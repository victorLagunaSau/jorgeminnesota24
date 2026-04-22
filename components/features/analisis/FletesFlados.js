import React, { useState, useEffect } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { FaSearch, FaTruck } from 'react-icons/fa';

const FletesFlados = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    useEffect(() => {
        let datosFiados = [];
        let datosLegacy = [];
        let loadCount = 0;

        const combinar = () => {
            loadCount++;
            const porId = new Map();
            [...datosFiados, ...datosLegacy].forEach(v => porId.set(v.id, v));
            const todos = Array.from(porId.values());
            // Ordenar por fecha de entrega (timestamp) más reciente primero
            todos.sort((a, b) => {
                const ta = a.timestamp?.seconds || 0;
                const tb = b.timestamp?.seconds || 0;
                return tb - ta;
            });
            setVehiculos(todos);
            if (loadCount >= 2) setLoading(false);
        };

        const unsub1 = firestore()
            .collection("vehiculos")
            .where("estadoPago", "==", "fiado")
            .onSnapshot((snap) => {
                datosFiados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                combinar();
            });

        const unsub2 = firestore()
            .collection("vehiculos")
            .where("pagosPendientes", "==", true)
            .onSnapshot((snap) => {
                datosLegacy = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(v => v.estadoPago !== "pagado");
                combinar();
            });

        return () => { unsub1(); unsub2(); };
    }, []);

    const filtrados = vehiculos.filter(v => {
        if (!busqueda) return true;
        const b = busqueda.toLowerCase();
        return (
            (v.cliente || '').toLowerCase().includes(b) ||
            (v.binNip || '').toLowerCase().includes(b) ||
            (v.marca || '').toLowerCase().includes(b) ||
            (v.modelo || '').toLowerCase().includes(b) ||
            (v.ciudad || '').toLowerCase().includes(b)
        );
    });

    const totalPendiente = filtrados.reduce((sum, v) => sum + (parseFloat(v.saldoFiado) || parseFloat(v.pagoTotalPendiente) || 0), 0);
    const totalCobrado = filtrados.reduce((sum, v) => {
        const efectivo = (parseFloat(v.cajaRecibo) || 0) - (parseFloat(v.cajaCambio) || 0);
        const cc = parseFloat(v.cajaCC) || 0;
        return sum + efectivo + cc;
    }, 0);
    const totalPrecio = filtrados.reduce((sum, v) => {
        return sum + (parseFloat(v.price) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sobrePeso) || 0) + (parseFloat(v.gastosExtra) || 0);
    }, 0);

    const fmt = (n) => `$${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

    const formatFecha = (ts) => {
        if (!ts) return '-';
        const d = ts.seconds ? new Date(ts.seconds * 1000) : ts instanceof Date ? ts : null;
        return d ? d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
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
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Fletes Fiados</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{vehiculos.length} vehículos con saldo pendiente</p>
                </div>
            </div>

            {/* Cards resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Precio Total</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{fmt(totalPrecio)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Cobrado</p>
                    <p className="text-2xl font-black text-green-700 mt-1">{fmt(totalCobrado)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Pendiente</p>
                    <p className="text-2xl font-black text-orange-700 mt-1">{fmt(totalPendiente)}</p>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative w-full md:w-96 mb-6">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por cliente, lote, vehículo..."
                    className="input w-full pl-12 bg-white border-2 border-gray-200 focus:border-red-500 text-gray-800 font-semibold rounded-xl"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>

            {/* Lista */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-sm w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                                <th className="py-3">#</th>
                                <th className="py-3">Fecha</th>
                                <th className="py-3">Cliente</th>
                                <th className="py-3">Lote</th>
                                <th className="py-3">Vehículo</th>
                                <th className="py-3">Origen</th>
                                <th className="py-3 text-right">Precio</th>
                                <th className="py-3 text-right">Cobrado</th>
                                <th className="py-3 text-right">Pendiente</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-16 text-gray-300">
                                        <FaTruck className="mx-auto text-4xl mb-2" />
                                        <p className="font-bold">Sin fletes fiados</p>
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((v, i) => {
                                    const precio = (parseFloat(v.price) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sobrePeso) || 0) + (parseFloat(v.gastosExtra) || 0);
                                    const efectivo = (parseFloat(v.cajaRecibo) || 0) - (parseFloat(v.cajaCambio) || 0);
                                    const cc = parseFloat(v.cajaCC) || 0;
                                    const cobrado = efectivo + cc;
                                    const saldo = parseFloat(v.saldoFiado) || parseFloat(v.pagoTotalPendiente) || 0;

                                    return (
                                        <tr key={v.id} className="border-b border-gray-50 hover:bg-orange-50/30">
                                            <td className="text-gray-300 text-xs">{i + 1}</td>
                                            <td className="text-gray-500 text-xs whitespace-nowrap">{formatFecha(v.timestamp)}</td>
                                            <td className="font-bold text-gray-800">{v.cliente}</td>
                                            <td className="font-mono font-bold text-blue-600">{v.binNip}</td>
                                            <td className="text-gray-600">{v.marca} {v.modelo}</td>
                                            <td className="text-gray-400 text-xs">{v.ciudad}, {v.estado}</td>
                                            <td className="text-right">{fmt(precio)}</td>
                                            <td className="text-right text-green-600">{fmt(cobrado)}</td>
                                            <td className="text-right font-bold text-orange-600">{fmt(saldo)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer total */}
                {filtrados.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <p className="text-sm font-black text-gray-500 uppercase">{filtrados.length} fletes fiados</p>
                        <div className="flex gap-8">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Cobrado</p>
                                <p className="text-lg font-black text-green-700">{fmt(totalCobrado)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-orange-400 uppercase font-bold">Pendiente</p>
                                <p className="text-lg font-black text-orange-700">{fmt(totalPendiente)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FletesFlados;
