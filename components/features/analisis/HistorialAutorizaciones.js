import React, { useState, useEffect } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaSearch, FaEdit, FaTrash, FaExchangeAlt } from 'react-icons/fa';
import moment from 'moment';

const ACCIONES = {
    edicion: { label: "Edición", icon: FaEdit, color: "text-blue-600", bg: "bg-blue-50" },
    eliminacion: { label: "Eliminación", icon: FaTrash, color: "text-red-600", bg: "bg-red-50" },
    cambioLote: { label: "Cambio de Lote", icon: FaExchangeAlt, color: "text-orange-600", bg: "bg-orange-50" },
};

const HistorialAutorizaciones = () => {
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [filtroAccion, setFiltroAccion] = useState("todas");

    useEffect(() => {
        const unsub = firestore()
            .collection(COLLECTIONS.AUDIT_LOG)
            .onSnapshot((snap) => {
                const datos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                datos.sort((a, b) => {
                    const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp?.seconds || 0) * 1000;
                    const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp?.seconds || 0) * 1000;
                    return tb - ta;
                });
                setRegistros(datos);
                setLoading(false);
            });
        return () => unsub();
    }, []);

    const filtrados = registros.filter(r => {
        const b = busqueda.toLowerCase();
        const matchBusqueda = !b ||
            r.cliente?.toLowerCase().includes(b) ||
            r.binNip?.includes(b) ||
            r.marca?.toLowerCase().includes(b) ||
            r.modelo?.toLowerCase().includes(b) ||
            r.usuario?.toLowerCase().includes(b);
        const matchAccion = filtroAccion === "todas" || r.accion === filtroAccion;
        return matchBusqueda && matchAccion;
    });

    const formatCambios = (cambios) => {
        if (!cambios) return null;
        return Object.entries(cambios).map(([campo, val]) => (
            <div key={campo} className="text-[11px] leading-tight">
                <span className="font-semibold text-gray-500">{campo}:</span>{' '}
                <span className="text-red-400 line-through">{String(val.antes || '-')}</span>
                {' → '}
                <span className="text-green-600 font-bold">{String(val.despues || '-')}</span>
            </div>
        ));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg text-red-600"></span>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                    Autorizaciones
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {registros.length} registros totales
                </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por usuario, cliente, lote..."
                        className="input w-full pl-12 bg-white border-2 border-gray-200 focus:border-red-500 text-gray-800 font-semibold rounded-xl"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <select
                    className="select bg-white border-2 border-gray-200 font-semibold text-gray-700"
                    value={filtroAccion}
                    onChange={(e) => setFiltroAccion(e.target.value)}
                >
                    <option value="todas">Todas las acciones</option>
                    <option value="edicion">Ediciones</option>
                    <option value="eliminacion">Eliminaciones</option>
                    <option value="cambioLote">Cambios de Lote</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                    <thead>
                        <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                            <th className="py-3">Acción</th>
                            <th>Usuario</th>
                            <th>Lote</th>
                            <th>Vehículo</th>
                            <th>Cliente</th>
                            <th>Cambios</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filtrados.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center py-10 text-gray-300">
                                    No se encontraron registros
                                </td>
                            </tr>
                        ) : (
                            filtrados.map((r) => {
                                const accion = ACCIONES[r.accion] || { label: r.accion, icon: FaEdit, color: "text-gray-600", bg: "bg-gray-50" };
                                const Icon = accion.icon;
                                return (
                                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${accion.color} ${accion.bg}`}>
                                                <Icon size={10} /> {accion.label}
                                            </span>
                                        </td>
                                        <td className="font-bold text-gray-700">{r.usuario || '-'}</td>
                                        <td className="font-mono font-bold text-blue-600">{r.binNip}</td>
                                        <td className="text-gray-600">{r.marca} {r.modelo}</td>
                                        <td className="text-gray-600">{r.cliente}</td>
                                        <td className="max-w-xs">
                                            {r.cambios ? formatCambios(r.cambios) : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="text-gray-400 whitespace-nowrap">
                                            {r.timestamp?.seconds
                                                ? moment(r.timestamp.seconds * 1000).format('DD/MM/YYYY HH:mm')
                                                : r.timestamp instanceof Date
                                                    ? moment(r.timestamp).format('DD/MM/YYYY HH:mm')
                                                    : '-'
                                            }
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistorialAutorizaciones;
