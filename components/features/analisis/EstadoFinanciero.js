import React, { useState, useEffect, useMemo } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaDollarSign, FaArrowUp, FaArrowDown, FaBalanceScale, FaCar, FaHandHoldingUsd, FaMoneyBillWave, FaTruck, FaCreditCard, FaCalendarWeek } from 'react-icons/fa';

const SEMANAS_OPTIONS = [
    { value: 1, label: "Semana actual" },
    { value: 2, label: "Últimas 2 semanas" },
    { value: 3, label: "Últimas 3 semanas" },
    { value: 4, label: "Últimas 4 semanas" },
];

// Obtener el lunes de la semana actual
const getLunes = () => {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0=dom, 1=lun, ...
    const diff = dia === 0 ? 6 : dia - 1; // Si es domingo, retroceder 6 días
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diff);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
};

const EstadoFinanciero = () => {
    const [semanas, setSemanas] = useState(1);
    const [movimientos, setMovimientos] = useState([]);
    const [viajesPagados, setViajesPagados] = useState([]);
    const [loading, setLoading] = useState(true);

    // Calcular rango de fechas
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

    // === CALCULOS FINANCIEROS ===
    const financiero = useMemo(() => {
        // VEHICULOS ENTREGADOS (cobros)
        const vehiculos = movimientos.filter(m => m.estatus === "EN" && m.tipo !== "Pago" && m.tipo !== "Abono");
        const vehiculosEfectivo = vehiculos.reduce((t, m) => t + ((parseFloat(m.cajaRecibo) || 0) - (parseFloat(m.cajaCambio) || 0)), 0);
        const vehiculosCC = vehiculos.reduce((t, m) => t + (parseFloat(m.cajaCC) || 0), 0);
        const vehiculosTotal = vehiculos.reduce((t, m) => t + (parseFloat(m.totalPago) || 0), 0);
        const vehiculosStorage = vehiculos.reduce((t, m) => t + (parseFloat(m.storage) || 0), 0);
        const vehiculosSobrePeso = vehiculos.reduce((t, m) => t + (parseFloat(m.sobrePeso) || 0), 0);
        const vehiculosGastosExtra = vehiculos.reduce((t, m) => t + (parseFloat(m.gastosExtra) || 0), 0);
        const vehiculosPrecio = vehiculos.reduce((t, m) => t + (parseFloat(m.pago) || 0), 0);

        // CREDITO OTORGADO
        const creditoOtorgado = vehiculos.reduce((t, m) => t + (parseFloat(m.creditoOtorgado) || 0), 0);
        const saldoFiado = vehiculos.reduce((t, m) => {
            if (typeof m.saldoFiado === "number") return t + parseFloat(m.saldoFiado);
            return t + (parseFloat(m.pagoTotalPendiente) || 0);
        }, 0);

        // ANTICIPOS
        const anticipos = movimientos.filter(m => m.tipo === "Anticipo");
        const totalAnticipos = anticipos.reduce((t, m) => t + (parseFloat(m.anticipoPago) || 0), 0);

        // ABONOS DE FIADOS
        const abonos = movimientos.filter(m => m.tipo === "Abono");
        const abonosEfectivo = abonos.reduce((t, m) => t + (parseFloat(m.cajaRecibo) || 0), 0);
        const abonosCC = abonos.reduce((t, m) => t + (parseFloat(m.cajaCC) || 0), 0);

        // ENTRADAS DE CAJA
        const entradas = movimientos.filter(m => m.estatus === "EE" && m.tipo === "Entrada");
        const totalEntradas = entradas.reduce((t, m) => t + (parseFloat(m.cajaRecibo) || 0), 0);

        // PAGOS A CHOFERES (de viajesPagados)
        const pagosChoferes = {
            count: viajesPagados.length,
            totalFletes: viajesPagados.reduce((t, v) => t + (parseFloat(v.resumenFinanciero?.totalFletes) || 0), 0),
            totalStorage: viajesPagados.reduce((t, v) => t + (parseFloat(v.resumenFinanciero?.totalStorage) || 0), 0),
            totalSobrepeso: viajesPagados.reduce((t, v) => t + (parseFloat(v.resumenFinanciero?.totalSobrepeso) || 0), 0),
            totalGastosExtra: viajesPagados.reduce((t, v) => t + (parseFloat(v.resumenFinanciero?.totalGastosExtra) || 0), 0),
            granTotal: viajesPagados.reduce((t, v) => t + (parseFloat(v.resumenFinanciero?.granTotal) || 0), 0),
            totalVehiculos: viajesPagados.reduce((t, v) => t + (parseFloat(v.resumenFinanciero?.totalVehiculos) || 0), 0),
        };

        // TOTALES
        const totalIngresos = vehiculosEfectivo + vehiculosCC + totalAnticipos + abonosEfectivo + abonosCC + totalEntradas;
        const totalEgresos = pagosChoferes.granTotal;
        const balance = totalIngresos - totalEgresos;

        return {
            vehiculos: { count: vehiculos.length, efectivo: vehiculosEfectivo, cc: vehiculosCC, total: vehiculosTotal, storage: vehiculosStorage, sobrePeso: vehiculosSobrePeso, gastosExtra: vehiculosGastosExtra, precio: vehiculosPrecio },
            credito: { otorgado: creditoOtorgado, saldoPendiente: saldoFiado },
            anticipos: { count: anticipos.length, total: totalAnticipos },
            abonos: { count: abonos.length, efectivo: abonosEfectivo, cc: abonosCC },
            entradas: { count: entradas.length, total: totalEntradas },
            pagosChoferes,
            totalIngresos,
            totalEgresos,
            balance,
        };
    }, [movimientos, viajesPagados]);

    const fmt = (n) => `$${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

    const formatFecha = (d) => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

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
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                        Estado Financiero
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {formatFecha(fechaInicio)} — {formatFecha(fechaFin)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <FaCalendarWeek className="text-gray-400" />
                    <select
                        className="select select-sm bg-white border-2 border-gray-200 font-bold text-gray-700 rounded-xl"
                        value={semanas}
                        onChange={(e) => setSemanas(Number(e.target.value))}
                    >
                        {SEMANAS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Cards resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Ingresos */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaArrowUp className="text-green-600" />
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Ingresos</span>
                    </div>
                    <p className="text-3xl font-black text-green-700">{fmt(financiero.totalIngresos)}</p>
                </div>
                {/* Egresos */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-5 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                        <FaArrowDown className="text-red-600" />
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Total Egresos</span>
                    </div>
                    <p className="text-3xl font-black text-red-700">{fmt(financiero.totalEgresos)}</p>
                </div>
                {/* Balance */}
                <div className={`bg-gradient-to-br rounded-2xl p-5 border ${financiero.balance >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <FaBalanceScale className={financiero.balance >= 0 ? 'text-blue-600' : 'text-orange-600'} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${financiero.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Balance</span>
                    </div>
                    <p className={`text-3xl font-black ${financiero.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        {financiero.balance < 0 ? '-' : ''}{fmt(financiero.balance)}
                    </p>
                </div>
            </div>

            {/* Dos columnas: Ingresos / Egresos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* === INGRESOS === */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="bg-green-600 px-5 py-3">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <FaArrowUp /> Ingresos
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">

                        {/* Cobro de Vehiculos */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <FaCar className="text-green-600" size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Cobro de Vehículos</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.vehiculos.count} vehículos entregados</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-green-700">{fmt(financiero.vehiculos.efectivo + financiero.vehiculos.cc)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 ml-10">
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Transporte</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.vehiculos.precio)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Storage</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.vehiculos.storage)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Sobrepeso</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.vehiculos.sobrePeso)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Gastos Extra</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.vehiculos.gastosExtra)}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-green-500 uppercase font-bold">Efectivo</p>
                                    <p className="text-sm font-bold text-green-700">{fmt(financiero.vehiculos.efectivo)}</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-blue-500 uppercase font-bold">Tarjeta/CC</p>
                                    <p className="text-sm font-bold text-blue-700">{fmt(financiero.vehiculos.cc)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Anticipos */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <FaHandHoldingUsd className="text-emerald-600" size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Pagos Adelantados</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{financiero.anticipos.count} anticipos</p>
                                </div>
                            </div>
                            <p className="text-lg font-black text-green-700">{fmt(financiero.anticipos.total)}</p>
                        </div>

                        {/* Abonos de Fiados */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                        <FaCreditCard className="text-teal-600" size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Abonos de Fiados</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.abonos.count} abonos recibidos</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-green-700">{fmt(financiero.abonos.efectivo + financiero.abonos.cc)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 ml-10">
                                <div className="bg-green-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-green-500 uppercase font-bold">Efectivo</p>
                                    <p className="text-sm font-bold text-green-700">{fmt(financiero.abonos.efectivo)}</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-blue-500 uppercase font-bold">Tarjeta/CC</p>
                                    <p className="text-sm font-bold text-blue-700">{fmt(financiero.abonos.cc)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Entradas de Caja */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-lime-100 rounded-lg flex items-center justify-center">
                                    <FaMoneyBillWave className="text-lime-600" size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Entradas de Caja</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{financiero.entradas.count} entradas</p>
                                </div>
                            </div>
                            <p className="text-lg font-black text-green-700">{fmt(financiero.entradas.total)}</p>
                        </div>

                        {/* Total Ingresos */}
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
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <FaArrowDown /> Egresos
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">

                        {/* Pagos a Choferes */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                        <FaTruck className="text-red-600" size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Pagos a Choferes</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.pagosChoferes.count} viajes liquidados — {financiero.pagosChoferes.totalVehiculos} vehículos</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-red-700">{fmt(financiero.pagosChoferes.granTotal)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 ml-10">
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Fletes</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.pagosChoferes.totalFletes)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Storage</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.pagosChoferes.totalStorage)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Sobrepeso</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.pagosChoferes.totalSobrepeso)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Gastos Extra</p>
                                    <p className="text-sm font-bold text-gray-700">{fmt(financiero.pagosChoferes.totalGastosExtra)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Crédito Otorgado */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <FaDollarSign className="text-orange-600" size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Crédito Otorgado</p>
                                    <p className="text-[10px] text-orange-500 uppercase font-bold">Informativo — no es salida de caja</p>
                                </div>
                            </div>
                            <p className="text-lg font-black text-orange-600">{fmt(financiero.credito.otorgado)}</p>
                        </div>

                        {/* Saldo Pendiente de Cobro */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <FaBalanceScale className="text-yellow-600" size={14} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Saldo Pendiente</p>
                                    <p className="text-[10px] text-yellow-600 uppercase font-bold">Por cobrar de fiados</p>
                                </div>
                            </div>
                            <p className="text-lg font-black text-yellow-700">{fmt(financiero.credito.saldoPendiente)}</p>
                        </div>

                        {/* Total Egresos */}
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
                            <p className={`text-sm font-black uppercase tracking-wider ${financiero.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                                Balance Neto del Periodo
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase">
                                {formatFecha(fechaInicio)} — {formatFecha(fechaFin)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-4xl font-black ${financiero.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                            {financiero.balance < 0 ? '-' : ''}{fmt(financiero.balance)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Ingresos {fmt(financiero.totalIngresos)} — Egresos {fmt(financiero.totalEgresos)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EstadoFinanciero;
