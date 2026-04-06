import React, {useState, useEffect} from "react";
import {firestore} from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import {
    FaSearch,
    FaTrash,
    FaSave,
    FaHistory,
    FaCar,
    FaMapMarkerAlt,
    FaUser,
    FaTimes,
    FaCheckCircle
} from "react-icons/fa";

const ViajesAnteriores = ({user}) => {
    const [busqueda, setBusqueda] = useState("");
    const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState([]);
    const [choferes, setChoferes] = useState([]);
    const [provincias, setProvincias] = useState([]);
    const [clientes, setClientes] = useState([]); // Nueva colección
    const [loading, setLoading] = useState(false);
    const [folioPGM, setFolioPGM] = useState(null);
    const [busquedaCliente, setBusquedaCliente] = useState({}); // Estado para el buscador de cliente por fila

    const [busquedaChofer, setBusquedaChofer] = useState(""); // Texto que escribe el usuario
    const [choferSeleccionado, setChoferSeleccionado] = useState(null); // Objeto del chofer elegido

    const seleccionarChofer = (chofer) => {
        setEncabezado({...encabezado, choferId: chofer.id});
        setChoferSeleccionado(chofer);
        setBusquedaChofer(""); // Limpiamos el buscador
    };

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

        const unsubClientes = firestore().collection("clientes").onSnapshot(snap => {
            setClientes(snap.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().cliente,
                telefono: doc.data().telefonoCliente
            })));
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
            unsubClientes();
        };
    }, []);

    // Función para asignar cliente a la fila
    const asignarClienteAFila = (lote, cliente) => {
        const nuevosVehiculos = vehiculosSeleccionados.map(v => {
            if (v.lote === lote) {
                return {
                    ...v,
                    clienteId: cliente.id,
                    clienteNombre: cliente.nombre,
                    clienteTelefono: cliente.telefono
                };
            }
            return v;
        });
        setVehiculosSeleccionados(nuevosVehiculos);
        setBusquedaCliente({...busquedaCliente, [lote]: ""}); // Limpiar input
    };

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
                titulo: vehData.titulo || "NO",
                // Inicializamos datos del cliente si ya existen en la ficha
                clienteId: vehData.clienteId || "",
                clienteNombre: vehData.clienteNombre || vehData.cliente || "",
                clienteTelefono: vehData.clienteTelefono || ""
            }]);
            setBusqueda("");
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const finalizarRegularizacion = async () => {
        const faltanClientes = vehiculosSeleccionados.some(v => !v.clienteId);
        if (faltanClientes) {
            alert("Por favor, asigna un Cliente Oficial a todos los vehículos.");
            return;
        }

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
                    fechaAsignacionManual: new Date(),
                    // Actualizamos también la ficha del vehículo con el cliente oficial seleccionado
                    clienteId: v.clienteId,
                    clienteNombre: v.clienteNombre,
                    clienteTelefono: v.clienteTelefono,
                    cliente: v.clienteNombre
                });
            });
            batch.update(firestore().collection("config").doc("consecutivos"), {folioManualPGM: folioPGM});

            await batch.commit();
            alert(`Viaje ${numViajeFinal} creado exitosamente.`);
            setVehiculosSeleccionados([]);
            setBusqueda("");
            setFolioPGM(prev => prev + 1);

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

            {/* ENCABEZADO */}
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
                <div className="relative">
                    <label className="text-[10px] font-black uppercase text-gray-400">Chofer</label>

                    {/* Input Buscador */}
                    <div className="relative">
                        <input
    type="text"
    className={`input input-bordered input-sm w-full font-bold uppercase ${
        encabezado.choferId ? "bg-gray-200 text-gray-700" : "bg-white"
    }`}
    // Si hay chofer seleccionado, lo muestra. Si no, muestra la búsqueda.
    value={busquedaChofer || (choferSeleccionado ? choferSeleccionado.nombreChofer : "")}
    onChange={(e) => setBusquedaChofer(e.target.value)}
    placeholder="BUSCAR CHOFER..."
    readOnly={!!encabezado.choferId && !busquedaChofer}
