import React, { useState, useEffect } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaSearch, FaHistory, FaClock } from 'react-icons/fa';
import moment from 'moment';

const HistorialAnticipos = () => {
    const [movimientos, setMovimientos] = useState([]);
    const [vehiculosMap, setVehiculosMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [verHistorial, setVerHistorial] = useState(false);

    useEffect(() => {
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

        const unsubVeh = firestore()
            .collection(COLLECTIONS.VEHICULOS)
            .where("anticipoPago", ">", 0)
            .onSnapshot((snap) => {
                const datos = [];
                const mapEstatus = {};
                snap.docs.forEach(doc => {
                    const d = doc.data();
                    mapEstatus[d.binNip || doc.id] = d.estatus;
                    datos.push({
                        id: doc.id,
                        source: 'vehiculo',
                        cliente: d.cliente,
                        binNip: d.binNip,
                        marca: d.marca,
                        modelo: d.modelo,
                        anticipoPago: d.anticipoPago,
                        anticipoMetodo: d.anticipoMetodo || 'efectivo',
                        usuario: d.anticipoUsuario || d.usuario || '',
                        timestamp: d.anticipoTimestamp || d.fechaPago || d.timestamp || null,
                        estatus: d.estatus,
                    });
                });
                setVehiculosMap(mapEstatus);
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

    const deduplicar = (arr) => {
        const map = {};
        arr.forEach(m => {
            const key = m.binNip || m.id;
            if (!map[key]) {
                map[key] = { ...m };
            } else {
                // Combinar: mantener datos del anticipo pero siempre tomar estatus del vehículo
                if (m.source === 'anticipo') {
                    map[key] = { ...map[key], ...m, estatus: map[key].estatus || m.estatus };
                } else {
                    map[key].estatus = m.estatus;
                }
            }
        });
        return Object.values(map);
    };

    const esFinalizado = (m) => {
        // Primero checar el mapa de vehículos (siempre actualizado), luego el dato del registro
        const estatus = vehiculosMap[m.binNip] || m.estatus;
        return estatus === "EN";
    };

    const filtrados = movimientos.filter(m => {
        const b = busqueda.toLowerCase();
        const coincide = (
            m.cliente?.toLowerCase().includes(b) ||
            m.binNip?.includes(b) ||
            m.marca?.toLowerCase().includes(b) ||
            m.modelo?.toLowerCase().includes(b)
        );
        if (!coincide) return false;
        return verHistorial ? esFinalizado(m) : !esFinalizado(m);
    });

    const pendientes = movimientos.filter(m => !esFinalizado(m));
    const finalizados = movimientos.filter(m => esFinalizado(m));

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
                    {pendientes.length} pendientes · {finalizados.length} liquidados
                </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-96">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, lote, marca..."
                            className="input w-full pl-12 bg-white border-2 border-gray-200 focus:border-red-500 text-gray-800 font-semibold rounded-xl"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setVerHistorial(!verHistorial)}
                        className={`btn btn-sm gap-1 font-black uppercase text-[10px] ${verHistorial ? 'btn-info text-white' : 'btn-outline btn-info'}`}
                    >
                        {verHistorial ? <FaClock /> : <FaHistory />}
                        {verHistorial ? 'Pendientes' : 'Historial'}
                    </button>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase">
                        {verHistorial ? 'Total liquidados' : 'Total pendientes'}
                    </p>
                    <p className="text-2xl font-black text-gray-800">${totalAnticipos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                    <thead>
                        <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                            <th className="py-3">Estado</th>
                            <th>Cliente</th>
                            <th>Lote</th>
                            <th>Vehículo</th>
                            <th>Método</th>
                            <th>Cobrado por</th>
                            <th>Fecha</th>
                            <th className="text-right">Anticipo</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filtrados.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center py-10 text-gray-300">
                                    {verHistorial ? 'No hay anticipos liquidados' : 'No hay anticipos pendientes'}
                                </td>
                            </tr>
                        ) : (
                            filtrados.map((m) => {
                                const finalizado = esFinalizado(m);
                                const metodo = m.metodoPagoAnticipo || m.anticipoMetodo || 'efectivo';
                                return (
                                    <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${finalizado ? 'opacity-70' : ''}`}>
                                        <td>
                                            <span className={`badge badge-sm font-black uppercase text-[8px] text-white ${finalizado ? 'badge-success' : 'badge-warning'}`}>
                                                {finalizado ? 'Liquidado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="font-bold text-gray-800">{m.cliente}</td>
                                        <td className="font-mono font-bold text-blue-600">{m.binNip}</td>
                                        <td className="text-gray-600">{m.marca} {m.modelo}</td>
                                        <td>
                                            <span className={`text-[10px] font-black uppercase ${metodo === 'cc' ? 'text-blue-600' : 'text-green-600'}`}>
                                                {metodo === 'cc' ? 'CC' : 'Efectivo'}
                                            </span>
                                        </td>
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
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistorialAnticipos;
