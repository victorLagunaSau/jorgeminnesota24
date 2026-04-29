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
    const [vista, setVista] = useState("historial"); // "historial" | "agregar" | "importados"

    // Estados del historial
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('semana');
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Viajes importados H-
    const [viajesImportados, setViajesImportados] = useState([]);
    const [loadingImportados, setLoadingImportados] = useState(false);
    const [filtroImportados, setFiltroImportados] = useState("todos"); // "todos" | "pendientes" | "asignados"

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
    const [modalNota, setModalNota] = useState({ show: false, lote: "", notaRegistro: "", notaRecepcion: "", notaImportada: "" });

    // Modal para confirmar cambio de número de viaje
    const [modalCambioNum, setModalCambioNum] = useState({ show: false, viaje: null, nuevoNum: "", resultado: "" });

    // Lotes que ya fueron cobrados en Caja (estatus "EN")
    const [lotesPagados, setLotesPagados] = useState({});
    const [modalEliminar, setModalEliminar] = useState({ show: false, viaje: null });

    // Asignar chofer a viajes importados (H-*)
    const [dropdownChoferViaje, setDropdownChoferViaje] = useState(null);
    const [busquedaChoferHistorial, setBusquedaChoferHistorial] = useState("");

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

    // Asignar chofer a viaje importado
    const asignarChoferAViaje = async (viaje, chofer) => {
        setDropdownChoferViaje(null);
        setBusquedaChoferHistorial("");
        try {
            const docId = viaje.docId || viaje.numViaje;
            await firestore().collection("viajesPagados").doc(docId).update({
                chofer: {
                    id: chofer.id,
                    nombre: chofer.nombreChofer,
                    empresa: chofer.empresaNombre || "",
                },
                choferPendiente: false,
                empresaLiquidada: chofer.empresaNombre || "",
            });
            // Actualizar local
            setViajes(prev => prev.map(v =>
                (v.docId || v.numViaje) === docId
                    ? {
                        ...v,
                        chofer: { id: chofer.id, nombre: chofer.nombreChofer, empresa: chofer.empresaNombre || "" },
                        choferPendiente: false,
                        empresaLiquidada: chofer.empresaNombre || "",
                    }
                    : v
            ));
        } catch (e) {
            console.error(e);
            alert("Error al asignar chofer: " + e.message);
        }
    };

    // Verificar si el usuario puede eliminar viajes
    const puedeEliminarViajes = user?.adminMaster === true || user?.eliminarViajes === true;
    // Solo Admin Master puede cambiar el número de viaje en el historial
    const puedeEditarNumViaje = user?.adminMaster === true;

    // Abre modal de confirmación
    const eliminarViaje = (viaje) => {
        if (!puedeEliminarViajes) return;
        setModalEliminar({ show: true, viaje });
    };

    // Ejecuta la eliminación tras confirmar
    const confirmarEliminarViaje = async () => {
        const viaje = modalEliminar.viaje;
        if (!viaje) return;
        setModalEliminar({ show: false, viaje: null });
        setLoading(true);
        try {
            const batch = firestore().batch();
            const docId = viaje.docId || viaje.numViaje;

            batch.delete(firestore().collection("viajesPagados").doc(docId));

            if (viaje.vehiculos && viaje.vehiculos.length > 0) {
                const lotes = viaje.vehiculos.map(v => v.lote).filter(Boolean);
                const existenciaSnaps = await Promise.all(
                    lotes.map(lote => firestore().collection("vehiculos").doc(lote).get())
                );
                existenciaSnaps.forEach((snap, idx) => {
                    if (snap.exists) {
                        batch.update(firestore().collection("vehiculos").doc(lotes[idx]), {
                            numViaje: firebase.firestore.FieldValue.delete(),
                            folioPago: firebase.firestore.FieldValue.delete()
                        });
                    }
                });
            }

            await batch.commit();
            consultarViajes(periodoSeleccionado);
        } catch (error) {
            console.error(error);
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
            const data = snap.docs
                .map(doc => ({ docId: doc.id, ...doc.data() }))
                .filter(v => !v.numViaje?.startsWith("H-") && v.metodo !== "IMPORTACION_HISTORIAL");
            data.sort((a, b) => {
                const numA = parseFloat(a.numViaje) || 0;
                const numB = parseFloat(b.numViaje) || 0;
                return numB - numA;
            });
            setViajes(data);

            // Consultar cuáles lotes ya fueron cobrados en Caja
            const todosLotes = data.flatMap(v => (v.vehiculos || []).map(vh => vh.lote).filter(Boolean));
            const pagados = {};
            // Firestore limita "in" a 10 elementos, hacemos batches
            for (let i = 0; i < todosLotes.length; i += 10) {
                const batch = todosLotes.slice(i, i + 10);
                const vehSnap = await firestore().collection("vehiculos")
                    .where(firebase.firestore.FieldPath.documentId(), "in", batch)
                    .get();
                vehSnap.docs.forEach(doc => {
                    if (doc.data().estatus === "EN") {
                        pagados[doc.id] = true;
                    }
                });
            }
            setLotesPagados(pagados);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const consultarImportados = async () => {
        setLoadingImportados(true);
        try {
            const snap = await firestore().collection("viajesPagados")
                .where("metodo", "==", "IMPORTACION_HISTORIAL")
                .get();
            const data = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
            data.sort((a, b) => {
                const numA = parseInt((a.numViaje || "").replace("H-", "")) || 0;
                const numB = parseInt((b.numViaje || "").replace("H-", "")) || 0;
                return numB - numA;
            });
            setViajesImportados(data);
        } catch (e) { console.error(e); }
        setLoadingImportados(false);
    };

    useEffect(() => {
        consultarViajes('semana');
        consultarImportados();
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
            {/* MODAL CONFIRMAR ELIMINAR VIAJE */}
            {modalEliminar.show && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl border-t-8 border-red-600 max-w-xs w-full p-6 text-center">
                        <h3 className="text-base font-black uppercase tracking-tight text-gray-800">¿Seguro que desea eliminar?</h3>
                        <div className="flex justify-center gap-3 mt-6">
                            <button
                                onClick={() => setModalEliminar({ show: false, viaje: null })}
                                className="btn btn-sm btn-ghost font-black uppercase text-[11px] px-6">
                                No
                            </button>
                            <button
                                onClick={confirmarEliminarViaje}
                                className="btn btn-sm btn-error text-white font-black uppercase text-[11px] px-6">
                                Sí
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                {modalNota.notaImportada && (
                                    <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                                        <p className="text-[9px] font-black text-amber-500 uppercase mb-1">Nota (Historial)</p>
                                        <p className="text-sm font-bold text-amber-700 italic">
                                            {modalNota.notaImportada}
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
            <div className="p-4 lg:p-6 bg-white border-b-2 border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                            Historial de Viajes
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {vista === "historial" ? "Viajes Liquidados y Pagados" : vista === "importados" ? "Viajes Importados del Historial (H-)" : "Agregar Viaje Pasado"}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {vista === "historial" && viajes.length > 0 && (
                            <div className="bg-white border-2 border-black px-3 py-2 rounded-xl text-black text-center shadow-lg">
                                <h4 className="text-[9px] font-black uppercase opacity-60 italic">Total Período</h4>
                                <span className="text-lg lg:text-2xl font-black italic">${totalGeneral.toLocaleString()}</span>
                            </div>
                        )}

                        <button
                            onClick={() => setVista("agregar")}
                            className={`btn btn-sm h-12 px-4 font-black uppercase gap-2 ${vista === "agregar" ? "btn-error text-white" : "btn-outline btn-error"}`}
                        >
                            <FaPlus /> Agregar
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                {vista !== "agregar" && (
                    <div className="flex gap-1 mt-3 mb-3">
                        <button
                            onClick={() => setVista("historial")}
                            className={`px-4 py-2 text-[11px] font-black uppercase rounded-t ${vista === "historial" ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}
                        >
                            Historial
                        </button>
                        <button
                            onClick={() => setVista("importados")}
                            className={`px-4 py-2 text-[11px] font-black uppercase rounded-t flex items-center gap-2 ${vista === "importados" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}
                        >
                            <FaHistory size={10} /> Viajes Importados (H-)
                            {viajesImportados.filter(v => v.choferPendiente).length > 0 && (
                                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                    {viajesImportados.filter(v => v.choferPendiente).length}
                                </span>
                            )}
                        </button>
                    </div>
                )}

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
            {vista === "importados" ? (
                // VISTA VIAJES IMPORTADOS H-
                <div className="p-2 overflow-x-auto">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <span className="text-[10px] font-black uppercase text-gray-400">Filtrar:</span>
                        {[
                            { key: "todos", label: `Todos (${viajesImportados.length})` },
                            { key: "pendientes", label: `Sin chofer (${viajesImportados.filter(v => v.choferPendiente || !v.chofer?.nombre).length})` },
                            { key: "asignados", label: `Con chofer (${viajesImportados.filter(v => !v.choferPendiente && v.chofer?.nombre).length})` },
                        ].map(f => (
                            <button key={f.key}
                                onClick={() => setFiltroImportados(f.key)}
                                className={`btn btn-xs font-black uppercase ${filtroImportados === f.key ? "btn-warning text-black" : "btn-ghost"}`}
                            >
                                {f.label}
                            </button>
                        ))}
                        <button onClick={consultarImportados} disabled={loadingImportados} className="btn btn-xs btn-ghost font-black uppercase ml-auto">
                            {loadingImportados ? <span className="loading loading-spinner loading-xs"></span> : "Recargar"}
                        </button>
                    </div>

                    {viajesImportados.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-400 font-bold uppercase">No hay viajes importados (H-)</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-[11px]">
                            <thead>
                                <tr className="bg-orange-700 text-white text-[10px] uppercase font-black">
                                    <th className="border border-orange-600 px-1 py-2 text-center">Fecha</th>
                                    <th className="border border-orange-600 px-1 py-2 text-center">Viaje</th>
                                    <th className="border border-orange-600 px-1 py-2">Chofer</th>
                                    <th className="border border-orange-600 px-1 py-2">Vehículo</th>
                                    <th className="border border-orange-600 px-1 py-2">Lote</th>
                                    <th className="border border-orange-600 px-1 py-2">Ruta</th>
                                    <th className="border border-orange-600 px-1 py-2">Cliente</th>
                                    <th className="border border-orange-600 px-1 py-2 text-right">Flete</th>
                                    <th className="border border-orange-600 px-1 py-2 text-right">Storage</th>
                                    <th className="border border-orange-600 px-1 py-2 text-right">S.Peso</th>
                                    <th className="border border-orange-600 px-1 py-2 text-right">G.Extra</th>
                                    <th className="border border-orange-600 px-1 py-2 text-right">Total</th>
                                    <th className="border border-orange-600 px-1 py-2 text-right bg-orange-800">Total Viaje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viajesImportados
                                    .filter(v => {
                                        if (filtroImportados === "pendientes") return v.choferPendiente || !v.chofer?.nombre;
                                        if (filtroImportados === "asignados") return !v.choferPendiente && v.chofer?.nombre;
                                        return true;
                                    })
                                    .map((viaje, vIndex) => {
                                    const fecha = viaje.fechaPago?.toDate ? moment(viaje.fechaPago.toDate()).format("D MMM YY") : "";
                                    const totalViaje = (viaje.vehiculos || []).reduce((acc, v) =>
                                        acc + (parseFloat(v.flete) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0), 0);
                                    return (viaje.vehiculos || []).map((v, idx) => {
                                        const extras = (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0);
                                        const total = (parseFloat(v.flete) || 0) + extras;
                                        const sinChofer = viaje.choferPendiente || !viaje.chofer?.nombre;
                                        const bgFila = sinChofer ? "bg-yellow-50" : "bg-white";
                                        return (
                                            <tr key={`imp-${vIndex}-${idx}`} className={`${bgFila} hover:bg-yellow-100 border-b border-gray-200`}>
                                                <td className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-600 whitespace-nowrap text-[10px]">{idx === 0 ? fecha : ""}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-center font-black text-orange-700 whitespace-nowrap">
                                                    {idx === 0 ? (
                                                        puedeEditarNumViaje && editandoViaje === viaje.docId ? (
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <input type="text" className="w-16 border-2 border-blue-500 rounded text-center text-[11px] font-black px-1 py-1 focus:outline-none" value={nuevoNumViaje} onChange={(e) => setNuevoNumViaje(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') cambiarNumeroViaje(viaje, nuevoNumViaje); if (e.key === 'Escape') setEditandoViaje(null); }} autoFocus />
                                                                <button onClick={() => cambiarNumeroViaje(viaje, nuevoNumViaje)} className="w-5 h-5 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white shadow-sm"><FaCheck size={8}/></button>
                                                                <button onClick={() => setEditandoViaje(null)} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-400 hover:bg-gray-500 text-white shadow-sm"><FaTimes size={8}/></button>
                                                            </div>
                                                        ) : (
                                                            <span className={puedeEditarNumViaje ? "cursor-pointer hover:text-blue-600" : ""} onDoubleClick={puedeEditarNumViaje ? () => { setEditandoViaje(viaje.docId); setNuevoNumViaje(viaje.numViaje); } : undefined} title={puedeEditarNumViaje ? "Doble clic para editar" : ""}>
                                                                #{viaje.numViaje}
                                                            </span>
                                                        )
                                                    ) : ""}
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-gray-700" style={{ minWidth: "130px" }}>
                                                    {idx === 0 ? (
                                                        viaje.chofer?.nombre ? (
                                                            <div>
                                                                <div className="font-black text-blue-800 text-[11px] truncate">{viaje.chofer.nombre}</div>
                                                                {viaje.choferExcel && <div className="text-[8px] text-orange-500 italic">Ref: {viaje.choferExcel}</div>}
                                                            </div>
                                                        ) : (
                                                            <div className="relative">
                                                                {viaje.choferExcel && <div className="text-[8px] text-orange-500 italic font-bold mb-1">Ref: {viaje.choferExcel}</div>}
                                                                <input type="text" placeholder="Asignar chofer..." className="input input-xs w-full font-bold uppercase text-[10px] bg-yellow-50 border-yellow-300" value={dropdownChoferViaje === viaje.docId ? busquedaChoferHistorial : ""} onChange={(e) => { setBusquedaChoferHistorial(e.target.value); setDropdownChoferViaje(viaje.docId); }} onFocus={() => setDropdownChoferViaje(viaje.docId)} />
                                                                {dropdownChoferViaje === viaje.docId && (
                                                                    <div className="absolute z-[200] w-72 bg-white border-2 border-black shadow-2xl rounded-md max-h-48 overflow-y-auto mt-1 left-0">
                                                                        {choferes.filter(c => { const t = busquedaChoferHistorial.toUpperCase(); return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t); }).slice(0, 15).map(c => (
                                                                            <div key={c.id} className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between" onClick={() => { asignarChoferAViaje(viaje, c); setViajesImportados(prev => prev.map(vi => (vi.docId || vi.numViaje) === (viaje.docId || viaje.numViaje) ? { ...vi, chofer: { id: c.id, nombre: c.nombreChofer, empresa: c.empresaNombre || "" }, choferPendiente: false, empresaLiquidada: c.empresaNombre || "" } : vi)); }}>
                                                                                <span>{c.nombreChofer}</span>
                                                                                <span className="text-[8px] opacity-60">{c.empresaNombre}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    ) : ""}
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-gray-600 text-[10px]">{v.marca} {v.modelo}</td>
                                                <td className="border border-gray-200 px-1 py-1 font-mono font-black text-blue-700">{v.lote}</td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-[10px]"><span className="text-gray-600">{v.estado}</span> <span className="font-bold text-red-700">{v.ciudad}</span></td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase font-bold text-gray-800 text-[10px]">{v.clienteNombre || v.clienteAlt}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono font-bold">${v.flete}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">${v.storage || 0}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">${v.sPeso || 0}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">${v.gExtra || 0}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono font-black text-gray-800">${total.toLocaleString()}</td>
                                                {idx === 0 && (
                                                    <td rowSpan={(viaje.vehiculos || []).length} className="border border-gray-200 px-1 py-1 text-right font-mono font-black text-orange-800 bg-orange-50 align-middle whitespace-nowrap">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[12px]">${totalViaje.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                                            {puedeEliminarViajes && (
                                                                <button onClick={() => eliminarViaje(viaje)} disabled={loading} className="text-red-400 hover:text-red-600 text-[10px]" title="Eliminar viaje">
                                                                    <FaTrashAlt size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : vista === "historial" ? (
                // VISTA HISTORIAL - TABLA TIPO EXCEL
                <div className="p-2 overflow-x-auto">
                    {viajes.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-400 font-bold uppercase">No hay viajes pagados en este período</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-[11px]">
                            <thead>
                                <tr className="bg-gray-800 text-white text-[10px] uppercase font-black">
                                    <th className="border border-gray-600 px-1 py-2 text-center">Fecha</th>
                                    <th className="border border-gray-600 px-1 py-2 text-center">Viaje</th>
                                    <th className="border border-gray-600 px-1 py-2">Chofer</th>
                                    <th className="border border-gray-600 px-1 py-2">Vehículo</th>
                                    <th className="border border-gray-600 px-1 py-2">Lote</th>
                                    <th className="border border-gray-600 px-1 py-2">Ruta</th>
                                    <th className="border border-gray-600 px-1 py-2">Cliente</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">Flete</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">Storage</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">S.Peso</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">G.Extra</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">Total</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right bg-indigo-700">Total Viaje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viajes.map((viaje, vIndex) => {
                                    const fecha = viaje.fechaPago?.toDate ? moment(viaje.fechaPago.toDate()).format("D MMM YY") : "";
                                    const totalViaje = (viaje.vehiculos || []).reduce((acc, v) =>
                                        acc + (parseFloat(v.flete) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0), 0);
                                    return viaje.vehiculos.map((v, idx) => {
                                        const extras = (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0);
                                        const total = (parseFloat(v.flete) || 0) + extras;
                                        const notaRegistro = (v.comentarioRegistro || "").trim();
                                        const notaRecepcion = (v.comentarioRecepcion || "").trim();
                                        const notaImportada = (v.notas || "").trim();
                                        const tieneNota = notaRegistro !== "" || notaRecepcion !== "" || notaImportada !== "";
                                        const lotePagado = lotesPagados[v.lote] === true;
                                        const bgFila = lotePagado ? "bg-green-300" : "bg-white";
                                        return (
                                            <tr key={`${vIndex}-${idx}`} className={`${bgFila} hover:bg-yellow-50 border-b border-gray-200`}>
                                                <td className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-600 whitespace-nowrap text-[10px]">{idx === 0 ? fecha : ""}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-center font-black whitespace-nowrap">
                                                    {idx === 0 ? (
                                                        puedeEditarNumViaje && editandoViaje === viaje.docId ? (
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <input type="text" className="w-16 border-2 border-blue-500 rounded text-center text-[11px] font-black px-1 py-1 focus:outline-none" value={nuevoNumViaje} onChange={(e) => setNuevoNumViaje(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') cambiarNumeroViaje(viaje, nuevoNumViaje); if (e.key === 'Escape') setEditandoViaje(null); }} autoFocus />
                                                                <button onClick={() => cambiarNumeroViaje(viaje, nuevoNumViaje)} className="w-5 h-5 flex items-center justify-center rounded-full bg-green-600 text-white shadow-sm"><FaCheck size={8}/></button>
                                                                <button onClick={() => setEditandoViaje(null)} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-400 text-white shadow-sm"><FaTimes size={8}/></button>
                                                            </div>
                                                        ) : (
                                                            <span className={puedeEditarNumViaje ? "cursor-pointer hover:text-blue-600" : ""} onDoubleClick={puedeEditarNumViaje ? () => { setEditandoViaje(viaje.docId); setNuevoNumViaje(viaje.numViaje); } : undefined} title={puedeEditarNumViaje ? "Doble clic para editar" : ""}>
                                                                #{viaje.numViaje}
                                                            </span>
                                                        )
                                                    ) : ""}
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-gray-700" style={{ minWidth: "130px" }}>
                                                    {idx === 0 ? (
                                                        viaje.chofer?.nombre ? (
                                                            <div>
                                                                <div className="font-black text-blue-800 text-[11px] truncate">{viaje.chofer.nombre}</div>
                                                                {viaje.choferExcel && <div className="text-[8px] text-orange-500 italic">Ref: {viaje.choferExcel}</div>}
                                                            </div>
                                                        ) : viaje.choferPendiente ? (
                                                            <div className="relative">
                                                                {viaje.choferExcel && <div className="text-[8px] text-orange-500 italic font-bold mb-1">Ref: {viaje.choferExcel}</div>}
                                                                <input type="text" placeholder="Asignar chofer..." className="input input-xs w-full font-bold uppercase text-[10px] bg-yellow-50 border-yellow-300" value={dropdownChoferViaje === viaje.docId ? busquedaChoferHistorial : ""} onChange={(e) => { setBusquedaChoferHistorial(e.target.value); setDropdownChoferViaje(viaje.docId); }} onFocus={() => setDropdownChoferViaje(viaje.docId)} />
                                                                {dropdownChoferViaje === viaje.docId && (
                                                                    <div className="absolute z-[200] w-72 bg-white border-2 border-black shadow-2xl rounded-md max-h-48 overflow-y-auto mt-1 left-0">
                                                                        {choferes.filter(c => { const t = busquedaChoferHistorial.toUpperCase(); return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t); }).slice(0, 15).map(c => (
                                                                            <div key={c.id} className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between" onClick={() => asignarChoferAViaje(viaje, c)}>
                                                                                <span>{c.nombreChofer}</span>
                                                                                <span className="text-[8px] opacity-60">{c.empresaNombre}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic text-[10px]">Sin chofer</span>
                                                        )
                                                    ) : ""}
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-gray-600 text-[10px]">{v.marca} {v.modelo}</td>
                                                <td className="border border-gray-200 px-1 py-1 font-mono font-black text-blue-700">
                                                    {v.lote}
                                                    {tieneNota && <button type="button" onClick={() => setModalNota({ show: true, lote: v.lote, notaRegistro, notaRecepcion, notaImportada })} className="text-blue-400 hover:text-blue-600 ml-1"><FaCommentDots size={9} /></button>}
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-[10px]"><span className="text-gray-600">{v.estado}</span> <span className="font-bold text-red-700">{v.ciudad}</span></td>
                                                <td className="border border-gray-200 px-1 py-1 uppercase font-bold text-gray-800 text-[10px]">{v.clienteNombre || v.clienteAlt}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono font-bold">${v.flete}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">${v.storage || 0}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">${v.sPeso || 0}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">${v.gExtra || 0}</td>
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono font-black text-gray-800">${total.toLocaleString()}</td>
                                                {idx === 0 && (
                                                    <td rowSpan={viaje.vehiculos.length} className="border border-gray-200 px-1 py-1 text-right font-mono font-black text-indigo-800 bg-indigo-50 align-middle whitespace-nowrap">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[12px]">${totalViaje.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                                            {puedeEliminarViajes && (
                                                                <button onClick={() => eliminarViaje(viaje)} disabled={loading} className="text-red-400 hover:text-red-600 text-[10px]" title="Eliminar viaje">
                                                                    <FaTrashAlt size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
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

            {/* Overlay para cerrar dropdown chofer */}
            {dropdownChoferViaje && <div className="fixed inset-0 z-[150]" onClick={() => { setDropdownChoferViaje(null); setBusquedaChoferHistorial(""); }} />}
        </div>
    );
};

export default ReporteViajesPagados;
