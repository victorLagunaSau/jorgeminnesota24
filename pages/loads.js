import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import {
    FaCar, FaUser, FaMapMarkerAlt, FaSearch,
    FaTruck, FaEye, FaTimes, FaLock,
    FaSignOutAlt, FaArrowLeft, FaChevronDown, FaChevronRight,
    FaGavel, FaBarcode, FaKey, FaCalendarAlt, FaBuilding,
    FaMap, FaList, FaTrash, FaCheck, FaCheckCircle
} from "react-icons/fa";

// Coordenadas centrales de cada estado de USA [lng, lat]
const STATE_COORDS = {
    'Alabama': [-86.9023, 32.3182], 'Alaska': [-153.4937, 64.2008],
    'Arizona': [-111.0937, 34.0489], 'Arkansas': [-92.3731, 34.7465],
    'California': [-119.4179, 36.7783], 'Colorado': [-105.7821, 39.5501],
    'Connecticut': [-72.7554, 41.6032], 'Delaware': [-75.5277, 38.9108],
    'Florida': [-81.5158, 27.6648], 'Georgia': [-83.6431, 32.1656],
    'Hawaii': [-155.6659, 19.8968], 'Idaho': [-114.742, 44.0682],
    'Illinois': [-89.3985, 40.6331], 'Indiana': [-86.1349, 40.2672],
    'Iowa': [-93.0977, 41.878], 'Kansas': [-98.4842, 39.0119],
    'Kentucky': [-84.270, 37.8393], 'Louisiana': [-91.9623, 30.9843],
    'Maine': [-69.4455, 45.2538], 'Maryland': [-76.6413, 39.0458],
    'Massachusetts': [-71.3824, 42.4072], 'Michigan': [-84.5361, 44.3148],
    'Minnesota': [-94.6859, 46.7296], 'Mississippi': [-89.3985, 32.3547],
    'Missouri': [-91.8318, 37.9643], 'Montana': [-110.3626, 46.8797],
    'Nebraska': [-99.9018, 41.4925], 'Nevada': [-116.4194, 38.8026],
    'New Hampshire': [-71.5724, 43.1939], 'New Jersey': [-74.4057, 40.0583],
    'New Mexico': [-105.8701, 34.5199], 'New York': [-74.2179, 43.2994],
    'North Carolina': [-79.0193, 35.7596], 'North Dakota': [-101.002, 47.5515],
    'Ohio': [-82.9071, 40.4173], 'Oklahoma': [-97.0929, 35.4676],
    'Oregon': [-120.5542, 43.8041], 'Pennsylvania': [-77.1945, 41.2033],
    'Rhode Island': [-71.4774, 41.5801], 'South Carolina': [-81.1637, 33.8361],
    'South Dakota': [-99.9018, 43.9695], 'Tennessee': [-86.5804, 35.5175],
    'Texas': [-99.9018, 31.9686], 'Utah': [-111.0937, 39.3210],
    'Vermont': [-72.5778, 44.5588], 'Virginia': [-78.6569, 37.4316],
    'Washington': [-120.7401, 47.7511], 'West Virginia': [-80.4549, 38.5976],
    'Wisconsin': [-89.6165, 43.7844], 'Wyoming': [-107.2903, 42.756],
    'Sin ubicación': [-98.5795, 39.8283], 'Otro': [-98.5795, 39.8283]
};

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

// Mapa cargado dinámicamente (SSR off — usa d3 internamente)
const MapChart = dynamic(() => import("../components/features/solicitudes/MapaUSA"), { ssr: false });

