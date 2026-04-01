import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import firebase from "firebase/app";
import { FaSearch, FaFileExcel, FaTruck, FaBuilding, FaFileInvoice, FaLayerGroup } from "react-icons/fa";
import * as XLSX from "xlsx";
import moment from "moment";

const ReporteViajesPagados = ({ user }) => {
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('semana');
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(false);

    const calcularFechas = (periodo) => {
        const hoy = new Date();
        const diaSemana = hoy.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado

        // Calcular el sábado de esta semana
        let diasHastaSabado = 6 - diaSemana;
        if (diaSemana === 0) diasHastaSabado = -1; // Si es domingo, el sábado fue ayer
        const sabadoActual = new Date(hoy);
        sabadoActual.setDate(hoy.getDate() + diasHastaSabado);
        sabadoActual.setHours(23, 59, 59, 999);

        // Calcular el lunes según el período
        let lunesInicio = new Date(sabadoActual);

        if (periodo === 'semana') {
            // Lunes de esta semana
            lunesInicio.setDate(sabadoActual.getDate() - 5);
        } else if (periodo === 'quincena') {
            // Lunes de hace 2 semanas
            lunesInicio.setDate(sabadoActual.getDate() - 12);
        } else if (periodo === 'mensual') {
            // Lunes de hace 4 semanas (aproximadamente 1 mes)
            lunesInicio.setDate(sabadoActual.getDate() - 26);
        }

        lunesInicio.setHours(0, 0, 0, 0);

        return { inicio: lunesInicio, fin: sabadoActual };
    };

    const consultarViajes = async (periodo) => {
        setPeriodoSeleccionado(periodo);
        setLoading(true);
        try {
            const { inicio, fin } = calcularFechas(periodo);
            const snap = await firestore().collection("viajesPagados")
                .where("fechaPago", ">=", firebase.firestore.Timestamp.fromDate(inicio))
                .where("fechaPago", "<=", firebase.firestore.Timestamp.fromDate(fin))
                .orderBy("fechaPago", "asc")
                .get();
            setViajes(snap.docs.map(doc => doc.data()));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    // Cargar automáticamente el historial de 1 semana al iniciar
    useEffect(() => {
        consultarViajes('semana');
    }, []);

    const exportarExcel = () => {
        const dataExcel = viajes.flatMap(viaje =>
            viaje.vehiculos.map(v => ({
                "FECHA PAGO": moment(viaje.fechaPago.toDate()).format("DD/MM/YYYY"),
                "FOLIO": viaje.folioPago,
                "EMPRESA": viaje.empresaLiquidada,
                "CHOFER": viaje.chofer?.nombre,
                "LOTE": v.lote,
                "VEHICULO": `${v.marca} ${v.modelo}`,
                "FLETE": parseFloat(v.flete || 0),
                "GASTOS": parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0),
                "TOTAL": parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0)
            }))
        );
        const ws = XLSX.utils.json_to_sheet(dataExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `Reporte_Logistica.xlsx`);
    };

    const totalGeneral = viajes.reduce((acc, v) => acc + (v.resumenFinanciero?.granTotal || 0), 0);

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-black">
            <div className="sticky top-0 z-50 p-6 bg-white border-b-2 border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                            Historial de Viajes
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Viajes Liquidados y Pagados
                        </p>
                    </div>
                    {viajes.length > 0 && (
                        <div className="bg-white border-2 border-black p-4 rounded-xl text-black text-center shadow-lg">
                            <h4 className="text-[10px] font-black uppercase opacity-60 italic">Total Período</h4>
                            <span className="text-2xl font-black italic">${totalGeneral.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => consultarViajes('semana')}
                                className={`btn btn-sm font-black uppercase ${periodoSeleccionado === 'semana' ? 'btn-error text-white' : 'btn-outline'}`}
                            >
                                1 Semana (Lun-Sáb)
                            </button>
                            <button
                                onClick={() => consultarViajes('quincena')}
                                className={`btn btn-sm font-black uppercase ${periodoSeleccionado === 'quincena' ? 'btn-error text-white' : 'btn-outline'}`}
                            >
                                2 Semanas (Lun-Sáb)
                            </button>
                            <button
                                onClick={() => consultarViajes('mensual')}
                                className={`btn btn-sm font-black uppercase ${periodoSeleccionado === 'mensual' ? 'btn-error text-white' : 'btn-outline'}`}
                            >
                                1 Mes (Lun-Sáb)
                            </button>
                        </div>
                        <button onClick={exportarExcel} disabled={viajes.length === 0} className="btn btn-sm btn-success text-white font-black uppercase gap-2">
                            <FaFileExcel /> Exportar Excel
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {viajes.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 font-bold uppercase">No hay viajes pagados en este período</p>
                    </div>
                ) : (
                    viajes.map((viaje, vIndex) => (
                        <div key={vIndex} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden transform transition-all">
                            <div className="bg-gray-100 p-3 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-green-600 px-3 py-1 italic font-black text-lg skew-x-[-10deg] text-white">
                                        VIAJE #{viaje.numViaje}
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase font-bold text-gray-500 leading-none">Transportista</p>
                                        <p className="text-sm font-black uppercase italic leading-none text-gray-800">{viaje.chofer?.nombre}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase font-bold text-gray-500 leading-none">Empresa</p>
                                        <p className="text-sm font-black uppercase italic leading-none text-gray-800">{viaje.empresaLiquidada}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[9px] uppercase font-bold text-gray-500 leading-none">Fecha de Pago</p>
                                        <p className="text-sm font-black uppercase italic leading-none text-gray-800">
                                            {moment(viaje.fechaPago.toDate()).format("DD/MM/YYYY")}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase px-4 py-1 rounded-full bg-green-500 text-white">
                                        PAGADO
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="table w-full border-collapse">
                                    <thead>
                                        <tr className="text-[10px] uppercase text-gray-500 bg-gray-50 border-b-2 border-gray-200 italic font-black">
                                            <th className="p-3">Lote</th>
                                            <th className="p-3">Vehículo</th>
                                            <th className="p-3">Ciudad / Almacén</th>
                                            <th className="p-3">Cliente</th>
                                            <th className="p-3 text-center text-blue-800">Flete</th>
                                            <th className="p-3 text-center">Storage</th>
                                            <th className="p-3 text-center text-gray-400">S. Peso</th>
                                            <th className="p-3 text-center text-gray-400">G. Extra</th>
                                            <th className="p-3 text-center bg-green-100 text-green-700">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viaje.vehiculos.map((v, idx) => {
                                            const total = parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0);
                                            return (
                                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-3 font-mono text-xs font-black text-blue-700">{v.lote}</td>
                                                    <td className="p-3 text-[10px] uppercase font-bold text-gray-600">{v.marca} {v.modelo}</td>
                                                    <td className="p-3">
                                                        <div className="text-[11px] font-black text-red-700 uppercase leading-none">{v.ciudad}</div>
                                                        <div className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic">{v.almacen}</div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="text-[10px] font-bold uppercase text-gray-800">{v.clienteNombre || v.clienteAlt}</div>
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-[11px] font-black">${v.flete}</td>
                                                    <td className="p-3 text-center font-mono text-[11px] font-black">${v.storage || 0}</td>
                                                    <td className="p-3 text-center font-mono text-[11px] font-black">${v.sPeso || 0}</td>
                                                    <td className="p-3 text-center font-mono text-[11px] font-black">${v.gExtra || 0}</td>
                                                    <td className="p-3 text-center font-black bg-green-50 text-green-700">${total.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-gray-50 border-t-2 border-gray-300">
                                            <td colSpan="8" className="p-3 text-right font-black uppercase text-gray-600">
                                                Total del Viaje:
                                            </td>
                                            <td className="p-3 text-center font-black text-lg bg-green-100 text-green-700 border-l-4 border-green-600">
                                                ${viaje.resumenFinanciero?.granTotal?.toLocaleString() || '0'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReporteViajesPagados;