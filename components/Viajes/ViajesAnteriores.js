import React, {useState, useEffect} from "react";
import {firestore} from "../../firebase/firebaseIni";
import firebase from "firebase/app";
import {FaSearch, FaTrash, FaSave, FaHistory, FaCar, FaMapMarkerAlt, FaUser} from "react-icons/fa";

const ViajesAnteriores = ({user}) => {
    const [busqueda, setBusqueda] = useState("");
    const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState([]);
    const [choferes, setChoferes] = useState([]);
    const [provincias, setProvincias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [folioPGM, setFolioPGM] = useState(null);

    const [encabezado, setEncabezado] = useState({
        choferId: "",
        fechaManual: "",
        empresaLiquidada: ""
    });

    useEffect(() => {
        const unsubChoferes = firestore().collection("choferes").onSnapshot(snap => {
            setChoferes(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        const unsubProvincias = firestore().collection("province").onSnapshot(snap => {
            setProvincias(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        const fetchFolio = async () => {
            const doc = await firestore().collection("config").doc("consecutivos").get();
            const actual = doc.data()?.folioManualPGM || 999;
            setFolioPGM(actual + 1);
        };

        fetchFolio();
        return () => {
            unsubChoferes();
            unsubProvincias();
        };
    }, []);

    const buscarVehiculo = async () => {
        if (!busqueda) return;
        setLoading(true);
        try {
            const vehDoc = await firestore().collection("vehiculos").doc(busqueda.trim()).get();
            if (!vehDoc.exists) {
                alert("Vehículo no encontrado.");
                return;
            }

            const vehData = vehDoc.data();
            const viajeExistente = await firestore().collection("viajesPagados")
                .where("vehiculos", "array-contains-any", [{lote: busqueda.trim()}]).get();

            if (!viajeExistente.empty || vehData.numViaje) {
                alert(`Error: El lote ${busqueda} ya tiene viaje asignado.`);
                return;
            }

            // Cruce de Flete (Cost)
            let fleteCalculado = parseFloat(vehData.flete || 0);
            if (fleteCalculado === 0) {
                const prov = provincias.find(p => p.state === vehData.estado);
                const reg = prov?.regions?.find(r => r.city === vehData.ciudad);
                if (reg) fleteCalculado = parseFloat(reg.cost || 0);
            }

            setVehiculosSeleccionados([...vehiculosSeleccionados, {
                ...vehData,
                lote: vehDoc.id,
                flete: fleteCalculado,
                storage: parseFloat(vehData.storage || 0),
                sPeso: parseFloat(vehData.sobrePeso || vehData.sPeso || 0),
                gExtra: parseFloat(vehData.gastosExtra || vehData.gExtra || 0),
                titulo: vehData.titulo || "NO"
            }]);
            setBusqueda("");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const finalizarRegularizacion = async () => {
        if (vehiculosSeleccionados.length === 0 || !encabezado.choferId || !encabezado.fechaManual) {
            alert("Completa Chofer, Fecha y Vehículos.");
            return;
        }
        setLoading(true);
        const batch = firestore().batch();
        const numViajeFinal = `PGM-${folioPGM}`;
        const choferSel = choferes.find(c => c.id === encabezado.choferId);

        try {
            const totalFletes = vehiculosSeleccionados.reduce((acc, v) => acc + v.flete, 0);
            const totalOtros = vehiculosSeleccionados.reduce((acc, v) => acc + (v.storage + v.sPeso + v.gExtra), 0);

            const nuevoViaje = {
                numViaje: numViajeFinal,
                folioPago: numViajeFinal,
                estatus: "PAGADO",
                fechaCreacion: firebase.firestore.Timestamp.fromDate(new Date(encabezado.fechaManual)),
                fechaPago: firebase.firestore.Timestamp.fromDate(new Date(encabezado.fechaManual)),
                fechaRegistroSistema: new Date(),
                metodo: "REGULARIZACION_HISTORICA",
                creadoPor: {id: user.id, nombre: user.nombre},
                chofer: {id: choferSel.id, nombre: choferSel.nombreChofer, empresa: choferSel.empresaNombre},
                empresaLiquidada: encabezado.empresaLiquidada || choferSel.empresaNombre,
                vehiculos: vehiculosSeleccionados,
                resumenFinanciero: {
                    totalFletes,
                    totalSoloGastos: totalOtros,
                    totalVehiculos: vehiculosSeleccionados.length,
                    granTotal: totalFletes + totalOtros
                }
            };

            batch.set(firestore().collection("viajesPagados").doc(numViajeFinal), nuevoViaje);
            vehiculosSeleccionados.forEach(v => {
                batch.update(firestore().collection("vehiculos").doc(v.lote), {
                    numViaje: numViajeFinal,
                    folioPago: numViajeFinal,
                    fechaAsignacionManual: new Date()
                });
            });
            batch.update(firestore().collection("config").doc("consecutivos"), {folioManualPGM: folioPGM});

            await batch.commit();

            // --- LIMPIEZA DE ESTADO EN LUGAR DE RELOAD ---
            alert(`Viaje ${numViajeFinal} creado exitosamente.`);

            // Limpiamos los datos del viaje actual
            setVehiculosSeleccionados([]);
            setBusqueda("");
            // Incrementamos el folio localmente para el siguiente registro
            setFolioPGM(prev => prev + 1);
            // Opcional: Si quieres mantener el chofer y fecha para capturar varios del mismo día
            // setEncabezado({choferId: "", fechaManual: "", empresaLiquidada: ""});

        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-xl border-t-8 border-black font-sans text-black">
            <h2 className="text-2xl font-black uppercase italic mb-6 flex items-center gap-3">
                <FaHistory/> Regularización de Historial</h2>

            <div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400">Folio PGM</label>
                    <div className="text-xl font-black text-red-600">PGM-{folioPGM}</div>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400">Fecha Original (Papel)</label>
                    <input type="date" className="input input-bordered input-sm w-full font-bold uppercase"
                           onChange={(e) => setEncabezado({...encabezado, fechaManual: e.target.value})}/>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400">Chofer</label>
                    <select className="select select-bordered select-sm w-full font-bold uppercase"
                            onChange={(e) => setEncabezado({...encabezado, choferId: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {choferes.map(c => <option key={c.id} value={c.id}>{c.nombreChofer}</option>)}
                    </select>
                </div>
            </div>

            <div className="mb-6 flex gap-2">
                <input type="text" placeholder="Escanea o escribe el Lote..."
                       className="input input-bordered flex-1 font-mono font-black uppercase" value={busqueda}
                       onChange={(e) => setBusqueda(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && buscarVehiculo()}/>
                <button onClick={buscarVehiculo} disabled={loading}
                        className="btn btn-accent text-white px-10 font-black">VALIDAR LOTE
                </button>
            </div>

            <div className="overflow-x-auto border rounded-xl shadow-inner mb-6">
                <table className="table table-compact w-full border-separate border-spacing-0">
                    <thead className="bg-gray-800 text-white text-[9px] uppercase sticky top-0">
                    <tr>
                        <th className="p-2">Identificación</th>
                        <th className="p-2">Ubicación / Cliente</th>
                        <th className="p-2 text-right">Flete</th>
                        <th className="p-2 text-right">Storage</th>
                        <th className="p-2 text-right">Extras</th>
                        <th className="p-2 text-right">S.Peso</th>
                        <th className="p-2 text-center">Título</th>
                        <th className="p-2 text-right bg-red-600">Subtotal</th>
                        <th className="p-2"></th>
                    </tr>
                    </thead>
                    <tbody>
                    {vehiculosSeleccionados.map((v, i) => {
                        const subtotal = v.flete + v.storage + v.sPeso + v.gExtra;
                        return (
                            <tr key={i} className="text-[11px] font-bold border-b hover:bg-gray-50">
                                <td className="p-2">
                                    <div className="text-blue-700 font-black">{v.lote}</div>
                                    <div className="text-gray-500 uppercase flex items-center gap-1"><FaCar
                                        size={10}/> {v.marca} {v.modelo}</div>
                                </td>
                                <td className="p-2 leading-tight">
                                    <div className="uppercase flex items-center gap-1 text-red-700"><FaMapMarkerAlt
                                        size={10}/> {v.ciudad}, {v.estado}</div>
                                    <div className="text-gray-400 uppercase flex items-center gap-1"><FaUser
                                        size={10}/> {v.clienteNombre || v.cliente || "S/N"}</div>
                                </td>
                                <td className="p-2 text-right font-mono">${v.flete}</td>
                                <td className="p-2 text-right font-mono text-gray-500">${v.storage}</td>
                                <td className="p-2 text-right font-mono text-gray-500">${v.gExtra}</td>
                                <td className="p-2 text-right font-mono text-gray-500">${v.sPeso}</td>
                                <td className="p-2 text-center text-xs">{v.titulo === "SI" ? "✅" : "❌"}</td>
                                <td className="p-2 text-right font-black bg-red-50 text-red-700 font-mono text-sm">${subtotal.toLocaleString()}</td>
                                <td className="p-2 text-center">
                                    <button
                                        onClick={() => setVehiculosSeleccionados(vehiculosSeleccionados.filter(veh => veh.lote !== v.lote))}
                                        className="text-red-400 hover:text-red-600"><FaTrash/></button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                    <tr>
                        <td colSpan="7" className="text-right font-black uppercase p-3">Gran Total de Pago:</td>
                        <td className="text-right font-black p-3 text-xl text-black bg-red-100 font-mono border-l-4 border-red-600">
                            ${vehiculosSeleccionados.reduce((acc, v) => acc + (v.flete + v.storage + v.sPeso + v.gExtra), 0).toLocaleString()}
                        </td>
                        <td></td>
                    </tr>
                    </tfoot>
                </table>
            </div>

            <button
                onClick={finalizarRegularizacion}
                disabled={loading || vehiculosSeleccionados.length === 0}
                className="btn btn-error btn-sm h-12 px-10 text-white font-black text-sm gap-3 shadow-lg uppercase italic transition-all hover:scale-105 active:scale-95"
            >
                {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                ) : (
                    <>
                        <FaSave/> Procesar Viaje PGM-{folioPGM}
                    </>
                )}
            </button>
        </div>
    );
};

export default ViajesAnteriores;