import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import { COLLECTIONS, SOLICITUD_STATUS } from "../constants";
import {
    FaUser, FaLock, FaSignOutAlt, FaCar, FaSearch, FaPlus,
    FaMapMarkerAlt, FaCalendarAlt, FaKey, FaBarcode, FaSpinner,
    FaClock, FaArrowLeft, FaCheckCircle, FaTruck, FaTimes, FaIdCard
} from "react-icons/fa";

// Mapa de abreviaturas de estado de EE.UU. (para estimar flete desde la ubicación de la subasta)
const US_STATES_MAP = {
    'TX': 'Texas', 'CA': 'California', 'FL': 'Florida', 'AZ': 'Arizona',
    'NV': 'Nevada', 'GA': 'Georgia', 'NC': 'North Carolina', 'SC': 'South Carolina',
    'TN': 'Tennessee', 'AL': 'Alabama', 'LA': 'Louisiana', 'MS': 'Mississippi',
    'OK': 'Oklahoma', 'AR': 'Arkansas', 'NM': 'New Mexico', 'CO': 'Colorado',
    'IL': 'Illinois', 'OH': 'Ohio', 'PA': 'Pennsylvania', 'NY': 'New York',
    'NJ': 'New Jersey', 'MI': 'Michigan', 'IN': 'Indiana', 'WI': 'Wisconsin',
    'MN': 'Minnesota', 'IA': 'Iowa', 'MO': 'Missouri', 'KS': 'Kansas',
    'NE': 'Nebraska', 'SD': 'South Dakota', 'ND': 'North Dakota', 'MT': 'Montana',
    'WY': 'Wyoming', 'UT': 'Utah', 'ID': 'Idaho', 'WA': 'Washington',
    'OR': 'Oregon', 'VA': 'Virginia', 'WV': 'West Virginia', 'KY': 'Kentucky',
    'MD': 'Maryland', 'DE': 'Delaware', 'CT': 'Connecticut', 'RI': 'Rhode Island',
    'MA': 'Massachusetts', 'VT': 'Vermont', 'NH': 'New Hampshire', 'ME': 'Maine',
    'HI': 'Hawaii', 'AK': 'Alaska'
};

