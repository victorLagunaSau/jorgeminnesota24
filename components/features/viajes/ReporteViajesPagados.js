import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import { useAdminData } from "../../../context/adminData";
import {
    FaFileExcel, FaTimes, FaCheck, FaTrashAlt, FaCommentDots, FaExchangeAlt, FaPlus, FaArrowLeft, FaPen, FaSave
} from "react-icons/fa";
import * as XLSX from "xlsx";
import moment from "moment";
import FormViaje from "./FormViaje";
import { COLLECTIONS } from "../../../constants";

const ReporteViajesPagados = ({ user }) => {
    // --- DATOS DEL CONTEXTO COMPARTIDO ---
    const { choferes, clientes } = useAdminData();

    // Vista: "historial" o "agregar"
    const [vista, setVista] = useState("historial");

    // Estados del historial
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('semana');
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(false);

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

    // Edición inline de viaje completo
    const [edicionInline, setEdicionInline] = useState(null); // { docId, vehiculos, metodoPago, chofer, empresaLiquidada, estadoOrigen, numViaje }
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);
    const [busquedaChoferEdicion, setBusquedaChoferEdicion] = useState("");
    const [showDropdownChoferEdicion, setShowDropdownChoferEdicion] = useState(false);
    const [dropdownClienteEdicion, setDropdownClienteEdicion] = useState(null); // idx del vehículo con dropdown abierto
    const [busquedaClienteEdicion, setBusquedaClienteEdicion] = useState("");

    const iniciarEdicion = (viaje) => {
        setEdicionInline({
            docId: viaje.docId || viaje.numViaje,
            numViaje: viaje.numViaje || "",
            chofer: viaje.chofer ? { ...viaje.chofer } : { id: "", nombre: "", empresa: "" },
            empresaLiquidada: viaje.empresaLiquidada || "",
            estadoOrigen: viaje.estadoOrigen || "",
            metodoPago: viaje.metodoPago ? { ...viaje.metodoPago } : { efectivo: "", cheque: "", zelle: "" },
            vehiculos: (viaje.vehiculos || []).map(v => ({ ...v })),
            _original: viaje
        });
    };

    const cancelarEdicion = () => {
        setEdicionInline(null);
        setBusquedaChoferEdicion("");
        setShowDropdownChoferEdicion(false);
    };

    const actualizarVehiculoEdicion = (idx, campo, valor) => {
        setEdicionInline(prev => ({
            ...prev,
            vehiculos: prev.vehiculos.map((v, i) => i === idx ? { ...v, [campo]: valor } : v)
        }));
    };

    const guardarEdicion = async () => {
        if (!edicionInline) return;
        setGuardandoEdicion(true);
        try {
            const { docId, numViaje: nuevoNum, chofer: nuevoChofer, empresaLiquidada: nuevaEmpresa, estadoOrigen: nuevoEstado, metodoPago: nuevoMetodo, vehiculos: nuevosVehiculos, _original } = edicionInline;
            const batch = firestore().batch();

            const totalFletes = nuevosVehiculos.reduce((acc, v) => acc + (parseFloat(v.flete) || 0), 0);
            const totalStorage = nuevosVehiculos.reduce((acc, v) => acc + (parseFloat(v.storage) || 0), 0);
            const totalSobrepeso = nuevosVehiculos.reduce((acc, v) => acc + (parseFloat(v.sPeso) || 0), 0);
            const totalGastosExtra = nuevosVehiculos.reduce((acc, v) => acc + (parseFloat(v.gExtra) || 0), 0);
            const granTotal = totalFletes + totalStorage + totalSobrepeso + totalGastosExtra;

            const totalPrecioVenta = nuevosVehiculos.reduce((acc, v) => acc + (parseFloat(v.precioVenta) || parseFloat(v.flete) || 0), 0);
            const totalStorageCliente = nuevosVehiculos.reduce((acc, v) => acc + (v.preciosClienteEditados ? (parseFloat(v.storageCliente) || 0) : (parseFloat(v.storage) || 0)), 0);
            const totalSobrepesoCliente = nuevosVehiculos.reduce((acc, v) => acc + (v.preciosClienteEditados ? (parseFloat(v.sPesoCliente) || 0) : (parseFloat(v.sPeso) || 0)), 0);
            const totalGastosExtraCliente = nuevosVehiculos.reduce((acc, v) => acc + (v.preciosClienteEditados ? (parseFloat(v.gExtraCliente) || 0) : (parseFloat(v.gExtra) || 0)), 0);
            const granTotalCliente = totalPrecioVenta + totalStorageCliente + totalSobrepesoCliente + totalGastosExtraCliente;

            const dataActualizada = {
                chofer: nuevoChofer,
                empresaLiquidada: nuevaEmpresa,
                estadoOrigen: nuevoEstado,
                numViaje: nuevoNum,
                metodoPago: nuevoMetodo,
                vehiculos: nuevosVehiculos,
                resumenFinanciero: {
                    ...(_original.resumenFinanciero || {}),
                    totalFletes, totalStorage, totalSobrepeso, totalGastosExtra, granTotal,
                    totalPrecioVenta, totalStorageCliente, totalSobrepesoCliente, totalGastosExtraCliente, granTotalCliente
                }
            };

            if (nuevoNum !== _original.numViaje) {
                const { docId: _, ...sinDocId } = _original;
                batch.set(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(nuevoNum), { ...sinDocId, ...dataActualizada, folioPago: nuevoNum });
                batch.delete(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(docId));
                nuevosVehiculos.forEach(v => {
                    if (v.lote) batch.update(firestore().collection(COLLECTIONS.VEHICULOS).doc(v.lote), { numViaje: nuevoNum, folioPago: nuevoNum });
                });
            } else {
                batch.update(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(docId), dataActualizada);
            }

            nuevosVehiculos.forEach(v => {
                if (v.lote) {
                    batch.update(firestore().collection(COLLECTIONS.VEHICULOS).doc(v.lote), {
                        storage: v.preciosClienteEditados ? parseFloat(v.storageCliente || 0) : parseFloat(v.storage || 0),
                        sobrePeso: v.preciosClienteEditados ? parseFloat(v.sPesoCliente || 0) : parseFloat(v.sPeso || 0),
                        gastosExtra: v.preciosClienteEditados ? parseFloat(v.gExtraCliente || 0) : parseFloat(v.gExtra || 0),
                        storageChofer: parseFloat(v.storage || 0),
                        sobrePesoChofer: parseFloat(v.sPeso || 0),
                        gastosExtraChofer: parseFloat(v.gExtra || 0),
                        cliente: v.clienteNombre || v.clienteAlt || "",
                        clienteNombre: v.clienteNombre || "",
                    });
                }
            });

            await batch.commit();
            setEdicionInline(null);
            consultarViajes(periodoSeleccionado);
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setGuardandoEdicion(false);
        }
    };

    // Asignar chofer a viajes importados (H-*)
    const [dropdownChoferViaje, setDropdownChoferViaje] = useState(null);
    const [busquedaChoferHistorial, setBusquedaChoferHistorial] = useState("");


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
        if (!chofer.empresaNombre) {
            alert("Este chofer no tiene empresa asignada. Asígnale una empresa primero en el módulo de Choferes.");
            return;
        }
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

    // Reasignar chofer de un viaje pagado (solo masterAdmin)
    const [reasignandoChofer, setReasignandoChofer] = useState(null); // docId del viaje
    const [busquedaChoferReasignar, setBusquedaChoferReasignar] = useState("");
    const [loadingReasignar, setLoadingReasignar] = useState(false);

    const reasignarChoferViaje = async (viaje, chofer) => {
        if (!chofer.empresaNombre) {
            alert("Este chofer no tiene empresa asignada. Asígnale una empresa primero en el módulo de Choferes.");
            return;
        }
        setLoadingReasignar(true);
        try {
            const docId = viaje.docId || viaje.numViaje;
            const nuevoChofer = {
                id: chofer.id,
                nombre: chofer.nombreChofer,
                empresa: chofer.empresaNombre || "",
            };

            // 1. Actualizar el viaje pagado
            await firestore().collection("viajesPagados").doc(docId).update({
                chofer: nuevoChofer,
                empresaLiquidada: chofer.empresaNombre || "",
                empresaLiderId: chofer.empresaLiderId || "",
            });

            // 2. Actualizar vehículos relacionados en la colección vehiculos
            if (viaje.vehiculos) {
                const batch = firestore().batch();
                viaje.vehiculos.forEach(v => {
                    if (v.lote) {
                        const vRef = firestore().collection("vehiculos").doc(v.lote);
                        batch.update(vRef, {
                            empresaLiderId: chofer.empresaLiderId || "",
                        });
                    }
                });
                await batch.commit();
            }

            // 3. Actualizar estado local
            setViajes(prev => prev.map(v =>
                (v.docId || v.numViaje) === docId
                    ? { ...v, chofer: nuevoChofer, empresaLiquidada: chofer.empresaNombre || "", empresaLiderId: chofer.empresaLiderId || "" }
                    : v
            ));

            setReasignandoChofer(null);
            setBusquedaChoferReasignar("");
        } catch (e) {
            console.error(e);
            alert("Error al reasignar chofer: " + e.message);
        } finally {
            setLoadingReasignar(false);
        }
    };

    // Permiso Historial = acceso completo al historial (editar, eliminar, reasignar, cambiar número)
    const tieneHistorial = user?.adminMaster === true || user?.editarHistorial === true;
    const puedeEliminarViajes = user?.adminMaster === true;
    const puedeEditarNumViaje = tieneHistorial;
    const puedeReasignarChofer = tieneHistorial;
    const puedeEditarViaje = tieneHistorial;

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
            let snap;
            if (periodo === 'historico') {
                snap = await firestore().collection("viajesPagados")
                    .orderBy("fechaPago", "desc")
                    .get();
            } else {
                const { inicio, fin } = calcularFechas(periodo);
                snap = await firestore().collection("viajesPagados")
                    .where("fechaPago", ">=", firebase.firestore.Timestamp.fromDate(inicio))
                    .where("fechaPago", "<=", firebase.firestore.Timestamp.fromDate(fin))
                    .orderBy("fechaPago", "desc")
                    .get();
            }
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
            const todosLotes = [...new Set(data.flatMap(v => (v.vehiculos || []).map(vh => vh.lote).filter(Boolean)))];
            const pagados = {};
            // Firestore limita "in" a 10 elementos, lanzamos todos los batches en paralelo
            const promesas = [];
            for (let i = 0; i < todosLotes.length; i += 10) {
                promesas.push(
                    firestore().collection("vehiculos")
                        .where(firebase.firestore.FieldPath.documentId(), "in", todosLotes.slice(i, i + 10))
                        .get()
                );
            }
            const resultados = await Promise.all(promesas);
            resultados.forEach(snap => {
                snap.docs.forEach(doc => {
                    if (doc.data().estatus === "EN") {
                        pagados[doc.id] = true;
                    }
                });
            });
            setLotesPagados(pagados);
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
                "TOTAL": parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0),
                "EFECTIVO": parseFloat(viaje.metodoPago?.efectivo || 0) || "",
                "CHEQUE": parseFloat(viaje.metodoPago?.cheque || 0) || "",
                "ZELLE": parseFloat(viaje.metodoPago?.zelle || 0) || ""
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
                            {vista === "agregar" ? "Registrar Viaje Pasado" : "Historial de Viajes"}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {vista === "agregar" ? "Se registrará con la fecha que selecciones" : "Viajes Liquidados y Pagados"}
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
                            onClick={() => setVista(vista === "historial" ? "agregar" : "historial")}
                            className={`btn btn-sm font-black uppercase gap-2 ${vista === "agregar" ? "btn-ghost" : "btn-info text-white"}`}
                        >
                            {vista === "agregar" ? <><FaArrowLeft /> Volver</> : <><FaPlus /> Agregar Viaje</>}
                        </button>
                    </div>
                </div>

                {vista === "historial" && (
                    <div className="bg-gray-50 p-4 rounded-xl border mt-4">
                            <div className="flex justify-between items-center gap-4">
                                <div className="flex gap-3 flex-wrap">
                                    <button
                                        onClick={() => consultarViajes('semana')}
                                        className={`btn btn-sm font-black uppercase ${periodoSeleccionado === 'semana' ? 'btn-error text-white' : 'btn-outline'}`}
                                    >
                                        1 Semana
                                    </button>
                                    <button
                                        onClick={() => consultarViajes('mensual')}
                                        className={`btn btn-sm font-black uppercase ${periodoSeleccionado === 'mensual' ? 'btn-error text-white' : 'btn-outline'}`}
                                    >
                                        1 Mes
                                    </button>
                                    <button
                                        onClick={() => consultarViajes('historico')}
                                        className={`btn btn-sm font-black uppercase ${periodoSeleccionado === 'historico' ? 'btn-error text-white' : 'btn-outline'}`}
                                    >
                                        Histórico
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
            {vista === "agregar" ? (
                <div className="p-4">
                    <FormViaje
                        user={user}
                        mostrarFechaManual={true}
                        onViajeCreado={() => {
                            setVista("historial");
                            consultarViajes(periodoSeleccionado);
                        }}
                    />
                </div>
            ) : (
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
                                    <th className="border border-gray-600 px-1 py-2 text-center">Título</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">Flete</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">Storage</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">S.Peso</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">G.Extra</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right">Total</th>
                                    <th className="border border-gray-600 px-1 py-2 text-center">Método Pago</th>
                                    <th className="border border-gray-600 px-1 py-2 text-right bg-indigo-700">Total Viaje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viajes.map((viaje, vIndex) => {
                                    const vDocId = viaje.docId || viaje.numViaje;
                                    const enEdicion = edicionInline && edicionInline.docId === vDocId;
                                    const datos = enEdicion ? edicionInline : viaje;
                                    const vehs = datos.vehiculos || [];
                                    const fecha = viaje.fechaPago?.toDate ? moment(viaje.fechaPago.toDate()).format("D MMM YY") : "";
                                    const totalViaje = vehs.reduce((acc, v) =>
                                        acc + (parseFloat(v.flete) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0), 0);

                                    return vehs.map((v, idx) => {
                                        const total = (parseFloat(v.flete) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0);
                                        const notaRegistro = (v.comentarioRegistro || "").trim();
                                        const notaRecepcion = (v.comentarioRecepcion || "").trim();
                                        const notaImportada = (v.notas || "").trim();
                                        const tieneNota = notaRegistro !== "" || notaRecepcion !== "" || notaImportada !== "";
                                        const lotePagado = lotesPagados[v.lote] === true;
                                        const bgFila = enEdicion ? "bg-blue-50" : lotePagado ? "bg-green-300" : "bg-white";
                                        const inputCls = "w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] font-bold uppercase focus:border-blue-500 focus:outline-none bg-white";
                                        const inputNumCls = "w-14 px-1 py-0.5 border border-blue-300 rounded text-[11px] font-bold text-right focus:border-blue-500 focus:outline-none bg-white";

                                        return (
                                            <tr key={`${vIndex}-${idx}`} className={`${bgFila} hover:bg-yellow-50 border-b border-gray-200`}>
                                                {/* FECHA */}
                                                <td className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-600 whitespace-nowrap text-[10px]">{idx === 0 ? fecha : ""}</td>

                                                {/* NUM VIAJE */}
                                                <td className="border border-gray-200 px-1 py-1 text-center font-black whitespace-nowrap">
                                                    {idx === 0 ? (
                                                        enEdicion ? (
                                                            <input type="text" className="w-16 px-1 py-0.5 border border-blue-300 rounded text-center text-[11px] font-black focus:outline-none bg-white" value={edicionInline.numViaje} onChange={(e) => setEdicionInline(prev => ({ ...prev, numViaje: e.target.value }))} />
                                                        ) : puedeEditarNumViaje && editandoViaje === viaje.docId ? (
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

                                                {/* CHOFER */}
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-gray-700" style={{ minWidth: "130px" }}>
                                                    {idx === 0 ? (
                                                        enEdicion ? (
                                                            <div className="relative">
                                                                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowDropdownChoferEdicion(!showDropdownChoferEdicion)}>
                                                                    <span className="font-black text-blue-800 text-[11px] truncate flex-1">{edicionInline.chofer.nombre || "Seleccionar..."}</span>
                                                                    <FaExchangeAlt size={8} className="text-gray-400" />
                                                                </div>
                                                                {showDropdownChoferEdicion && (
                                                                    <div className="absolute z-[200] w-72 bg-white border-2 border-black shadow-2xl rounded-md max-h-48 overflow-y-auto mt-1 left-0">
                                                                        <input type="text" placeholder="Buscar chofer..." className="w-full px-2 py-1 border-b text-[11px] font-bold uppercase focus:outline-none" value={busquedaChoferEdicion} onChange={(e) => setBusquedaChoferEdicion(e.target.value)} autoFocus />
                                                                        {choferes.filter(c => { const t = busquedaChoferEdicion.toUpperCase(); return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t); }).slice(0, 15).map(c => (
                                                                            <div key={c.id} className={`p-2 cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between ${c.empresaNombre ? "hover:bg-blue-600 hover:text-white" : "opacity-50"}`} onClick={() => {
                                                                                setEdicionInline(prev => ({ ...prev, chofer: { id: c.id, nombre: c.nombreChofer, empresa: c.empresaNombre || "" }, empresaLiquidada: c.empresaNombre || "" }));
                                                                                setShowDropdownChoferEdicion(false);
                                                                                setBusquedaChoferEdicion("");
                                                                            }}>
                                                                                <span>{c.nombreChofer}</span>
                                                                                <span className="text-[8px] opacity-60">{c.empresaNombre || "SIN EMPRESA"}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : reasignandoChofer === vDocId ? (
                                                            <div className="relative">
                                                                <div className="flex items-center gap-1">
                                                                    <input type="text" placeholder="Buscar chofer..." className="input input-xs w-full font-bold uppercase text-[10px] bg-yellow-50 border-yellow-300" value={busquedaChoferReasignar} onChange={(e) => setBusquedaChoferReasignar(e.target.value)} autoFocus />
                                                                    <button onClick={() => { setReasignandoChofer(null); setBusquedaChoferReasignar(""); }} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-400 text-white"><FaTimes size={8}/></button>
                                                                </div>
                                                                <div className="absolute z-[200] w-72 bg-white border-2 border-black shadow-2xl rounded-md max-h-48 overflow-y-auto mt-1 left-0">
                                                                    {choferes.filter(c => { const t = busquedaChoferReasignar.toUpperCase(); return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t); }).slice(0, 15).map(c => (
                                                                        <div key={c.id} className={`p-2 cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between ${c.empresaNombre ? "hover:bg-blue-600 hover:text-white" : "opacity-50"}`} onClick={() => reasignarChoferViaje(viaje, c)}>
                                                                            <span>{c.nombreChofer}</span>
                                                                            <span className={`text-[8px] ${c.empresaNombre ? "opacity-60" : "text-red-500 font-black"}`}>{c.empresaNombre || "SIN EMPRESA"}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : viaje.chofer?.nombre ? (
                                                            <div className="flex items-center gap-1">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-black text-blue-800 text-[11px] truncate">{viaje.chofer.nombre}</div>
                                                                    {viaje.choferExcel && <div className="text-[8px] text-orange-500 italic">Ref: {viaje.choferExcel}</div>}
                                                                </div>
                                                                {puedeReasignarChofer && (
                                                                    <button onClick={() => { setReasignandoChofer(vDocId); setBusquedaChoferReasignar(""); }} className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-blue-600 hover:text-white" title="Reasignar chofer">
                                                                        <FaExchangeAlt size={8}/>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : viaje.choferPendiente ? (
                                                            <div className="relative">
                                                                {viaje.choferExcel && <div className="text-[8px] text-orange-500 italic font-bold mb-1">Ref: {viaje.choferExcel}</div>}
                                                                <input type="text" placeholder="Asignar chofer..." className="input input-xs w-full font-bold uppercase text-[10px] bg-yellow-50 border-yellow-300" value={dropdownChoferViaje === viaje.docId ? busquedaChoferHistorial : ""} onChange={(e) => { setBusquedaChoferHistorial(e.target.value); setDropdownChoferViaje(viaje.docId); }} onFocus={() => setDropdownChoferViaje(viaje.docId)} />
                                                                {dropdownChoferViaje === viaje.docId && (
                                                                    <div className="absolute z-[200] w-72 bg-white border-2 border-black shadow-2xl rounded-md max-h-48 overflow-y-auto mt-1 left-0">
                                                                        {choferes.filter(c => { const t = busquedaChoferHistorial.toUpperCase(); return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t); }).slice(0, 15).map(c => (
                                                                            <div key={c.id} className={`p-2 cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between ${c.empresaNombre ? "hover:bg-blue-600 hover:text-white" : "opacity-50"}`} onClick={() => asignarChoferAViaje(viaje, c)}>
                                                                                <span>{c.nombreChofer}</span>
                                                                                <span className={`text-[8px] ${c.empresaNombre ? "opacity-60" : "text-red-500 font-black"}`}>{c.empresaNombre || "SIN EMPRESA"}</span>
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

                                                {/* VEHÍCULO */}
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-gray-600 text-[10px]">
                                                    {enEdicion ? (
                                                        <div className="flex gap-0.5">
                                                            <input type="text" value={v.marca || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "marca", e.target.value)} className={inputCls} style={{width: "50%"}} placeholder="Marca" />
                                                            <input type="text" value={v.modelo || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "modelo", e.target.value)} className={inputCls} style={{width: "50%"}} placeholder="Modelo" />
                                                        </div>
                                                    ) : <>{v.marca} {v.modelo}</>}
                                                </td>

                                                {/* LOTE */}
                                                <td className="border border-gray-200 px-1 py-1 font-mono font-black text-blue-700">
                                                    {enEdicion ? (
                                                        <input type="text" value={v.lote || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "lote", e.target.value)} className="w-20 px-1 py-0.5 border border-blue-300 rounded text-[11px] font-mono font-bold text-center focus:outline-none bg-white" />
                                                    ) : (
                                                        <>{v.lote}{tieneNota && <button type="button" onClick={() => setModalNota({ show: true, lote: v.lote, notaRegistro, notaRecepcion, notaImportada })} className="text-blue-400 hover:text-blue-600 ml-1"><FaCommentDots size={9} /></button>}</>
                                                    )}
                                                </td>

                                                {/* RUTA */}
                                                <td className="border border-gray-200 px-1 py-1 uppercase text-[10px]">
                                                    {enEdicion ? (
                                                        <div className="flex gap-0.5">
                                                            <input type="text" value={v.estado || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "estado", e.target.value)} className={inputCls} style={{width: "40%"}} placeholder="ST" />
                                                            <input type="text" value={v.ciudad || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "ciudad", e.target.value)} className={inputCls} style={{width: "60%"}} placeholder="Ciudad" />
                                                        </div>
                                                    ) : <><span className="text-gray-600">{v.estado}</span> <span className="font-bold text-red-700">{v.ciudad}</span></>}
                                                </td>

                                                {/* CLIENTE */}
                                                <td className="border border-gray-200 px-1 py-1 uppercase font-bold text-gray-800 text-[10px]">
                                                    {enEdicion ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={dropdownClienteEdicion === idx ? busquedaClienteEdicion : (v.clienteNombre || v.clienteAlt || "")}
                                                                onChange={(e) => { setBusquedaClienteEdicion(e.target.value); setDropdownClienteEdicion(idx); }}
                                                                onFocus={() => { setDropdownClienteEdicion(idx); setBusquedaClienteEdicion(v.clienteNombre || v.clienteAlt || ""); }}
                                                                className={inputCls}
                                                                placeholder="Buscar cliente..."
                                                            />
                                                            {dropdownClienteEdicion === idx && (
                                                                <div className="absolute z-[200] w-64 bg-white border-2 border-black shadow-2xl rounded-md max-h-40 overflow-y-auto mt-1 left-0">
                                                                    {clientes.filter(c => { const t = busquedaClienteEdicion.toUpperCase(); return !t || c.cliente?.toUpperCase().includes(t); }).slice(0, 12).map(c => (
                                                                        <div key={c.id} className="px-2 py-1.5 cursor-pointer text-[11px] font-bold uppercase border-b last:border-none hover:bg-blue-600 hover:text-white" onClick={() => {
                                                                            actualizarVehiculoEdicion(idx, "clienteNombre", c.cliente);
                                                                            actualizarVehiculoEdicion(idx, "clienteId", c.id);
                                                                            actualizarVehiculoEdicion(idx, "clienteAlt", c.cliente);
                                                                            setDropdownClienteEdicion(null);
                                                                            setBusquedaClienteEdicion("");
                                                                        }}>
                                                                            {c.cliente}
                                                                        </div>
                                                                    ))}
                                                                    {clientes.filter(c => { const t = busquedaClienteEdicion.toUpperCase(); return !t || c.cliente?.toUpperCase().includes(t); }).length === 0 && (
                                                                        <div className="px-2 py-2 text-[10px] text-gray-400 italic text-center">No se encontró cliente</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (v.clienteNombre || v.clienteAlt)}
                                                </td>

                                                {/* TÍTULO */}
                                                <td className={`border border-gray-200 px-1 py-1 text-center font-black text-[10px] ${!enEdicion && (v.titulo === "SI" ? "text-green-700 bg-green-50" : "text-red-500")}`}>
                                                    {enEdicion ? (
                                                        <select value={v.titulo || "NO"} onChange={(e) => actualizarVehiculoEdicion(idx, "titulo", e.target.value)} className="px-1 py-0.5 border border-blue-300 rounded text-[11px] font-black focus:outline-none bg-white">
                                                            <option value="NO">NO</option>
                                                            <option value="SI">SI</option>
                                                        </select>
                                                    ) : (v.titulo || "NO")}
                                                </td>

                                                {/* FLETE */}
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono font-bold">
                                                    {enEdicion ? <input type="number" value={v.flete || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "flete", e.target.value)} className={inputNumCls} /> : `$${v.flete}`}
                                                </td>

                                                {/* STORAGE */}
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">
                                                    {enEdicion ? <input type="number" value={v.storage || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "storage", e.target.value)} className={inputNumCls} /> : `$${v.storage || 0}`}
                                                </td>

                                                {/* S.PESO */}
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">
                                                    {enEdicion ? <input type="number" value={v.sPeso || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "sPeso", e.target.value)} className={inputNumCls} /> : `$${v.sPeso || 0}`}
                                                </td>

                                                {/* G.EXTRA */}
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono">
                                                    {enEdicion ? <input type="number" value={v.gExtra || ""} onChange={(e) => actualizarVehiculoEdicion(idx, "gExtra", e.target.value)} className={inputNumCls} /> : `$${v.gExtra || 0}`}
                                                </td>

                                                {/* TOTAL */}
                                                <td className="border border-gray-200 px-1 py-1 text-right font-mono font-black text-gray-800">${total.toLocaleString()}</td>

                                                {/* MÉTODO PAGO */}
                                                {idx === 0 && (
                                                    <td rowSpan={vehs.length} className="border border-gray-200 px-1 py-1 text-center align-middle whitespace-nowrap bg-white">
                                                        {enEdicion ? (
                                                            <div className="flex flex-col gap-1 text-[9px]">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-bold text-gray-500 w-10 text-left">Efect.</span>
                                                                    <input type="number" value={edicionInline.metodoPago.efectivo} onChange={(e) => setEdicionInline(prev => ({ ...prev, metodoPago: { ...prev.metodoPago, efectivo: e.target.value } }))} className="w-16 px-1 py-0.5 border border-blue-300 rounded text-[10px] font-bold text-right focus:outline-none bg-white" placeholder="0" />
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-bold text-gray-500 w-10 text-left">Cheq.</span>
                                                                    <input type="number" value={edicionInline.metodoPago.cheque} onChange={(e) => setEdicionInline(prev => ({ ...prev, metodoPago: { ...prev.metodoPago, cheque: e.target.value } }))} className="w-16 px-1 py-0.5 border border-blue-300 rounded text-[10px] font-bold text-right focus:outline-none bg-white" placeholder="0" />
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-bold text-gray-500 w-10 text-left">Zelle</span>
                                                                    <input type="number" value={edicionInline.metodoPago.zelle} onChange={(e) => setEdicionInline(prev => ({ ...prev, metodoPago: { ...prev.metodoPago, zelle: e.target.value } }))} className="w-16 px-1 py-0.5 border border-blue-300 rounded text-[10px] font-bold text-right focus:outline-none bg-white" placeholder="0" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            viaje.metodoPago ? (
                                                                <div className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-gray-700">
                                                                    {parseFloat(viaje.metodoPago.efectivo) > 0 && (
                                                                        <span>Efectivo: ${parseFloat(viaje.metodoPago.efectivo).toLocaleString()}</span>
                                                                    )}
                                                                    {parseFloat(viaje.metodoPago.cheque) > 0 && (
                                                                        <span>Cheque: ${parseFloat(viaje.metodoPago.cheque).toLocaleString()}</span>
                                                                    )}
                                                                    {parseFloat(viaje.metodoPago.zelle) > 0 && (
                                                                        <span>Zelle: ${parseFloat(viaje.metodoPago.zelle).toLocaleString()}</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-[9px] italic">—</span>
                                                            )
                                                        )}
                                                    </td>
                                                )}

                                                {/* TOTAL VIAJE */}
                                                {idx === 0 && (
                                                    <td rowSpan={vehs.length} className="border border-gray-200 px-1 py-1 text-right font-mono font-black text-indigo-800 bg-indigo-50 align-middle whitespace-nowrap">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[12px]">${totalViaje.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                                            {enEdicion ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={guardarEdicion} disabled={guardandoEdicion} className="w-6 h-6 flex items-center justify-center rounded-full bg-green-600 text-white shadow-sm hover:bg-green-700" title="Guardar"><FaSave size={10}/></button>
                                                                    <button onClick={cancelarEdicion} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-400 text-white shadow-sm hover:bg-gray-500" title="Cancelar"><FaTimes size={10}/></button>
                                                                    {puedeEliminarViajes && (
                                                                        <button onClick={() => eliminarViaje(viaje)} disabled={loading} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600" title="Eliminar viaje"><FaTrashAlt size={10}/></button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1">
                                                                    {puedeEditarViaje && (
                                                                        <button onClick={() => iniciarEdicion(viaje)} className="text-blue-400 hover:text-blue-600" title="Editar viaje">
                                                                            <FaPen size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
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
            )}

            {/* Overlay para cerrar dropdown chofer */}
            {dropdownChoferViaje && <div className="fixed inset-0 z-[150]" onClick={() => { setDropdownChoferViaje(null); setBusquedaChoferHistorial(""); }} />}

            {/* Overlays para cerrar dropdowns en edición */}
            {showDropdownChoferEdicion && <div className="fixed inset-0 z-[150]" onClick={() => { setShowDropdownChoferEdicion(false); setBusquedaChoferEdicion(""); }} />}
            {dropdownClienteEdicion !== null && <div className="fixed inset-0 z-[150]" onClick={() => { setDropdownClienteEdicion(null); setBusquedaClienteEdicion(""); }} />}
        </div>
    );
};

export default ReporteViajesPagados;
