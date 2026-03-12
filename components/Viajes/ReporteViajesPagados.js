import React, { useState } from "react";
import { firestore } from "../../firebase/firebaseIni";
import firebase from "firebase/app";
import { FaSearch, FaFileExcel, FaTruck, FaBuilding, FaFileInvoice, FaLayerGroup } from "react-icons/fa";
import * as XLSX from "xlsx";
import moment from "moment";

const ReporteViajesPagados = ({ user }) => {
    const [fechas, setFechas] = useState({ inicio: "", fin: "" });
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(false);

    const consultarViajes = async () => {
        if (!fechas.inicio || !fechas.fin) return alert("Selecciona el rango de fechas");
        setLoading(true);
        try {
            const start = new Date(fechas.inicio + "T00:00:00");
            const end = new Date(fechas.fin + "T23:59:59");
            const snap = await firestore().collection("viajesPagados")
                .where("fechaPago", ">=", firebase.firestore.Timestamp.fromDate(start))
                .where("fechaPago", "<=", firebase.firestore.Timestamp.fromDate(end))
                .orderBy("fechaPago", "asc")
                .get();
            setViajes(snap.docs.map(doc => doc.data()));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

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

    // Agrupación para la tabla visual
    const viajesAgrupados = viajes.reduce((acc, viaje) => {
        const fecha = moment(viaje.fechaPago.toDate()).format("DD/MM/YYYY");
        if (!acc[fecha]) acc[fecha] = {};

        const choferKey = `${viaje.chofer?.nombre} - ${viaje.empresaLiquidada}`;
        if (!acc[fecha][choferKey]) acc[fecha][choferKey] = [];

        acc[fecha][choferKey].push(viaje);
        return acc;
    }, {});

    const totalGeneral = viajes.reduce((acc, v) => acc + (v.resumenFinanciero?.granTotal || 0), 0);

    return (
        <div className="p-6 bg-white rounded-xl shadow-md font-sans text-black">
            <h2 className="text-2xl font-black uppercase italic mb-8 border-b-4 border-red-600 pb-2 flex items-center gap-3">
                <FaFileInvoice className="text-red-600" /> Reporte Consolidado de Viajes
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-xl border mb-8 items-end text-black">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400">Desde:</label>
                    <input type="date" className="input input-bordered input-sm w-full font-bold" value={fechas.inicio} onChange={e => setFechas({...fechas, inicio: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400">Hasta:</label>
                    <input type="date" className="input input-bordered input-sm w-full font-bold" value={fechas.fin} onChange={e => setFechas({...fechas, fin: e.target.value})} />
                </div>
                <button onClick={consultarViajes} className="btn btn-sm btn-error text-white font-black uppercase">Consultar</button>
                <button onClick={exportarExcel} className="btn btn-sm btn-outline font-black uppercase gap-2"><FaFileExcel /> Excel</button>
            </div>

            {viajes.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-red-600/5 p-4 border-l-8 border-red-600 rounded shadow-sm">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">Resumen Choferes</h4>
                            {Object.entries(viajes.reduce((acc, v) => { acc[v.chofer?.nombre] = (acc[v.chofer?.nombre] || 0) + v.resumenFinanciero.granTotal; return acc; }, {})).map(([n, t]) => (
                                <div key={n} className="flex justify-between text-[11px] font-bold border-b py-1"><span>{n}</span><span>${t.toLocaleString()}</span></div>
                            ))}
                        </div>
                        <div className="bg-red-600/5 p-4 border-l-8 border-black rounded shadow-sm">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">Resumen Empresas</h4>
                            {Object.entries(viajes.reduce((acc, v) => { acc[v.empresaLiquidada] = (acc[v.empresaLiquidada] || 0) + v.resumenFinanciero.granTotal; return acc; }, {})).map(([e, t]) => (
                                <div key={e} className="flex justify-between text-[11px] font-bold border-b py-1"><span>{e}</span><span>${t.toLocaleString()}</span></div>
                            ))}
                        </div>
                        <div className="bg-white border-2 border-black p-6 rounded-xl text-black flex flex-col justify-center text-center shadow-xl">
                            <h4 className="text-[12px] font-black uppercase opacity-60 mb-2 italic">Total Global Pagado</h4>
                            <span className="text-4xl font-black italic">${totalGeneral.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-xl shadow-lg">
                        <table className="table table-compact w-full text-[11px]">
                            <thead className="bg-gray-800 text-white uppercase italic">
                                <tr>
                                    <th className="w-32">Folio</th>
                                    <th>Lote / Vehículo</th>
                                    <th className="text-right">Flete</th>
                                    <th className="text-right">Gastos</th>
                                    <th className="text-right bg-red-700">Total Unitario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(viajesAgrupados).map(([fecha, choferesGroup]) => (
                                    <React.Fragment key={fecha}>
                                        <tr className="bg-gray-200 border-y-2 border-gray-400">
                                            <td colSpan="5" className="p-2 font-black text-gray-700 uppercase italic">
                                                Día: {fecha}
                                            </td>
                                        </tr>
                                        {Object.entries(choferesGroup).map(([choferInfo, viajesList]) => {
                                            const subtotalChofer = viajesList.reduce((sum, v) => sum + v.resumenFinanciero.granTotal, 0);
                                            return (
                                                <React.Fragment key={choferInfo}>
                                                    <tr className="bg-gray-50 border-b">
                                                        <td colSpan="5" className="p-2 font-black text-red-700 uppercase flex items-center gap-2">
                                                            <FaTruck size={12}/> {choferInfo}
                                                        </td>
                                                    </tr>
                                                    {viajesList.map(viaje =>
                                                        viaje.vehiculos.map((v, idx) => {
                                                            const unitario = v.flete + (parseFloat(v.storage||0) + parseFloat(v.sPeso||0) + parseFloat(v.gExtra||0));
                                                            return (
                                                                <tr key={`${viaje.numViaje}-${v.lote}`} className="border-b hover:bg-white transition-colors">
                                                                    <td className="font-black text-blue-700 pl-6">#{viaje.numViaje}</td>
                                                                    <td className="uppercase">
                                                                        <span className="font-black">{v.lote}</span> | {v.marca} {v.modelo}
                                                                        <div className="text-[9px] text-gray-400 italic">Cliente: {v.clienteNombre || v.clienteAlt}</div>
                                                                    </td>
                                                                    <td className="text-right font-mono">${v.flete}</td>
                                                                    <td className="text-right font-mono">${(parseFloat(v.storage||0) + parseFloat(v.sPeso||0) + parseFloat(v.gExtra||0))}</td>
                                                                    <td className="text-right font-black bg-red-50 text-red-700">${unitario.toLocaleString()}</td>
                                                                </tr>
                                                            )
                                                        })
                                                    )}
                                                    <tr className="bg-white border-b-2">
                                                        <td colSpan="4" className="text-right font-black uppercase p-2 text-gray-400">Subtotal {choferInfo.split('-')[0]}:</td>
                                                        <td className="text-right font-black p-2 text-sm border-l-4 border-red-600">${subtotalChofer.toLocaleString()}</td>
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default ReporteViajesPagados;