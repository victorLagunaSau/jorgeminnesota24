import React, { useState, useEffect, useRef } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import ReactToPrint from "react-to-print";
import HojaVerificacion from "./HojaVerificacion";
import { FaTruck, FaChevronDown, FaChevronUp, FaCalendarAlt, FaPrint } from "react-icons/fa";

const PAGE_SIZE = 10;

const HistorialViajesCarrier = ({ user }) => {
    const [todosViajes, setTodosViajes] = useState([]);
    const [visibles, setVisibles] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [expandido, setExpandido] = useState({});
    const [viajeAImprimir, setViajeAImprimir] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const col = firestore().collection(COLLECTIONS.VIAJES_PAGADOS);

        if (user.admin) {
            // Admin ve todos
            const unsub = col.orderBy("fechaPago", "desc").onSnapshot((snap) => {
                setTodosViajes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
            return () => unsub();
        }

        // Carrier: buscar por empresaId O empresaLiderId
        let datosEmpresa = [];
        let datosLider = [];
        let loadCount = 0;

        const combinar = () => {
            loadCount++;
            const porId = new Map();
            [...datosEmpresa, ...datosLider].forEach((v) => porId.set(v.id, v));
            const todos = Array.from(porId.values());
            todos.sort((a, b) => {
                const ta = a.fechaPago?.seconds || 0;
                const tb = b.fechaPago?.seconds || 0;
                return tb - ta;
            });
            setTodosViajes(todos);
            if (loadCount >= 2) setLoading(false);
        };

        const unsub1 = col
            .where("empresaLiderId", "==", user.id)
            .onSnapshot((snap) => {
                datosLider = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                combinar();
            });

        const unsub2 = col
            .where("creadoPor.id", "==", user.id)
            .onSnapshot((snap) => {
                datosEmpresa = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                combinar();
            });

        return () => { unsub1(); unsub2(); };
    }, [user]);

    const viajes = todosViajes.slice(0, visibles);
    const hayMas = visibles < todosViajes.length;

    const cargarMas = () => {
        setVisibles((prev) => prev + PAGE_SIZE);
    };

    const toggleExpandido = (id) => {
        setExpandido((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const formatFecha = (ts) => {
        if (!ts) return "-";
        const d = ts.seconds ? new Date(ts.seconds * 1000) : ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
        if (!d) return "-";
        return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
    };

    const fmt = (n) => {
        const val = parseFloat(n) || 0;
        return `$${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg text-red-600"></span>
            </div>
        );
    }

    if (viajes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                <FaTruck className="text-5xl mb-3" />
                <p className="font-bold text-lg">Sin viajes en historial</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Componente oculto para impresión */}
            <div style={{ display: "none" }}>
                <HojaVerificacion ref={printRef} viajeData={viajeAImprimir} />
            </div>

            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {viajes.length} viaje{viajes.length !== 1 ? "s" : ""} cargado{viajes.length !== 1 ? "s" : ""}
                </p>
            </div>

            {viajes.map((viaje) => {
                const abierto = expandido[viaje.id];
                const vehiculos = viaje.vehiculos || [];
                const totalFlete = vehiculos.reduce((s, v) => s + (parseFloat(v.flete) || 0), 0);
                const totalStorage = vehiculos.reduce((s, v) => s + (parseFloat(v.storage) || 0), 0);
                const totalSPeso = vehiculos.reduce((s, v) => s + (parseFloat(v.sPeso) || 0), 0);
                const totalGExtra = vehiculos.reduce((s, v) => s + (parseFloat(v.gExtra) || 0), 0);
                const granTotal = totalFlete + totalStorage + totalSPeso + totalGExtra;

                return (
                    <div key={viaje.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* Header del viaje */}
                        <div className="px-4 py-3 flex items-center justify-between">
                            <div
                                className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => toggleExpandido(viaje.id)}
                            >
                                <div className="bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg">
                                    {viaje.numViaje || viaje.folioPago || "S/N"}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-gray-800 uppercase italic leading-none">
                                        {viaje.chofer?.nombre || "Sin chofer"}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <FaCalendarAlt className="text-gray-300" size={10} />
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            {formatFecha(viaje.fechaPago)}
                                        </span>
                                        <span className="text-[10px] text-gray-300">|</span>
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            {vehiculos.length} vehículo{vehiculos.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-gray-800 ml-auto mr-2">{fmt(granTotal)}</span>
                                {abierto ? (
                                    <FaChevronUp className="text-gray-400" size={12} />
                                ) : (
                                    <FaChevronDown className="text-gray-400" size={12} />
                                )}
                            </div>
                            <ReactToPrint
                                onBeforeGetContent={() => {
                                    setViajeAImprimir(viaje);
                                    return new Promise((r) => setTimeout(r, 300));
                                }}
                                trigger={() => (
                                    <button
                                        className="btn btn-xs bg-white hover:bg-gray-100 border border-gray-300 text-gray-600 rounded-lg px-2 ml-2"
                                        title="Imprimir hoja"
                                    >
                                        <FaPrint size={12} />
                                    </button>
                                )}
                                content={() => printRef.current}
                                documentTitle={`Hoja - Viaje ${viaje.numViaje || viaje.folioPago || ""}`}
                            />
                        </div>

                        {/* Detalle expandible */}
                        {abierto && (
                            <div className="border-t border-gray-100">
                                <div className="overflow-x-auto">
                                    <table className="table table-sm w-full">
                                        <thead>
                                            <tr className="text-[9px] text-gray-400 font-bold uppercase bg-gray-50 border-b border-gray-200">
                                                <th className="py-2 px-3">#</th>
                                                <th className="py-2 px-3">Lote</th>
                                                <th className="py-2 px-3">Vehículo</th>
                                                <th className="py-2 px-3">Origen</th>
                                                <th className="py-2 px-3">Referencia</th>
                                                <th className="py-2 px-3 text-right">Flete</th>
                                                <th className="py-2 px-3 text-right">Storage</th>
                                                <th className="py-2 px-3 text-right">S.Peso</th>
                                                <th className="py-2 px-3 text-right">G.Extra</th>
                                                <th className="py-2 px-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs">
                                            {vehiculos.map((v, idx) => {
                                                const flete = parseFloat(v.flete) || 0;
                                                const storage = parseFloat(v.storage) || 0;
                                                const sPeso = parseFloat(v.sPeso) || 0;
                                                const gExtra = parseFloat(v.gExtra) || 0;
                                                const total = flete + storage + sPeso + gExtra;

                                                return (
                                                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                        <td className="px-3 text-gray-300">{idx + 1}</td>
                                                        <td className="px-3 font-mono font-bold text-blue-600">{v.lote}</td>
                                                        <td className="px-3 font-bold text-gray-700">{v.marca} {v.modelo}</td>
                                                        <td className="px-3 text-gray-400">{v.ciudad}, {v.estado}</td>
                                                        <td className="px-3 text-gray-500">{v.clienteAlt || v.clienteNombre || "-"}</td>
                                                        <td className="px-3 text-right">{fmt(flete)}</td>
                                                        <td className="px-3 text-right">{fmt(storage)}</td>
                                                        <td className="px-3 text-right">{fmt(sPeso)}</td>
                                                        <td className="px-3 text-right">{fmt(gExtra)}</td>
                                                        <td className="px-3 text-right font-bold">{fmt(total)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50 border-t-2 border-gray-200 text-xs font-black">
                                                <td colSpan="5" className="px-3 py-2 text-right text-gray-500 uppercase">Totales:</td>
                                                <td className="px-3 py-2 text-right">{fmt(totalFlete)}</td>
                                                <td className="px-3 py-2 text-right">{fmt(totalStorage)}</td>
                                                <td className="px-3 py-2 text-right">{fmt(totalSPeso)}</td>
                                                <td className="px-3 py-2 text-right">{fmt(totalGExtra)}</td>
                                                <td className="px-3 py-2 text-right text-red-600">{fmt(granTotal)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Info adicional */}
                                {(viaje.estadoOrigen || viaje.metodoPago) && (
                                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 text-[10px] text-gray-400 font-bold uppercase">
                                        {viaje.estadoOrigen && (
                                            <span>Origen: <span className="text-gray-600">{viaje.estadoOrigen}</span></span>
                                        )}
                                        {viaje.metodoPago && (
                                            <>
                                                {parseFloat(viaje.metodoPago.efectivo) > 0 && (
                                                    <span>Efectivo: <span className="text-green-600">{fmt(viaje.metodoPago.efectivo)}</span></span>
                                                )}
                                                {parseFloat(viaje.metodoPago.cheque) > 0 && (
                                                    <span>Cheque: <span className="text-blue-600">{fmt(viaje.metodoPago.cheque)}</span></span>
                                                )}
                                                {parseFloat(viaje.metodoPago.zelle) > 0 && (
                                                    <span>Zelle: <span className="text-purple-600">{fmt(viaje.metodoPago.zelle)}</span></span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Botón cargar más */}
            {hayMas && (
                <div className="flex justify-center pt-2 pb-4">
                    <button
                        onClick={cargarMas}
                        className="btn btn-sm bg-gray-800 hover:bg-gray-900 text-white border-none font-black uppercase rounded-xl px-8 text-[10px] tracking-wider"
                    >
                        Cargar más viajes
                    </button>
                </div>
            )}
        </div>
    );
};

export default HistorialViajesCarrier;
