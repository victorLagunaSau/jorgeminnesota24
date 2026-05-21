import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import { useAdminData } from "../../../context/adminData";
import {
    FaFileExcel, FaTimes, FaCheck, FaTrashAlt, FaCommentDots, FaExchangeAlt, FaPlus, FaArrowLeft
} from "react-icons/fa";
import * as XLSX from "xlsx";
import moment from "moment";
import FormViaje from "./FormViaje";

const ReporteViajesPagados = ({ user }) => {
    // --- DATOS DEL CONTEXTO COMPARTIDO ---
    const { choferes } = useAdminData();

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

    // Verificar si el usuario puede eliminar viajes
    const puedeEliminarViajes = user?.adminMaster === true || user?.eliminarViajes === true;
    // Solo Admin Master puede cambiar el número de viaje en el historial
    const puedeEditarNumViaje = user?.adminMaster === true;
    const puedeReasignarChofer = user?.adminMaster === true;

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
                                                        reasignandoChofer === (viaje.docId || viaje.numViaje) ? (
                                                            <div className="relative">
                                                                <div className="flex items-center gap-1">
                                                                    <input type="text" placeholder="Buscar chofer..." className="input input-xs w-full font-bold uppercase text-[10px] bg-yellow-50 border-yellow-300" value={busquedaChoferReasignar} onChange={(e) => setBusquedaChoferReasignar(e.target.value)} autoFocus />
                                                                    <button onClick={() => { setReasignandoChofer(null); setBusquedaChoferReasignar(""); }} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-400 text-white"><FaTimes size={8}/></button>
                                                                </div>
                                                                <div className="absolute z-[200] w-72 bg-white border-2 border-black shadow-2xl rounded-md max-h-48 overflow-y-auto mt-1 left-0">
                                                                    {choferes.filter(c => { const t = busquedaChoferReasignar.toUpperCase(); return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t); }).slice(0, 15).map(c => (
                                                                        <div key={c.id} className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between" onClick={() => reasignarChoferViaje(viaje, c)}>
                                                                            <span>{c.nombreChofer}</span>
                                                                            <span className="text-[8px] opacity-60">{c.empresaNombre}</span>
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
                                                                    <button onClick={() => { setReasignandoChofer(viaje.docId || viaje.numViaje); setBusquedaChoferReasignar(""); }} className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-blue-600 hover:text-white" title="Reasignar chofer">
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
                                                <td className={`border border-gray-200 px-1 py-1 text-center font-black text-[10px] ${v.titulo === "SI" ? "text-green-700 bg-green-50" : "text-red-500"}`}>{v.titulo || "NO"}</td>
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
            )}

            {/* Overlay para cerrar dropdown chofer */}
            {dropdownChoferViaje && <div className="fixed inset-0 z-[150]" onClick={() => { setDropdownChoferViaje(null); setBusquedaChoferHistorial(""); }} />}
        </div>
    );
};

export default ReporteViajesPagados;
