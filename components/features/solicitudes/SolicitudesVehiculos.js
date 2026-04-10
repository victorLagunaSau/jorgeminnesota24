import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import {
    FaCar, FaUser, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaSearch,
    FaCheck, FaTruck, FaSpinner, FaEye, FaTimes, FaBarcode, FaKey,
    FaChevronLeft, FaChevronRight, FaClock, FaCheckCircle, FaHourglassHalf
} from "react-icons/fa";

const SolicitudesVehiculos = ({ user }) => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState("todas"); // todas, pendiente, aprobado, en_proceso, completado
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [modalDetalle, setModalDetalle] = useState(null);
    const [actualizando, setActualizando] = useState(null);

    const xPagina = 10;

    // Cargar solicitudes
    useEffect(() => {
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
                setLoading(false);
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const cambiarEstado = async (id, nuevoEstado) => {
        setActualizando(id);
        try {
            await firestore().collection("solicitudesVehiculos").doc(id).update({
                estado: nuevoEstado,
                [`fecha${nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1)}`]: new Date(),
                actualizadoPor: user?.nombre || "Admin"
            });
        } catch (error) {
            console.error("Error actualizando estado:", error);
            alert("Error al actualizar el estado");
        } finally {
            setActualizando(null);
        }
    };

    const getEstadoBadge = (estado) => {
        const config = {
            pendiente: { bg: "bg-yellow-100", text: "text-yellow-800", icon: FaClock, label: "Pendiente" },
            aprobado: { bg: "bg-blue-100", text: "text-blue-800", icon: FaCheck, label: "Aprobado" },
            en_proceso: { bg: "bg-purple-100", text: "text-purple-800", icon: FaTruck, label: "En Proceso" },
            completado: { bg: "bg-green-100", text: "text-green-800", icon: FaCheckCircle, label: "Completado" }
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

    // Filtrar solicitudes
    const solicitudesFiltradas = solicitudes.filter(s => {
        const matchEstado = filtro === "todas" || s.estado === filtro;
        const matchBusqueda = !busqueda ||
            s.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.lotNumber?.includes(busqueda) ||
            s.make?.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.model?.toLowerCase().includes(busqueda.toLowerCase());
        return matchEstado && matchBusqueda;
    });

    const totalPags = Math.ceil(solicitudesFiltradas.length / xPagina);
    const solicitudesPaginadas = solicitudesFiltradas.slice((pagina - 1) * xPagina, pagina * xPagina);

    // Contadores por estado
    const contadores = {
        todas: solicitudes.length,
        pendiente: solicitudes.filter(s => s.estado === "pendiente").length,
        aprobado: solicitudes.filter(s => s.estado === "aprobado").length,
        en_proceso: solicitudes.filter(s => s.estado === "en_proceso").length,
        completado: solicitudes.filter(s => s.estado === "completado").length
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg text-red-600"></span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase italic text-gray-800 tracking-tight">
                        Solicitudes de Vehículos
                    </h2>
                    <p className="text-sm text-gray-500">Gestiona las solicitudes de los clientes</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-50 px-3 py-1 rounded-lg">
                        <span className="text-[10px] text-yellow-600 font-bold">PENDIENTES</span>
                        <p className="text-xl font-black text-yellow-700">{contadores.pendiente}</p>
                    </div>
                    <div className="bg-green-50 px-3 py-1 rounded-lg">
                        <span className="text-[10px] text-green-600 font-bold">COMPLETADOS</span>
                        <p className="text-xl font-black text-green-700">{contadores.completado}</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Búsqueda */}
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, lote, marca..."
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                            className="input input-bordered w-full pl-10 bg-white text-black"
                        />
                    </div>

                    {/* Filtro por estado */}
                    <div className="flex flex-wrap gap-2">
                        {["todas", "pendiente", "aprobado", "en_proceso", "completado"].map((estado) => {
                            const isActive = filtro === estado;
                            const badge = estado !== "todas" ? getEstadoBadge(estado) : null;
                            return (
                                <button
                                    key={estado}
                                    onClick={() => { setFiltro(estado); setPagina(1); }}
                                    className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase transition-colors ${
                                        isActive
                                            ? "bg-red-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {estado === "todas" ? "Todas" : badge?.label} ({contadores[estado]})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Lista de Solicitudes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {solicitudesFiltradas.length === 0 ? (
                    <div className="text-center py-16">
                        <FaCar className="text-5xl text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No hay solicitudes {filtro !== "todas" && `con estado "${filtro}"`}</p>
                    </div>
                ) : (
                    <>
                        {/* Header tabla */}
                        <div className="hidden md:grid md:grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b text-[10px] font-black text-gray-500 uppercase">
                            <div className="col-span-3">Vehículo</div>
                            <div className="col-span-2">Cliente</div>
                            <div className="col-span-2">Ubicación</div>
                            <div className="col-span-2">Fecha</div>
                            <div className="col-span-2 text-center">Estado</div>
                            <div className="col-span-1 text-center">Acción</div>
                        </div>

                        {/* Filas */}
                        <div className="divide-y divide-gray-100">
                            {solicitudesPaginadas.map((sol) => {
                                const badge = getEstadoBadge(sol.estado);
                                const BadgeIcon = badge.icon;

                                return (
                                    <div key={sol.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        {/* Vista móvil */}
                                        <div className="md:hidden space-y-3">
                                            <div className="flex gap-3">
                                                {sol.imageUrl && (
                                                    <img src={sol.imageUrl} alt="" className="w-20 h-16 object-cover rounded bg-gray-100" />
                                                )}
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm uppercase">{sol.year} {sol.make} {sol.model}</p>
                                                    <p className="text-[10px] text-gray-500">Lote: {sol.lotNumber}</p>
                                                    <p className="text-[11px] text-gray-600 mt-1">
                                                        <FaUser className="inline mr-1" /> {sol.clienteNombre}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[9px] font-bold h-fit ${badge.bg} ${badge.text}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setModalDetalle(sol)}
                                                    className="btn btn-xs btn-ghost text-blue-600"
                                                >
                                                    <FaEye /> Ver
                                                </button>
                                                {sol.estado !== "completado" && (
                                                    <select
                                                        value={sol.estado}
                                                        onChange={(e) => cambiarEstado(sol.id, e.target.value)}
                                                        className="select select-xs bg-white border-gray-200"
                                                        disabled={actualizando === sol.id}
                                                    >
                                                        <option value="pendiente">Pendiente</option>
                                                        <option value="aprobado">Aprobado</option>
                                                        <option value="en_proceso">En Proceso</option>
                                                        <option value="completado">Completado</option>
                                                    </select>
                                                )}
                                            </div>
                                        </div>

                                        {/* Vista desktop */}
                                        <div className="hidden md:grid md:grid-cols-12 gap-2 items-center">
                                            <div className="col-span-3 flex items-center gap-3">
                                                {sol.imageUrl && (
                                                    <img src={sol.imageUrl} alt="" className="w-16 h-12 object-cover rounded bg-gray-100" />
                                                )}
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 uppercase">{sol.year} {sol.make} {sol.model}</p>
                                                    <p className="text-[10px] text-gray-500">Lote: {sol.lotNumber} • {sol.source}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="font-medium text-sm text-gray-800">{sol.clienteNombre}</p>
                                                {sol.clienteTelefono && (
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <FaPhone /> {sol.clienteTelefono}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-600">{sol.location || "-"}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-600">{formatDate(sol.fechaSolicitud)}</p>
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                                                    <BadgeIcon size={10} /> {badge.label}
                                                </span>
                                            </div>
                                            <div className="col-span-1 flex justify-center gap-1">
                                                <button
                                                    onClick={() => setModalDetalle(sol)}
                                                    className="btn btn-ghost btn-xs text-blue-600"
                                                    title="Ver detalle"
                                                >
                                                    <FaEye />
                                                </button>
                                                {sol.estado !== "completado" && (
                                                    <div className="dropdown dropdown-end">
                                                        <label tabIndex={0} className="btn btn-ghost btn-xs text-gray-600">
                                                            {actualizando === sol.id ? <FaSpinner className="animate-spin" /> : "▼"}
                                                        </label>
                                                        <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-white rounded-box w-40 z-50">
                                                            <li><a onClick={() => cambiarEstado(sol.id, "pendiente")}>Pendiente</a></li>
                                                            <li><a onClick={() => cambiarEstado(sol.id, "aprobado")}>Aprobado</a></li>
                                                            <li><a onClick={() => cambiarEstado(sol.id, "en_proceso")}>En Proceso</a></li>
                                                            <li><a onClick={() => cambiarEstado(sol.id, "completado")} className="text-green-600">Completado</a></li>
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Paginación */}
                        {totalPags > 1 && (
                            <div className="flex justify-center items-center gap-2 p-4 border-t bg-gray-50">
                                <button
                                    onClick={() => setPagina(p => p - 1)}
                                    disabled={pagina === 1}
                                    className="btn btn-xs btn-outline"
                                >
                                    <FaChevronLeft />
                                </button>
                                <span className="text-[11px] font-bold text-gray-600">
                                    Página {pagina} de {totalPags}
                                </span>
                                <button
                                    onClick={() => setPagina(p => p + 1)}
                                    disabled={pagina === totalPags}
                                    className="btn btn-xs btn-outline"
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal Detalle */}
            {modalDetalle && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                            <h3 className="font-black text-lg uppercase">Detalle de Solicitud</h3>
                            <button onClick={() => setModalDetalle(null)} className="btn btn-ghost btn-sm">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Imagen */}
                            {modalDetalle.imageUrl && (
                                <img
                                    src={modalDetalle.imageUrl}
                                    alt=""
                                    className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                                />
                            )}

                            {/* Info Vehículo */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-black text-xl uppercase text-gray-800">
                                    {modalDetalle.year} {modalDetalle.make} {modalDetalle.model}
                                </h4>
                                <p className="text-sm text-gray-500">Fuente: {modalDetalle.source}</p>

                                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                                    <div className="flex items-start gap-2">
                                        <FaBarcode className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase">Lote</p>
                                            <p className="font-mono font-bold">{modalDetalle.lotNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <FaKey className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase">Gate Pass</p>
                                            <p className="font-mono font-bold">{modalDetalle.gatePass}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 col-span-2">
                                        <FaBarcode className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase">VIN</p>
                                            <p className="font-mono text-xs">{modalDetalle.vin || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 col-span-2">
                                        <FaMapMarkerAlt className="text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase">Ubicación</p>
                                            <p>{modalDetalle.location || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Cliente */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h5 className="font-bold text-sm text-blue-800 uppercase mb-2">Datos del Cliente</h5>
                                <div className="space-y-2 text-sm">
                                    <p className="flex items-center gap-2">
                                        <FaUser className="text-blue-600" />
                                        <span className="font-medium">{modalDetalle.clienteNombre}</span>
                                    </p>
                                    {modalDetalle.clienteTelefono && (
                                        <p className="flex items-center gap-2">
                                            <FaPhone className="text-blue-600" />
                                            <span>{modalDetalle.clienteTelefono}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Estado y Fechas */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Estado actual:</span>
                                    {(() => {
                                        const badge = getEstadoBadge(modalDetalle.estado);
                                        return (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                                                {badge.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Fecha solicitud:</span>
                                    <span className="font-medium">{formatDate(modalDetalle.fechaSolicitud)}</span>
                                </div>
                            </div>

                            {/* Cambiar Estado */}
                            {modalDetalle.estado !== "completado" && (
                                <div className="border-t pt-4">
                                    <p className="text-sm font-bold text-gray-700 mb-2">Cambiar Estado:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["pendiente", "aprobado", "en_proceso", "completado"].map((estado) => {
                                            const badge = getEstadoBadge(estado);
                                            const isActive = modalDetalle.estado === estado;
                                            return (
                                                <button
                                                    key={estado}
                                                    onClick={() => {
                                                        cambiarEstado(modalDetalle.id, estado);
                                                        setModalDetalle({ ...modalDetalle, estado });
                                                    }}
                                                    disabled={isActive || actualizando === modalDetalle.id}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                                        isActive
                                                            ? `${badge.bg} ${badge.text} ring-2 ring-offset-1`
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {badge.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolicitudesVehiculos;
