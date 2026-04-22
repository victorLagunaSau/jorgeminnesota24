import React, { useState, useEffect, useMemo } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaDollarSign, FaArrowUp, FaArrowDown, FaBalanceScale, FaCar, FaHandHoldingUsd, FaMoneyBillWave, FaTruck, FaCreditCard, FaCalendarWeek, FaTimes } from 'react-icons/fa';

const SEMANAS_OPTIONS = [
    { value: 1, label: "Semana actual" },
    { value: 2, label: "Últimas 2 semanas" },
    { value: 3, label: "Últimas 3 semanas" },
    { value: 4, label: "Últimas 4 semanas" },
];

const getLunes = () => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diff);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
};

const fmt = (n) => `$${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const formatFecha = (d) => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const formatTs = (ts) => {
    if (!ts) return '-';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : ts instanceof Date ? ts : null;
    return d ? d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '-';
};

// Modal de detalle fullscreen
const DetalleModal = ({ titulo, items, columnas, total, onClose }) => {
    if (!titulo) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{titulo}</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase">{items.length} registros</p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-circle bg-gray-100 hover:bg-gray-200 border-none">
                        <FaTimes />
                    </button>
                </div>
                {/* Tabla */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {items.length === 0 ? (
                        <div className="text-center py-16 text-gray-300">
                            <p className="text-lg font-bold">Sin registros en este periodo</p>
                        </div>
                    ) : (
                        <table className="table table-sm w-full">
                            <thead>
                                <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                                    <th className="py-3">#</th>
                                    {columnas.map(c => (
                                        <th key={c.key} className={`py-3 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {items.map((item, i) => (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="text-gray-300 text-xs">{i + 1}</td>
                                        {columnas.map(c => (
                                            <td key={c.key} className={`${c.align === 'right' ? 'text-right' : ''} ${c.bold ? 'font-bold' : ''} ${c.color || 'text-gray-600'}`}>
                                                {c.render ? c.render(item) : (c.fmt ? fmt(parseFloat(item[c.key]) || 0) : (item[c.key] || '-'))}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* Footer con total */}
                {total !== undefined && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
                        <p className="text-sm font-black text-gray-500 uppercase">Total</p>
                        <p className="text-2xl font-black text-gray-800">{fmt(total)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Cajita clickeable que abre modal
const SubItem = ({ label, monto, color = "text-gray-700", bg = "bg-gray-50", items, columnas, setModalData }) => {
    return (
        <button
            onClick={() => setModalData({ titulo: label, items, columnas, total: monto })}
            className={`${bg} rounded-lg px-3 py-2 w-full text-left hover:ring-2 hover:ring-gray-300 transition-all cursor-pointer`}
        >
            <p className="text-[9px] text-gray-400 uppercase font-bold">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{fmt(monto)}</p>
        </button>
    );
};

const EstadoFinanciero = () => {
    const [semanas, setSemanas] = useState(1);
    const [movimientos, setMovimientos] = useState([]);
    const [viajesPagados, setViajesPagados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalData, setModalData] = useState(null);

    const { fechaInicio, fechaFin } = useMemo(() => {
        const lunes = getLunes();
        const inicio = new Date(lunes);
        inicio.setDate(inicio.getDate() - (semanas - 1) * 7);
        const fin = new Date();
        fin.setHours(23, 59, 59, 999);
        return { fechaInicio: inicio, fechaFin: fin };
    }, [semanas]);

    useEffect(() => {
        setLoading(true);
        setModalData(null);
        let loadedCount = 0;
        const checkDone = () => { loadedCount++; if (loadedCount >= 2) setLoading(false); };

        const unsub1 = firestore()
            .collection(COLLECTIONS.MOVIMIENTOS)
            .where("timestamp", ">=", fechaInicio)
            .where("timestamp", "<=", fechaFin)
            .onSnapshot((snap) => {
                setMovimientos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                checkDone();
            }, () => checkDone());

        const unsub2 = firestore()
            .collection(COLLECTIONS.VIAJES_PAGADOS)
            .where("fechaPago", ">=", fechaInicio)
            .where("fechaPago", "<=", fechaFin)
            .onSnapshot((snap) => {
                setViajesPagados(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                checkDone();
            }, () => checkDone());

        return () => { unsub1(); unsub2(); };
    }, [fechaInicio, fechaFin]);

    // === DATOS FILTRADOS ===
    const datos = useMemo(() => {
        const vehiculos = movimientos.filter(m => m.estatus === "EN" && m.tipo !== "Pago" && m.tipo !== "Abono");
        const anticipos = movimientos.filter(m => m.tipo === "Anticipo");
        const abonos = movimientos.filter(m => m.tipo === "Abono");
        const entradas = movimientos.filter(m => m.estatus === "EE" && m.tipo === "Entrada");

        // Vehiculos con crédito
        const vehiculosCredito = vehiculos.filter(m => (parseFloat(m.creditoOtorgado) || 0) > 0);
        const vehiculosSaldoPendiente = vehiculos.filter(m => {
            if (typeof m.saldoFiado === "number") return m.saldoFiado > 0;
            return (parseFloat(m.pagoTotalPendiente) || 0) > 0;
        });

        // Desglosar vehiculos de viajes pagados para detalle
        const vehiculosChofer = [];
        viajesPagados.forEach(viaje => {
            (viaje.vehiculos || []).forEach(v => {
                vehiculosChofer.push({
                    ...v,
                    chofer: viaje.chofer?.nombre || '-',
                    empresa: viaje.empresaLiquidada || '-',
                    folioPago: viaje.folioPago || viaje.id,
                    fechaPago: viaje.fechaPago,
                });
            });
        });

        return { vehiculos, anticipos, abonos, entradas, vehiculosCredito, vehiculosSaldoPendiente, vehiculosChofer };
    }, [movimientos, viajesPagados]);

    // === CALCULOS ===
    const financiero = useMemo(() => {
        const { vehiculos, anticipos, abonos, entradas } = datos;

        const v = {
            count: vehiculos.length,
            efectivo: vehiculos.reduce((t, m) => t + ((parseFloat(m.cajaRecibo) || 0) - (parseFloat(m.cajaCambio) || 0)), 0),
            cc: vehiculos.reduce((t, m) => t + (parseFloat(m.cajaCC) || 0), 0),
            precio: vehiculos.reduce((t, m) => t + (parseFloat(m.pago) || 0), 0),
            storage: vehiculos.reduce((t, m) => t + (parseFloat(m.storage) || 0), 0),
            sobrePeso: vehiculos.reduce((t, m) => t + (parseFloat(m.sobrePeso) || 0), 0),
            gastosExtra: vehiculos.reduce((t, m) => t + (parseFloat(m.gastosExtra) || 0), 0),
        };

        const creditoOtorgado = vehiculos.reduce((t, m) => t + (parseFloat(m.creditoOtorgado) || 0), 0);
        const saldoPendiente = vehiculos.reduce((t, m) => {
            if (typeof m.saldoFiado === "number") return t + parseFloat(m.saldoFiado);
            return t + (parseFloat(m.pagoTotalPendiente) || 0);
        }, 0);

        const ant = { count: anticipos.length, total: anticipos.reduce((t, m) => t + (parseFloat(m.anticipoPago) || 0), 0) };
        const ab = { count: abonos.length, efectivo: abonos.reduce((t, m) => t + (parseFloat(m.cajaRecibo) || 0), 0), cc: abonos.reduce((t, m) => t + (parseFloat(m.cajaCC) || 0), 0) };
        const ent = { count: entradas.length, total: entradas.reduce((t, m) => t + (parseFloat(m.cajaRecibo) || 0), 0) };

        const pc = {
            count: viajesPagados.length,
            totalFletes: viajesPagados.reduce((t, vi) => t + (parseFloat(vi.resumenFinanciero?.totalFletes) || 0), 0),
            totalStorage: viajesPagados.reduce((t, vi) => t + (parseFloat(vi.resumenFinanciero?.totalStorage) || 0), 0),
            totalSobrepeso: viajesPagados.reduce((t, vi) => t + (parseFloat(vi.resumenFinanciero?.totalSobrepeso) || 0), 0),
            totalGastosExtra: viajesPagados.reduce((t, vi) => t + (parseFloat(vi.resumenFinanciero?.totalGastosExtra) || 0), 0),
            granTotal: viajesPagados.reduce((t, vi) => t + (parseFloat(vi.resumenFinanciero?.granTotal) || 0), 0),
            totalVehiculos: viajesPagados.reduce((t, vi) => t + (parseFloat(vi.resumenFinanciero?.totalVehiculos) || 0), 0),
        };

        const totalIngresos = v.efectivo + v.cc + ant.total + ab.efectivo + ab.cc + ent.total;
        const totalEgresos = pc.granTotal;

        return { vehiculos: v, credito: { otorgado: creditoOtorgado, saldoPendiente }, anticipos: ant, abonos: ab, entradas: ent, pagosChoferes: pc, totalIngresos, totalEgresos, balance: totalIngresos - totalEgresos };
    }, [datos, viajesPagados]);

    // === COLUMNAS PARA DETALLE ===
    const colVehiculo = (campoMonto, label) => [
        { key: 'binNip', label: 'Lote', bold: true, color: 'text-blue-600' },
        { key: 'marca', label: 'Vehículo', render: (m) => `${m.marca || ''} ${m.modelo || ''}` },
        { key: 'cliente', label: 'Cliente' },
        { key: 'fecha', label: 'Fecha', render: (m) => formatTs(m.timestamp) },
        { key: campoMonto, label: label || campoMonto, align: 'right', fmt: true, bold: true, color: 'text-green-700' },
    ];

    const colChofer = (campoMonto, label) => [
        { key: 'lote', label: 'Lote', bold: true, color: 'text-blue-600' },
        { key: 'vehiculo', label: 'Vehículo', render: (m) => `${m.marca || ''} ${m.modelo || ''}` },
        { key: 'chofer', label: 'Chofer' },
        { key: 'fecha', label: 'Fecha', render: (m) => formatTs(m.fechaPago) },
        { key: campoMonto, label: label, align: 'right', fmt: true, bold: true, color: 'text-red-700' },
    ];

    const colAnticipo = [
        { key: 'binNip', label: 'Lote', bold: true, color: 'text-blue-600' },
        { key: 'marca', label: 'Vehículo', render: (m) => `${m.marca || ''} ${m.modelo || ''}` },
        { key: 'cliente', label: 'Cliente' },
        { key: 'fecha', label: 'Fecha', render: (m) => formatTs(m.timestamp) },
        { key: 'anticipoPago', label: 'Monto', align: 'right', fmt: true, bold: true, color: 'text-green-700' },
    ];

    const colAbono = [
        { key: 'binNip', label: 'Lote', bold: true, color: 'text-blue-600' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'fecha', label: 'Fecha', render: (m) => formatTs(m.timestamp) },
        { key: 'cajaRecibo', label: 'Efectivo', align: 'right', fmt: true, color: 'text-green-700' },
        { key: 'cajaCC', label: 'Tarjeta', align: 'right', fmt: true, color: 'text-blue-600' },
    ];

    const colEntrada = [
        { key: 'entradaCajaReceptor', label: 'Receptor' },
        { key: 'entradaCajaConceptoPago', label: 'Concepto' },
        { key: 'fecha', label: 'Fecha', render: (m) => formatTs(m.timestamp) },
        { key: 'cajaRecibo', label: 'Monto', align: 'right', fmt: true, bold: true, color: 'text-green-700' },
    ];

    const colCredito = [
        { key: 'binNip', label: 'Lote', bold: true, color: 'text-blue-600' },
        { key: 'vehiculo', label: 'Vehículo', render: (m) => `${m.marca || ''} ${m.modelo || ''}` },
        { key: 'cliente', label: 'Cliente' },
        { key: 'creditoOtorgado', label: 'Crédito', align: 'right', fmt: true, bold: true, color: 'text-orange-600' },
    ];

    const colSaldo = [
        { key: 'binNip', label: 'Lote', bold: true, color: 'text-blue-600' },
        { key: 'vehiculo', label: 'Vehículo', render: (m) => `${m.marca || ''} ${m.modelo || ''}` },
        { key: 'cliente', label: 'Cliente' },
        { key: 'saldo', label: 'Pendiente', align: 'right', bold: true, color: 'text-yellow-700', render: (m) => fmt(parseFloat(m.saldoFiado) || parseFloat(m.pagoTotalPendiente) || 0) },
    ];

    // Filtrar vehiculos que tienen monto > 0 en campo dado
    const vehiculosCon = (campo) => datos.vehiculos.filter(m => (parseFloat(m[campo]) || 0) > 0);
    const choferCon = (campo) => datos.vehiculosChofer.filter(m => (parseFloat(m[campo]) || 0) > 0);

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
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Estado Financiero</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{formatFecha(fechaInicio)} — {formatFecha(fechaFin)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <FaCalendarWeek className="text-gray-400" />
                    <select className="select select-sm bg-white border-2 border-gray-200 font-bold text-gray-700 rounded-xl" value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
                        {SEMANAS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Cards resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaArrowUp className="text-green-600" />
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Ingresos</span>
                    </div>
                    <p className="text-3xl font-black text-green-700">{fmt(financiero.totalIngresos)}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-5 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaArrowDown className="text-red-600" />
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Total Egresos</span>
                    </div>
                    <p className="text-3xl font-black text-red-700">{fmt(financiero.totalEgresos)}</p>
                </div>
                <div className={`bg-gradient-to-br rounded-2xl p-5 border ${financiero.balance >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <FaBalanceScale className={financiero.balance >= 0 ? 'text-blue-600' : 'text-orange-600'} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${financiero.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Balance</span>
                    </div>
                    <p className={`text-3xl font-black ${financiero.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{financiero.balance < 0 ? '-' : ''}{fmt(financiero.balance)}</p>
                </div>
            </div>

            {/* Dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* === INGRESOS === */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="bg-green-600 px-5 py-3">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2"><FaArrowUp /> Ingresos</h3>
                    </div>
                    <div className="divide-y divide-gray-100">

                        {/* Cobro de Vehiculos */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><FaCar className="text-green-600" size={14} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Cobro de Vehículos</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.vehiculos.count} vehículos entregados</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-green-700">{fmt(financiero.vehiculos.efectivo + financiero.vehiculos.cc)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 ml-10">
                                <SubItem label="Transporte" monto={financiero.vehiculos.precio} items={vehiculosCon('pago')} columnas={colVehiculo('pago', 'Flete')} setModalData={setModalData} />
                                <SubItem label="Storage" monto={financiero.vehiculos.storage} items={vehiculosCon('storage')} columnas={colVehiculo('storage', 'Storage')} setModalData={setModalData} />
                                <SubItem label="Sobrepeso" monto={financiero.vehiculos.sobrePeso} items={vehiculosCon('sobrePeso')} columnas={colVehiculo('sobrePeso', 'Sobrepeso')} setModalData={setModalData} />
                                <SubItem label="Gastos Extra" monto={financiero.vehiculos.gastosExtra} items={vehiculosCon('gastosExtra')} columnas={colVehiculo('gastosExtra', 'Extra')} setModalData={setModalData} />
                                <SubItem label="Efectivo" monto={financiero.vehiculos.efectivo} bg="bg-green-50" color="text-green-700" items={datos.vehiculos.filter(m => ((parseFloat(m.cajaRecibo)||0)-(parseFloat(m.cajaCambio)||0)) > 0)} columnas={colVehiculo('cajaRecibo', 'Efectivo')} setModalData={setModalData} />
                                <SubItem label="Tarjeta/CC" monto={financiero.vehiculos.cc} bg="bg-blue-50" color="text-blue-700" items={vehiculosCon('cajaCC')} columnas={colVehiculo('cajaCC', 'Tarjeta')} setModalData={setModalData} />
                            </div>
                        </div>

                        {/* Anticipos */}
                        <div className="p-4">
                            <button onClick={() => setModalData({ titulo: 'Pagos Adelantados', items: datos.anticipos, columnas: colAnticipo, total: financiero.anticipos.total })} className="flex items-center justify-between w-full hover:bg-gray-50 rounded-lg p-1 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><FaHandHoldingUsd className="text-emerald-600" size={14} /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Pagos Adelantados</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.anticipos.count} anticipos</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-green-700">{fmt(financiero.anticipos.total)}</p>
                            </button>
                        </div>

                        {/* Abonos */}
                        <div className="p-4">
                            <button onClick={() => setModalData({ titulo: 'Abonos de Fiados', items: datos.abonos, columnas: colAbono, total: financiero.abonos.efectivo + financiero.abonos.cc })} className="flex items-center justify-between w-full hover:bg-gray-50 rounded-lg p-1 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center"><FaCreditCard className="text-teal-600" size={14} /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Abonos de Fiados</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.abonos.count} abonos recibidos</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-green-700">{fmt(financiero.abonos.efectivo + financiero.abonos.cc)}</p>
                            </button>
                        </div>

                        {/* Entradas */}
                        <div className="p-4">
                            <button onClick={() => setModalData({ titulo: 'Entradas de Caja', items: datos.entradas, columnas: colEntrada, total: financiero.entradas.total })} className="flex items-center justify-between w-full hover:bg-gray-50 rounded-lg p-1 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-lime-100 rounded-lg flex items-center justify-center"><FaMoneyBillWave className="text-lime-600" size={14} /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Entradas de Caja</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.entradas.count} entradas</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-green-700">{fmt(financiero.entradas.total)}</p>
                            </button>
                        </div>

                        {/* Total */}
                        <div className="p-4 bg-green-50">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-green-800 uppercase">Total Ingresos</p>
                                <p className="text-xl font-black text-green-800">{fmt(financiero.totalIngresos)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === EGRESOS === */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="bg-red-600 px-5 py-3">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2"><FaArrowDown /> Egresos</h3>
                    </div>
                    <div className="divide-y divide-gray-100">

                        {/* Pagos a Choferes */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><FaTruck className="text-red-600" size={14} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Pagos a Choferes</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.pagosChoferes.count} viajes — {financiero.pagosChoferes.totalVehiculos} vehículos</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-red-700">{fmt(financiero.pagosChoferes.granTotal)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 ml-10">
                                <SubItem label="Fletes" monto={financiero.pagosChoferes.totalFletes} items={choferCon('flete')} columnas={colChofer('flete', 'Flete')} setModalData={setModalData} />
                                <SubItem label="Storage" monto={financiero.pagosChoferes.totalStorage} items={choferCon('storage')} columnas={colChofer('storage', 'Storage')} setModalData={setModalData} />
                                <SubItem label="Sobrepeso" monto={financiero.pagosChoferes.totalSobrepeso} items={choferCon('sPeso')} columnas={colChofer('sPeso', 'Sobrepeso')} setModalData={setModalData} />
                                <SubItem label="Gastos Extra" monto={financiero.pagosChoferes.totalGastosExtra} items={choferCon('gExtra')} columnas={colChofer('gExtra', 'Extra')} setModalData={setModalData} />
                            </div>
                        </div>

                        {/* Crédito Otorgado */}
                        <div className="p-4">
                            <button onClick={() => setModalData({ titulo: 'Crédito Otorgado', items: datos.vehiculosCredito, columnas: colCredito, total: financiero.credito.otorgado })} className="flex items-center justify-between w-full hover:bg-gray-50 rounded-lg p-1 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><FaDollarSign className="text-orange-600" size={14} /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Crédito Otorgado</p>
                                        <p className="text-[10px] text-orange-500 uppercase font-bold">Informativo</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-orange-600">{fmt(financiero.credito.otorgado)}</p>
                            </button>
                        </div>

                        {/* Saldo Pendiente */}
                        <div className="p-4">
                            <button onClick={() => setModalData({ titulo: 'Saldo Pendiente', items: datos.vehiculosSaldoPendiente, columnas: colSaldo, total: financiero.credito.saldoPendiente })} className="flex items-center justify-between w-full hover:bg-gray-50 rounded-lg p-1 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center"><FaBalanceScale className="text-yellow-600" size={14} /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Saldo Pendiente</p>
                                        <p className="text-[10px] text-yellow-600 uppercase font-bold">Por cobrar de fiados</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-yellow-700">{fmt(financiero.credito.saldoPendiente)}</p>
                            </button>
                        </div>

                        {/* Total */}
                        <div className="p-4 bg-red-50">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-red-800 uppercase">Total Egresos</p>
                                <p className="text-xl font-black text-red-800">{fmt(financiero.totalEgresos)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Final */}
            <div className={`mt-6 rounded-2xl p-6 border-2 ${financiero.balance >= 0 ? 'bg-blue-50 border-blue-300' : 'bg-orange-50 border-orange-300'}`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <FaBalanceScale className={`text-2xl ${financiero.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                        <div>
                            <p className={`text-sm font-black uppercase tracking-wider ${financiero.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balance Neto del Periodo</p>
                            <p className="text-[10px] text-gray-500 uppercase">{formatFecha(fechaInicio)} — {formatFecha(fechaFin)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-4xl font-black ${financiero.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{financiero.balance < 0 ? '-' : ''}{fmt(financiero.balance)}</p>
                        <p className="text-xs text-gray-400 mt-1">Ingresos {fmt(financiero.totalIngresos)} — Egresos {fmt(financiero.totalEgresos)}</p>
                    </div>
                </div>
            </div>

            {/* Modal de detalle */}
            {modalData && (
                <DetalleModal
                    titulo={modalData.titulo}
                    items={modalData.items}
                    columnas={modalData.columnas}
                    total={modalData.total}
                    onClose={() => setModalData(null)}
                />
            )}
        </div>
    );
};

export default EstadoFinanciero;
