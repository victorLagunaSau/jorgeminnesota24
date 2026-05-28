import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import { COLLECTIONS } from "../constants";
import {
    FaUser, FaLock, FaSignOutAlt, FaCar, FaSearch, FaPlus,
    FaMapMarkerAlt, FaCalendarAlt, FaKey, FaBarcode, FaSpinner,
    FaClock, FaArrowLeft, FaCheckCircle, FaHistory, FaTruck, FaWarehouse, FaTimes, FaIdCard
} from "react-icons/fa";

const SolicitarPage = () => {
    const { user, loading, isCliente, signIn, signOut } = useAuthContext();

    // Estados para búsqueda
    const [lotNumber, setLotNumber] = useState("");
    const [gatePass, setGatePass] = useState("");
    const [searching, setSearching] = useState(false);
    const [vehicleResult, setVehicleResult] = useState(null);
    const [searchError, setSearchError] = useState("");
    const [searchProgress, setSearchProgress] = useState(0);

    const PROGRESS_SEGMENTS = 20;
    const SEARCH_PHASES = [
        { until: 30, label: "Conectando con subasta..." },
        { until: 60, label: "Obteniendo información del vehículo..." },
        { until: 90, label: "Verificando datos..." },
        { until: 101, label: "Finalizando..." }
    ];
    const currentPhaseLabel = SEARCH_PHASES.find(p => searchProgress < p.until)?.label || SEARCH_PHASES[SEARCH_PHASES.length - 1].label;

    // Simula progreso mientras dura la búsqueda (sin feedback real del scraper)
    useEffect(() => {
        if (!searching) {
            setSearchProgress(0);
            return;
        }

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            // Curva asintótica que se acerca a 95% (nunca llega hasta tener respuesta)
            const pct = Math.min(95, Math.round(95 * (1 - Math.exp(-elapsed / 4000))));
            setSearchProgress(pct);
        }, 80);

        return () => clearInterval(interval);
    }, [searching]);

    // Estados para lista de solicitudes
    const [solicitudes, setSolicitudes] = useState([]);
    const [solicitudesCompletadas, setSolicitudesCompletadas] = useState([]);
    const [vehiculosEntregados, setVehiculosEntregados] = useState([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [tabSolicitudes, setTabSolicitudes] = useState("solicitudes"); // "solicitudes" | "historial"

    // Modales de detalle
    const [solicitudDetalle, setSolicitudDetalle] = useState(null);
    const [vehiculoDetalle, setVehiculoDetalle] = useState(null);

    // Helpers de status para modal de vehículo
    const VEHICLE_STATUS_COLORS = {
        'PR': 'bg-slate-200 text-slate-700',
        'IN': 'bg-sky-200 text-sky-800',
        'TR': 'bg-blue-200 text-blue-800',
        'EB': 'bg-indigo-200 text-indigo-800',
        'DS': 'bg-cyan-200 text-cyan-800',
        'EN': 'bg-emerald-200 text-emerald-800',
    };
    const VEHICLE_STATUS_LABELS = {
        'PR': 'Registrado', 'IN': 'Cargando', 'TR': 'En Viaje',
        'EB': 'En Brownsville', 'DS': 'Descargado', 'EN': 'Entregado'
    };
    const getVStatusColor = (s) => VEHICLE_STATUS_COLORS[s] || 'bg-slate-200 text-slate-700';
    const getVStatusLabel = (s) => VEHICLE_STATUS_LABELS[s] || s;
    const formatVDate = (ts) => {
        if (!ts) return '-';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    // Login form
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loginError, setLoginError] = useState("");

    // Pull-to-refresh
    const [refreshing, setRefreshing] = useState(false);
    const pullStartY = useRef(0);
    const isPulling = useRef(false);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    // Marcar body como app Capacitor para estilos móviles (font-size 16px en inputs)
    useEffect(() => {
        if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform?.()) return;
        document.body.classList.add("capacitor-app");

        const onTouchStart = (e) => {
            if (window.scrollY === 0) {
                pullStartY.current = e.touches[0].clientY;
                isPulling.current = true;
            }
        };
        const onTouchMove = (e) => {
            if (!isPulling.current) return;
            const diff = e.touches[0].clientY - pullStartY.current;
            if (diff > 80 && window.scrollY === 0) {
                isPulling.current = false;
                handleRefresh();
            }
        };
        const onTouchEnd = () => { isPulling.current = false; };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: true });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
        };
    }, [handleRefresh]);

    // Cargar solicitudes del cliente
    useEffect(() => {
        const clienteId = user?.datosCliente?.id || user?.id;

        if (!clienteId) {
            setLoadingSolicitudes(false);
            return;
        }

        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .where("clienteId", "==", clienteId)
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lista.sort((a, b) => {
                    const fechaA = a.fechaSolicitud?.toDate?.() || new Date(0);
                    const fechaB = b.fechaSolicitud?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setSolicitudes(lista.filter(s => s.estado !== "completado"));
                setSolicitudesCompletadas(lista.filter(s => s.estado === "completado"));
                setLoadingSolicitudes(false);
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
                setLoadingSolicitudes(false);
            });

        return () => unsubscribe();
    }, [user]);

    // Cargar vehículos entregados del cliente
    useEffect(() => {
        const clienteNombre = user?.datosCliente?.cliente;
        if (!clienteNombre) return;

        const unsubscribe = firestore()
            .collection(COLLECTIONS.VEHICULOS)
            .where("cliente", "==", clienteNombre)
            .where("estatus", "==", "EN")
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lista.sort((a, b) => {
                    const fechaA = a.registro?.timestamp?.toDate?.() || new Date(0);
                    const fechaB = b.registro?.timestamp?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setVehiculosEntregados(lista);
            });

        return () => unsubscribe();
    }, [user?.datosCliente?.cliente]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        try {
            await signIn(email, pass);
        } catch (err) {
            setLoginError("Credenciales incorrectas.");
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!lotNumber.trim() || !gatePass.trim() || gatePass.length < 4) return;

        setSearching(true);
        setSearchError("");
        setVehicleResult(null);

        try {
            const response = await fetch("https://jorgeminnesota.duckdns.org/api/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": "db831f6fb15f35bd5ecaece924d27b482e7dde9a3dff56d86acc9000b4c24ed6"
                },
                body: JSON.stringify({ lotNumber: lotNumber.trim(), gatePass: gatePass.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                setSearchError(data.error || "Error al buscar vehículo");
                return;
            }

            setVehicleResult(data.vehicle);
        } catch (error) {
            setSearchError("Error de conexión. Intenta de nuevo.");
        } finally {
            setSearching(false);
        }
    };

    const handleAgregarSolicitud = async () => {
        if (!vehicleResult) {
            alert("No hay vehículo seleccionado");
            return;
        }

        if (!user) {
            alert("Error: Debes iniciar sesión");
            return;
        }

        const clienteId = user.datosCliente?.id || user.id;

        setGuardando(true);
        try {
            await firestore().collection("solicitudesVehiculos").add({
                clienteId: clienteId,
                clienteNombre: (user.datosCliente.cliente || user.username || "").toUpperCase().trim(),
                clienteTelefono: user.datosCliente.telefonoCliente || "",
                // Datos del vehículo
                lotNumber: vehicleResult.lotNumber,
                gatePass: vehicleResult.gatePass,
                make: vehicleResult.make || "",
                model: vehicleResult.model || "",
                year: vehicleResult.year || "",
                vin: vehicleResult.vin || "",
                location: vehicleResult.location || "",
                imageUrl: vehicleResult.imageUrl || "",
                source: vehicleResult.source || "",
                auctionDate: vehicleResult.auctionDate || "",
                // Metadatos
                estado: "pendiente", // pendiente, aprobado, en_proceso, completado
                fechaSolicitud: new Date(),
                notas: ""
            });

            // Limpiar búsqueda
            setVehicleResult(null);
            setLotNumber("");
            setGatePass("");

        } catch (error) {
            console.error("Error guardando solicitud:", error);
            alert("Error al guardar la solicitud: " + error.message);
        } finally {
            setGuardando(false);
        }
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            pendiente: "bg-sky-100 text-sky-800",
            aprobado: "bg-blue-100 text-blue-800",
            asignado: "bg-indigo-100 text-indigo-800",
            en_proceso: "bg-blue-100 text-blue-800",
            completado: "bg-emerald-100 text-emerald-800"
        };
        const labels = {
            pendiente: "Pendiente",
            aprobado: "Aprobado",
            asignado: "Asignado a transportista",
            en_proceso: "En Camino",
            completado: "Completado"
        };
        return { className: badges[estado] || badges.pendiente, label: labels[estado] || estado };
    };

    // Si no es cliente pero está logueado, hacer logout
    if (user && !isCliente) {
        signOut();
        return null;
    }

    if (loading) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white">
            <span className="loading loading-ring loading-lg text-blue-600"></span>
        </div>
    );

    // Cuenta no aprobada
    if (user && user.datosCliente?.aprobado === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center items-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Cuenta en Revisión | Jorge Minnesota</title></Head>
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
                    <FaClock className="text-4xl text-indigo-500 mx-auto mb-3"/>
                    <h2 className="text-lg font-black uppercase text-gray-800 mb-2">Cuenta en Revisión</h2>
                    <p className="text-sm text-gray-500 mb-4">Tu cuenta aún no ha sido aprobada. No puedes solicitar vehículos hasta que sea revisada.</p>
                    <Link href="/clients">
                        <a className="text-sm text-blue-600 font-bold underline">Volver</a>
                    </Link>
                </div>
            </div>
        );
    }

    // Login Form
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Solicitar Vehículos | Jorge Minnesota</title></Head>
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-blue-100">
                    <div className="text-center mb-8">
                        <img src="/assets/Logo.png" className="w-24 mx-auto mb-4" alt="Logo"/>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">
                            Solicitar Vehículos
                        </h1>
                        <p className="text-sm text-gray-500 mt-2">Inicia sesión para solicitar vehículos</p>
                    </div>
                    {loginError && <p className="text-red-500 text-center mb-4 text-sm">{loginError}</p>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <FaUser className="absolute left-4 top-4 text-gray-300"/>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                required
                            />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-4 text-gray-300"/>
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                required
                            />
                        </div>
                        <button type="submit" className="btn w-full text-white font-black uppercase shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                            Entrar
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link href="/clients">
                            <a className="text-sm text-blue-600 hover:underline">← Volver al login</a>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Main Content
    const clienteData = user.datosCliente || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-10 safe-area-bottom font-sans text-black overflow-x-hidden">
            <Head><title>Solicitar Vehículos | Jorge Minnesota</title></Head>

            {/* Pull-to-refresh indicator */}
            {refreshing && (
                <div className="ptr-spinner">
                    <div className="ptr-icon"></div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md p-4 safe-area-top flex justify-between items-center border-b border-blue-100 sticky top-0 z-[60] shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                    <Link href="/clients">
                        <a className="text-blue-600 p-2 flex-shrink-0">
                            <FaArrowLeft className="text-lg"/>
                        </a>
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg font-black uppercase italic text-black leading-none tracking-tighter truncate">
                            Solicitar Vehículos
                        </h1>
                        <p className="text-[10px] text-gray-500">Jorge Minnesota Logistic LLC</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href="/clients">
                        <a className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50">
                            <FaCar className="text-base md:text-sm"/>
                            <span className="hidden md:inline">Mis Vehículos</span>
                        </a>
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50"
                    >
                        <FaSignOutAlt className="text-base md:text-sm"/>
                        <span className="hidden md:inline">Salir</span>
                    </button>
                </div>
            </header>

            {/* User Info */}
            <section className="bg-white/70 backdrop-blur-sm px-4 py-3 border-b border-blue-100">
                <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaUser className="text-blue-600 text-[10px]"/>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-xs text-gray-800 truncate">{clienteData.cliente || user.username}</p>
                            <p className="text-[9px] text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 px-2 py-1 rounded-lg text-center flex-shrink-0 shadow-sm">
                        <span className="text-[8px] text-blue-600 font-bold uppercase">Solicitudes</span>
                        <p className="text-base font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent leading-tight tabular-nums">{solicitudes.length}</p>
                    </div>
                </div>
            </section>

            <main className="px-4 py-4">
                <div className="grid gap-3 lg:grid-cols-2">

                    {/* Panel de Búsqueda */}
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-3">
                            <h2 className="text-sm font-black uppercase text-gray-800 mb-2 flex items-center gap-2">
                                <FaSearch className="text-blue-600 text-xs"/> Buscar Vehículo
                            </h2>
                            <form onSubmit={handleSearch} className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                                            Número de Lote *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 43874580"
                                            value={lotNumber}
                                            onChange={(e) => setLotNumber(e.target.value.replace(/\D/g, ''))}
                                            className="input input-bordered input-sm w-full bg-white text-black border-blue-100 focus:border-blue-400"
                                            disabled={searching}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                                            Gate Pass *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: A1B2"
                                            value={gatePass}
                                            onChange={(e) => setGatePass(e.target.value.toUpperCase().slice(0, 5))}
                                            className="input input-bordered input-sm w-full bg-white text-black uppercase border-blue-100 focus:border-blue-400"
                                            disabled={searching}
                                            maxLength={5}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={searching || !lotNumber.trim() || gatePass.length < 4}
                                    className="btn btn-sm w-full text-white font-bold border-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                                >
                                    {searching ? (
                                        <>
                                            <FaSpinner className="animate-spin mr-2"/> Buscando...
                                        </>
                                    ) : (
                                        <>
                                            <FaSearch className="mr-2"/> Buscar Vehículo
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Indicador de búsqueda */}
                            {searching && (
                                <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-100 p-5">
                                    {/* Halo decorativo de fondo */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-40 h-40 rounded-full bg-blue-200/40 blur-2xl animate-halo"></div>
                                    </div>

                                    <div className="relative flex flex-col items-center">
                                        {/* Lupita orbitando */}
                                        <div className="relative w-24 h-24 flex items-center justify-center mb-3">
                                            {/* Lupita que orbita (no rota sobre su eje) */}
                                            <div className="absolute animate-lupita-orbit">
                                                <FaSearch className="text-blue-600 text-4xl drop-shadow-lg"/>
                                            </div>
                                        </div>

                                        {/* Etiqueta con fade al cambiar */}
                                        <p
                                            key={currentPhaseLabel}
                                            className="text-sm sm:text-base font-black text-gray-800 text-center uppercase tracking-wide animate-fade-in-up px-2"
                                        >
                                            {currentPhaseLabel}
                                        </p>

                                        {/* Porcentaje con gradiente */}
                                        <span className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent tabular-nums mt-1 mb-3">
                                            {searchProgress}%
                                        </span>

                                        {/* Barra segmentada */}
                                        <div className="flex gap-[3px] w-full">
                                            {Array.from({ length: PROGRESS_SEGMENTS }).map((_, i) => {
                                                const segmentThreshold = ((i + 1) / PROGRESS_SEGMENTS) * 100;
                                                const filled = searchProgress >= segmentThreshold;
                                                const partial = !filled && searchProgress > (i / PROGRESS_SEGMENTS) * 100;
                                                return (
                                                    <div
                                                        key={i}
                                                        className="relative flex-1 h-3 bg-blue-100/60 rounded-sm overflow-hidden"
                                                    >
                                                        <div
                                                            className={`h-full rounded-sm transition-all duration-200 ease-out ${
                                                                filled
                                                                    ? 'bg-gradient-to-b from-blue-500 to-indigo-600 shadow-[0_0_4px_rgba(59,130,246,0.6)]'
                                                                    : partial
                                                                        ? 'bg-blue-400'
                                                                        : ''
                                                            }`}
                                                            style={{
                                                                width: filled
                                                                    ? '100%'
                                                                    : partial
                                                                        ? `${((searchProgress - (i / PROGRESS_SEGMENTS) * 100) / (100 / PROGRESS_SEGMENTS)) * 100}%`
                                                                        : '0%'
                                                            }}
                                                        ></div>
                                                        {/* Shimmer encima del segmento activo */}
                                                        {partial && (
                                                            <div className="absolute inset-0 animate-shimmer pointer-events-none"></div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {searchError && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {searchError}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Panel de Solicitudes / Historial */}
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-blue-100">
                            <button
                                onClick={() => setTabSolicitudes("solicitudes")}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold uppercase transition-all ${
                                    tabSolicitudes === "solicitudes"
                                        ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/60"
                                        : "text-gray-400 hover:text-gray-600"
                                }`}
                            >
                                <FaClock className="text-[10px]"/> Solicitudes
                                {solicitudes.length > 0 && (
                                    <span className="bg-blue-200 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{solicitudes.length}</span>
                                )}
                            </button>
                            <button
                                onClick={() => setTabSolicitudes("historial")}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold uppercase transition-all ${
                                    tabSolicitudes === "historial"
                                        ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/60"
                                        : "text-gray-400 hover:text-gray-600"
                                }`}
                            >
                                <FaHistory className="text-[10px]"/> Historial
                                {(solicitudesCompletadas.length + vehiculosEntregados.length) > 0 && (
                                    <span className="bg-indigo-200 text-indigo-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{solicitudesCompletadas.length + vehiculosEntregados.length}</span>
                                )}
                            </button>
                        </div>

                        <div className="p-3">
                        {tabSolicitudes === "solicitudes" ? (
                            /* === Solicitudes activas === */
                            loadingSolicitudes ? (
                                <div className="flex justify-center py-8">
                                    <span className="loading loading-spinner loading-md text-blue-600"></span>
                                </div>
                            ) : solicitudes.length === 0 ? (
                                <div className="text-center py-8">
                                    <FaCar className="text-4xl text-gray-300 mx-auto mb-3"/>
                                    <p className="text-sm text-gray-500">No tienes solicitudes aún</p>
                                    <p className="text-xs text-gray-400">Busca un vehículo para comenzar</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {solicitudes.map((sol) => {
                                        const badge = getEstadoBadge(sol.estado);
                                        return (
                                            <div key={sol.id} onClick={() => setSolicitudDetalle(sol)} className="border border-blue-100 rounded-lg p-2.5 cursor-pointer hover:bg-blue-50/60 transition-colors">
                                                <div className="flex gap-2.5 items-start">
                                                    {sol.imageUrl && (
                                                        <img
                                                            src={sol.imageUrl}
                                                            alt={`${sol.year} ${sol.make}`}
                                                            className="w-16 h-14 object-cover rounded bg-gray-100 flex-shrink-0"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-xs text-gray-500 uppercase truncate leading-tight">
                                                            {sol.year} {sol.make}
                                                        </p>
                                                        <p className="font-black text-sm text-gray-900 uppercase truncate leading-tight">
                                                            {sol.model}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 mt-1">
                                                            Lote: {sol.lotNumber} • {sol.source}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                                            <span className="flex items-center gap-0.5 truncate">
                                                                <FaMapMarkerAlt className="flex-shrink-0"/> {sol.location || 'N/A'}
                                                            </span>
                                                            <span className="flex items-center gap-0.5 flex-shrink-0">
                                                                <FaCalendarAlt/> {sol.fechaSolicitud?.toDate?.().toLocaleDateString('es-MX') || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            /* === Historial === */
                            (solicitudesCompletadas.length + vehiculosEntregados.length) === 0 ? (
                                <div className="text-center py-8">
                                    <FaHistory className="text-4xl text-gray-300 mx-auto mb-3"/>
                                    <p className="text-sm text-gray-500">No tienes historial aún</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {/* Vehículos entregados */}
                                    {vehiculosEntregados.map((v) => (
                                        <div key={v.id} onClick={() => setVehiculoDetalle(v)} className="border border-green-100 rounded-lg p-2.5 bg-green-50/30 cursor-pointer hover:bg-green-50/60 transition-colors">
                                            <div className="flex gap-2.5 items-start">
                                                <div className="w-16 h-14 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                                                    <FaCheckCircle className="text-green-500 text-xl"/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-xs text-gray-500 uppercase truncate leading-tight">
                                                        {v.marca}
                                                    </p>
                                                    <p className="font-black text-sm text-gray-900 uppercase truncate leading-tight">
                                                        {v.modelo}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 mt-1">
                                                        Lote: {v.binNip} • {v.almacen || '-'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                                        <span className="flex items-center gap-0.5 truncate">
                                                            <FaMapMarkerAlt className="flex-shrink-0"/> {v.ciudad}, {v.estado}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2">
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-200 text-green-800">
                                                            Entregado
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Solicitudes completadas */}
                                    {solicitudesCompletadas.map((sol) => (
                                        <div key={sol.id} onClick={() => setSolicitudDetalle(sol)} className="border border-blue-100 rounded-lg p-2.5 cursor-pointer hover:bg-blue-50/60 transition-colors">
                                            <div className="flex gap-2.5 items-start">
                                                {sol.imageUrl ? (
                                                    <img
                                                        src={sol.imageUrl}
                                                        alt={`${sol.year} ${sol.make}`}
                                                        className="w-16 h-14 object-cover rounded bg-gray-100 flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <FaCar className="text-gray-300"/>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-xs text-gray-500 uppercase truncate leading-tight">
                                                        {sol.year} {sol.make}
                                                    </p>
                                                    <p className="font-black text-sm text-gray-900 uppercase truncate leading-tight">
                                                        {sol.model}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 mt-1">
                                                        Lote: {sol.lotNumber} • {sol.source}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                                        <span className="flex items-center gap-0.5 truncate">
                                                            <FaMapMarkerAlt className="flex-shrink-0"/> {sol.location || 'N/A'}
                                                        </span>
                                                    </div>
                                                    {sol.fechaCompletado && (
                                                        <p className="text-[10px] text-green-600 font-bold mt-1">
                                                            <FaCheckCircle className="inline mr-0.5 text-[9px]"/>
                                                            {sol.fechaCompletado.toDate ? sol.fechaCompletado.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(sol.fechaCompletado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                    <div className="mt-2">
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-100 text-green-800">
                                                            Completado
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Preview de Búsqueda */}
            {vehicleResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up" onClick={() => setVehicleResult(null)}>
                    <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto shadow-2xl safe-area-bottom flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Imagen */}
                        <div className="relative flex-shrink-0">
                            {vehicleResult.imageUrl ? (
                                <div className="w-full bg-gradient-to-br from-slate-900 to-slate-800 sm:rounded-t-2xl flex items-center justify-center" style={{ minHeight: '420px' }}>
                                    <img
                                        src={vehicleResult.imageUrl}
                                        alt={`${vehicleResult.year} ${vehicleResult.make} ${vehicleResult.model}`}
                                        className="w-full h-auto max-h-[60vh] object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-96 bg-gradient-to-br from-blue-600 to-indigo-800 sm:rounded-t-2xl flex items-center justify-center">
                                    <FaCar className="text-6xl text-white/60"/>
                                </div>
                            )}
                            <button
                                onClick={() => setVehicleResult(null)}
                                className="absolute right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all z-10"
                                style={{ top: 'max(env(safe-area-inset-top), 0.75rem)' }}
                                aria-label="Cerrar"
                            >
                                <FaTimes size={14}/>
                            </button>
                            <div className="absolute bottom-3 left-3">
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold px-2.5 py-1 rounded shadow">
                                    {vehicleResult.source}
                                </span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-5 sm:p-6 flex-1 flex flex-col">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Vehículo Encontrado</p>
                            <p className="text-base font-bold text-gray-500 uppercase tracking-wide leading-tight">
                                {vehicleResult.year} {vehicleResult.make}
                            </p>
                            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                                {vehicleResult.model}
                            </h3>

                            <div className="mt-5 space-y-3.5 text-base text-gray-700">
                                <div className="flex items-center gap-3">
                                    <FaBarcode className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Lote</span>
                                    <span className="font-mono font-bold text-gray-900">{vehicleResult.lotNumber}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FaKey className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Gate Pass</span>
                                    <span className="font-mono font-bold text-gray-900">{vehicleResult.gatePass}</span>
                                </div>
                                {vehicleResult.vin && (
                                    <div className="flex items-center gap-3">
                                        <FaBarcode className="text-blue-500 text-sm flex-shrink-0"/>
                                        <span className="text-gray-500 text-sm font-medium w-24">VIN</span>
                                        <span className="font-mono text-gray-900 text-sm">{vehicleResult.vin}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <FaMapMarkerAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Ubicación</span>
                                    <span className="text-gray-900 font-medium">{vehicleResult.location || 'N/A'}</span>
                                </div>
                                {vehicleResult.auctionDate && (
                                    <div className="flex items-center gap-3">
                                        <FaCalendarAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                        <span className="text-gray-500 text-sm font-medium w-24">Subasta</span>
                                        <span className="text-gray-900 font-medium">{vehicleResult.auctionDate}</span>
                                    </div>
                                )}
                            </div>

                            {/* Acciones */}
                            <div className="mt-6 pt-4 border-t border-blue-100 space-y-2">
                                <button
                                    onClick={handleAgregarSolicitud}
                                    disabled={guardando}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-black uppercase text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {guardando ? (
                                        <><FaSpinner className="animate-spin"/> Guardando...</>
                                    ) : (
                                        <><FaPlus/> Agregar a Mis Solicitudes</>
                                    )}
                                </button>
                                <button
                                    onClick={() => setVehicleResult(null)}
                                    disabled={guardando}
                                    className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase text-xs tracking-wide transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalle Solicitud */}
            {solicitudDetalle && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up" onClick={() => setSolicitudDetalle(null)}>
                    <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto shadow-2xl safe-area-bottom" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                            {solicitudDetalle.imageUrl ? (
                                <div className="w-full bg-gradient-to-br from-slate-900 to-slate-800 sm:rounded-t-2xl flex items-center justify-center" style={{ minHeight: '420px' }}>
                                    <img
                                        src={solicitudDetalle.imageUrl}
                                        alt=""
                                        className="w-full h-auto max-h-[72vh] object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-96 bg-gradient-to-br from-blue-600 to-indigo-800 sm:rounded-t-2xl flex items-center justify-center">
                                    <FaCar className="text-6xl text-white/60"/>
                                </div>
                            )}
                            <button onClick={() => setSolicitudDetalle(null)} className="absolute right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all z-10" style={{ top: 'max(env(safe-area-inset-top), 0.75rem)' }}>
                                <FaTimes size={14}/>
                            </button>
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold px-2.5 py-1 rounded shadow">{solicitudDetalle.source}</span>
                                {(() => {
                                    const badge = getEstadoBadge(solicitudDetalle.estado);
                                    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge.className}`}>{badge.label}</span>;
                                })()}
                            </div>
                        </div>

                        <div className="p-5 sm:p-6">
                            <p className="text-base font-bold text-gray-500 uppercase tracking-wide leading-tight">
                                {solicitudDetalle.year} {solicitudDetalle.make}
                            </p>
                            <h4 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                                {solicitudDetalle.model}
                            </h4>

                            <div className="mt-5 space-y-3.5 text-base text-gray-700">
                                <div className="flex items-center gap-3">
                                    <FaBarcode className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Lote</span>
                                    <span className="font-mono font-bold text-gray-900">{solicitudDetalle.lotNumber}</span>
                                </div>
                                {solicitudDetalle.vin && (
                                    <div className="flex items-center gap-3">
                                        <FaKey className="text-blue-500 text-sm flex-shrink-0"/>
                                        <span className="text-gray-500 text-sm font-medium w-24">VIN</span>
                                        <span className="font-mono text-gray-900 text-sm">{solicitudDetalle.vin}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <FaMapMarkerAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Ubicación</span>
                                    <span className="text-gray-900 font-medium">{solicitudDetalle.location || '-'}</span>
                                </div>
                                {solicitudDetalle.auctionDate && (
                                    <div className="flex items-center gap-3">
                                        <FaCalendarAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                        <span className="text-gray-500 text-sm font-medium w-24">Comprado</span>
                                        <span className="text-gray-900 font-medium">{solicitudDetalle.auctionDate}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <FaCalendarAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Solicitado</span>
                                    <span className="text-gray-900 font-medium">
                                        {solicitudDetalle.fechaSolicitud?.toDate?.().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) || '-'}
                                    </span>
                                </div>
                                {solicitudDetalle.fechaCompletado && (
                                    <div className="flex items-center gap-3">
                                        <FaCheckCircle className="text-emerald-500 text-sm flex-shrink-0"/>
                                        <span className="text-gray-500 text-sm font-medium w-24">Completado</span>
                                        <span className="text-emerald-700 font-bold">
                                            {solicitudDetalle.fechaCompletado?.toDate?.().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) || new Date(solicitudDetalle.fechaCompletado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalle Vehículo (entregado) */}
            {vehiculoDetalle && (() => {
                const statusOrder = ['PR', 'IN', 'TR', 'EB', 'DS', 'EN'];
                const currentIndex = statusOrder.indexOf(vehiculoDetalle.estatus);
                const InfoCard = ({ icon, label, value, mono }) => (
                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 hover:bg-blue-50/70 transition-colors">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-blue-500 text-xs">{icon}</span>
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wide">{label}</span>
                        </div>
                        <p className={`text-sm text-gray-800 ${mono ? 'font-mono font-bold' : 'font-semibold'} break-words`}>
                            {value || '-'}
                        </p>
                    </div>
                );
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up" onClick={() => setVehiculoDetalle(null)}>
                        <div className="bg-white rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto shadow-2xl safe-area-bottom" onClick={(e) => e.stopPropagation()}>
                            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 sm:rounded-t-3xl px-6 pb-8 overflow-hidden" style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}>
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="absolute -bottom-16 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="relative flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">Vehículo</p>
                                        <p className="text-blue-100 text-sm sm:text-base font-bold uppercase mt-0.5 leading-tight tracking-wide truncate">
                                            {vehiculoDetalle.marca}
                                        </p>
                                        <h3 className="text-white text-2xl sm:text-3xl font-black uppercase leading-tight tracking-tight truncate">
                                            {vehiculoDetalle.modelo}
                                        </h3>
                                        <div className="inline-flex items-center gap-1.5 mt-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-lg">
                                            <FaBarcode className="text-blue-200 text-xs"/>
                                            <span className="text-white font-mono font-bold text-sm">{vehiculoDetalle.binNip}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setVehiculoDetalle(null)} className="p-2 bg-white/15 hover:bg-white/30 rounded-full text-white transition-all flex-shrink-0">
                                        <FaTimes size={14}/>
                                    </button>
                                </div>

                                <div className="relative flex flex-wrap items-center gap-2 mt-4">
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${getVStatusColor(vehiculoDetalle.estatus)}`}>
                                        {getVStatusLabel(vehiculoDetalle.estatus)}
                                    </span>
                                </div>
                            </div>

                            {/* Pipeline */}
                            <div className="px-5 sm:px-6 py-5 border-b border-blue-100 bg-gradient-to-b from-blue-50/40 to-white">
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-4">Seguimiento</p>
                                <div className="relative">
                                    <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-blue-100 rounded-full"></div>
                                    <div
                                        className="absolute top-3.5 left-3 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: currentIndex > 0 ? `calc((100% - 1.5rem) * ${currentIndex / (statusOrder.length - 1)})` : '0%' }}
                                    ></div>
                                    <div className="relative flex items-start justify-between">
                                        {statusOrder.map((step, i) => {
                                            const isActive = i <= currentIndex;
                                            const isCurrent = step === vehiculoDetalle.estatus;
                                            const isPast = isActive && !isCurrent;
                                            return (
                                                <div key={step} className="flex flex-col items-center gap-1.5 flex-1 max-w-[60px]">
                                                    <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all ${
                                                        isCurrent
                                                            ? "bg-blue-600 text-white border-blue-300 ring-4 ring-blue-100 scale-110 shadow-md"
                                                            : isPast
                                                                ? "bg-emerald-500 text-white border-emerald-300"
                                                                : "bg-white text-gray-400 border-blue-100"
                                                    }`}>
                                                        {isPast ? <FaCheckCircle className="text-[11px]"/> : step}
                                                    </div>
                                                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase text-center leading-tight ${
                                                        isCurrent ? "text-blue-700" : isPast ? "text-emerald-700" : "text-gray-400"
                                                    }`}>
                                                        {getVStatusLabel(step)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5 sm:p-6 space-y-5">
                                <section>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="h-5 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Información del Vehículo</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <InfoCard icon={<FaBarcode/>} label="Lote" value={vehiculoDetalle.binNip} mono/>
                                        <InfoCard icon={<FaCar/>} label="Marca / Modelo" value={`${vehiculoDetalle.marca || ''} ${vehiculoDetalle.modelo || ''}`.trim()}/>
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="h-5 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Logística</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <InfoCard icon={<FaMapMarkerAlt/>} label="Origen" value={[vehiculoDetalle.ciudad, vehiculoDetalle.estado].filter(Boolean).join(', ')}/>
                                        <InfoCard icon={<FaWarehouse/>} label="Almacén" value={vehiculoDetalle.almacen}/>
                                        <InfoCard icon={<FaCalendarAlt/>} label="Fecha de Registro" value={formatVDate(vehiculoDetalle.registro?.timestamp)}/>
                                        <InfoCard icon={<FaTruck/>} label="Estatus" value={getVStatusLabel(vehiculoDetalle.estatus)}/>
                                    </div>
                                </section>

                                {(vehiculoDetalle.cliente || vehiculoDetalle.referencia) && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="h-5 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Detalles</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {vehiculoDetalle.cliente && (
                                                <InfoCard icon={<FaUser/>} label="Cliente" value={vehiculoDetalle.cliente}/>
                                            )}
                                            {vehiculoDetalle.referencia && (
                                                <InfoCard icon={<FaIdCard/>} label="Referencia" value={vehiculoDetalle.referencia}/>
                                            )}
                                        </div>
                                    </section>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={() => setVehiculoDetalle(null)}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black uppercase text-xs tracking-wide shadow-md transition-all"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Footer */}
            <footer className="mt-6 pb-4 text-center text-[10px] text-gray-400 uppercase">
                Solicitar Vehículos - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default SolicitarPage;
