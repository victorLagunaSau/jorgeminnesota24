import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { firestore } from "../firebase/firebaseIni";
import { COLLECTIONS } from "../constants";
import {
    FaLock, FaSignOutAlt, FaTruck, FaMapMarkerAlt,
    FaSearch, FaCalendarAlt, FaWarehouse, FaHashtag,
    FaCar, FaBoxOpen, FaHistory, FaCamera, FaTimes,
    FaCheck, FaChevronDown, FaChevronUp, FaUser,
    FaEye, FaEyeSlash, FaSpinner, FaTrash, FaImages, FaMap
} from "react-icons/fa";

const MapaChofer = dynamic(() => import("../components/features/viajes/MapaChofer"), { ssr: false });

const SESSION_KEY = "driver_session";
const OFFLINE_VIAJES_KEY = "driver_viajes_offline";
const OFFLINE_PENDING_KEY = "driver_pending_actions";
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const MAX_FOTOS = 10;
const MIN_FOTOS_LEVANTADO = 2;

const DriverPage = () => {
    const [chofer, setChofer] = useState(null);
    const [loading, setLoading] = useState(true);

    // Login state
    const [folio, setFolio] = useState("");
    const [clave, setClave] = useState("");
    const [error, setError] = useState("");
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [mostrarClave, setMostrarClave] = useState(false);

    // Viajes y vehiculos
    const [viajesPendientes, setViajesPendientes] = useState([]);
    const [viajesPagados, setViajesPagados] = useState([]);
    const [loadingViajes, setLoadingViajes] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [vista, setVista] = useState("pendientes"); // "pendientes" | "levantados" | "historial" | "mapa"

    // Fotos
    const [subiendo, setSubiendo] = useState(null); // lote del vehiculo que se esta subiendo
    const [fotoExpandida, setFotoExpandida] = useState(null);
    const fileInputRef = useRef(null);
    const [fotoTarget, setFotoTarget] = useState(null); // {viajeId, vehiculoIdx}

    // Confirmacion levantado
    const [confirmandoLevantado, setConfirmandoLevantado] = useState(null);

    // Offline
    const [isOffline, setIsOffline] = useState(false);

    // Detectar online/offline
    useEffect(() => {
        const goOffline = () => setIsOffline(true);
        const goOnline = () => {
            setIsOffline(false);
            syncPendingActions();
        };
        window.addEventListener("offline", goOffline);
        window.addEventListener("online", goOnline);
        setIsOffline(!navigator.onLine);
        return () => {
            window.removeEventListener("offline", goOffline);
            window.removeEventListener("online", goOnline);
        };
    }, []);

    // Sincronizar acciones pendientes al reconectar
    const syncPendingActions = async () => {
        try {
            const pending = JSON.parse(localStorage.getItem(OFFLINE_PENDING_KEY) || "[]");
            if (pending.length === 0) return;

            for (const action of pending) {
                if (action.type === "levantado") {
                    try {
                        const viajeRef = firestore().collection(COLLECTIONS.VIAJES_PENDIENTES).doc(action.viajeId);
                        const doc = await viajeRef.get();
                        if (!doc.exists) continue;
                        const data = doc.data();
                        const vehiculos = [...(data.vehiculos || [])];
                        if (!vehiculos[action.vehiculoIdx]) continue;
                        vehiculos[action.vehiculoIdx] = {
                            ...vehiculos[action.vehiculoIdx],
                            levantado: true,
                            fechaLevantado: new Date(action.fecha),
                            levantadoPor: action.choferNombre
                        };
                        await viajeRef.update({ vehiculos });

                        if (vehiculos[action.vehiculoIdx].solicitudId) {
                            await firestore().collection(COLLECTIONS.SOLICITUDES_VEHICULOS).doc(vehiculos[action.vehiculoIdx].solicitudId).update({
                                estado: "en_proceso",
                                fechaEnProceso: new Date()
                            });
                        }
                    } catch (_) {}
                }
            }
            localStorage.removeItem(OFFLINE_PENDING_KEY);
        } catch (_) {}
    };

    // Restaurar sesion
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (saved) setChofer(JSON.parse(saved));
        } catch (_) {}
        setLoading(false);
    }, []);

    // Cargar viajes (con cache offline)
    useEffect(() => {
        if (!chofer) { setLoadingViajes(false); return; }
        setLoadingViajes(true);
        const choferId = chofer.id;

        // Cargar cache offline primero para render inmediato
        try {
            const cached = JSON.parse(localStorage.getItem(OFFLINE_VIAJES_KEY) || "{}");
            if (cached.pendientes) setViajesPendientes(cached.pendientes);
            if (cached.pagados) setViajesPagados(cached.pagados);
        } catch (_) {}

        const unsubPend = firestore()
            .collection(COLLECTIONS.VIAJES_PENDIENTES)
            .onSnapshot((snap) => {
                const lista = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(v => v.chofer?.id === choferId);
                lista.sort((a, b) => {
                    const fa = a.fechaCreacion?.toDate?.() || new Date(0);
                    const fb = b.fechaCreacion?.toDate?.() || new Date(0);
                    return fb - fa;
                });
                setViajesPendientes(lista);
                setLoadingViajes(false);

                // Guardar en cache para modo offline (serializar timestamps)
                try {
                    const serialized = lista.map(v => ({
                        ...v,
                        fechaCreacion: v.fechaCreacion?.toDate?.()?.toISOString() || null,
                        vehiculos: (v.vehiculos || []).map(vh => ({
                            ...vh,
                            fechaLevantado: vh.fechaLevantado?.toDate?.()?.toISOString() || vh.fechaLevantado || null
                        }))
                    }));
                    const cached = JSON.parse(localStorage.getItem(OFFLINE_VIAJES_KEY) || "{}");
                    cached.pendientes = serialized;
                    localStorage.setItem(OFFLINE_VIAJES_KEY, JSON.stringify(cached));
                } catch (_) {}
            });

        const unsubPag = firestore()
            .collection(COLLECTIONS.VIAJES_PAGADOS)
            .onSnapshot((snap) => {
                const lista = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(v => v.chofer?.id === choferId);
                lista.sort((a, b) => {
                    const fa = a.fechaCreacion?.toDate?.() || new Date(0);
                    const fb = b.fechaCreacion?.toDate?.() || new Date(0);
                    return fb - fa;
                });
                setViajesPagados(lista);

                try {
                    const serialized = lista.map(v => ({
                        ...v,
                        fechaCreacion: v.fechaCreacion?.toDate?.()?.toISOString() || null
                    }));
                    const cached = JSON.parse(localStorage.getItem(OFFLINE_VIAJES_KEY) || "{}");
                    cached.pagados = serialized;
                    localStorage.setItem(OFFLINE_VIAJES_KEY, JSON.stringify(cached));
                } catch (_) {}
            });

        return () => { unsubPend(); unsubPag(); };
    }, [chofer]);

    // === Extraer vehiculos planos de los viajes ===
    const extraerVehiculos = (viajes, esHistorial = false) => {
        const vehiculos = [];
        viajes.forEach(viaje => {
            (viaje.vehiculos || []).forEach((v, idx) => {
                vehiculos.push({
                    ...v,
                    viajeId: viaje.id,
                    viajeNum: viaje.numViaje,
                    vehiculoIdx: idx,
                    fechaViaje: viaje.fechaCreacion,
                    esHistorial
                });
            });
        });
        return vehiculos;
    };

    const todosPendientes = extraerVehiculos(viajesPendientes);
    const todosHistorial = extraerVehiculos(viajesPagados, true);

    const vehiculosSinLevantar = todosPendientes.filter(v => !v.levantado);
    const vehiculosLevantados = todosPendientes.filter(v => v.levantado);

    const matchBusqueda = (v) => {
        if (!busqueda) return true;
        const b = busqueda.toLowerCase();
        return (
            v.lote?.toLowerCase().includes(b) ||
            v.marca?.toLowerCase().includes(b) ||
            v.modelo?.toLowerCase().includes(b) ||
            v.clienteAlt?.toLowerCase().includes(b) ||
            v.estado?.toLowerCase().includes(b) ||
            v.ciudad?.toLowerCase().includes(b)
        );
    };

    const vehiculosMostrar = vista === "pendientes"
        ? vehiculosSinLevantar.filter(matchBusqueda)
        : vista === "levantados"
            ? vehiculosLevantados.filter(matchBusqueda)
            : todosHistorial.filter(matchBusqueda);

    // === Auth ===
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        if (!folio.trim() || !clave.trim()) { setError("Ingresa tu folio y clave."); return; }

        setLoadingAuth(true);
        try {
            const snap = await firestore()
                .collection(COLLECTIONS.CHOFERES)
                .where("folio", "==", parseInt(folio))
                .get();

            if (snap.empty) { setError("Folio no encontrado."); setLoadingAuth(false); return; }

            const doc = snap.docs[0];
            const data = doc.data();

            if (!data.clave) { setError("Sin clave asignada. Contacta al administrador."); setLoadingAuth(false); return; }
            if (data.clave !== clave) { setError("Clave incorrecta."); setLoadingAuth(false); return; }

            const choferData = { id: doc.id, ...data };
            setChofer(choferData);
            localStorage.setItem(SESSION_KEY, JSON.stringify(choferData));
        } catch (err) {
            console.error("Error login:", err);
            setError("Error de conexion. Intenta de nuevo.");
        } finally {
            setLoadingAuth(false);
        }
    };

    const handleLogout = () => {
        setChofer(null);
        localStorage.removeItem(SESSION_KEY);
        setViajesPendientes([]);
        setViajesPagados([]);
        setFolio("");
        setClave("");
        setVista("pendientes");
    };

    // === Marcar levantado ===
    const marcarLevantado = async (viajeId, vehiculoIdx) => {
        setConfirmandoLevantado(null);

        // Si estamos offline, guardar acción en cola y actualizar UI local
        if (!navigator.onLine) {
            try {
                const pending = JSON.parse(localStorage.getItem(OFFLINE_PENDING_KEY) || "[]");
                pending.push({
                    type: "levantado",
                    viajeId,
                    vehiculoIdx,
                    fecha: new Date().toISOString(),
                    choferNombre: chofer.nombreChofer
                });
                localStorage.setItem(OFFLINE_PENDING_KEY, JSON.stringify(pending));

                // Actualizar UI local
                setViajesPendientes(prev => prev.map(v => {
                    if (v.id !== viajeId) return v;
                    const vehiculos = [...(v.vehiculos || [])];
                    if (vehiculos[vehiculoIdx]) {
                        vehiculos[vehiculoIdx] = {
                            ...vehiculos[vehiculoIdx],
                            levantado: true,
                            fechaLevantado: new Date().toISOString(),
                            levantadoPor: chofer.nombreChofer
                        };
                    }
                    return { ...v, vehiculos };
                }));
            } catch (_) {}
            return;
        }

        try {
            const viajeRef = firestore().collection(COLLECTIONS.VIAJES_PENDIENTES).doc(viajeId);
            const doc = await viajeRef.get();
            if (!doc.exists) return;

            const data = doc.data();
            const vehiculos = [...(data.vehiculos || [])];
            if (!vehiculos[vehiculoIdx]) return;

            const vehiculoActual = vehiculos[vehiculoIdx];
            vehiculos[vehiculoIdx] = {
                ...vehiculoActual,
                levantado: true,
                fechaLevantado: new Date(),
                levantadoPor: chofer.nombreChofer
            };

            await viajeRef.update({ vehiculos });

            // Si el vehículo viene de una solicitud, actualizar a "en_proceso"
            if (vehiculoActual.solicitudId) {
                try {
                    await firestore().collection(COLLECTIONS.SOLICITUDES_VEHICULOS).doc(vehiculoActual.solicitudId).update({
                        estado: "en_proceso",
                        fechaEnProceso: new Date()
                    });
                } catch (solErr) {
                    console.error("Error actualizando solicitud:", solErr);
                }
            }
        } catch (err) {
            console.error("Error al marcar levantado:", err);
        }
    };

    // === Subir foto a Cloudinary ===
    const abrirCamara = (viajeId, vehiculoIdx) => {
        setFotoTarget({ viajeId, vehiculoIdx });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !fotoTarget) return;

        const { viajeId, vehiculoIdx } = fotoTarget;

        // Verificar limite
        const viaje = viajesPendientes.find(v => v.id === viajeId);
        const vehiculo = viaje?.vehiculos?.[vehiculoIdx];
        if ((vehiculo?.fotos || []).length >= MAX_FOTOS) {
            alert(`Maximo ${MAX_FOTOS} fotos por vehiculo.`);
            return;
        }

        const loteId = vehiculo?.lote || "sin-lote";
        setSubiendo(loteId);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", UPLOAD_PRESET);
            formData.append("folder", `vehiculos-fotos/${loteId}`);

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                { method: "POST", body: formData }
            );

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error("Cloudinary error:", errData);
                throw new Error(errData?.error?.message || "Error en upload");
            }

            const data = await res.json();
            const fotoData = {
                url: data.secure_url,
                publicId: data.public_id,
                fecha: new Date().toISOString(),
                subidoPor: chofer.nombreChofer
            };

            // Guardar en Firestore
            const viajeRef = firestore().collection(COLLECTIONS.VIAJES_PENDIENTES).doc(viajeId);
            const viajeDoc = await viajeRef.get();
            if (!viajeDoc.exists) return;

            const viajeData = viajeDoc.data();
            const vehiculos = [...(viajeData.vehiculos || [])];
            if (!vehiculos[vehiculoIdx]) return;

            const fotosActuales = vehiculos[vehiculoIdx].fotos || [];
            vehiculos[vehiculoIdx] = {
                ...vehiculos[vehiculoIdx],
                fotos: [...fotosActuales, fotoData]
            };

            await viajeRef.update({ vehiculos });
        } catch (err) {
            console.error("Error subiendo foto:", err);
            alert("Error al subir la foto. Intenta de nuevo.");
        } finally {
            setSubiendo(null);
            setFotoTarget(null);
        }
    };

    // === Eliminar foto ===
    const eliminarFoto = async (viajeId, vehiculoIdx, fotoIdx) => {
        if (!confirm("Eliminar esta foto?")) return;
        try {
            const viajeRef = firestore().collection(COLLECTIONS.VIAJES_PENDIENTES).doc(viajeId);
            const doc = await viajeRef.get();
            if (!doc.exists) return;

            const data = doc.data();
            const vehiculos = [...(data.vehiculos || [])];
            if (!vehiculos[vehiculoIdx]) return;

            const fotos = [...(vehiculos[vehiculoIdx].fotos || [])];
            fotos.splice(fotoIdx, 1);
            vehiculos[vehiculoIdx] = { ...vehiculos[vehiculoIdx], fotos };

            await viajeRef.update({ vehiculos });
        } catch (err) {
            console.error("Error eliminando foto:", err);
        }
    };

    // === Helpers ===
    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Thumbnail URL de Cloudinary (200px ancho, auto calidad)
    const thumb = (url) => {
        if (!url || !url.includes('cloudinary')) return url;
        return url.replace('/upload/', '/upload/w_200,q_auto/');
    };

    // === Guards ===
    if (loading) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white">
            <span className="loading loading-ring loading-lg text-red-600"></span>
        </div>
    );

    // ============================================================
    // LOGIN
    // ============================================================
    if (!chofer) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex flex-col justify-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Portal Choferes | Jorge Minnesota INC</title></Head>
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    <div className="text-center mb-6">
                        <img src="/assets/Logo.png" className="w-20 mx-auto mb-3" alt="Logo"/>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">
                            Portal de Choferes
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Ingresa tu folio y clave para ver tus cargas
                        </p>
                    </div>

                    {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <FaHashtag className="absolute left-4 top-4 text-gray-300"/>
                            <input
                                type="number"
                                placeholder="Folio (Ej: 12)"
                                value={folio}
                                onChange={(e) => setFolio(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black font-bold text-center text-lg"
                                style={{ fontSize: '16px' }}
                                required
                            />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-4 text-gray-300"/>
                            <input
                                type={mostrarClave ? "text" : "password"}
                                placeholder="Clave"
                                value={clave}
                                onChange={(e) => setClave(e.target.value)}
                                className="input input-bordered w-full pl-12 pr-12 bg-gray-50 border-none text-black font-bold text-center text-lg tracking-widest"
                                style={{ fontSize: '16px' }}
                                maxLength={6}
                                required
                            />
                            <button type="button" onClick={() => setMostrarClave(!mostrarClave)} className="absolute right-4 top-4 text-gray-400">
                                {mostrarClave ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <button type="submit" disabled={loadingAuth} className="btn btn-error w-full text-white font-black uppercase shadow-lg">
                            {loadingAuth ? <span className="loading loading-spinner loading-sm"></span> : "Entrar"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/clients">
                            <a className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium">
                                Soy Cliente →
                            </a>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // PORTAL
    // ============================================================
    return (
        <div className="min-h-screen bg-gray-50 pb-24 safe-area-bottom font-sans text-black">
            <Head><title>Portal Chofer | Jorge Minnesota INC</title></Head>

            {/* Input file oculto para camara */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Banner offline */}
            {isOffline && (
                <div className="bg-amber-500 text-white text-center py-2 text-xs font-bold safe-area-top">
                    Sin conexión — Los cambios se sincronizarán al reconectar
                </div>
            )}

            {/* Header */}
            <header className="bg-white p-4 safe-area-top flex justify-between items-center border-b-2 border-gray-100 sticky top-0 z-[60] shadow-sm">
                <div className="flex items-center gap-3">
                    <img src="/assets/Logo.png" className="w-10 h-auto" alt="Logo"/>
                    <div>
                        <h1 className="text-base font-black uppercase italic text-black leading-none tracking-tighter">
                            {chofer.nombreChofer}
                        </h1>
                        <p className="text-[10px] text-gray-500">
                            #{chofer.folio} · {chofer.empresaNombre}
                        </p>
                    </div>
                    <button
                        onClick={() => setVista(vista === "mapa" ? "pendientes" : "mapa")}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            vista === "mapa"
                                ? "bg-green-600 text-white shadow-md"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                        }`}
                    >
                        <FaMap size={12}/> Mapa
                    </button>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase border border-red-600 px-3 py-1.5 rounded-lg">
                    <FaSignOutAlt /> Salir
                </button>
            </header>

            {/* Contadores */}
            <section className="bg-white px-4 py-3 border-b shadow-sm">
                <div className="flex gap-3 justify-center">
                    <div className="bg-amber-50 px-4 py-2 rounded-lg text-center flex-1">
                        <span className="text-[9px] text-amber-600 font-bold uppercase">Por Levantar</span>
                        <p className="text-2xl font-black text-amber-700">{vehiculosSinLevantar.length}</p>
                    </div>
                    <div className="bg-green-50 px-4 py-2 rounded-lg text-center flex-1">
                        <span className="text-[9px] text-green-600 font-bold uppercase">Levantados</span>
                        <p className="text-2xl font-black text-green-700">{vehiculosLevantados.length}</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg text-center flex-1">
                        <span className="text-[9px] text-blue-600 font-bold uppercase">Historial</span>
                        <p className="text-2xl font-black text-blue-700">{todosHistorial.length}</p>
                    </div>
                </div>
            </section>

            {/* Tabs + Search */}
            <div className="px-4 py-3 space-y-3 sticky top-[60px] z-50 bg-gray-50">
                <div className="flex bg-gray-200 rounded-lg p-1">
                    <button
                        onClick={() => setVista("pendientes")}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1 ${
                            vista === "pendientes" ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500'
                        }`}
                    >
                        <FaBoxOpen size={10}/> Pendientes
                    </button>
                    <button
                        onClick={() => setVista("levantados")}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1 ${
                            vista === "levantados" ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500'
                        }`}
                    >
                        <FaCheck size={10}/> Levantados
                    </button>
                    <button
                        onClick={() => setVista("historial")}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1 ${
                            vista === "historial" ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'
                        }`}
                    >
                        <FaHistory size={10}/> Historial
                    </button>
                </div>

                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm"/>
                    <input
                        type="text"
                        placeholder="Buscar lote, marca, cliente, ubicacion..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="input input-bordered input-sm w-full pl-9 bg-white text-black text-[13px]"
                        style={{ fontSize: '16px' }}
                    />
                </div>
            </div>

            {/* Mapa de vehículos */}
            {vista === "mapa" && (
                <div className="px-4 py-3">
                    <MapaChofer vehiculos={todosPendientes} />
                </div>
            )}

            {/* Lista de vehiculos */}
            <main className={`px-4 space-y-3 ${vista === "mapa" ? "hidden" : ""}`}>
                {loadingViajes ? (
                    <div className="flex justify-center py-20">
                        <span className="loading loading-spinner loading-lg text-red-600"></span>
                    </div>
                ) : vehiculosMostrar.length === 0 ? (
                    <div className="text-center py-16">
                        <FaCar className="text-5xl text-gray-300 mx-auto mb-3"/>
                        <p className="text-gray-500 text-sm">
                            {busqueda ? "Sin resultados" : vista === "pendientes" ? "No tienes vehiculos por levantar" : vista === "levantados" ? "No has levantado vehiculos" : "Sin historial"}
                        </p>
                    </div>
                ) : (
                    vehiculosMostrar.map((v, i) => {
                        const fotos = v.fotos || [];
                        const isSubiendo = subiendo === v.lote;
                        const esHistorial = v.esHistorial;

                        return (
                            <div key={`${v.viajeId}-${v.vehiculoIdx}-${i}`} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Header del vehiculo */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono font-black text-red-600 text-xs">#{v.lote}</span>
                                                {v.levantado && (
                                                    <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                                        Levantado
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase text-base leading-tight">
                                                {v.marca} {v.modelo}
                                            </h3>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                                            esHistorial ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {v.almacen || 'N/A'}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <FaUser className="text-[9px] text-gray-400"/>
                                            {v.clienteAlt || v.clienteNombre || '-'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FaMapMarkerAlt className="text-[9px] text-gray-400"/>
                                            {v.ciudad || '-'}, {v.estado || '-'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FaCalendarAlt className="text-[9px] text-gray-400"/>
                                            {formatDate(v.fechaViaje)}
                                        </span>
                                    </div>

                                    {v.levantado && v.fechaLevantado && (
                                        <div className="mt-1 text-[10px] text-green-600 font-bold">
                                            Levantado: {formatDate(v.fechaLevantado)}
                                        </div>
                                    )}
                                </div>

                                {/* Galeria de fotos */}
                                {fotos.length > 0 && (
                                    <div className="px-4 pb-2">
                                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                            {fotos.map((foto, fi) => (
                                                <div key={fi} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 group">
                                                    <img
                                                        src={thumb(foto.url)}
                                                        alt={`Foto ${fi + 1}`}
                                                        className="w-full h-full object-cover cursor-pointer"
                                                        onClick={() => setFotoExpandida(foto.url)}
                                                    />
                                                    {!esHistorial && (
                                                        <button
                                                            onClick={() => eliminarFoto(v.viajeId, v.vehiculoIdx, fi)}
                                                            className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            style={{ opacity: 1 }} // Siempre visible en mobile
                                                        >
                                                            <FaTimes size={8}/>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[9px] text-gray-400">{fotos.length}/{MAX_FOTOS} fotos</span>
                                    </div>
                                )}

                                {/* Acciones */}
                                {!esHistorial && (
                                    <div className="px-4 pb-4 flex gap-2">
                                        {/* Boton foto */}
                                        <button
                                            onClick={() => abrirCamara(v.viajeId, v.vehiculoIdx)}
                                            disabled={isSubiendo || fotos.length >= MAX_FOTOS}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
                                        >
                                            {isSubiendo ? (
                                                <><FaSpinner className="animate-spin" size={12}/> Subiendo...</>
                                            ) : (
                                                <><FaCamera size={12}/> {fotos.length > 0 ? `Foto (${fotos.length})` : "Tomar Foto"}</>
                                            )}
                                        </button>

                                        {/* Boton levantado */}
                                        {!v.levantado && fotos.length < MIN_FOTOS_LEVANTADO && (
                                            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed">
                                                <FaCamera size={10}/> Mín. {MIN_FOTOS_LEVANTADO} fotos para levantar
                                            </div>
                                        )}
                                        {!v.levantado && fotos.length >= MIN_FOTOS_LEVANTADO && (
                                            confirmandoLevantado === `${v.viajeId}-${v.vehiculoIdx}` ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => marcarLevantado(v.viajeId, v.vehiculoIdx)}
                                                        className="flex items-center gap-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black"
                                                    >
                                                        <FaCheck size={10}/> Si
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmandoLevantado(null)}
                                                        className="flex items-center gap-1 px-3 py-2.5 bg-gray-200 text-gray-600 rounded-xl text-xs font-bold"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmandoLevantado(`${v.viajeId}-${v.vehiculoIdx}`)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black transition-colors"
                                                >
                                                    <FaTruck size={12}/> Levantado
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>

            {/* Lightbox foto expandida */}
            {fotoExpandida && (
                <div
                    className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
                    onClick={() => setFotoExpandida(null)}
                >
                    <button className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => setFotoExpandida(null)}>
                        <FaTimes size={20}/>
                    </button>
                    <img
                        src={fotoExpandida}
                        alt="Foto ampliada"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Footer */}
            <footer className="mt-6 text-center text-[10px] text-gray-400 uppercase pb-4">
                Portal de Choferes - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default DriverPage;
