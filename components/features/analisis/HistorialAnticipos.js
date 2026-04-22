import React, { useState, useEffect } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaSearch } from 'react-icons/fa';
import moment from 'moment';

const HistorialAnticipos = () => {
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    useEffect(() => {
        // Escuchar movimientos tipo Anticipo (del módulo Pago Adelantado)
        const unsubMov = firestore()
            .collection(COLLECTIONS.MOVIMIENTOS)
            .where("tipo", "==", "Anticipo")
            .onSnapshot((snap) => {
                const datos = snap.docs.map(doc => ({ id: doc.id, source: 'anticipo', ...doc.data() }));
                setMovimientos(prev => {
                    const fromVehiculos = prev.filter(m => m.source === 'vehiculo');
                    const merged = deduplicar([...datos, ...fromVehiculos]);
                    merged.sort((a, b) => getTime(b) - getTime(a));
                    return merged;
                });
                setLoading(false);
            });

        // Escuchar vehículos con anticipoPago > 0 (incluye pagos de viajes)
        const unsubVeh = firestore()
            .collection(COLLECTIONS.VEHICULOS)
            .where("anticipoPago", ">", 0)
            .onSnapshot((snap) => {
                const datos = snap.docs.map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        source: 'vehiculo',
                        cliente: d.cliente,
                        binNip: d.binNip,
                        marca: d.marca,
                        modelo: d.modelo,
                        anticipoPago: d.anticipoPago,
                        usuario: d.anticipoUsuario || d.usuario || '',
                        timestamp: d.fechaAnticipo || d.fechaPago || d.timestamp || null,
                    };
                });
                setMovimientos(prev => {
                    const fromAnticipos = prev.filter(m => m.source === 'anticipo');
                    const merged = deduplicar([...fromAnticipos, ...datos]);
                    merged.sort((a, b) => getTime(b) - getTime(a));
                    return merged;
                });
                setLoading(false);
            });

        return () => { unsubMov(); unsubVeh(); };
    }, []);

    const getTime = (m) => {
        if (m.timestamp?.seconds) return m.timestamp.seconds;
        if (m.timestamp instanceof Date) return m.timestamp.getTime() / 1000;
        return 0;
    };

    // Deduplica por binNip, priorizando source 'anticipo' (tiene más datos)
    const deduplicar = (arr) => {
        const map = {};
        arr.forEach(m => {
            const key = m.binNip || m.id;
            if (!map[key] || m.source === 'anticipo') {
                map[key] = m;
            }
        });
        return Object.values(map);
    };

    const filtrados = movimientos.filter(m => {
        const b = busqueda.toLowerCase();
        return (
            m.cliente?.toLowerCase().includes(b) ||
            m.binNip?.includes(b) ||
            m.marca?.toLowerCase().includes(b) ||
            m.modelo?.toLowerCase().includes(b)
        );
    });

    const totalAnticipos = filtrados.reduce((sum, m) => sum + (parseFloat(m.anticipoPago) || 0), 0);

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
                    Pagos Adelantados
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {movimientos.length} registros
                </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, lote, marca..."
                        className="input w-full pl-12 bg-white border-2 border-gray-200 focus:border-red-500 text-gray-800 font-semibold rounded-xl"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase">Total anticipos</p>
                    <p className="text-2xl font-black text-gray-800">${totalAnticipos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                    <thead>
                        <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                            <th className="py-3">Cliente</th>
                            <th>Lote</th>
                            <th>Vehículo</th>
                            <th>Cobrado por</th>
                            <th>Fecha</th>
                            <th className="text-right">Anticipo</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filtrados.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-10 text-gray-300">
                                    No se encontraron pagos adelantados
                                </td>
                            </tr>
                        ) : (
                            filtrados.map((m) => (
                                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="font-bold text-gray-800">{m.cliente}</td>
                                    <td className="font-mono font-bold text-blue-600">{m.binNip}</td>
                                    <td className="text-gray-600">{m.marca} {m.modelo}</td>
                                    <td className="text-gray-500 font-semibold">{m.usuario || '-'}</td>
                                    <td className="text-gray-400">
                                        {m.timestamp?.seconds
                                            ? moment(m.timestamp.seconds * 1000).format('DD/MM/YYYY HH:mm')
                                            : m.timestamp instanceof Date
                                                ? moment(m.timestamp).format('DD/MM/YYYY HH:mm')
                                                : '-'
                                        }
                                    </td>
                                    <td className="text-right font-black text-green-700">
                                        ${(parseFloat(m.anticipoPago) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistorialAnticipos;
