import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import {
    FaUser, FaLock, FaSignOutAlt, FaCar, FaSearch, FaPlus, FaTrash,
    FaMapMarkerAlt, FaCalendarAlt, FaKey, FaBarcode, FaSpinner,
    FaClock, FaArrowLeft, FaCheckCircle
} from "react-icons/fa";

const SolicitarPage = () => {
    const { user, loading, isCliente, signIn, signOut } = useAuthContext();

    // Estados para búsqueda
    const [lotNumber, setLotNumber] = useState("");
    const [gatePass, setGatePass] = useState("");
    const [searching, setSearching] = useState(false);
    const [vehicleResult, setVehicleResult] = useState(null);
    const [searchError, setSearchError] = useState("");

    // Estados para lista de solicitudes
    const [solicitudes, setSolicitudes] = useState([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
    const [guardando, setGuardando] = useState(false);

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
                setSolicitudes(lista);
                setLoadingSolicitudes(false);
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
                setLoadingSolicitudes(false);
            });

        return () => unsubscribe();
    }, [user]);

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

    const handleEliminarSolicitud = async (id) => {
        if (!confirm("¿Estás seguro de eliminar esta solicitud?")) return;

        try {
            await firestore().collection("solicitudesVehiculos").doc(id).delete();
        } catch (error) {
            console.error("Error eliminando:", error);
        }
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            pendiente: "bg-yellow-100 text-yellow-800",
            aprobado: "bg-blue-100 text-blue-800",
            asignado: "bg-indigo-100 text-indigo-800",
            en_proceso: "bg-purple-100 text-purple-800",
            completado: "bg-green-100 text-green-800"
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
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Cuenta en Revisión | Jorge Minnesota</title></Head>
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
                    <FaClock className="text-4xl text-amber-500 mx-auto mb-3"/>
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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Solicitar Vehículos | Jorge Minnesota</title></Head>
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
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
                        <button type="submit" className="btn btn-primary w-full text-white font-black uppercase shadow-lg">
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
        <div className="min-h-screen bg-gray-50 pb-10 safe-area-bottom font-sans text-black overflow-x-hidden">
            <Head><title>Solicitar Vehículos | Jorge Minnesota</title></Head>

            {/* Pull-to-refresh indicator */}
            {refreshing && (
                <div className="ptr-spinner">
                    <div className="ptr-icon"></div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white safe-area-top border-b border-gray-200 sticky top-0 z-[60] shadow-sm">
                <div className="flex justify-between items-center px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Link href="/clients">
                            <a className="text-blue-600 p-1 flex-shrink-0">
                                <FaArrowLeft className="text-base"/>
                            </a>
                        </Link>
                        <img src="/assets/Logo.png" className="w-7 h-auto flex-shrink-0" alt="Logo"/>
                        <div className="min-w-0">
                            <h1 className="text-xs font-black uppercase italic text-black leading-none tracking-tighter truncate">
                                Solicitar Vehículos
                            </h1>
                            <p className="text-[8px] text-gray-400 truncate">Busca y solicita vehículos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Link href="/clients">
                            <a className="flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase border border-blue-200 px-2 py-1 rounded-lg bg-blue-50">
                                <FaCar className="text-xs"/>
                            </a>
                        </Link>
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-1 text-[9px] font-bold text-red-600 uppercase border border-red-200 px-2 py-1 rounded-lg bg-red-50"
                        >
                            <FaSignOutAlt className="text-xs"/>
                        </button>
                    </div>
                </div>
            </header>

            {/* User Info */}
            <section className="bg-white px-3 py-2 border-b border-gray-200">
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
                    <div className="bg-orange-50 px-2 py-1 rounded-lg text-center flex-shrink-0">
                        <span className="text-[8px] text-orange-600 font-bold uppercase">Solicitudes</span>
                        <p className="text-base font-black text-orange-700 leading-tight">{solicitudes.length}</p>
                    </div>
                </div>
            </section>

            <main className="px-3 py-3">
                <div className="grid gap-3 lg:grid-cols-2">

                    {/* Panel de Búsqueda */}
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
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
                                            className="input input-bordered input-sm w-full bg-white text-black"
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
                                            className="input input-bordered input-sm w-full bg-white text-black uppercase"
                                            disabled={searching}
                                            maxLength={5}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={searching || !lotNumber.trim() || gatePass.length < 4}
                                    className="btn btn-primary btn-sm w-full text-white font-bold"
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
                                <div className="mt-4 flex flex-col items-center gap-3 py-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"></div>
                                        <FaSearch className="absolute inset-0 m-auto text-blue-600 text-sm" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">Buscando en subastas...</p>
                                    <p className="text-[10px] text-gray-400">Esto puede tomar unos segundos</p>
                                </div>
                            )}

                            {searchError && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {searchError}
                                </div>
                            )}
                        </div>

                        {/* Resultado de búsqueda */}
                        {vehicleResult && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {vehicleResult.imageUrl && (
                                    <div className="relative w-full h-40 bg-gray-100">
                                        <img
                                            src={vehicleResult.imageUrl}
                                            alt={`${vehicleResult.year} ${vehicleResult.make} ${vehicleResult.model}`}
                                            className="w-full h-full object-contain"
                                        />
                                        <span className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold">
                                            {vehicleResult.source}
                                        </span>
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="text-xl font-black text-gray-800 uppercase">
                                        {vehicleResult.year} {vehicleResult.make} {vehicleResult.model}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">Lote: {vehicleResult.lotNumber}</p>

                                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                        <div className="flex items-start gap-2">
                                            <FaBarcode className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">VIN</p>
                                                <p className="font-mono text-xs">{vehicleResult.vin || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FaMapMarkerAlt className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">Ubicación</p>
                                                <p className="text-xs">{vehicleResult.location || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FaKey className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">Gate Pass</p>
                                                <p className="font-mono text-xs">{vehicleResult.gatePass}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FaCalendarAlt className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">Subasta</p>
                                                <p className="text-xs">{vehicleResult.auctionDate || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAgregarSolicitud}
                                        disabled={guardando}
                                        className="btn btn-success w-full text-white font-bold"
                                    >
                                        {guardando ? (
                                            <><FaSpinner className="animate-spin mr-2"/> Guardando...</>
                                        ) : (
                                            <><FaPlus className="mr-2"/> Agregar a Mis Solicitudes</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel de Solicitudes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                        <h2 className="text-sm font-black uppercase text-gray-800 mb-2 flex items-center gap-2">
                            <FaClock className="text-orange-600 text-xs"/> Mis Solicitudes
                        </h2>

                        {loadingSolicitudes ? (
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
                                        <div key={sol.id} className="border border-gray-100 rounded-lg p-2">
                                            <div className="flex gap-2 items-start">
                                                {sol.imageUrl && (
                                                    <img
                                                        src={sol.imageUrl}
                                                        alt={`${sol.year} ${sol.make}`}
                                                        className="w-14 h-12 object-cover rounded bg-gray-100 flex-shrink-0"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-1">
                                                        <p className="font-bold text-xs text-gray-800 uppercase truncate">
                                                            {sol.year} {sol.make} {sol.model}
                                                        </p>
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase flex-shrink-0 ${badge.className}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-500">
                                                        Lote: {sol.lotNumber} • {sol.source}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-400">
                                                        <span className="flex items-center gap-0.5 truncate">
                                                            <FaMapMarkerAlt className="flex-shrink-0"/> {sol.location || 'N/A'}
                                                        </span>
                                                        <span className="flex items-center gap-0.5 flex-shrink-0">
                                                            <FaCalendarAlt/> {sol.fechaSolicitud?.toDate?.().toLocaleDateString('es-MX') || 'N/A'}
                                                        </span>
                                                    </div>
                                                    {sol.estado === "completado" && sol.fechaCompletado && (
                                                        <p className="text-[9px] text-green-600 font-bold mt-1">
                                                            <FaCheckCircle className="inline mr-0.5 text-[8px]"/>
                                                            Completado: {sol.fechaCompletado.toDate ? sol.fechaCompletado.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(sol.fechaCompletado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                                {sol.estado === "pendiente" && (
                                                    <button
                                                        onClick={() => handleEliminarSolicitud(sol.id)}
                                                        className="text-red-400 p-1 flex-shrink-0"
                                                    >
                                                        <FaTrash className="text-xs"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-6 pb-4 text-center text-[10px] text-gray-400 uppercase">
                Solicitar Vehículos - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default SolicitarPage;