/>
                        {/* Botón para borrar selección si te equivocas */}
                        {encabezado.choferId && (
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500"
                                onClick={() => {
                                    setEncabezado({...encabezado, choferId: ""});
                                    setChoferSeleccionado(null);
                                }}
                            >
                                <FaTimes/>
                            </button>
                        )}
                    </div>

                    {/* Dropdown de resultados (Solo si no hay uno seleccionado y hay texto) */}
                    {busquedaChofer && !encabezado.choferId && (
                        <div
                            className="absolute z-[110] w-full bg-white border-2 border-black shadow-xl rounded-md max-h-48 overflow-y-auto mt-1">
                            {choferes
                                .filter(c => c.nombreChofer.toLowerCase().includes(busquedaChofer.toLowerCase()))
                                .map(c => (
                                    <div
                                        key={c.id}
                                        className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-xs font-bold uppercase border-b border-gray-100"
                                        onClick={() => seleccionarChofer(c)}
                                    >
                                        {c.nombreChofer} <span
                                        className="text-[9px] opacity-70">({c.empresaNombre})</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            </div>

            {/* BUSCADOR DE LOTE */}
            <div className="mb-6 flex gap-2">
                <input type="text" placeholder="Escanea o escribe el Lote..."
                       className="input input-bordered flex-1 font-mono font-black uppercase" value={busqueda}
                       onChange={(e) => setBusqueda(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && buscarVehiculo()}/>
                <button onClick={buscarVehiculo} disabled={loading}
                        className="btn btn-accent text-white px-10 font-black uppercase">Validar Lote
                </button>
            </div>

            {/* TABLA */}
            <div className="overflow-x-auto border rounded-xl shadow-inner mb-6">
                <table className="table table-compact w-full border-separate border-spacing-0">
                    <thead className="bg-gray-800 text-white text-[9px] uppercase sticky top-0">
                    <tr>
                        <th className="p-2">Identificación</th>
                        <th className="p-2 w-48">Cliente Oficial</th>
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
                            <tr key={v.lote} className="text-[11px] font-bold border-b hover:bg-gray-50">
                                <td className="p-2">
                                    <div className="text-blue-700 font-black">{v.lote}</div>
                                    <div className="text-gray-500 uppercase flex items-center gap-1"><FaCar
                                        size={10}/> {v.marca} {v.modelo}</div>
                                    <div className="text-red-700 uppercase italic text-[9px]"><FaMapMarkerAlt
                                        size={9}/> {v.ciudad}, {v.estado}</div>
                                </td>

                                {/* SELECTOR DE CLIENTE INTEGRADO */}
                                <td className="p-2">
    <div className="relative w-full">
        <div className="text-[8px] font-black text-blue-600 mb-1 italic uppercase">
            Ref: {v.clienteAlt || "S/N"}
        </div>
        <div className="relative">
            <input
                type="text"
                placeholder="BUSCAR CLIENTE..."
                className={`input input-bordered input-xs w-full font-bold text-[9px] uppercase pr-8 ${
                    v.clienteNombre ? "bg-gray-200 text-gray-700" : "bg-white text-black"
                }`}
                value={busquedaCliente[v.lote] || (v.clienteNombre ? v.clienteNombre : "")}
                onChange={(e) => setBusquedaCliente({
                    ...busquedaCliente,
                    [v.lote]: e.target.value
                })}
                readOnly={!!v.clienteNombre && !busquedaCliente[v.lote]}
            />

            {/* BOTÓN PARA EDITAR / BORRAR SELECCIÓN */}
            {v.clienteNombre && !busquedaCliente[v.lote] && (
                <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                    onClick={() => {
                        // Limpiamos los datos del cliente en este vehículo específico
                        const resetVehiculos = vehiculosSeleccionados.map(veh =>
                            veh.lote === v.lote
                            ? { ...veh, clienteId: "", clienteNombre: "", clienteTelefono: "" }
                            : veh
                        );
                        setVehiculosSeleccionados(resetVehiculos);
                    }}
                >
                    <FaTimes size={12} />
                </button>
            )}
        </div>

        {/* DROPDOWN DE RESULTADOS */}
        {busquedaCliente[v.lote] && (
            <div className="absolute z-[100] w-full bg-white border-2 shadow-xl rounded-md max-h-32 overflow-y-auto mt-1 border-blue-200">
                {clientes
                    .filter(c => c.nombre.toLowerCase().includes(busquedaCliente[v.lote].toLowerCase()))
                    .map(cliente => (
                        <div
                            key={cliente.id}
                            className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[9px] font-bold uppercase border-b last:border-none"
                            onClick={() => asignarClienteAFila(v.lote, cliente)}
                        >
                            {cliente.nombre}
                        </div>
                    ))
                }
            </div>
        )}
    </div>
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