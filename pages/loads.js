import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import {
    FaCar, FaUser, FaMapMarkerAlt, FaSearch,
    FaTruck, FaEye, FaTimes, FaLock,
    FaSignOutAlt, FaArrowLeft, FaChevronDown, FaChevronRight,
    FaGavel, FaBarcode, FaKey, FaCalendarAlt, FaBuilding
} from "react-icons/fa";

const LoadsPage = () => {
    const { user, loading, isAdmin, isEmpresa, isChofer, signIn, signOut } = useAuthContext();

    const [solicitudes, setSolicitudes] = useState([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
    const [filtro, setFiltro] = useState("todas");
    const [busqueda, setBusqueda] = useState("");
    const [modalDetalle, setModalDetalle] = useState(null);
    const [imagenAmpliada, setImagenAmpliada] = useState(null);
    const [actualizando, setActualizando] = useState(null);
    const [estadosAbiertos, setEstadosAbiertos] = useState({});

    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loginError, setLoginError] = useState("");

    const tieneAcceso = isAdmin || isEmpresa || isChofer;

    // Extraer estado de USA de la ubicación
    const extraerEstadoUSA = (location) => {
        if (!location) return "Sin ubicación";

        const estados = {
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

        const match = location.match(/\b([A-Z]{2})\b/);
        if (match && estados[match[1]]) {
            return estados[match[1]];
        }

        for (const [code, name] of Object.entries(estados)) {
            if (location.toLowerCase().includes(name.toLowerCase())) {
                return name;
            }
        }

        return "Otro";
    };

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
                const estadosIniciales = {};
                estadosUnicos.forEach(estado => {
                    estadosIniciales[estado] = true;
                });
                setEstadosAbiertos(estadosIniciales);
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
                setLoadingSolicitudes(false);
            });

        return () => unsubscribe();
    }, [user, tieneAcceso]);

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

    const getEstadoConfig = (estado) => {
        const config = {
            pendiente: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", label: "Pendiente" },
            aprobado: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50", label: "Aprobado" },
            en_proceso: { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50", label: "En Proceso" },
            completado: { bg: "bg-green-500", text: "text-green-600", light: "bg-green-50", label: "Completado" }
        };
        return config[estado] || config.pendiente;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const solicitudesFiltradas = solicitudes.filter(s => {
        const matchEstado = filtro === "todas" || s.estado === filtro;
        const matchBusqueda = !busqueda ||
            s.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.lotNumber?.includes(busqueda) ||
            s.make?.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.model?.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.location?.toLowerCase().includes(busqueda.toLowerCase());
        return matchEstado && matchBusqueda;
    });

    const solicitudesPorEstado = useMemo(() => {
        const grupos = {};
        solicitudesFiltradas.forEach(sol => {
            const estado = extraerEstadoUSA(sol.location);
            if (!grupos[estado]) {
                grupos[estado] = [];
            }
            grupos[estado].push(sol);
        });

        const ordenado = Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);
        return ordenado;
    }, [solicitudesFiltradas]);

    const contadores = {
        todas: solicitudes.length,
        pendiente: solicitudes.filter(s => s.estado === "pendiente").length,
        aprobado: solicitudes.filter(s => s.estado === "aprobado").length,
        en_proceso: solicitudes.filter(s => s.estado === "en_proceso").length,
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
                                    {solicitudesFiltradas.length} solicitudes en {solicitudesPorEstado.length} estados
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-white hover:bg-red-600 rounded-lg transition-colors text-sm font-medium border border-gray-300 hover:border-red-600"
                        >
                            <FaSignOutAlt /> Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-6xl">
                <div className="space-y-6">
                    {/* Filtros */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente, lote, marca, ubicación..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white"
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                                {["todas", "pendiente", "aprobado", "en_proceso", "completado"].map((estado) => {
                                    const isActive = filtro === estado;
                                    const config = estado !== "todas" ? getEstadoConfig(estado) : null;
                                    return (
                                        <button
                                            key={estado}
                                            onClick={() => setFiltro(estado)}
                                            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                                                isActive
                                                    ? "bg-red-600 text-white shadow-red-200"
                                                    : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:border-gray-400"
                                            }`}
                                        >
                                            {estado === "todas" ? "Todas" : config?.label} ({contadores[estado]})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Grid de Cards agrupadas por estado */}
                    {loadingSolicitudes ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                    ) : solicitudesFiltradas.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <FaTruck className="text-4xl text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No hay solicitudes</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {solicitudesPorEstado.map(([estadoUSA, solicitudesGrupo]) => (
                                <div key={estadoUSA} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                    {/* Header del estado */}
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

                                    {/* Cards del estado */}
                                    {estadosAbiertos[estadoUSA] && (
                                        <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 bg-gray-100">
                                            {solicitudesGrupo.map((sol) => {
                                                const estadoConfig = getEstadoConfig(sol.estado);
                                                return (
                                                    <div key={sol.id} className="bg-white border border-gray-300 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-400 transition-all shadow-sm">
                                                        {/* Imagen clickeable */}
                                                        <div
                                                            className="relative w-full h-44 bg-gradient-to-br from-gray-200 to-gray-300 cursor-pointer group"
                                                            onClick={() => sol.imageUrl && setImagenAmpliada(sol.imageUrl)}
                                                        >
                                                            {sol.imageUrl ? (
                                                                <img
                                                                    src={sol.imageUrl}
                                                                    alt={`${sol.year} ${sol.make} ${sol.model}`}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <FaCar className="text-4xl text-gray-400" />
                                                                </div>
                                                            )}
                                                            {/* Badge de estado */}
                                                            <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold text-white ${estadoConfig.bg}`}>
                                                                {estadoConfig.label}
                                                            </span>
                                                            {/* Overlay para ampliar */}
                                                            {sol.imageUrl && (
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                    <span className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 transition-opacity">
                                                                        Click para ampliar
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="p-4">
                                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="text-base font-bold text-gray-800 truncate">
                                                                        {sol.year} {sol.make} {sol.model}
                                                                    </h3>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                                                            {sol.source || 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setModalDetalle(sol)}
                                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <FaEye />
                                                                </button>
                                                            </div>

                                                            {/* Info del vehículo como en vehicle-search */}
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                                                    <FaBarcode className="text-gray-400" />
                                                                    <div>
                                                                        <p className="text-gray-400 text-[10px]">Lote</p>
                                                                        <p className="text-gray-700 font-mono font-medium">{sol.lotNumber || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                                                    <FaKey className="text-gray-400" />
                                                                    <div>
                                                                        <p className="text-gray-400 text-[10px]">Gate Pass</p>
                                                                        <p className="text-gray-700 font-mono font-medium">{sol.gatePass || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded col-span-2">
                                                                    <FaBarcode className="text-gray-400" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-gray-400 text-[10px]">VIN</p>
                                                                        <p className="text-gray-700 font-mono font-medium truncate">{sol.vin || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded col-span-2">
                                                                    <FaMapMarkerAlt className="text-gray-400" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-gray-400 text-[10px]">Location</p>
                                                                        <p className="text-gray-700 font-medium truncate">{sol.location || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded col-span-2">
                                                                    <FaGavel className="text-gray-400" />
                                                                    <div>
                                                                        <p className="text-gray-400 text-[10px]">Fecha de Subasta</p>
                                                                        <p className="text-gray-700 font-medium">{sol.auctionDate || 'No disponible'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Cliente */}
                                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                                <div className="flex items-center gap-2">
                                                                    <FaUser className="text-red-500 text-xs" />
                                                                    <span className="text-gray-700 font-medium text-sm">{sol.clienteNombre || 'Sin cliente'}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-400 mt-1">Solicitado: {formatDate(sol.fechaSolicitud)}</p>
                                                            </div>

                                                            {/* Cambiar Estado */}
                                                            {sol.estado !== "completado" && (
                                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                                    <label className="text-xs text-gray-500 font-medium mb-1.5 block">Cambiar estado:</label>
                                                                    <select
                                                                        value={sol.estado}
                                                                        onChange={(e) => cambiarEstado(sol.id, e.target.value)}
                                                                        disabled={actualizando === sol.id}
                                                                        className="w-full px-3 py-2.5 bg-gray-100 border-2 border-gray-300 rounded-lg text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 cursor-pointer hover:border-gray-400 transition-colors"
                                                                    >
                                                                        <option value="pendiente">Pendiente</option>
                                                                        <option value="aprobado">Aprobado</option>
                                                                        <option value="en_proceso">En Proceso</option>
                                                                        <option value="completado">Completado</option>
                                                                    </select>
                                                                </div>
                                                            )}
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
                                    <div className="grid grid-cols-2 gap-2">
                                        {["pendiente", "aprobado", "en_proceso", "completado"].map((estado) => {
                                            const config = getEstadoConfig(estado);
                                            const isActive = modalDetalle.estado === estado;
                                            return (
                                                <button
                                                    key={estado}
                                                    onClick={() => {
                                                        cambiarEstado(modalDetalle.id, estado);
                                                        setModalDetalle({ ...modalDetalle, estado });
                                                    }}
                                                    disabled={isActive}
                                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                                        isActive
                                                            ? `${config.bg} text-white`
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {config.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
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
