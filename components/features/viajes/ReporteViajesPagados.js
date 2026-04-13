import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import {
    FaSearch, FaFileExcel, FaTruck, FaBuilding, FaFileInvoice, FaLayerGroup,
    FaPlus, FaList, FaHistory, FaCar, FaMapMarkerAlt, FaUser, FaTimes, FaTrash, FaSave, FaPen, FaCheck, FaTrashAlt, FaCommentDots
} from "react-icons/fa";
import * as XLSX from "xlsx";
import moment from "moment";

const ReporteViajesPagados = ({ user }) => {
    // Estado para cambiar entre vista de historial y agregar viaje
    const [vista, setVista] = useState("historial"); // "historial" | "agregar"

    // Estados del historial
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('semana');
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estados para agregar viaje pasado
    const [busqueda, setBusqueda] = useState("");
    const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState([]);
    const [choferes, setChoferes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [numViaje, setNumViaje] = useState("");
    const [busquedaCliente, setBusquedaCliente] = useState({});
    const [busquedaChofer, setBusquedaChofer] = useState("");
    const [choferSeleccionado, setChoferSeleccionado] = useState(null);
    const [encabezado, setEncabezado] = useState({
        choferId: "",
        fechaViaje: "",
        empresaLiquidada: ""
    });

    // Estado para editar viaje existente
    const [editandoViaje, setEditandoViaje] = useState(null);
    const [nuevoNumViaje, setNuevoNumViaje] = useState("");

    // Modal para ver nota del vehículo en el historial
    const [modalNota, setModalNota] = useState({ show: false, lote: "", notaRegistro: "", notaRecepcion: "" });

    // Modal para confirmar cambio de número de viaje
    const [modalCambioNum, setModalCambioNum] = useState({ show: false, viaje: null, nuevoNum: "", resultado: "" });

    // Cargar datos para agregar viajes
    useEffect(() => {
        const unsubChoferes = firestore().collection("choferes").onSnapshot(snap => {
            setChoferes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubClientes = firestore().collection("clientes").onSnapshot(snap => {
            setClientes(snap.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().cliente,
                telefono: doc.data().telefonoCliente
            })));
        });

        return () => {
            unsubChoferes();
            unsubClientes();
        };
    }, []);

    // Función para cambiar número de viaje existente
    const cambiarNumeroViaje = (viajeActual, nuevoNum) => {
        if (!nuevoNum || nuevoNum === viajeActual.numViaje) {
            setEditandoViaje(null);
            return;
        }
        setModalCambioNum({ show: true, viaje: viajeActual, nuevoNum, resultado: "" });
    };

    const ejecutarCambioNumero = async () => {
        const { viaje: viajeActual, nuevoNum } = modalCambioNum;
        setLoading(true);
        try {
            const batch = firestore().batch();
            const docIdAnterior = viajeActual.docId || viajeActual.numViaje;

            const { docId, ...viajeDataSinDocId } = viajeActual;
            const nuevoViajeData = {
                ...viajeDataSinDocId,
                numViaje: nuevoNum,
                folioPago: nuevoNum
            };
            batch.set(firestore().collection("viajesPagados").doc(nuevoNum), nuevoViajeData);
            batch.delete(firestore().collection("viajesPagados").doc(docIdAnterior));

            if (viajeActual.vehiculos) {
                viajeActual.vehiculos.forEach(v => {
                    if (v.lote) {
                        batch.update(firestore().collection("vehiculos").doc(v.lote), {
                            numViaje: nuevoNum,
                            folioPago: nuevoNum
                        });
                    }
                });
            }

            await batch.commit();
            setModalCambioNum(prev => ({ ...prev, resultado: `Viaje actualizado de #${viajeActual.numViaje} a #${nuevoNum}` }));
            setEditandoViaje(null);
            consultarViajes(periodoSeleccionado);
        } catch (error) {
            setModalCambioNum(prev => ({ ...prev, resultado: `Error: ${error.message}` }));
        } finally {
            setLoading(false);
        }
    };

    // Verificar si el usuario puede eliminar viajes
    const puedeEliminarViajes = user?.adminMaster === true || user?.eliminarViajes === true;

    // Función para eliminar un viaje completo
    const eliminarViaje = async (viaje) => {
        if (!puedeEliminarViajes) {
            alert("No tienes permisos para eliminar viajes.");
            return;
        }

        const confirmar = window.confirm(
            `¿Estás seguro de eliminar el viaje #${viaje.numViaje}?\n\nEsto eliminará:\n- El registro del viaje\n- Las referencias en ${viaje.vehiculos?.length || 0} vehículos\n\nEsta acción NO se puede deshacer.`
        );
        if (!confirmar) return;

        // Segunda confirmación para mayor seguridad
        const confirmar2 = window.confirm(
            `⚠️ ÚLTIMA CONFIRMACIÓN ⚠️\n\n¿Realmente deseas eliminar el viaje #${viaje.numViaje}?`
        );
        if (!confirmar2) return;

        setLoading(true);
        try {
            const batch = firestore().batch();
            const docId = viaje.docId || viaje.numViaje;

            // Eliminar el documento del viaje
            batch.delete(firestore().collection("viajesPagados").doc(docId));

            // Limpiar las referencias de numViaje en los vehículos
            if (viaje.vehiculos && viaje.vehiculos.length > 0) {
                for (const v of viaje.vehiculos) {
                    if (v.lote) {
                        batch.update(firestore().collection("vehiculos").doc(v.lote), {
                            numViaje: firebase.firestore.FieldValue.delete(),
                            folioPago: firebase.firestore.FieldValue.delete()
                        });
                    }
                }
            }

            await batch.commit();
            alert(`Viaje #${viaje.numViaje} eliminado correctamente.`);
            consultarViajes(periodoSeleccionado);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Funciones del historial
    const calcularFechas = (periodo) => {
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        let diasHastaSabado = 6 - diaSemana;
        if (diaSemana === 0) diasHastaSabado = -1;
        const sabadoActual = new Date(hoy);
        sabadoActual.setDate(hoy.getDate() + diasHastaSabado);
        sabadoActual.setHours(23, 59, 59, 999);

        let lunesInicio = new Date(sabadoActual);
        if (periodo === 'semana') {
            lunesInicio.setDate(sabadoActual.getDate() - 5);
        } else if (periodo === 'quincena') {
            lunesInicio.setDate(sabadoActual.getDate() - 12);
        } else if (periodo === 'mensual') {
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
                .orderBy("fechaPago", "desc")
                .get();
            const data = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
            data.sort((a, b) => {
                const numA = parseFloat(a.numViaje) || 0;
                const numB = parseFloat(b.numViaje) || 0;
                return numB - numA;
            });
            setViajes(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

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

    // Funciones para agregar viaje pasado
    const seleccionarChofer = (chofer) => {
        setEncabezado({ ...encabezado, choferId: chofer.id });
        setChoferSeleccionado(chofer);
        setBusquedaChofer("");
    };

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
        setBusquedaCliente({ ...busquedaCliente, [lote]: "" });
    };

    const buscarVehiculo = async () => {
        if (!busqueda) return;
        const loteBuscado = busqueda.trim();

        // Verificar si ya está en la lista
        if (vehiculosSeleccionados.some(v => v.lote === loteBuscado)) {
            alert("Este lote ya está en la lista.");
            return;
        }

        setLoading(true);
        try {
            const vehDoc = await firestore().collection("vehiculos").doc(loteBuscado).get();
            if (!vehDoc.exists) {
                alert("Vehículo no encontrado en la base de datos.");
                return;
            }

            const vehData = vehDoc.data();

            // Verificar si ya tiene viaje asignado
            if (vehData.numViaje) {
                const confirmar = window.confirm(
                    `Este lote ya tiene el viaje #${vehData.numViaje} asignado. ¿Deseas agregarlo de todas formas?`
                );
                if (!confirmar) return;
            }

            // Buscar el COSTO al chofer en la configuración de Estados y Precios
            let costoChofer = 0;
            if (vehData.estado && vehData.ciudad) {
                const provinceSnap = await firestore().collection("province")
                    .where("state", "==", vehData.estado)
                    .limit(1)
                    .get();

                if (!provinceSnap.empty) {
                    const provinceData = provinceSnap.docs[0].data();
                    const regionEncontrada = provinceData.regions?.find(
                        r => r.city?.toUpperCase() === vehData.ciudad?.toUpperCase()
                    );
                    if (regionEncontrada) {
                        costoChofer = parseFloat(regionEncontrada.cost) || 0;
                    }
                }
            }

            setVehiculosSeleccionados([...vehiculosSeleccionados, {
                lote: vehDoc.id,
                marca: vehData.marca || "",
                modelo: vehData.modelo || "",
                ciudad: vehData.ciudad || "",
                estado: vehData.estado || "",
                almacen: vehData.almacen || "",
                titulo: vehData.titulo || "NO",
                clienteId: vehData.clienteId || "",
                clienteNombre: vehData.clienteNombre || vehData.cliente || "",
                clienteTelefono: vehData.clienteTelefono || vehData.telefonoCliente || "",
                clienteAlt: vehData.cliente || "",
                // Pre-llenar con el COSTO al chofer desde Estados y Precios
                flete: costoChofer,
                storage: parseFloat(vehData.storage) || 0,
                sPeso: parseFloat(vehData.sobrePeso) || 0,
                gExtra: parseFloat(vehData.gastosExtra) || 0
            }]);
            setBusqueda("");
        } catch (e) {
            console.error(e);
            alert("Error al buscar el vehículo.");
        } finally {
            setLoading(false);
        }
    };

    const registrarViajePasado = async () => {
        if (!numViaje || numViaje.toString().trim() === "") {
            alert("Ingresa el número de viaje.");
            return;
        }
        if (vehiculosSeleccionados.length === 0) {
            alert("Agrega al menos un vehículo.");
            return;
        }
        if (!encabezado.choferId) {
            alert("Selecciona un chofer.");
            return;
        }
        if (!encabezado.fechaViaje) {
            alert("Selecciona la fecha del viaje.");
            return;
        }

        // Verificar que todos tengan cliente
        const faltanClientes = vehiculosSeleccionados.some(v => !v.clienteId);
        if (faltanClientes) {
            alert("Por favor, asigna un Cliente a todos los vehículos.");
            return;
        }

        const numViajeFinal = String(numViaje).trim();

        // Verificar si ya existe un viaje con ese número
        const viajeExistente = await firestore().collection("viajesPagados").doc(numViajeFinal).get();
        if (viajeExistente.exists) {
            alert(`Ya existe el viaje #${numViajeFinal}. Usa otro número.`);
            return;
        }

        setLoading(true);
        const batch = firestore().batch();
        const choferSel = choferes.find(c => c.id === encabezado.choferId);
        const fechaViaje = new Date(encabezado.fechaViaje);

        try {
            const totalFletes = vehiculosSeleccionados.reduce((acc, v) => acc + parseFloat(v.flete || 0), 0);
            const totalOtros = vehiculosSeleccionados.reduce((acc, v) =>
                acc + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0), 0);

            const nuevoViaje = {
                numViaje: numViajeFinal,
                folioPago: numViajeFinal,
                estatus: "PAGADO",
                fechaCreacion: firebase.firestore.Timestamp.fromDate(fechaViaje),
                fechaPago: firebase.firestore.Timestamp.fromDate(fechaViaje),
                fechaRegistroSistema: new Date(),
                metodo: "VIAJE_HISTORICO",
                creadoPor: { id: user?.id || "sistema", nombre: user?.nombre || "Sistema" },
                chofer: {
                    id: choferSel.id,
                    nombre: choferSel.nombreChofer,
                    empresa: choferSel.empresaNombre
                },
                empresaLiquidada: encabezado.empresaLiquidada || choferSel.empresaNombre,
                vehiculos: vehiculosSeleccionados,
                resumenFinanciero: {
                    totalFletes,
                    totalSoloGastos: totalOtros,
                    totalVehiculos: vehiculosSeleccionados.length,
                    granTotal: totalFletes + totalOtros
                }
            };

            // Crear el viaje
            batch.set(firestore().collection("viajesPagados").doc(numViajeFinal), nuevoViaje);

            // Actualizar cada vehículo con el numViaje
            vehiculosSeleccionados.forEach(v => {
                batch.update(firestore().collection("vehiculos").doc(v.lote), {
                    numViaje: numViajeFinal,
                    folioPago: numViajeFinal,
                    clienteId: v.clienteId,
                    clienteNombre: v.clienteNombre,
                    clienteTelefono: v.clienteTelefono,
                    cliente: v.clienteNombre
                });
            });

            await batch.commit();
            alert(`Viaje #${numViajeFinal} registrado exitosamente.`);

            // Limpiar formulario
            setVehiculosSeleccionados([]);
            setBusqueda("");
            setNumViaje("");
            setEncabezado({ choferId: "", fechaViaje: "", empresaLiquidada: "" });
            setChoferSeleccionado(null);

            // Volver al historial y recargar
            setVista("historial");
            consultarViajes(periodoSeleccionado);

        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const totalGeneral = viajes.reduce((acc, v) => acc + (v.resumenFinanciero?.granTotal || 0), 0);

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-black">
            {/* MODAL DE NOTA DEL VEHÍCULO */}
            {modalNota.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border-t-8 border-blue-600 overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-gray-800">
                                <FaCommentDots className="text-blue-600" /> Notas del Vehículo
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Lote: {modalNota.lote}</p>

                            <div className="mt-6 space-y-4">
                                {modalNota.notaRegistro && (
                                    <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Nota de Registro (Origen)</p>
                                        <p className="text-sm font-bold text-gray-700 italic">
                                            {modalNota.notaRegistro}
                                        </p>
                                    </div>
                                )}
                                {modalNota.notaRecepcion && (
                                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                        <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Nota de Recepción (Destino)</p>
                                        <p className="text-sm font-bold text-blue-700 italic">
                                            {modalNota.notaRecepcion}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex mt-6">
                                <button
                                    onClick={() => setModalNota({ show: false, lote: "", notaRegistro: "", notaRecepcion: "" })}
                                    className="btn btn-sm btn-ghost flex-1 font-black uppercase text-[10px]"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CAMBIO DE NÚMERO DE VIAJE */}
            {modalCambioNum.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border-t-8 border-blue-600 overflow-hidden">
                        <div className="p-6">
                            {!modalCambioNum.resultado ? (
                                <>
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-800">
                                        Cambiar Número de Viaje
                                    </h3>
                                    <p className="text-sm font-bold text-gray-600 mt-3">
                                        ¿Cambiar viaje <span className="text-red-600">#{modalCambioNum.viaje?.numViaje}</span> a <span className="text-green-600">#{modalCambioNum.nuevoNum}</span>?
                                    </p>
                                    <div className="flex gap-2 mt-6">
                                        <button
                                            onClick={() => setModalCambioNum({ show: false, viaje: null, nuevoNum: "", resultado: "" })}
                                            className="btn btn-sm btn-ghost flex-1 font-black uppercase text-[10px]"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={ejecutarCambioNumero}
                                            className="btn btn-sm btn-success flex-1 text-white font-black uppercase text-[10px]"
                                        >
                                            Sí, cambiar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-green-700 flex items-center gap-2">
                                        <FaCheck /> Listo
                                    </h3>
                                    <p className="text-sm font-bold text-gray-600 mt-3">
                                        {modalCambioNum.resultado}
                                    </p>
                                    <div className="flex mt-6">
                                        <button
                                            onClick={() => setModalCambioNum({ show: false, viaje: null, nuevoNum: "", resultado: "" })}
                                            className="btn btn-sm btn-ghost flex-1 font-black uppercase text-[10px]"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="sticky top-0 z-50 p-6 bg-white border-b-2 border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                            Historial de Viajes
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {vista === "historial" ? "Viajes Liquidados y Pagados" : "Agregar Viaje Pasado"}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {vista === "historial" && viajes.length > 0 && (
                            <div className="bg-white border-2 border-black p-4 rounded-xl text-black text-center shadow-lg">
                                <h4 className="text-[10px] font-black uppercase opacity-60 italic">Total Período</h4>
                                <span className="text-2xl font-black italic">${totalGeneral.toLocaleString()}</span>
                            </div>
                        )}

                        {/* Botón para cambiar de vista */}
                        <button
                            onClick={() => setVista(vista === "historial" ? "agregar" : "historial")}
                            className={`btn btn-sm h-12 px-6 font-black uppercase gap-2 ${
                                vista === "agregar"
                                    ? "btn-outline btn-error"
                                    : "btn-error text-white"
                            }`}
                        >
                            {vista === "historial" ? (
                                <><FaPlus /> Agregar Viaje Pasado</>
                            ) : (
                                <><FaList /> Ver Historial</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filtros solo en vista historial */}
                {vista === "historial" && (
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
                )}
            </div>

            {/* CONTENIDO */}
            {vista === "historial" ? (
                // VISTA HISTORIAL
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
                                        {editandoViaje === viaje.numViaje ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500 font-bold">VIAJE #</span>
                                                <input
                                                    type="text"
                                                    className="input input-bordered input-sm w-24 font-black"
                                                    value={nuevoNumViaje}
                                                    onChange={(e) => setNuevoNumViaje(e.target.value)}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => cambiarNumeroViaje(viaje, nuevoNumViaje)}
                                                    className="btn btn-sm btn-success text-white"
                                                >
                                                    <FaCheck />
                                                </button>
                                                <button
                                                    onClick={() => setEditandoViaje(null)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="bg-green-600 px-3 py-1 italic font-black text-lg skew-x-[-10deg] text-white">
                                                    VIAJE #{viaje.numViaje}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setEditandoViaje(viaje.numViaje);
                                                        setNuevoNumViaje(viaje.numViaje);
                                                    }}
                                                    className="btn btn-xs btn-ghost text-gray-500 hover:text-blue-600"
                                                    title="Editar número de viaje"
                                                >
                                                    <FaPen size={10} />
                                                </button>
                                            </div>
                                        )}
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
                                        {/* Botón eliminar - solo visible si tiene permiso */}
                                        {puedeEliminarViajes && (
                                            <button
                                                onClick={() => eliminarViaje(viaje)}
                                                disabled={loading}
                                                className="btn btn-sm btn-ghost text-red-400 hover:text-red-600 hover:bg-red-50"
                                                title="Eliminar viaje"
                                            >
                                                <FaTrashAlt size={14} />
                                            </button>
                                        )}
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
                                                <th className="p-3 text-right text-blue-700">Nota</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viaje.vehiculos.map((v, idx) => {
                                                const total = parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0);
                                                const notaRegistro = (v.comentarioRegistro || "").trim();
                                                const notaRecepcion = (v.comentarioRecepcion || "").trim();
                                                const tieneNota = notaRegistro !== "" || notaRecepcion !== "";
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
                                                        <td className="p-3 text-right">
                                                            {tieneNota ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setModalNota({
                                                                        show: true,
                                                                        lote: v.lote,
                                                                        notaRegistro,
                                                                        notaRecepcion
                                                                    })}
                                                                    className="text-blue-600 hover:text-blue-800 transition-colors inline-flex"
                                                                    title="Ver nota"
                                                                >
                                                                    <FaCommentDots size={20} />
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-200">—</span>
                                                            )}
                                                        </td>
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
                                                <td className="p-3 bg-gray-50"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                // VISTA AGREGAR VIAJE PASADO - Estilo idéntico a FormViaje
                <div className="p-4">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 font-sans text-black">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 border-b pb-4">Registrar Viaje Pasado</h2>

                        {/* ENCABEZADO - Grid 4 columnas como FormViaje */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 items-end">
                            <div>
                                <label className="block text-[10px] md:text-[10px] font-black text-red-600 uppercase mb-1 italic">Núm. Viaje *</label>
                                <input
                                    type="text"
                                    className="input input-bordered input-md md:input-sm w-full bg-white text-black font-bold uppercase text-center text-[16px] md:text-[14px]"
                                    value={numViaje}
                                    onChange={(e) => setNumViaje(e.target.value)}
                                    placeholder="Ej: 500"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-[10px] md:text-[10px] font-black text-gray-600 uppercase mb-1 italic">Chofer *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="input input-bordered input-md md:input-sm w-full bg-white text-black font-bold uppercase pr-8 text-[16px] md:text-[14px]"
                                        value={busquedaChofer || (choferSeleccionado ? choferSeleccionado.nombreChofer : "")}
                                        onChange={(e) => setBusquedaChofer(e.target.value)}
                                        placeholder="Buscar chofer..."
                                        readOnly={!!encabezado.choferId && !busquedaChofer}
                                        style={{ fontSize: '16px' }}
                                    />
                                    {encabezado.choferId && (
                                        <button
                                            className="absolute right-2 top-2 text-gray-400"
                                            onClick={() => {
                                                setEncabezado({ ...encabezado, choferId: "" });
                                                setChoferSeleccionado(null);
                                            }}
                                        >
                                            <FaTimes size={12} />
                                        </button>
                                    )}
                                </div>
                                {busquedaChofer && !encabezado.choferId && (
                                    <div className="absolute z-[100] w-full bg-white border shadow-2xl rounded-md max-h-60 overflow-y-auto mt-1 border-red-200">
                                        {choferes
                                            .filter(c => c.nombreChofer.toLowerCase().includes(busquedaChofer.toLowerCase()))
                                            .map(c => (
                                                <div
                                                    key={c.id}
                                                    className="p-3 hover:bg-red-600 hover:text-white cursor-pointer text-[11px] font-black uppercase border-b last:border-none flex justify-between items-center"
                                                    onClick={() => seleccionarChofer(c)}
                                                >
                                                    <span>{c.nombreChofer}</span>
                                                    <span className="text-[9px] opacity-70">{c.empresaNombre}</span>
                                                </div>
                                            ))
                                        }
                                        {choferes.filter(c => c.nombreChofer.toLowerCase().includes(busquedaChofer.toLowerCase())).length === 0 && (
                                            <div className="p-3 text-gray-400 text-[10px] italic font-bold">No se encontró al chofer...</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[10px] md:text-[10px] font-black text-gray-600 uppercase mb-1 italic">Fecha del Viaje *</label>
                                <input
                                    type="date"
                                    className="input input-bordered input-md md:input-sm w-full bg-white text-black font-bold uppercase text-[16px] md:text-[14px]"
                                    value={encabezado.fechaViaje}
                                    onChange={(e) => setEncabezado({ ...encabezado, fechaViaje: e.target.value })}
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Lote..."
                                    className="input input-bordered input-md md:input-sm flex-1 bg-white text-black font-bold uppercase text-[16px] md:text-[14px]"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
                                    onKeyPress={(e) => e.key === 'Enter' && buscarVehiculo()}
                                    style={{ fontSize: '16px' }}
                                />
                                <button
                                    onClick={buscarVehiculo}
                                    disabled={loading || !busqueda}
                                    className="btn btn-sm btn-info text-white font-black px-4"
                                >
                                    + Agregar
                                </button>
                            </div>
                        </div>

                        {/* CONTADOR DE UNIDADES */}
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[11px] font-black uppercase text-gray-400 italic">
                                Unidades: {vehiculosSeleccionados.length}
                            </span>
                            <span className="text-[11px] font-black uppercase text-gray-400 italic">
                                Total: ${vehiculosSeleccionados.reduce((acc, v) => acc + (v.flete + v.storage + v.sPeso + v.gExtra), 0).toLocaleString()}
                            </span>
                        </div>

                        {/* TABLA - Estilo idéntico a FormViaje */}
                        <div className="overflow-x-auto border rounded-xl shadow-inner max-h-[600px] md:max-h-[400px] -webkit-overflow-scrolling-touch mb-6">
                            <table className="table table-compact w-full">
                                <thead>
                                    <tr className="text-[11px] md:text-[10px] uppercase bg-gray-100 text-gray-500 sticky top-0 z-20">
                                        <th className="p-2">#</th>
                                        <th className="p-2 min-w-[110px]">Lote</th>
                                        <th className="p-2 min-w-[100px]">Marca</th>
                                        <th className="p-2 min-w-[100px]">Modelo</th>
                                        <th className="p-2 min-w-[150px]">Cliente *</th>
                                        <th className="p-2 min-w-[90px]">Almacén</th>
                                        <th className="p-2 min-w-[80px]">Estado</th>
                                        <th className="p-2 min-w-[100px]">Ciudad</th>
                                        <th className="p-2 min-w-[80px] text-blue-800">Flete</th>
                                        <th className="p-2 min-w-[70px]">Storage</th>
                                        <th className="p-2 min-w-[70px]">S. Peso</th>
                                        <th className="p-2 min-w-[70px]">G. Extra</th>
                                        <th className="p-2 min-w-[60px]">Título</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {vehiculosSeleccionados.length === 0 ? (
                                        <tr>
                                            <td colSpan="14" className="text-center py-10 text-gray-400 font-bold uppercase">
                                                Escanea lotes para agregar vehículos
                                            </td>
                                        </tr>
                                    ) : (
                                        vehiculosSeleccionados.map((v, i) => (
                                            <tr key={v.lote} className="bg-gray-200">
                                                <td className="font-mono text-[12px] md:text-[10px] text-gray-400 italic p-2">{i + 1}</td>
                                                <td className="p-1">
                                                    <input
                                                        type="text"
                                                        value={v.lote}
                                                        disabled
                                                        className="input input-sm md:input-xs w-full font-black text-[14px] md:text-[12px] text-blue-700 bg-gray-100"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="text"
                                                        value={v.marca}
                                                        disabled
                                                        className="input input-sm md:input-xs w-full bg-gray-100 uppercase font-bold text-[14px] md:text-[12px]"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="text"
                                                        value={v.modelo}
                                                        disabled
                                                        className="input input-sm md:input-xs w-full bg-gray-100 uppercase font-bold text-[14px] md:text-[12px]"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1 relative">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar cliente..."
                                                            className={`input input-sm md:input-xs w-full font-bold text-[14px] md:text-[12px] uppercase pr-8 ${
                                                                v.clienteNombre ? "bg-green-100 text-green-800" : "bg-white text-black"
                                                            }`}
                                                            value={busquedaCliente[v.lote] || (v.clienteNombre ? v.clienteNombre : "")}
                                                            onChange={(e) => setBusquedaCliente({
                                                                ...busquedaCliente,
                                                                [v.lote]: e.target.value
                                                            })}
                                                            readOnly={!!v.clienteNombre && !busquedaCliente[v.lote]}
                                                            style={{ fontSize: '16px' }}
                                                        />
                                                        {v.clienteNombre && !busquedaCliente[v.lote] && (
                                                            <button
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500"
                                                                onClick={() => {
                                                                    const resetVehiculos = vehiculosSeleccionados.map(veh =>
                                                                        veh.lote === v.lote
                                                                            ? { ...veh, clienteId: "", clienteNombre: "", clienteTelefono: "" }
                                                                            : veh
                                                                    );
                                                                    setVehiculosSeleccionados(resetVehiculos);
                                                                }}
                                                            >
                                                                <FaTimes size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {busquedaCliente[v.lote] && (
                                                        <div className="absolute z-[100] w-full bg-white border shadow-2xl rounded-md max-h-40 overflow-y-auto mt-1 border-red-200">
                                                            {clientes
                                                                .filter(c => c.nombre.toLowerCase().includes(busquedaCliente[v.lote].toLowerCase()))
                                                                .map(cliente => (
                                                                    <div
                                                                        key={cliente.id}
                                                                        className="p-2 hover:bg-red-600 hover:text-white cursor-pointer text-[11px] font-black uppercase border-b last:border-none"
                                                                        onClick={() => asignarClienteAFila(v.lote, cliente)}
                                                                    >
                                                                        {cliente.nombre}
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                    {v.clienteAlt && !v.clienteNombre && (
                                                        <span className="text-[8px] font-bold text-blue-600 uppercase italic block mt-1">
                                                            Ref: {v.clienteAlt}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="text"
                                                        value={v.almacen}
                                                        disabled
                                                        className="input input-sm md:input-xs w-full bg-gray-100 uppercase font-bold text-[14px] md:text-[12px]"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="text"
                                                        value={v.estado}
                                                        disabled
                                                        className="input input-sm md:input-xs w-full bg-gray-100 text-red-800 font-bold text-[14px] md:text-[12px]"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="text"
                                                        value={v.ciudad}
                                                        disabled
                                                        className="input input-sm md:input-xs w-full bg-gray-100 text-red-800 font-bold text-[14px] md:text-[12px]"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="number"
                                                        value={v.flete}
                                                        onChange={(e) => {
                                                            const nuevos = vehiculosSeleccionados.map(veh =>
                                                                veh.lote === v.lote ? { ...veh, flete: parseFloat(e.target.value) || 0 } : veh
                                                            );
                                                            setVehiculosSeleccionados(nuevos);
                                                        }}
                                                        className="input input-sm md:input-xs w-20 md:w-16 text-center font-black text-blue-900 bg-blue-50 text-[14px] md:text-[12px]"
                                                        placeholder="0"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="number"
                                                        value={v.storage}
                                                        onChange={(e) => {
                                                            const nuevos = vehiculosSeleccionados.map(veh =>
                                                                veh.lote === v.lote ? { ...veh, storage: parseFloat(e.target.value) || 0 } : veh
                                                            );
                                                            setVehiculosSeleccionados(nuevos);
                                                        }}
                                                        className="input input-sm md:input-xs w-20 md:w-16 text-center text-[14px] md:text-[12px]"
                                                        placeholder="0"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="number"
                                                        value={v.sPeso}
                                                        onChange={(e) => {
                                                            const nuevos = vehiculosSeleccionados.map(veh =>
                                                                veh.lote === v.lote ? { ...veh, sPeso: parseFloat(e.target.value) || 0 } : veh
                                                            );
                                                            setVehiculosSeleccionados(nuevos);
                                                        }}
                                                        className="input input-sm md:input-xs w-20 md:w-16 text-center text-[14px] md:text-[12px]"
                                                        placeholder="0"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="number"
                                                        value={v.gExtra}
                                                        onChange={(e) => {
                                                            const nuevos = vehiculosSeleccionados.map(veh =>
                                                                veh.lote === v.lote ? { ...veh, gExtra: parseFloat(e.target.value) || 0 } : veh
                                                            );
                                                            setVehiculosSeleccionados(nuevos);
                                                        }}
                                                        className="input input-sm md:input-xs w-20 md:w-16 text-center text-[14px] md:text-[12px]"
                                                        placeholder="0"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <select
                                                        value={v.titulo}
                                                        onChange={(e) => {
                                                            const nuevos = vehiculosSeleccionados.map(veh =>
                                                                veh.lote === v.lote ? { ...veh, titulo: e.target.value } : veh
                                                            );
                                                            setVehiculosSeleccionados(nuevos);
                                                        }}
                                                        className="select select-sm md:select-xs w-full font-bold text-[14px] md:text-[12px]"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        <option value="NO">NO</option>
                                                        <option value="SI">SI</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => setVehiculosSeleccionados(vehiculosSeleccionados.filter(veh => veh.lote !== v.lote))}
                                                        className="text-red-400"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* BOTÓN FINAL */}
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={registrarViajePasado}
                                disabled={loading || vehiculosSeleccionados.length === 0}
                                className="btn btn-error text-white font-black px-16 gap-3 shadow-xl"
                            >
                                {loading ? (
                                    <span className="loading loading-spinner"></span>
                                ) : (
                                    <><FaCheck /> REGISTRAR VIAJE #{numViaje}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReporteViajesPagados;
