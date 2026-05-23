import React, { useState, useEffect, useMemo, useRef } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import ReactToPrint from "react-to-print";
import { FaDollarSign, FaArrowUp, FaArrowDown, FaBalanceScale, FaCar, FaHandHoldingUsd, FaTruck, FaCreditCard, FaCalendarWeek, FaTimes, FaUserTie, FaReceipt, FaPrint } from 'react-icons/fa';

const MESES_NOMBRES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const getLunes = () => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diff);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
};

// Generar meses disponibles (desde enero del año actual hasta el mes actual)
const getMesesDisponibles = () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mesActual = hoy.getMonth();
    const meses = [];
    for (let i = 0; i <= mesActual; i++) {
        meses.push({ value: i, label: MESES_NOMBRES[i], anio });
    }
    return meses;
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
    const [modo, setModo] = useState("semana"); // "semana" | "meses"
    const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [viajesPagados, setViajesPagados] = useState([]);
    const [pagosNomina, setPagosNomina] = useState([]);
    const [gastosAll, setGastosAll] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalData, setModalData] = useState(null);
    const printRef = useRef();

    const mesesDisponibles = useMemo(() => getMesesDisponibles(), []);

    const toggleMes = (mes) => {
        setModo("meses");
        setMesesSeleccionados(prev =>
            prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes].sort((a, b) => a - b)
        );
    };

    const { fechaInicio, fechaFin } = useMemo(() => {
        if (modo === "semana") {
            const lunes = getLunes();
            const fin = new Date();
            fin.setHours(23, 59, 59, 999);
            return { fechaInicio: lunes, fechaFin: fin };
        }
        // Modo meses
        if (mesesSeleccionados.length === 0) {
            return { fechaInicio: new Date(), fechaFin: new Date() };
        }
        const anio = new Date().getFullYear();
        const minMes = Math.min(...mesesSeleccionados);
        const maxMes = Math.max(...mesesSeleccionados);
        const inicio = new Date(anio, minMes, 1, 0, 0, 0, 0);
        // Ultimo dia del mes mas alto
        const fin = new Date(anio, maxMes + 1, 0, 23, 59, 59, 999);
        return { fechaInicio: inicio, fechaFin: fin };
    }, [modo, mesesSeleccionados]);

    useEffect(() => {
        setLoading(true);
        setModalData(null);
        let loadedCount = 0;
        const checkDone = () => { loadedCount++; if (loadedCount >= 4) setLoading(false); };

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

        const unsub3 = firestore()
            .collection(COLLECTIONS.PAGOS_NOMINA)
            .where("fecha", ">=", fechaInicio)
            .where("fecha", "<=", fechaFin)
            .onSnapshot((snap) => {
                setPagosNomina(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                checkDone();
            }, () => checkDone());

        // Gastos: fechaGasto es string "YYYY-MM-DD", no Timestamp — cargar todos los revisados y filtrar en cliente
        const unsub4 = firestore()
            .collection("gastos")
            .where("estado", "==", "revisado")
            .onSnapshot((snap) => {
                setGastosAll(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                checkDone();
            }, () => checkDone());

        return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
    }, [fechaInicio, fechaFin]);

    // === DATOS FILTRADOS ===
    const datos = useMemo(() => {
        // Construir set de lotes que tienen viaje en el periodo para excluir cobros retroactivos (ej: carros 2025 cargados a caja en 2026)
        const lotesConViaje = new Set();
        viajesPagados.forEach(viaje => {
            (viaje.vehiculos || []).forEach(v => { if (v.lote) lotesConViaje.add(v.lote); });
        });

        const vehiculosTodos = movimientos.filter(m => m.estatus === "EN" && m.tipo !== "Pago" && m.tipo !== "Abono");
        // Solo contar cobros de vehiculos que tienen viaje asociado en el periodo
        const vehiculos = vehiculosTodos.filter(m => lotesConViaje.has(m.binNip));
        const anticipos = movimientos.filter(m => m.tipo === "Anticipo");
        const abonos = movimientos.filter(m => m.tipo === "Abono");

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

        // Gastos filtrados por rango de fechas (fechaGasto es string "YYYY-MM-DD")
        const inicioStr = fechaInicio.toISOString().split("T")[0];
        const finStr = fechaFin.toISOString().split("T")[0];
        const gastosFiltrados = gastosAll.filter(g => g.fechaGasto && g.fechaGasto >= inicioStr && g.fechaGasto <= finStr);

        return { vehiculos, anticipos, abonos, vehiculosCredito, vehiculosSaldoPendiente, vehiculosChofer, gastos: gastosFiltrados };
    }, [movimientos, viajesPagados, gastosAll, fechaInicio, fechaFin]);

    // === CALCULOS ===
    const financiero = useMemo(() => {
        const { vehiculos, anticipos, abonos } = datos;

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

        const pcFletes = viajesPagados.reduce((t, vi) => {
            const rf = vi.resumenFinanciero || {};
            // Si existe totalFletes, usar los campos desglosados
            if (rf.totalFletes !== undefined) {
                return t + (parseFloat(rf.totalFletes) || 0);
            }
            // Fallback: sumar fletes desde los vehículos individuales
            return t + (vi.vehiculos || []).reduce((s, v) => s + (parseFloat(v.flete) || 0), 0);
        }, 0);
        const pcStorage = viajesPagados.reduce((t, vi) => {
            const rf = vi.resumenFinanciero || {};
            if (rf.totalStorage !== undefined) return t + (parseFloat(rf.totalStorage) || 0);
            return t + (vi.vehiculos || []).reduce((s, v) => s + (parseFloat(v.storage) || 0), 0);
        }, 0);
        const pcSobrepeso = viajesPagados.reduce((t, vi) => {
            const rf = vi.resumenFinanciero || {};
            if (rf.totalSobrepeso !== undefined) return t + (parseFloat(rf.totalSobrepeso) || 0);
            return t + (vi.vehiculos || []).reduce((s, v) => s + (parseFloat(v.sPeso) || 0), 0);
        }, 0);
        const pcGastosExtra = viajesPagados.reduce((t, vi) => {
            const rf = vi.resumenFinanciero || {};
            if (rf.totalGastosExtra !== undefined) return t + (parseFloat(rf.totalGastosExtra) || 0);
            return t + (vi.vehiculos || []).reduce((s, v) => s + (parseFloat(v.gExtra) || 0), 0);
        }, 0);
        const pcVehiculos = viajesPagados.reduce((t, vi) => {
            const rf = vi.resumenFinanciero || {};
            if (rf.totalVehiculos !== undefined) return t + (parseFloat(rf.totalVehiculos) || 0);
            return t + (vi.vehiculos || []).length;
        }, 0);

        const pc = {
            count: viajesPagados.length,
            totalFletes: pcFletes,
            totalStorage: pcStorage,
            totalSobrepeso: pcSobrepeso,
            totalGastosExtra: pcGastosExtra,
            granTotal: pcFletes + pcStorage + pcSobrepeso + pcGastosExtra,
            totalVehiculos: pcVehiculos,
        };

        const nomina = { count: pagosNomina.length, total: pagosNomina.reduce((t, p) => t + (parseFloat(p.monto) || 0), 0) };

        const gastos = { count: datos.gastos.length, total: datos.gastos.reduce((t, g) => t + (parseFloat(g.monto) || 0), 0) };

        const totalIngresos = v.efectivo + v.cc + ant.total + ab.efectivo + ab.cc;
        const totalEgresos = pc.granTotal + nomina.total + gastos.total;

        return { vehiculos: v, credito: { otorgado: creditoOtorgado, saldoPendiente }, anticipos: ant, abonos: ab, pagosChoferes: pc, nomina, gastos, totalIngresos, totalEgresos, balance: totalIngresos - totalEgresos };
    }, [datos, viajesPagados, pagosNomina]);

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
            <div className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Estado Financiero</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{formatFecha(fechaInicio)} — {formatFecha(fechaFin)}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setModo("semana"); setMesesSeleccionados([]); }}
                            className={`btn btn-sm font-black uppercase gap-2 ${modo === "semana" ? "btn-error text-white" : "btn-outline"}`}
                        >
                            <FaCalendarWeek size={12} /> Semana Actual
                        </button>
                        <ReactToPrint
                            trigger={() => (
                                <button className="btn btn-sm btn-outline font-black uppercase gap-2">
                                    <FaPrint size={12} /> Imprimir
                                </button>
                            )}
                            content={() => printRef.current}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black uppercase text-gray-400 mr-1">Meses:</span>
                    {mesesDisponibles.map(m => (
                        <button
                            key={m.value}
                            onClick={() => toggleMes(m.value)}
                            className={`btn btn-xs font-black uppercase ${mesesSeleccionados.includes(m.value) ? "btn-error text-white" : "btn-outline btn-ghost"}`}
                        >
                            {m.label}
                        </button>
                    ))}
                    {mesesSeleccionados.length > 0 && (
                        <button
                            onClick={() => { setMesesSeleccionados([]); setModo("semana"); }}
                            className="btn btn-xs btn-ghost text-gray-400 font-bold uppercase"
                        >
                            <FaTimes size={10} /> Limpiar
                        </button>
                    )}
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

                        {/* Nómina Empleados */}
                        <div className="p-4">
                            <button onClick={() => setModalData({
                                titulo: 'Nómina de Empleados',
                                items: pagosNomina,
                                columnas: [
                                    { key: 'empleadoNombre', label: 'Empleado', bold: true },
                                    { key: 'concepto', label: 'Concepto' },
                                    { key: 'nota', label: 'Nota', render: (m) => m.nota || '-' },
                                    { key: 'fecha', label: 'Fecha', render: (m) => formatTs(m.fecha) },
                                    { key: 'monto', label: 'Monto', align: 'right', fmt: true, bold: true, color: 'text-red-700' },
                                ],
                                total: financiero.nomina.total
                            })} className="flex items-center justify-between w-full hover:bg-gray-50 rounded-lg p-1 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><FaUserTie className="text-purple-600" size={14} /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Nómina Empleados</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.nomina.count} pagos</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-red-700">{fmt(financiero.nomina.total)}</p>
                            </button>
                        </div>

                        {/* Gastos Operativos */}
                        <div className="p-4">
                            <button onClick={() => setModalData({
                                titulo: 'Gastos Operativos',
                                items: datos.gastos,
                                columnas: [
                                    { key: 'concepto', label: 'Concepto', bold: true },
                                    { key: 'categoria', label: 'Categoría' },
                                    { key: 'metodoPago', label: 'Pago' },
                                    { key: 'fechaGasto', label: 'Fecha' },
                                    { key: 'creadoPor', label: 'Subido por', render: (g) => g.creadoPor?.nombre || '-' },
                                    { key: 'monto', label: 'Monto', align: 'right', fmt: true, bold: true, color: 'text-red-700' },
                                ],
                                total: financiero.gastos.total
                            })} className="flex items-center justify-between w-full hover:bg-gray-50 rounded-lg p-1 transition-all cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center"><FaReceipt className="text-pink-600" size={14} /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Gastos Operativos</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{financiero.gastos.count} gastos</p>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-red-700">{fmt(financiero.gastos.total)}</p>
                            </button>
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

            {/* Vista de impresión oculta */}
            <div style={{ display: 'none' }}>
                <div ref={printRef} style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#111' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #b40a0a', paddingBottom: '16px' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Jorge Minnesota Logistic LLC</h1>
                        <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '8px 0 4px', color: '#444' }}>Estado Financiero</h2>
                        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{formatFecha(fechaInicio)} — {formatFecha(fechaFin)}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                        {/* INGRESOS */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: '#166534', borderBottom: '2px solid #166534', paddingBottom: '4px', marginBottom: '12px' }}>Ingresos</h3>
                            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 4px', fontWeight: '700' }}>Cobro de Vehículos</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#666' }}>{financiero.vehiculos.count} vehs</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>{fmt(financiero.vehiculos.efectivo + financiero.vehiculos.cc)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888' }}>
                                        <td style={{ padding: '2px 4px 2px 16px' }}>Transporte</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{fmt(financiero.vehiculos.precio)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888' }}>
                                        <td style={{ padding: '2px 4px 2px 16px' }}>Storage</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{fmt(financiero.vehiculos.storage)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888' }}>
                                        <td style={{ padding: '2px 4px 2px 16px' }}>Sobrepeso</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{fmt(financiero.vehiculos.sobrePeso)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888', borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '2px 4px 6px 16px' }}>Gastos Extra</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px 6px' }}>{fmt(financiero.vehiculos.gastosExtra)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888' }}>
                                        <td style={{ padding: '2px 4px 2px 16px' }}>Efectivo</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{fmt(financiero.vehiculos.efectivo)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888', borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '2px 4px 6px 16px' }}>Tarjeta/CC</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px 6px' }}>{fmt(financiero.vehiculos.cc)}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 4px', fontWeight: '700' }}>Pagos Adelantados</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#666' }}>{financiero.anticipos.count}</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>{fmt(financiero.anticipos.total)}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 4px', fontWeight: '700' }}>Abonos de Fiados</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#666' }}>{financiero.abonos.count}</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>{fmt(financiero.abonos.efectivo + financiero.abonos.cc)}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #166534' }}>
                                        <td style={{ padding: '8px 4px', fontWeight: '900', fontSize: '13px' }}>TOTAL INGRESOS</td>
                                        <td></td>
                                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '900', fontSize: '13px', color: '#166534' }}>{fmt(financiero.totalIngresos)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* EGRESOS */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: '#991b1b', borderBottom: '2px solid #991b1b', paddingBottom: '4px', marginBottom: '12px' }}>Egresos</h3>
                            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 4px', fontWeight: '700' }}>Pagos a Choferes</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#666' }}>{financiero.pagosChoferes.count} viajes / {financiero.pagosChoferes.totalVehiculos} vehs</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>{fmt(financiero.pagosChoferes.granTotal)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888' }}>
                                        <td style={{ padding: '2px 4px 2px 16px' }}>Fletes</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{fmt(financiero.pagosChoferes.totalFletes)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888' }}>
                                        <td style={{ padding: '2px 4px 2px 16px' }}>Storage</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{fmt(financiero.pagosChoferes.totalStorage)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888' }}>
                                        <td style={{ padding: '2px 4px 2px 16px' }}>Sobrepeso</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{fmt(financiero.pagosChoferes.totalSobrepeso)}</td>
                                    </tr>
                                    <tr style={{ fontSize: '10px', color: '#888', borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '2px 4px 6px 16px' }}>Gastos Extra</td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', padding: '2px 4px 6px' }}>{fmt(financiero.pagosChoferes.totalGastosExtra)}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 4px', fontWeight: '700' }}>Nómina Empleados</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#666' }}>{financiero.nomina.count} pagos</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>{fmt(financiero.nomina.total)}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 4px', fontWeight: '700' }}>Gastos Operativos</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#666' }}>{financiero.gastos.count} gastos</td>
                                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>{fmt(financiero.gastos.total)}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #991b1b' }}>
                                        <td style={{ padding: '8px 4px', fontWeight: '900', fontSize: '13px' }}>TOTAL EGRESOS</td>
                                        <td></td>
                                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '900', fontSize: '13px', color: '#991b1b' }}>{fmt(financiero.totalEgresos)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Informativos */}
                            <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '10px' }}>
                                <p style={{ fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', color: '#92400e' }}>Informativo (no afecta balance)</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Crédito Otorgado</span>
                                    <span style={{ fontWeight: '700' }}>{fmt(financiero.credito.otorgado)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Saldo Pendiente por cobrar</span>
                                    <span style={{ fontWeight: '700' }}>{fmt(financiero.credito.saldoPendiente)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BALANCE */}
                    <div style={{ border: `3px solid ${financiero.balance >= 0 ? '#1d4ed8' : '#c2410c'}`, borderRadius: '8px', padding: '16px', textAlign: 'center', backgroundColor: financiero.balance >= 0 ? '#eff6ff' : '#fff7ed' }}>
                        <p style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#666', marginBottom: '4px' }}>Balance Neto del Periodo</p>
                        <p style={{ fontSize: '28px', fontWeight: '900', color: financiero.balance >= 0 ? '#1d4ed8' : '#c2410c', margin: '4px 0' }}>
                            {financiero.balance < 0 ? '-' : ''}{fmt(financiero.balance)}
                        </p>
                        <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>
                            Ingresos {fmt(financiero.totalIngresos)} — Egresos {fmt(financiero.totalEgresos)}
                        </p>
                    </div>

                    <p style={{ fontSize: '9px', color: '#aaa', textAlign: 'center', marginTop: '20px' }}>
                        Generado el {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} — Jorge Minnesota Logistic LLC
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EstadoFinanciero;
