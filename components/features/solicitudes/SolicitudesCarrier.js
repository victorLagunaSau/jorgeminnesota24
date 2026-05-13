import React, { useState, useEffect, useMemo, useCallback } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import {
    FaCar, FaUser, FaMapMarkerAlt, FaSearch,
    FaTruck, FaEye, FaTimes, FaChevronDown, FaChevronRight,
    FaGavel, FaBarcode, FaCalendarAlt, FaCheck, FaCheckCircle, FaPlus, FaTrash, FaIdCard
} from "react-icons/fa";

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

const SolicitudesCarrier = ({ user, onCrearViaje, estadosAutorizados }) => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [modalDetalle, setModalDetalle] = useState(null);
    const [imagenAmpliada, setImagenAmpliada] = useState(null);
    const [actualizando, setActualizando] = useState(null);
    const [estadosAbiertos, setEstadosAbiertos] = useState({});
    const [tab, setTab] = useState("pendientes"); // "pendientes", "asignados", "completados"
    const [seleccionados, setSeleccionados] = useState(new Set());

    const extraerEstadoUSA = useCallback((location) => {
        if (!location) return "Sin ubicación";
        const match = location.match(/\b([A-Z]{2})\b/);
        if (match && US_STATES_MAP[match[1]]) return US_STATES_MAP[match[1]];
        for (const [, name] of Object.entries(US_STATES_MAP)) {
            if (location.toLowerCase().includes(name.toLowerCase())) return name;
        }
        return "Otro";
    }, []);

    // Auto-completar solicitudes cuyo lote ya existe en la colección vehiculos
    const autoCompletarPorVehiculos = useCallback(async (lista) => {
        const noCompletadas = lista.filter(s =>
            s.estado !== "completado" && s.lotNumber
        );
        if (noCompletadas.length === 0) return;

        // Firestore "in" query soporta máximo 10 valores por consulta
        const lotes = noCompletadas.map(s => s.lotNumber.toUpperCase().trim());
        const lotesUnicos = [...new Set(lotes)];
        const lotesExistentes = new Set();

        // Consultar en bloques de 10
        for (let i = 0; i < lotesUnicos.length; i += 10) {
            const bloque = lotesUnicos.slice(i, i + 10);
            // Los documentos en vehiculos usan binNip (lote) como ID
            const promises = bloque.map(lote =>
                firestore().collection("vehiculos").doc(lote).get()
            );
            const resultados = await Promise.all(promises);
            resultados.forEach(docSnap => {
                if (docSnap.exists) lotesExistentes.add(docSnap.id);
            });
        }

        if (lotesExistentes.size === 0) return;

        // Batch update: marcar como completado las que coincidan
        const batch = firestore().batch();
        let count = 0;
        noCompletadas.forEach(sol => {
            const loteNorm = sol.lotNumber.toUpperCase().trim();
            if (lotesExistentes.has(loteNorm)) {
                batch.update(
                    firestore().collection("solicitudesVehiculos").doc(sol.id),
                    {
                        estado: "completado",
                        fechaCompletado: new Date(),
                        completadoAuto: true,
                        notaCompletado: "Vehículo ya registrado en yarda"
                    }
                );
                count++;
            }
        });

        if (count > 0) {
            try {
                await batch.commit();
                console.log(`Auto-completadas ${count} solicitudes (lote ya en yarda)`);
            } catch (err) {
                console.error("Error auto-completando solicitudes:", err);
            }
        }
    }, []);

    useEffect(() => {
        if (!user) { setLoadingSolicitudes(false); return; }

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

                // Auto-completar solicitudes cuyo lote ya llegó a la yarda
                autoCompletarPorVehiculos(lista);

                const estadosUnicos = [...new Set(lista.map(s => extraerEstadoUSA(s.location)))];
                setEstadosAbiertos(prev => {
                    const nuevos = {};
                    estadosUnicos.forEach(estado => { nuevos[estado] = prev[estado] || false; });
                    return nuevos;
                });
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
                setLoadingSolicitudes(false);
            });

        return () => unsubscribe();
    }, [user]);

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

    const eliminarSolicitud = async (id) => {
        if (!confirm("¿Estás seguro de eliminar esta solicitud?")) return;
        try {
            await firestore().collection("solicitudesVehiculos").doc(id).delete();
            if (modalDetalle?.id === id) setModalDetalle(null);
        } catch (error) {
            console.error("Error eliminando solicitud:", error);
        }
    };

    const toggleEstado = (estado) => {
        setEstadosAbiertos(prev => ({ ...prev, [estado]: !prev[estado] }));
    };

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCrearViaje = () => {
        const solsSeleccionadas = solicitudes.filter(s => seleccionados.has(s.id));
        if (solsSeleccionadas.length === 0) return;
        setSeleccionados(new Set());
        onCrearViaje(solsSeleccionadas);
    };

    const getAgeColor = (fechaSolicitud) => {
        if (!fechaSolicitud) return { fill: "#22c55e", bg: "bg-green-500", text: "text-green-600", border: "border-green-400", days: 0 };
        const date = fechaSolicitud.toDate ? fechaSolicitud.toDate() : new Date(fechaSolicitud);
        const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 7) return { fill: "#ef4444", bg: "bg-red-500", text: "text-red-600", border: "border-red-400", days };
        if (days >= 3) return { fill: "#f59e0b", bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-400", days };
        return { fill: "#22c55e", bg: "bg-green-500", text: "text-green-600", border: "border-green-400", days };
    };

    const getEstadoConfig = (estado) => {
        const config = {
            pendiente: { bg: "bg-amber-500", label: "Pendiente" },
            asignado: { bg: "bg-indigo-500", label: "Asignado" },
            en_proceso: { bg: "bg-blue-500", label: "En Proceso" },
            completado: { bg: "bg-green-500", label: "Completado" }
        };
        return config[estado] || config.pendiente;
    };

    const formatDate = (timestamp, includeTime = false) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return String(timestamp);
        const opts = { day: "numeric", month: "short", year: "numeric" };
        if (includeTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
        return date.toLocaleDateString("es-MX", opts);
    };

    const formatAuctionDate = (dateStr) => {
        if (!dateStr) return "Sin fecha";
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) return dateStr;
        return parsed.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
    };

    const matchBusqueda = (s) => !busqueda ||
        s.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.lotNumber?.includes(busqueda) ||
        s.make?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.model?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.location?.toLowerCase().includes(busqueda.toLowerCase());

    const enEstadoAutorizado = (sol) => {
        if (!estadosAutorizados || estadosAutorizados.length === 0) return true;
        if (!sol.location) return false;
        const match = sol.location.match(/\b([A-Z]{2})\b/);
        if (match && US_STATES_MAP[match[1]]) return estadosAutorizados.includes(match[1]);
        for (const code of estadosAutorizados) {
            if (US_STATES_MAP[code] && sol.location.toLowerCase().includes(US_STATES_MAP[code].toLowerCase())) return true;
        }
        return false;
    };

    const solicitudesPendientes = solicitudes.filter(s =>
        s.estado !== "completado" && s.estado !== "asignado" && s.estado !== "en_proceso" && enEstadoAutorizado(s) && matchBusqueda(s)
    );
    const solicitudesAsignadas = solicitudes.filter(s =>
        (s.estado === "asignado" || s.estado === "en_proceso") && enEstadoAutorizado(s) && matchBusqueda(s)
    );
    const solicitudesCompletadas = solicitudes
        .filter(s => s.estado === "completado" && enEstadoAutorizado(s) && matchBusqueda(s))
        .sort((a, b) => {
            const fa = a.fechaCompletado?.toDate?.() || a.fechaSolicitud?.toDate?.() || new Date(0);
            const fb = b.fechaCompletado?.toDate?.() || b.fechaSolicitud?.toDate?.() || new Date(0);
            return fb - fa;
        })
        .slice(0, 40);

    const listaActual = tab === "pendientes" ? solicitudesPendientes
        : tab === "asignados" ? solicitudesAsignadas
        : solicitudesCompletadas;

    const solicitudesPorEstado = useMemo(() => {
        const grupos = {};
        listaActual.forEach(sol => {
            const estado = extraerEstadoUSA(sol.location);
            if (!grupos[estado]) grupos[estado] = [];
            grupos[estado].push(sol);
        });
        Object.values(grupos).forEach(arr => {
            arr.sort((a, b) => {
                const fechaA = a.fechaSolicitud?.toDate?.() || new Date(0);
                const fechaB = b.fechaSolicitud?.toDate?.() || new Date(0);
                return fechaA - fechaB;
            });
        });
        return Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);
    }, [listaActual]);

    const contadores = {
        pendientes: solicitudes.filter(s => !s.estado || s.estado === "pendiente" || s.estado === "aprobado").length,
        asignados: solicitudes.filter(s => s.estado === "asignado" || s.estado === "en_proceso").length,
        completados: solicitudes.filter(s => s.estado === "completado").length
    };

    const renderFila = (sol) => {
        const age = getAgeColor(sol.fechaSolicitud);
        const estadoConf = getEstadoConfig(sol.estado);
        const esPendiente = tab === "pendientes";
        const estaSeleccionado = seleccionados.has(sol.id);

        return (
            <div
                key={sol.id}
                onClick={() => esPendiente ? toggleSeleccion(sol.id) : setModalDetalle(sol)}
                className={`bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all ${estaSeleccionado ? "ring-2 ring-red-400 bg-red-50/30" : ""}`}
            >
                {/* Imagen */}
                <div className="relative w-full h-48 bg-gray-100">
                    {sol.imageUrl ? (
                        <img src={sol.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <FaCar className="text-gray-300 text-xl" />
                        </div>
                    )}
                    {/* Checkbox overlay */}
                    {esPendiente && (
                        <div className="absolute top-2 left-2">
                            <input
                                type="checkbox"
                                checked={estaSeleccionado}
                                onChange={() => toggleSeleccion(sol.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="checkbox checkbox-sm checkbox-error bg-white"
                            />
                        </div>
                    )}
                    {/* Badges overlay */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <span className="bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{sol.source}</span>
                        <span className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: age.fill }}>{age.days}d</span>
                    </div>
                    {/* Estado badge */}
                    <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white ${estadoConf.bg}`}>
                        {estadoConf.label}
                    </span>
                </div>

                {/* Info */}
                <div className="p-3">
                    <p className="text-[10px] text-gray-400 font-bold truncate flex items-center gap-1">
                        <FaUser className="text-[8px]" /> {(sol.clienteNombre || 'Sin cliente').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <p className="text-sm font-bold text-gray-800 truncate mt-0.5">
                        {sol.year} {sol.make} {sol.model}
                    </p>
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-500">
                        <div className="flex items-center gap-1">
                            <FaBarcode className="text-gray-400 text-[9px]" />
                            <span className="font-mono truncate">{sol.lotNumber}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FaMapMarkerAlt className="text-gray-400 text-[9px]" />
                            <span className="truncate">{sol.location || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FaGavel className="text-gray-400 text-[9px]" />
                            <span className="truncate">{sol.auctionDate || 'Sin fecha'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FaCalendarAlt className="text-gray-400 text-[9px]" />
                            <span className="truncate">Ordenado: {formatDate(sol.fechaSolicitud)}</span>
                        </div>
                        {tab === "completados" && sol.fechaCompletado && (
                            <div className="flex items-center gap-1">
                                <FaCheckCircle className="text-green-600 text-[9px]" />
                                <span className="text-green-600 font-bold truncate">{formatDate(sol.fechaCompletado)}</span>
                            </div>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); setModalDetalle(sol); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Ver detalle"
                        >
                            <FaEye size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); eliminarSolicitud(sol.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar"
                        >
                            <FaTrash size={11} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loadingSolicitudes) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                <button
                    onClick={() => setTab("pendientes")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-bold transition-all ${
                        tab === "pendientes" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"
                    }`}
                >
                    Pendientes
                    {contadores.pendientes > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "pendientes" ? "bg-red-500" : "bg-gray-300 text-gray-600"}`}>
                            {contadores.pendientes}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab("asignados")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-bold transition-all ${
                        tab === "asignados" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"
                    }`}
                >
                    Asignados
                    {contadores.asignados > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "asignados" ? "bg-indigo-500" : "bg-gray-300 text-gray-600"}`}>
                            {contadores.asignados}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab("completados")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-bold transition-all ${
                        tab === "completados" ? "bg-green-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"
                    }`}
                >
                    Completados
                    {contadores.completados > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "completados" ? "bg-green-500" : "bg-gray-300 text-gray-600"}`}>
                            {contadores.completados}
                        </span>
                    )}
                </button>

                {/* Búsqueda inline */}
                <div className="relative flex-1 min-w-0">
                    <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="text"
                        placeholder="# lote..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs"
                    />
                </div>
            </div>

            {/* Contenido */}
            {listaActual.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <FaTruck className="text-4xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">
                        {busqueda ? "No se encontraron resultados" :
                         tab === "pendientes" ? "No hay solicitudes pendientes" :
                         tab === "asignados" ? "No hay solicitudes asignadas" :
                         "No hay solicitudes completadas"}
                    </p>
                </div>
            ) : (busqueda || tab === "completados") ? (
                /* ===== LISTA PLANA (búsqueda o completados) ===== */
                <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                        {listaActual.map((sol) => renderFila(sol))}
                    </div>
                    {tab === "completados" && !busqueda && contadores.completados > 40 && (
                        <div className="px-4 py-3 text-center text-xs text-gray-400 mt-2">
                            Mostrando los últimos 40 de {contadores.completados}
                        </div>
                    )}
                </div>
            ) : (
                /* ===== SIN BÚSQUEDA: agrupado por estado ===== */
                <div className="space-y-3">
                    {solicitudesPorEstado.map(([estadoUSA, solicitudesGrupo]) => (
                        <div key={estadoUSA} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                onClick={() => toggleEstado(estadoUSA)}
                                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                                        <FaMapMarkerAlt className="text-white text-xs" />
                                    </div>
                                    <span className="text-gray-800 font-bold">{estadoUSA}</span>
                                    <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {solicitudesGrupo.length}
                                    </span>
                                </div>
                                {estadosAbiertos[estadoUSA] ? <FaChevronDown className="text-gray-400 text-sm" /> : <FaChevronRight className="text-gray-400 text-sm" />}
                            </button>

                            {estadosAbiertos[estadoUSA] && (
                                <div className="p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                                    {solicitudesGrupo.map((sol) => renderFila(sol))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Barra flotante de selección */}
            {seleccionados.size > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-white border-2 border-red-500 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-800">
                        {seleccionados.size} {seleccionados.size === 1 ? 'seleccionado' : 'seleccionados'}
                    </span>
                    <button onClick={() => setSeleccionados(new Set())} className="text-xs text-gray-500 hover:text-gray-700 underline">
                        Limpiar
                    </button>
                    <button
                        onClick={handleCrearViaje}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors shadow-lg"
                    >
                        <FaPlus size={11} /> Crear Viaje
                    </button>
                </div>
            )}

            {/* Modal Detalle */}
            {modalDetalle && (() => {
                const ageD = getAgeColor(modalDetalle.fechaSolicitud);
                return (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setModalDetalle(null)}>
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header con imagen */}
                        <div className="relative">
                            {modalDetalle.imageUrl ? (
                                <img src={modalDetalle.imageUrl} alt="" className="w-full h-44 object-cover rounded-t-2xl cursor-pointer" onClick={() => setImagenAmpliada(modalDetalle.imageUrl)} />
                            ) : (
                                <div className="w-full h-44 bg-gray-100 rounded-t-2xl flex items-center justify-center"><FaCar className="text-4xl text-gray-300" /></div>
                            )}
                            <button onClick={() => setModalDetalle(null)} className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white">
                                <FaTimes size={12} />
                            </button>
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded">{modalDetalle.source}</span>
                                <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: ageD.fill }}>{ageD.days}d</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${getEstadoConfig(modalDetalle.estado).bg}`}>
                                    {getEstadoConfig(modalDetalle.estado).label}
                                </span>
                            </div>
                        </div>

                        <div className="p-4">
                            {/* Título */}
                            <h4 className="text-lg font-bold text-gray-800">{modalDetalle.year} {modalDetalle.make} {modalDetalle.model}</h4>

                            {/* Datos en lista compacta */}
                            <div className="mt-3 space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <FaBarcode className="text-gray-400 text-xs flex-shrink-0" />
                                    <span className="text-gray-400 text-xs w-16">Lote</span>
                                    <span className="font-mono font-medium text-gray-800">{modalDetalle.lotNumber}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaIdCard className="text-gray-400 text-xs flex-shrink-0" />
                                    <span className="text-gray-400 text-xs w-16">Gate Pass</span>
                                    <span className="font-mono font-medium text-gray-800">{modalDetalle.gatePass || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaBarcode className="text-gray-400 text-xs flex-shrink-0" />
                                    <span className="text-gray-400 text-xs w-16">VIN</span>
                                    <span className="font-mono text-gray-800 text-xs">{modalDetalle.vin || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-gray-400 text-xs flex-shrink-0" />
                                    <span className="text-gray-400 text-xs w-16">Location</span>
                                    <span className="text-gray-800">{modalDetalle.location || '-'}</span>
                                </div>
                            </div>

                            {/* Separador + Cliente */}
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <FaUser className="text-red-400 text-xs flex-shrink-0" />
                                    <span className="text-gray-400 text-xs w-16">Cliente</span>
                                    <span className="font-medium text-gray-800">{modalDetalle.clienteNombre}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaGavel className="text-gray-400 text-xs flex-shrink-0" />
                                    <span className="text-gray-400 text-xs w-16">Comprado</span>
                                    <span className="text-gray-800">{modalDetalle.auctionDate || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaCalendarAlt className="text-gray-400 text-xs flex-shrink-0" />
                                    <span className="text-gray-400 text-xs w-16">Ordenado</span>
                                    <span className="text-gray-800">{formatDate(modalDetalle.fechaSolicitud, true)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Lightbox */}
            {imagenAmpliada && (
                <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 cursor-pointer" onClick={() => setImagenAmpliada(null)}>
                    <button className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => setImagenAmpliada(null)}>
                        <FaTimes size={20} />
                    </button>
                    <img src={imagenAmpliada} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};

export default SolicitudesCarrier;
