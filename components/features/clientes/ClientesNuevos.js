import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import {
    FaUser, FaPhone, FaMapMarkerAlt, FaEnvelope, FaIdCard,
    FaCheckCircle, FaTimes, FaChevronDown, FaChevronUp, FaClock
} from "react-icons/fa";

const ClientesNuevos = ({ user }) => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandido, setExpandido] = useState(null);
    const [aprobando, setAprobando] = useState(null);
    const [imagenAmpliada, setImagenAmpliada] = useState(null);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection(COLLECTIONS.CLIENTES)
            .where("aprobado", "==", false)
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lista.sort((a, b) => {
                    const fa = a.registro?.timestamp?.toDate?.() || new Date(0);
                    const fb = b.registro?.timestamp?.toDate?.() || new Date(0);
                    return fb - fa;
                });
                setClientes(lista);
                setLoading(false);
            }, () => setLoading(false));

        return () => unsubscribe();
    }, []);

    const aprobarCliente = async (clienteId) => {
        setAprobando(clienteId);
        try {
            await firestore()
                .collection(COLLECTIONS.CLIENTES)
                .doc(clienteId)
                .update({
                    aprobado: true,
                    aprobadoPor: user?.nombre || user?.email || "Admin",
                    fechaAprobado: new Date()
                });
        } catch (err) {
            console.error("Error aprobando cliente:", err);
            alert("Error al aprobar el cliente");
        }
        setAprobando(null);
    };

    const rechazarCliente = async (clienteId) => {
        if (!confirm("Rechazar este cliente? Se eliminará su cuenta.")) return;
        setAprobando(clienteId);
        try {
            await firestore().collection(COLLECTIONS.CLIENTES).doc(clienteId).delete();
            await firestore().collection(COLLECTIONS.USERS).doc(clienteId).delete();
        } catch (err) {
            console.error("Error rechazando cliente:", err);
        }
        setAprobando(null);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <FaClock className="text-amber-500"/> Clientes Nuevos
                    {clientes.length > 0 && (
                        <span className="bg-amber-500 text-white text-sm px-2.5 py-0.5 rounded-full">{clientes.length}</span>
                    )}
                </h2>
            </div>

            {clientes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <FaCheckCircle className="text-4xl text-green-400 mx-auto mb-4"/>
                    <p className="text-gray-500 text-sm">No hay solicitudes de clientes pendientes</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {clientes.map(cliente => {
                        const isExpanded = expandido === cliente.id;
                        return (
                            <div key={cliente.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Header */}
                                <div
                                    className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandido(isExpanded ? null : cliente.id)}
                                >
                                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <FaUser className="text-amber-600"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-gray-800 uppercase truncate">{cliente.cliente}</p>
                                        <p className="text-[11px] text-gray-500">
                                            {cliente.ciudadCliente}, {cliente.estadoCliente} &middot; {formatDate(cliente.registro?.timestamp)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Pendiente</span>
                                        {isExpanded ? <FaChevronUp className="text-gray-400"/> : <FaChevronDown className="text-gray-400"/>}
                                    </div>
                                </div>

                                {/* Detalle expandido */}
                                {isExpanded && (
                                    <div className="border-t border-gray-200">
                                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Datos */}
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-black text-gray-500 uppercase">Datos del Cliente</h3>
                                                {[
                                                    { icon: <FaUser/>, label: "Nombre", value: cliente.cliente },
                                                    { icon: <FaEnvelope/>, label: "Email", value: cliente.emailAcceso || cliente.emailCliente },
                                                    { icon: <FaPhone/>, label: "Teléfono", value: cliente.telefonoCliente },
                                                    { icon: <FaMapMarkerAlt/>, label: "Dirección", value: cliente.direccionCliente },
                                                    { icon: <FaMapMarkerAlt/>, label: "Ciudad", value: `${cliente.ciudadCliente || "-"}, ${cliente.estadoCliente || "-"}` },
                                                    { icon: <FaIdCard/>, label: "País", value: cliente.paisCliente },
                                                ].map((campo, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-sm">
                                                        <span className="text-gray-400 w-5 text-center flex-shrink-0">{campo.icon}</span>
                                                        <span className="text-gray-500 text-xs w-20 flex-shrink-0">{campo.label}</span>
                                                        <span className="font-medium text-gray-800">{campo.value || "-"}</span>
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span className="text-gray-400 w-5 text-center flex-shrink-0"><FaClock/></span>
                                                    <span className="text-gray-500 text-xs w-20 flex-shrink-0">Registro</span>
                                                    <span className="font-medium text-gray-800">{formatDate(cliente.registro?.timestamp)}</span>
                                                </div>
                                            </div>

                                            {/* Foto de licencia */}
                                            <div>
                                                <h3 className="text-xs font-black text-gray-500 uppercase mb-3">Licencia</h3>
                                                {(cliente.licenciaBase64 || cliente.licenciaUrl) ? (
                                                    <img
                                                        src={cliente.licenciaBase64 || cliente.licenciaUrl}
                                                        alt="Licencia"
                                                        className="w-full max-w-sm rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => setImagenAmpliada(cliente.licenciaBase64 || cliente.licenciaUrl)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                                                        <p className="text-gray-400 text-sm">Sin foto de licencia</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3 justify-end">
                                            <button
                                                onClick={() => rechazarCliente(cliente.id)}
                                                disabled={aprobando === cliente.id}
                                                className="btn btn-sm btn-outline border-red-400 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold uppercase text-xs gap-1"
                                            >
                                                <FaTimes size={10}/> Rechazar
                                            </button>
                                            <button
                                                onClick={() => aprobarCliente(cliente.id)}
                                                disabled={aprobando === cliente.id}
                                                className="btn btn-sm bg-green-600 text-white hover:bg-green-700 border-none font-bold uppercase text-xs gap-1"
                                            >
                                                {aprobando === cliente.id ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    <><FaCheckCircle size={10}/> Aprobar</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal imagen ampliada */}
            {imagenAmpliada && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setImagenAmpliada(null)}>
                    <img src={imagenAmpliada} alt="Licencia" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"/>
                </div>
            )}
        </div>
    );
};

export default ClientesNuevos;
