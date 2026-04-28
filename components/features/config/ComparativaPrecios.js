import React, { useState, useRef } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import ReactToPrint from "react-to-print";

const TablaPreciosImprimir = React.forwardRef(({ titulo, datos, campo }, ref) => (
    <div ref={ref} className="p-6" style={{ maxWidth: "100%" }}>
        <div className="flex justify-between items-center border-b-2 border-gray-300 pb-3 mb-4">
            <div>
                <img src="/assets/Logoprint.png" className="w-16" alt="Logo" />
            </div>
            <div className="text-right">
                <h1 className="text-xl font-black uppercase">{titulo}</h1>
                <p className="text-[10px] text-gray-400 font-bold">Jorge Minnesota Logistic LLC</p>
            </div>
        </div>

        <div className="columns-2 gap-4" style={{ columnFill: "balance" }}>
            {datos.map((estado) => (
                <div key={estado.state} className="break-inside-avoid mb-3">
                    <h3 className="text-[11px] font-black uppercase bg-gray-800 text-white px-2 py-1 rounded-t">
                        {estado.state}
                    </h3>
                    <table className="w-full border border-gray-300 text-[10px]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="px-1.5 py-0.5 text-left border-b font-bold">Ciudad</th>
                                <th className="px-1.5 py-0.5 text-right border-b font-bold">Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estado.regions.map((r, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="px-1.5 py-0.5 border-b border-gray-200 font-semibold">{r.city}</td>
                                    <td className="px-1.5 py-0.5 border-b border-gray-200 text-right font-mono font-bold">
                                        ${parseFloat(r[campo] || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    </div>
));

const ReporteCobrosImprimir = React.forwardRef(({ todosLosCobros, fechaDesde, fechaHasta }, ref) => {
    const totalGeneral = todosLosCobros.reduce((acc, m) => acc + m.totalPago, 0);
    return (
        <div ref={ref} className="p-6" style={{ maxWidth: "100%" }}>
            <div className="flex justify-between items-center border-b-2 border-gray-300 pb-3 mb-4">
                <div>
                    <img src="/assets/Logoprint.png" className="w-16" alt="Logo" />
                </div>
                <div className="text-right">
                    <h1 className="text-lg font-black uppercase">Reporte de Cobros</h1>
                    <p className="text-[10px] text-gray-500 font-bold">
                        {fechaDesde} — {fechaHasta} — {todosLosCobros.length} cobros
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold">Jorge Minnesota Logistic LLC</p>
                </div>
            </div>

            <table className="w-full border border-gray-300 text-[9px]">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="px-1.5 py-0.5 text-left border-b font-bold">Fecha</th>
                        <th className="px-1.5 py-0.5 text-left border-b font-bold">Usuario</th>
                        <th className="px-1.5 py-0.5 text-left border-b font-bold">Lote</th>
                        <th className="px-1.5 py-0.5 text-left border-b font-bold">Vehículo</th>
                        <th className="px-1.5 py-0.5 text-left border-b font-bold">Cliente</th>
                        <th className="px-1.5 py-0.5 text-left border-b font-bold">Ciudad</th>
                        <th className="px-1.5 py-0.5 text-right border-b font-bold">Flete</th>
                        <th className="px-1.5 py-0.5 text-right border-b font-bold">G.Extra</th>
                        <th className="px-1.5 py-0.5 text-right border-b font-bold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {todosLosCobros.map((m, i) => (
                        <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-1.5 py-0.5 border-b border-gray-200">{m.fechaStr}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200 font-bold">{m.usuario}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200 font-bold">{m.lote}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200">{m.marca} {m.modelo}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200">{m.cliente}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200">{m.ciudad}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200 text-right font-mono">${m.price}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200 text-right font-mono">{m.gastosExtra > 0 ? `$${m.gastosExtra}` : ""}</td>
                            <td className="px-1.5 py-0.5 border-b border-gray-200 text-right font-mono font-bold">${m.totalPago.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-4 border-t-2 border-gray-800 pt-2 text-right">
                <span className="text-[14px] font-black uppercase">
                    Total General: ${totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
});

const ComparativaPrecios = () => {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(false);
    const refViejos = useRef(null);
    const refNuevos = useRef(null);

    // Reporte de cobros
    const [cobros, setCobros] = useState(null);
    const [cargandoCobros, setCargandoCobros] = useState(false);
    const refCobros = useRef(null);

    const handleCargar = async () => {
        setCargando(true);
        const snap = await firestore().collection(COLLECTIONS.PROVINCE).get();
        const estados = snap.docs.map(doc => {
            const d = doc.data();
            const regions = (d.regions || []).sort((a, b) => (a.order || 0) - (b.order || 0));
            return { state: d.state, regions };
        });
        estados.sort((a, b) => a.state.localeCompare(b.state));
        setDatos(estados);
        setCargando(false);
    };

    const handleCargarCobros = async () => {
        setCargandoCobros(true);
        try {
            const desde = new Date(2026, 3, 13, 0, 0, 0); // 13 abril 2026
            const hasta = new Date(2026, 3, 25, 23, 59, 59); // 25 abril 2026 (ayer)

            const movSnap = await firestore()
                .collection(COLLECTIONS.MOVIMIENTOS)
                .where("estatus", "==", "EN")
                .get();

            const lista = [];

            movSnap.docs.forEach((doc) => {
                const d = doc.data();

                let fecha = null;
                if (d.timestamp?.seconds) {
                    fecha = new Date(d.timestamp.seconds * 1000);
                }
                if (!fecha || fecha < desde || fecha > hasta) return;

                const u = (d.usuario || "").toLowerCase();
                if (!u.includes("olivia") && !u.includes("adela") && !u.includes("cristela")) return;

                const est = (d.estado || "").toLowerCase();
                if (est.includes("florida")) return;

                lista.push({
                    id: doc.id,
                    usuario: d.usuario || "Sin usuario",
                    lote: d.binNip || "",
                    marca: d.marca || "",
                    modelo: d.modelo || "",
                    cliente: d.cliente || "",
                    ciudad: d.ciudad || "",
                    estado: d.estado || "",
                    price: parseFloat(d.price || 0),
                    storage: parseFloat(d.storage || 0),
                    sobrePeso: parseFloat(d.sobrePeso || 0),
                    gastosExtra: parseFloat(d.gastosExtra || 0),
                    totalPago: parseFloat(d.totalPago || 0),
                    fecha,
                    fechaStr: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
                });
            });

            lista.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

            setCobros(lista);
        } catch (e) {
            alert("Error: " + e.message);
        }
        setCargandoCobros(false);
    };

    const totalCobros = cobros ? cobros.length : 0;

    return (
        <div className="max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg border">
            <h2 className="text-2xl font-black text-gray-800 mb-4">Comparativa de Precios</h2>

            <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={handleCargar} disabled={cargando} className="btn btn-sm btn-info text-white font-bold uppercase">
                    {cargando ? "Cargando..." : "Cargar Precios"}
                </button>

                {datos && (
                    <>
                        <ReactToPrint
                            trigger={() => (
                                <button className="btn btn-sm btn-outline border-blue-600 text-blue-700 font-bold uppercase">
                                    Imprimir Precios Viejos
                                </button>
                            )}
                            content={() => refViejos.current}
                            documentTitle="preciosclienteviejos"
                        />
                        <ReactToPrint
                            trigger={() => (
                                <button className="btn btn-sm btn-outline border-green-600 text-green-700 font-bold uppercase">
                                    Imprimir Precios Nuevos
                                </button>
                            )}
                            content={() => refNuevos.current}
                            documentTitle="preciosclientenuevos"
                        />
                    </>
                )}
            </div>

            {datos && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Precios Viejos */}
                    <div className="border-2 border-blue-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                            <h3 className="font-black text-blue-700 uppercase text-sm">Precios Viejos (Cobro)</h3>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-3">
                            {datos.map((estado) => (
                                <div key={estado.state} className="mb-3">
                                    <h4 className="text-[11px] font-black uppercase bg-blue-800 text-white px-2 py-1 rounded-t">{estado.state}</h4>
                                    <table className="w-full border text-[11px]">
                                        <tbody>
                                            {estado.regions.map((r, i) => (
                                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                                                    <td className="px-2 py-0.5 border-b border-gray-200 font-semibold">{r.city}</td>
                                                    <td className="px-2 py-0.5 border-b border-gray-200 text-right font-mono font-bold text-blue-700">
                                                        ${parseFloat(r.price || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Precios Nuevos */}
                    <div className="border-2 border-green-200 rounded-xl overflow-hidden">
                        <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                            <h3 className="font-black text-green-700 uppercase text-sm">Precios Nuevos (Página)</h3>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-3">
                            {datos.map((estado) => (
                                <div key={estado.state} className="mb-3">
                                    <h4 className="text-[11px] font-black uppercase bg-green-800 text-white px-2 py-1 rounded-t">{estado.state}</h4>
                                    <table className="w-full border text-[11px]">
                                        <tbody>
                                            {estado.regions.map((r, i) => (
                                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-green-50/30"}>
                                                    <td className="px-2 py-0.5 border-b border-gray-200 font-semibold">{r.city}</td>
                                                    <td className="px-2 py-0.5 border-b border-gray-200 text-right font-mono font-bold text-green-700">
                                                        ${parseFloat(r.precioPagina || r.price || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Reporte de Cobros --- */}
            <div className="border-t-2 border-gray-200 pt-6">
                <h2 className="text-2xl font-black text-gray-800 mb-2">Reporte de Cobros</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Todos los cobros de <strong>Olivia</strong>, <strong>Adela</strong> y <strong>Cristela</strong> del <strong>13 de abril</strong> al <strong>25 de abril 2026</strong>.
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    <button onClick={handleCargarCobros} disabled={cargandoCobros} className="btn btn-sm btn-warning text-white font-bold uppercase">
                        {cargandoCobros ? "Cargando..." : "Cargar Cobros"}
                    </button>

                    {cobros && totalCobros > 0 && (
                        <ReactToPrint
                            trigger={() => (
                                <button className="btn btn-sm btn-outline border-gray-700 text-gray-700 font-bold uppercase">
                                    Imprimir Reporte
                                </button>
                            )}
                            content={() => refCobros.current}
                            documentTitle="reporte_cobros_13abr_25abr"
                        />
                    )}
                </div>

                {cobros && totalCobros === 0 && (
                    <div className="alert alert-info">No se encontraron cobros en ese rango.</div>
                )}

                {cobros && totalCobros > 0 && (
                    <div>
                        <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded">
                            <table className="table table-compact w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-100 sticky top-0">
                                        <th>Fecha</th>
                                        <th>Usuario</th>
                                        <th>Lote</th>
                                        <th>Vehículo</th>
                                        <th>Cliente</th>
                                        <th>Ciudad</th>
                                        <th className="text-right">Flete</th>
                                        <th className="text-right">G.Extra</th>
                                        <th className="text-right font-black">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cobros.map((m) => (
                                        <tr key={m.id} className="hover:bg-yellow-50">
                                            <td className="text-[10px]">{m.fechaStr}</td>
                                            <td className="font-bold">{m.usuario}</td>
                                            <td className="font-bold">{m.lote}</td>
                                            <td>{m.marca} {m.modelo}</td>
                                            <td className="text-[10px]">{m.cliente}</td>
                                            <td>{m.ciudad}</td>
                                            <td className="text-right font-mono">${m.price.toLocaleString()}</td>
                                            <td className="text-right font-mono text-gray-400">{m.gastosExtra > 0 ? `$${m.gastosExtra}` : ""}</td>
                                            <td className="text-right font-mono font-bold">${m.totalPago.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-right mt-2 text-lg font-black">
                            Total General: ${cobros.reduce((acc, m) => acc + m.totalPago, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                )}
            </div>

            {/* Tablas ocultas para imprimir */}
            <div style={{ position: "absolute", left: "-9999px" }}>
                {datos && (
                    <>
                        <TablaPreciosImprimir ref={refViejos} titulo="Precios Cliente — Anteriores (Cobro)" datos={datos} campo="price" />
                        <TablaPreciosImprimir ref={refNuevos} titulo="Precios Cliente — Nuevos (Página)" datos={datos} campo="precioPagina" />
                    </>
                )}
                {cobros && (
                    <ReporteCobrosImprimir ref={refCobros} todosLosCobros={cobros} fechaDesde="13 Abr 2026" fechaHasta="25 Abr 2026" />
                )}
            </div>
        </div>
    );
};

export default ComparativaPrecios;