const extraerEstado = (location) => {
    if (!location) return "";
    const match = location.match(/\b([A-Z]{2})\b/);
    if (match && US_STATES_MAP[match[1]]) return US_STATES_MAP[match[1]];
    for (const [, name] of Object.entries(US_STATES_MAP)) {
        if (location.toLowerCase().includes(name.toLowerCase())) return name;
    }
    return "";
};

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

    // Provincias (para estimar el flete al cliente según la ubicación de la subasta)
    const [provincias, setProvincias] = useState([]);

    // Solicitudes activas — solo para evitar duplicados y mostrar el contador.
    // La lista/historial se ven en /client; aquí solo se crean.
    const [solicitudes, setSolicitudes] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [pidiendoTitulo, setPidiendoTitulo] = useState(false); // muestra el modal "¿recogerá el título?" antes de postear
    const [exito, setExito] = useState(null); // mensaje de confirmación tras agregar

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

    // Cargar solicitudes activas del cliente (para dedup y contador)
    useEffect(() => {
        const clienteId = user?.datosCliente?.id || user?.id;
        if (!clienteId) return;

        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .where("clienteId", "==", clienteId)
            .onSnapshot((snap) => {
                const lista = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(s => s.estado !== SOLICITUD_STATUS.COMPLETADO);
                setSolicitudes(lista);
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
            });

        return () => unsubscribe();
    }, [user]);

    // Cargar provincias una vez (para estimar el flete al cliente)
    useEffect(() => {
        if (!user) return;
        firestore()
            .collection(COLLECTIONS.PROVINCE)
            .get()
            .then((snap) => setProvincias(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            .catch((err) => console.error("Error cargando provincias:", err));
    }, [user]);

    // Estima el flete (precio al cliente) según la ubicación de la subasta del vehículo escaneado.
    // Devuelve null si no hay match — en ese caso mostramos "Se confirma al procesar".
    const calcularFleteEstimado = (location) => {
        if (!location || provincias.length === 0) return null;
        const estado = extraerEstado(location);
        if (!estado) return null;
        const prov = provincias.find(p => p.state === estado);
        if (!prov || !prov.regions?.length) return null;
        const loc = location.toLowerCase();
        const region = prov.regions.find(r => r.city && loc.includes(r.city.toLowerCase())) || prov.regions[0];
        const precio = parseFloat(region.precioPagina || region.price || 0);
        if (!precio) return null;
        return { estado, ciudad: region.city, precio };
    };

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
        setExito(null);

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

    // Limpia y recorta un campo de texto que viene del scraper antes de guardarlo
    const limpiarCampo = (valor, maxLen = 100) =>
        (valor === undefined || valor === null ? "" : String(valor)).trim().slice(0, maxLen);

    // titulo: "SI" | "NO" — si el transportista debe recoger el título del vehículo
    const handleAgregarSolicitud = async (titulo) => {
        if (!vehicleResult) {
            alert("No hay vehículo seleccionado");
            return;
        }

        if (!user) {
            alert("Error: Debes iniciar sesión");
            return;
        }

        // Validar que el scraper devolvió al menos el dato esencial (lote)
        const lote = limpiarCampo(vehicleResult.lotNumber, 20);
        if (!lote) {
            alert("Los datos del vehículo están incompletos. Vuelve a buscarlo.");
            return;
        }

        // Evitar solicitudes duplicadas del mismo lote (entre las activas del cliente)
        const yaSolicitado = solicitudes.some(
            (s) => limpiarCampo(s.lotNumber, 20) === lote
        );
        if (yaSolicitado) {
            alert(`Ya tienes una solicitud activa para el lote ${lote}.`);
            setVehicleResult(null);
            setPidiendoTitulo(false);
            return;
        }

        const clienteId = user.datosCliente?.id || user.id;

        setGuardando(true);
        try {
            await firestore().collection("solicitudesVehiculos").add({
                clienteId: clienteId,
                clienteNombre: (user.datosCliente.cliente || user.username || "").toUpperCase().trim(),
                clienteTelefono: user.datosCliente.telefonoCliente || "",
                // Datos del vehículo (sanitizados)
                lotNumber: lote,
                gatePass: limpiarCampo(vehicleResult.gatePass, 20),
                // ¿El transportista debe recoger el título? — se propaga al campo `titulo` del vehículo
                titulo: titulo === "SI" ? "SI" : "NO",
                make: limpiarCampo(vehicleResult.make),
                model: limpiarCampo(vehicleResult.model),
                year: limpiarCampo(vehicleResult.year, 10),
                vin: limpiarCampo(vehicleResult.vin, 30),
                location: limpiarCampo(vehicleResult.location, 150),
                imageUrl: limpiarCampo(vehicleResult.imageUrl, 1000),
                source: limpiarCampo(vehicleResult.source, 50),
                auctionDate: limpiarCampo(vehicleResult.auctionDate, 50),
                // Metadatos
                estado: SOLICITUD_STATUS.PENDIENTE,
                fechaSolicitud: new Date(),
                notas: ""
            });

            // Confirmación + limpiar búsqueda
            setExito({
                titulo: `${limpiarCampo(vehicleResult.year, 10)} ${limpiarCampo(vehicleResult.make)} ${limpiarCampo(vehicleResult.model)}`.trim(),
                lote
            });
            setVehicleResult(null);
            setPidiendoTitulo(false);
            setLotNumber("");
            setGatePass("");

        } catch (error) {
            console.error("Error guardando solicitud:", error);
            alert("Error al guardar la solicitud: " + error.message);
        } finally {
            setGuardando(false);
        }
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
                    <Link href="/client">
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
                        <Link href="/client">
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
                    <Link href="/client">
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
                    <Link href="/client">
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
                <div className="flex justify-between items-center gap-2 max-w-xl mx-auto">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaUser className="text-blue-600 text-[10px]"/>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-xs text-gray-800 truncate">{clienteData.cliente || user.username}</p>
                            <p className="text-[9px] text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                    <Link href="/client">
                        <a className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 px-2 py-1 rounded-lg text-center flex-shrink-0 shadow-sm hover:from-blue-100 hover:to-indigo-100 transition-colors">
                            <span className="text-[8px] text-blue-600 font-bold uppercase">Solicitudes</span>
                            <p className="text-base font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent leading-tight tabular-nums">{solicitudes.length}</p>
                        </a>
                    </Link>
                </div>
            </section>

            <main className="px-4 py-6">
                <div className="max-w-xl mx-auto space-y-4">

                    {/* Confirmación de solicitud agregada */}
                    {exito && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up">
                            <FaCheckCircle className="text-emerald-500 text-xl flex-shrink-0 mt-0.5"/>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-emerald-800 uppercase leading-tight">Solicitud agregada</p>
                                <p className="text-xs text-emerald-700 mt-0.5 truncate">{exito.titulo} — Lote {exito.lote}</p>
                                <Link href="/client">
                                    <a className="inline-block mt-2 text-[11px] font-bold text-blue-600 underline">Ver en Mis Vehículos →</a>
                                </Link>
                            </div>
                            <button onClick={() => setExito(null)} className="text-emerald-400 hover:text-emerald-600 flex-shrink-0">
                                <FaTimes size={14}/>
                            </button>
                        </div>
                    )}

                    {/* Panel de Búsqueda */}
                    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5">
                        <h2 className="text-base font-black uppercase text-gray-800 mb-1 flex items-center gap-2">
                            <FaSearch className="text-blue-600 text-sm"/> Buscar Vehículo
                        </h2>
                        <p className="text-xs text-gray-400 mb-4">Ingresa el lote y el gate pass de la subasta.</p>
                        <form onSubmit={handleSearch} className="space-y-3">
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
                                        className="input input-bordered w-full bg-white text-black border-blue-100 focus:border-blue-400"
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
                                        className="input input-bordered w-full bg-white text-black uppercase border-blue-100 focus:border-blue-400"
                                        disabled={searching}
                                        maxLength={5}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={searching || !lotNumber.trim() || gatePass.length < 4}
                                className="btn w-full text-white font-bold border-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
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

                    {/* Nota: la lista de solicitudes y el historial viven en /client */}
                    <p className="text-center text-[11px] text-gray-400">
                        Tus solicitudes y su estatus aparecen en{" "}
                        <Link href="/client"><a className="text-blue-600 font-bold underline">Mis Vehículos</a></Link>.
                    </p>
                </div>
            </main>

            {/* Modal Preview de Búsqueda */}
            {vehicleResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up" onClick={() => setVehicleResult(null)}>
                    <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto shadow-2xl safe-area-bottom flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Imagen */}
                        <div className="relative flex-shrink-0">
                            {vehicleResult.imageUrl ? (
                                <div className="w-full bg-slate-900 sm:rounded-t-2xl flex items-center justify-center">
                                    <img
                                        src={vehicleResult.imageUrl}
                                        alt={`${vehicleResult.year} ${vehicleResult.make} ${vehicleResult.model}`}
                                        className="w-full h-auto max-h-[55vh] object-contain"
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
                        </div>

                        {/* Info */}
                        <div className="p-5 sm:p-6 flex-1 flex flex-col">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Vehículo Encontrado</p>
                            <p className="text-base font-bold text-gray-500 uppercase tracking-wide leading-tight">
                                {vehicleResult.year} {vehicleResult.make}
                            </p>
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                                    {vehicleResult.model}
                                </h3>
                                {vehicleResult.source && (
                                    <span className="flex-shrink-0 mt-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-base font-black uppercase px-3 py-1.5 rounded-lg shadow">
                                        {vehicleResult.source}
                                    </span>
                                )}
                            </div>

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
                                {/* Costo del flete — campo "Cobro ($)" (precioPagina) de Estados y precios */}
                                {(() => {
                                    const est = calcularFleteEstimado(vehicleResult.location);
                                    return (
                                        <div className="flex items-center gap-3">
                                            <FaTruck className="text-emerald-600 text-base flex-shrink-0"/>
                                            <span className="text-emerald-700 text-sm font-bold w-24">Costo Flete</span>
                                            {est ? (
                                                <span className="text-emerald-700 font-black text-xl tabular-nums">
                                                    ${est.precio.toLocaleString('en-US')}<span className="text-xs font-bold ml-1">USD</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 font-medium text-sm">Se confirma al procesar</span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Acciones */}
                            <div className="mt-6 pt-4 border-t border-blue-100 space-y-2">
                                <button
                                    onClick={() => setPidiendoTitulo(true)}
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

            {/* Modal pregunta de título — aparece sobre el resultado antes de postear */}
            {vehicleResult && pidiendoTitulo && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-fade-in-up"
                    onClick={() => { if (!guardando) setPidiendoTitulo(false); }}
                >
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center safe-area-bottom" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <FaIdCard className="text-2xl text-indigo-600"/>
                        </div>
                        <h3 className="text-lg font-black uppercase text-gray-800 leading-tight">
                            ¿El transportista recogerá el título?
                        </h3>
                        <p className="text-xs text-gray-500 mt-2 mb-6">
                            Indícanos si este vehículo lleva título para que el transportista lo recoja.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleAgregarSolicitud("SI")}
                                disabled={guardando}
                                className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 text-white font-black uppercase text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {guardando ? <FaSpinner className="animate-spin"/> : "Sí"}
                            </button>
                            <button
                                onClick={() => handleAgregarSolicitud("NO")}
                                disabled={guardando}
                                className="py-3 rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 disabled:opacity-60 text-white font-black uppercase text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {guardando ? <FaSpinner className="animate-spin"/> : "No"}
                            </button>
                        </div>
                        <button
                            onClick={() => setPidiendoTitulo(false)}
                            disabled={guardando}
                            className="mt-3 text-xs text-gray-400 font-bold uppercase hover:text-gray-600 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="mt-6 pb-4 text-center text-[10px] text-gray-400 uppercase">
                Solicitar Vehículos - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default SolicitarPage;