const LoadsPage = () => {
    const { user, loading, isAdmin, isEmpresa, isChofer, signIn, signOut } = useAuthContext();

    const [solicitudes, setSolicitudes] = useState([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [modalDetalle, setModalDetalle] = useState(null);
    const [imagenAmpliada, setImagenAmpliada] = useState(null);
    const [actualizando, setActualizando] = useState(null);
    const [estadosAbiertos, setEstadosAbiertos] = useState({});
    const [vista, setVista] = useState("mapa"); // "mapa", "lista" o "completados"
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mapaContainerRef = useRef(null);

    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loginError, setLoginError] = useState("");

    const tieneAcceso = isAdmin || isEmpresa || isChofer;

    // Fullscreen handler — vive en el padre para que no se pierda al re-render
    const toggleFullscreen = useCallback(() => {
        if (!mapaContainerRef.current) return;
        if (!document.fullscreenElement) {
            mapaContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    const extraerEstadoUSA = useCallback((location) => {
        if (!location) return "Sin ubicación";
        const match = location.match(/\b([A-Z]{2})\b/);
        if (match && US_STATES_MAP[match[1]]) {
            return US_STATES_MAP[match[1]];
        }
        for (const [code, name] of Object.entries(US_STATES_MAP)) {
            if (location.toLowerCase().includes(name.toLowerCase())) {
                return name;
            }
        }
        return "Otro";
    }, []);

    useEffect(() => {
        if (!user || !tieneAcceso) {
            setLoadingSolicitudes(false);
            return;
        }

        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lista.sort((a, b) => {
                    const fechaA = a.fechaSolicitud?.toDate?.() || new Date(0);
                    const fechaB = b.fechaSolicitud?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setSolicitudes(lista);
                setLoadingSolicitudes(false);

                const estadosUnicos = [...new Set(lista.map(s => extraerEstadoUSA(s.location)))];
                setEstadosAbiertos(prev => {
                    const nuevos = {};
                    estadosUnicos.forEach(estado => {
                        nuevos[estado] = prev[estado] || false;
                    });
                    return nuevos;
                });
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
                setLoadingSolicitudes(false);
            });

        return () => unsubscribe();
    }, [user, tieneAcceso]);

    const eliminarSolicitud = async (id) => {
        if (!confirm("¿Estás seguro de eliminar esta solicitud?")) return;
        try {
            await firestore().collection("solicitudesVehiculos").doc(id).delete();
            if (modalDetalle?.id === id) setModalDetalle(null);
        } catch (error) {
            console.error("Error eliminando solicitud:", error);
        }
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

    const cambiarEstado = async (id, nuevoEstado) => {
        setActualizando(id);
        try {
            await firestore().collection("solicitudesVehiculos").doc(id).update({
                estado: nuevoEstado,
                [`fecha${nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1)}`]: new Date(),
                actualizadoPor: user?.nombre || user?.username || "Usuario"
            });
        } catch (error) {
            console.error("Error actualizando estado:", error);
        } finally {
            setActualizando(null);
        }
    };

    const toggleEstado = (estado) => {
        setEstadosAbiertos(prev => ({
            ...prev,
            [estado]: !prev[estado]
        }));
    };

    const getAgeColor = (fechaSolicitud) => {
        if (!fechaSolicitud) return { bg: "bg-green-500", text: "text-green-600", border: "border-green-400", light: "bg-green-50", days: 0 };
        const date = fechaSolicitud.toDate ? fechaSolicitud.toDate() : new Date(fechaSolicitud);
        const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 7) return { bg: "bg-red-500", text: "text-red-600", border: "border-red-400", light: "bg-red-50", days };
        if (days >= 3) return { bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-400", light: "bg-amber-50", days };
        return { bg: "bg-green-500", text: "text-green-600", border: "border-green-400", light: "bg-green-50", days };
    };

    const getEstadoConfig = (estado) => {
        const config = {
            pendiente: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", label: "Pendiente" },
            completado: { bg: "bg-green-500", text: "text-green-600", light: "bg-green-50", label: "Completado" }
        };
        return config[estado] || config.pendiente;
    };

    const formatDate = (timestamp, includeTime = false) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return String(timestamp);
        const opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
        if (includeTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
        return date.toLocaleDateString("es-MX", opts);
    };

    const formatAuctionDate = (dateStr) => {
        if (!dateStr) return "Sin fecha";
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) return dateStr;
        return parsed.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    };

    const matchBusqueda = (s) => !busqueda ||
        s.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.lotNumber?.includes(busqueda) ||
        s.make?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.model?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.location?.toLowerCase().includes(busqueda.toLowerCase());

    // Pendientes: mapa y lista solo muestran pendientes
    const solicitudesFiltradas = solicitudes.filter(s => s.estado !== "completado" && matchBusqueda(s));

    // Completados: para la pestaña Completados
    const solicitudesCompletadas = solicitudes.filter(s => s.estado === "completado" && matchBusqueda(s));

    const solicitudesPorEstado = useMemo(() => {
        const grupos = {};
        solicitudesFiltradas.forEach(sol => {
            const estado = extraerEstadoUSA(sol.location);
            if (!grupos[estado]) {
                grupos[estado] = [];
            }
            grupos[estado].push(sol);
        });

        // Dentro de cada grupo, ordenar por fecha más antigua primero
        Object.values(grupos).forEach(arr => {
            arr.sort((a, b) => {
                const fechaA = a.fechaSolicitud?.toDate?.() || new Date(0);
                const fechaB = b.fechaSolicitud?.toDate?.() || new Date(0);
                return fechaA - fechaB;
            });
        });

        const ordenado = Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);
        return ordenado;
    }, [solicitudesFiltradas]);

    // Markers para el mapa
    const markers = useMemo(() => {
        const porEstado = {};
        solicitudesFiltradas.forEach(sol => {
            const estado = extraerEstadoUSA(sol.location);
            if (!porEstado[estado]) {
                porEstado[estado] = { estado, solicitudes: [], coords: STATE_COORDS[estado] || STATE_COORDS['Otro'] };
            }
            porEstado[estado].solicitudes.push(sol);
        });
        return Object.values(porEstado);
    }, [solicitudesFiltradas]);

    const contadores = {
        pendiente: solicitudes.filter(s => s.estado !== "completado").length,
        completado: solicitudes.filter(s => s.estado === "completado").length
    };

    if (loading) {
        return (
            <div className="h-screen flex justify-center items-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    // Login
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-6">
                <Head><title>Loads | Jorge Minnesota</title></Head>
                <div className="w-full max-w-sm">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <FaTruck className="text-white text-2xl" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800">Loads</h1>
                            <p className="text-gray-500 text-sm mt-1">Gestión de solicitudes</p>
                        </div>
                        {loginError && (
                            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-4">
                                <p className="text-red-600 text-sm text-center font-medium">{loginError}</p>
                            </div>
                        )}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
                            >
                                Entrar
                            </button>
                        </form>
                    </div>
                    <div className="mt-6 text-center">
                        <Link href="/">
                            <a className="text-gray-600 text-sm hover:text-red-600 transition-colors font-medium">← Volver al inicio</a>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Sin acceso
    if (!tieneAcceso) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
                <Head><title>Sin Acceso | Jorge Minnesota</title></Head>
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <FaLock className="text-4xl text-gray-300 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h1>
                    <p className="text-gray-500 mb-6">No tienes permisos para acceder.</p>
                    <button onClick={() => signOut()} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    // Main
    return (
        <div className="min-h-screen bg-gray-50">
            <Head><title>Loads | Jorge Minnesota</title></Head>

            {/* Header fijo */}
            <header className="sticky top-0 z-40 bg-white border-b-2 border-gray-200 shadow-md">
                <div className="container mx-auto px-4 py-4 max-w-6xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <a className="p-2.5 text-gray-500 hover:text-white hover:bg-red-600 rounded-lg transition-colors border border-gray-300 hover:border-red-600">
                                    <FaArrowLeft className="h-4 w-4" />
                                </a>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">
                                    Solicitudes de Vehículos
                                </h1>
                                <p className="text-gray-500 text-xs">
                                    {contadores.pendiente} pendientes · {contadores.completado} completados
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Toggle vista */}
                            <div className="flex bg-gray-100 rounded-lg border border-gray-300 p-0.5">
                                <button
                                    onClick={() => setVista("mapa")}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                                        vista === "mapa"
                                            ? "bg-red-600 text-white shadow-sm"
                                            : "text-gray-600 hover:text-gray-800"
                                    }`}
                                >
                                    <FaMap /> Mapa
                                </button>
                                <button
                                    onClick={() => setVista("lista")}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                                        vista === "lista"
                                            ? "bg-red-600 text-white shadow-sm"
                                            : "text-gray-600 hover:text-gray-800"
                                    }`}
                                >
                                    <FaList /> Lista
                                </button>
                                <button
                                    onClick={() => setVista("completados")}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                                        vista === "completados"
                                            ? "bg-green-600 text-white shadow-sm"
                                            : "text-gray-600 hover:text-gray-800"
                                    }`}
                                >
                                    <FaCheckCircle /> Completados
                                    {contadores.completado > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                            vista === "completados" ? "bg-green-500" : "bg-gray-300 text-gray-600"
                                        }`}>
                                            {contadores.completado}
                                        </span>
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-white hover:bg-red-600 rounded-lg transition-colors text-sm font-medium border border-gray-300 hover:border-red-600"
                            >
                                <FaSignOutAlt /> <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-6xl">
                <div className="space-y-6">
                    {/* Búsqueda */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar por cliente, lote, marca, ubicación..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Contenido */}
                    {loadingSolicitudes ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                    ) : vista === "completados" ? (
                        /* ========== VISTA COMPLETADOS ========== */
                        solicitudesCompletadas.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                <FaCheckCircle className="text-4xl text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No hay solicitudes completadas</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {solicitudesCompletadas.map((sol) => (
                                    <div key={sol.id} className="bg-white border border-gray-300 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-400 transition-all shadow-sm">
                                        <div
                                            className="relative w-full h-44 bg-gradient-to-br from-gray-200 to-gray-300 cursor-pointer group"
                                            onClick={() => sol.imageUrl && setImagenAmpliada(sol.imageUrl)}
                                        >
                                            {sol.imageUrl ? (
                                                <img src={sol.imageUrl} alt={`${sol.year} ${sol.make} ${sol.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><FaCar className="text-4xl text-gray-400" /></div>
                                            )}
                                            <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold text-white bg-green-500">Completado</span>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-bold text-gray-800 truncate">{sol.year} {sol.make} {sol.model}</h3>
                                                    <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded">{sol.source || 'N/A'}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setModalDetalle(sol)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaEye /></button>
                                                    <button onClick={() => eliminarSolicitud(sol.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaTrash size={13} /></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                                    <FaBarcode className="text-gray-400" />
                                                    <div><p className="text-gray-400 text-[10px]">Lote</p><p className="text-gray-700 font-mono font-medium">{sol.lotNumber || 'N/A'}</p></div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                                    <FaUser className="text-gray-400" />
                                                    <div><p className="text-gray-400 text-[10px]">Cliente</p><p className="text-gray-700 font-medium truncate">{sol.clienteNombre || 'N/A'}</p></div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded col-span-2">
                                                    <FaMapMarkerAlt className="text-gray-400" />
                                                    <div className="flex-1 min-w-0"><p className="text-gray-400 text-[10px]">Location</p><p className="text-gray-700 font-medium truncate">{sol.location || 'N/A'}</p></div>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-xs text-gray-400">Completado: {formatDate(sol.fechaCompletado)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : solicitudesFiltradas.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <FaTruck className="text-4xl text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No hay solicitudes pendientes</p>
                        </div>
                    ) : vista === "mapa" ? (
                        /* ========== VISTA MAPA ========== */
                        <div ref={mapaContainerRef} className="rounded-xl shadow-md border overflow-hidden bg-gray-900 border-gray-700">
                            <MapChart
                                solicitudes={solicitudesFiltradas}
                                onSelectSolicitud={(sol) => setModalDetalle(sol)}
                                getEstadoConfig={getEstadoConfig}
                                formatDate={formatDate}
                                isFullscreen={isFullscreen}
                                toggleFullscreen={toggleFullscreen}
                            />
                        </div>
                    ) : (
                        /* ========== VISTA LISTA ========== */
                        <div className="space-y-4">
                            {solicitudesPorEstado.map(([estadoUSA, solicitudesGrupo]) => (
                                <div key={estadoUSA} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                    <button
                                        onClick={() => toggleEstado(estadoUSA)}
                                        className="w-full px-4 py-4 flex items-center justify-between bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center shadow-sm">
                                                <FaMapMarkerAlt className="text-white text-sm" />
                                            </div>
                                            <span className="text-gray-800 font-bold text-lg">{estadoUSA}</span>
                                            <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full">
                                                {solicitudesGrupo.length} {solicitudesGrupo.length === 1 ? 'vehículo' : 'vehículos'}
                                            </span>
                                        </div>
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200">
                                            {estadosAbiertos[estadoUSA] ? (
                                                <FaChevronDown className="text-gray-500" />
                                            ) : (
                                                <FaChevronRight className="text-gray-500" />
                                            )}
                                        </div>
                                    </button>

                                    {estadosAbiertos[estadoUSA] && (
                                        <div className="divide-y divide-gray-100">
                                            {solicitudesGrupo.map((sol) => {
                                                const age = getAgeColor(sol.fechaSolicitud);
                                                return (
                                                    <div key={sol.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 ${age.border}`}>
                                                        {/* Indicador de color + imagen */}
                                                        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                                                            {sol.imageUrl ? (
                                                                <img src={sol.imageUrl} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setImagenAmpliada(sol.imageUrl)} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center"><FaCar className="text-gray-400" /></div>
                                                            )}
                                                        </div>

                                                        {/* Info principal */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-gray-400 font-bold mb-0.5 flex items-center gap-1">
                                                                Cliente: <FaUser className="text-[10px]" /> {(sol.clienteNombre || 'Sin cliente').replace(/\b\w/g, c => c.toUpperCase())}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm font-bold text-gray-800 truncate">{sol.year} {sol.make} {sol.model}</h3>
                                                                <span className="bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0">{sol.source || 'N/A'}</span>
                                                                <span className={`${age.bg} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0`}>{age.days}d</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <FaBarcode className="text-gray-400 text-[10px]" />
                                                                    <span className="font-mono">{sol.lotNumber || 'N/A'}</span>
                                                                </span>
                                                                <span className="flex items-center gap-1 truncate">
                                                                    <FaMapMarkerAlt className="text-gray-400 text-[10px] flex-shrink-0" />
                                                                    <span className="truncate">{sol.location || 'N/A'}</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <FaGavel className="text-[10px]" />
                                                                    Comprado: {formatAuctionDate(sol.auctionDate)}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <FaCalendarAlt className="text-[10px]" />
                                                                    Ordenado: {formatDate(sol.fechaSolicitud, true)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Acciones */}
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                onClick={() => cambiarEstado(sol.id, "completado")}
                                                                disabled={actualizando === sol.id}
                                                                className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Completar"
                                                            >
                                                                {actualizando === sol.id ? (
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                                                ) : (
                                                                    <FaCheck size={14} />
                                                                )}
                                                            </button>
                                                            <button onClick={() => setModalDetalle(sol)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Ver detalle">
                                                                <FaEye size={14} />
                                                            </button>
                                                            <button onClick={() => eliminarSolicitud(sol.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                                <FaTrash size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Detalle */}
            {modalDetalle && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalDetalle(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">Detalle de Solicitud</h3>
                            <button onClick={() => setModalDetalle(null)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {modalDetalle.imageUrl ? (
                                <img
                                    src={modalDetalle.imageUrl}
                                    alt=""
                                    className="w-full h-52 object-contain bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl cursor-pointer"
                                    onClick={() => setImagenAmpliada(modalDetalle.imageUrl)}
                                />
                            ) : (
                                <div className="w-full h-52 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                                    <FaCar className="text-4xl text-gray-400" />
                                </div>
                            )}

                            <div>
                                <h4 className="text-xl font-bold text-gray-800">
                                    {modalDetalle.year} {modalDetalle.make} {modalDetalle.model}
                                </h4>
                                <span className="inline-block bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded mt-1">
                                    {modalDetalle.source}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <FaBarcode className="text-xs" />
                                        <span className="text-xs">Lote</span>
                                    </div>
                                    <p className="text-gray-800 font-mono font-bold">{modalDetalle.lotNumber}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <FaKey className="text-xs" />
                                        <span className="text-xs">Gate Pass</span>
                                    </div>
                                    <p className="text-gray-800 font-mono font-bold">{modalDetalle.gatePass || 'N/A'}</p>
                                </div>
                                <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <FaBarcode className="text-xs" />
                                        <span className="text-xs">VIN</span>
                                    </div>
                                    <p className="text-gray-800 font-mono text-sm">{modalDetalle.vin || 'N/A'}</p>
                                </div>
                                <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <FaMapMarkerAlt className="text-xs" />
                                        <span className="text-xs">Location</span>
                                    </div>
                                    <p className="text-gray-800 font-medium">{modalDetalle.location || 'N/A'}</p>
                                </div>
                                <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <FaGavel className="text-xs" />
                                        <span className="text-xs">Fecha de Subasta</span>
                                    </div>
                                    <p className="text-gray-800 font-medium">{modalDetalle.auctionDate || 'No disponible'}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <FaUser className="text-red-500 text-sm" />
                                    <span className="text-xs text-gray-500">Cliente</span>
                                </div>
                                <p className="text-gray-800 font-semibold">{modalDetalle.clienteNombre}</p>
                                <p className="text-xs text-gray-400 mt-1">Solicitado: {formatDate(modalDetalle.fechaSolicitud)}</p>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-gray-500">Estado actual</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getEstadoConfig(modalDetalle.estado).bg}`}>
                                        {getEstadoConfig(modalDetalle.estado).label}
                                    </span>
                                </div>

                                {modalDetalle.estado !== "completado" && (
                                    <button
                                        onClick={() => {
                                            cambiarEstado(modalDetalle.id, "completado");
                                            setModalDetalle({ ...modalDetalle, estado: "completado" });
                                        }}
                                        className="w-full py-2.5 bg-green-600 text-white font-medium text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaCheck size={12} /> Marcar como completado
                                    </button>
                                )}
                            </div>

                            {/* Botón eliminar en modal */}
                            <div className="pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => eliminarSolicitud(modalDetalle.id)}
                                    className="w-full py-2.5 bg-red-50 text-red-600 font-medium text-sm rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FaTrash size={12} /> Eliminar solicitud
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox para imagen ampliada */}
            {imagenAmpliada && (
                <div
                    className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setImagenAmpliada(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={() => setImagenAmpliada(null)}
                    >
                        <FaTimes size={20} />
                    </button>
                    <img
                        src={imagenAmpliada}
                        alt="Imagen ampliada"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default LoadsPage;
