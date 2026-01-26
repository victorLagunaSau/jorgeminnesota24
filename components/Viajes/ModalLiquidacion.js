import React, {useState, useEffect, useRef} from "react";
import {firestore} from "../../firebase/firebaseIni";
import {FaWallet, FaTimes, FaCar, FaPrint, FaCheckCircle, FaCheckDouble} from "react-icons/fa";
import ReactToPrint from "react-to-print";
import moment from "moment";
import ReciboPago from "./ReciboPago";

const ModalLiquidacion = ({viaje, user, onClose}) => {
    const [empresas, setEmpresas] = useState([]);
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
    const [procesando, setProcesando] = useState(false);
    const [pagoCompletado, setPagoCompletado] = useState(false);
    const [folioGenerado, setFolioGenerado] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    const reciboRef = useRef();
    const btnPrintRef = useRef();

    useEffect(() => {
        const unsub = firestore().collection("empresas")
            .orderBy("nombreEmpresa", "asc")
            .onSnapshot(snap => {
                setEmpresas(snap.docs.map(doc => ({
                    id: doc.id,
                    nombre: doc.data().nombreEmpresa,
                    mc: doc.data().mcNumber
                })));
            });
        return () => unsub();
    }, []);


    const ejecutarPago = async () => {
        setProcesando(true);
        try {
            const consecutivoRef = firestore().collection("config").doc("consecutivos");

            await firestore().runTransaction(async (transaction) => {
                const conDoc = await transaction.get(consecutivoRef);
                if (!conDoc.exists) throw "El documento de consecutivos no existe";

                const ultimoFolio = conDoc.data()["Viajes pagados"] || 0;
                const proximoFolio = ultimoFolio + 1;
                const nuevoFolioContable = `PG-${proximoFolio}`;

                // --- 1. RE-INSTALADA LA CREACIÓN DE VEHÍCULOS (ACTIVOS) ---
                viaje.vehiculos.forEach((v) => {
                    const vehiculoRef = firestore().collection("vehiculos").doc(v.lote);
                    transaction.set(vehiculoRef, {
                        active: true,
                        almacen: v.almacen || "PENDIENTE",
                        asignado: false,
                        binNip: v.lote,
                        ciudad: v.ciudad || "",
                        // Datos del Cliente Confirmados
                        cliente: v.clienteNombre || v.clienteAlt || "SIN ASIGNAR",
                        clienteAlt: v.clienteAlt || "",
                        clienteId: v.clienteId || "",
                        clienteNombre: v.clienteNombre || "",
                        clienteTelefono: v.clienteTelefono || "",

                        comentariosChofer: null,
                        descripcion: "",
                        estado: v.estado || "",
                        estatus: "EB",
                        gastosExtra: parseFloat(v.gExtra || 0),
                        gatePass: "X",
                        marca: v.marca || "",
                        modelo: v.modelo || "",
                        price: String(v.flete || "0"),
                        flete: parseFloat(v.flete || 0),
                        registro: {
                            idUsuario: viaje.creadoPor?.id || user?.id,
                            timestamp: viaje.fechaCreacion,
                            usuario: viaje.creadoPor?.nombre || user?.nombre
                        },
                        sobrePeso: parseFloat(v.sPeso || 0),
                        storage: parseFloat(v.storage || 0),
                        telefonoCliente: v.clienteTelefono || "",
                        tipoVehiculo: "",
                        titulo: v.titulo || "NO"
                    });
                });

                // --- 2. MOVER EL VIAJE A HISTORIAL CON TOTALES REALES ---
                const viajePagadoData = {
                    ...viaje,
                    folioPago: nuevoFolioContable,
                    fechaPago: new Date(),
                    pagadoPor: {id: user?.id, nombre: user?.nombre},
                    empresaLiquidada: empresaSeleccionada,
                    estatus: "PAGADO",
                    // Actualizamos el resumen con lo que calculamos en el modal
                    resumenFinanciero: {
                        ...viaje.resumenFinanciero,
                        totalFletes,
                        totalStorage,
                        totalSobrepeso: totalSobrepeso,
                        totalGastosExtra,
                        granTotal: granTotalReal
                    }
                };

                transaction.set(firestore().collection("viajesPagados").doc(nuevoFolioContable), viajePagadoData);

                // --- 3. LIMPIEZA Y CONSECUTIVO ---
                transaction.delete(firestore().collection("viajesPendientes").doc(viaje.id));
                transaction.update(consecutivoRef, {"Viajes pagados": proximoFolio});

                setFolioGenerado(nuevoFolioContable);
            });

            setPagoCompletado(true);
            setShowConfirm(false);
            setTimeout(() => {
                if (btnPrintRef.current) btnPrintRef.current.click();
            }, 500);

        } catch (error) {
            console.error("Error en pago:", error);
            alert("Error al procesar el pago.");
        } finally {
            setProcesando(false);
        }
    };
    // CÁLCULO DE TOTALES EN TIEMPO REAL
    const totalFletes = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.flete) || 0), 0);
    const totalStorage = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.storage) || 0), 0);
    const totalSobrepeso = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.sPeso) || 0), 0);
    const totalGastosExtra = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.gExtra) || 0), 0);
    const granTotalReal = totalFletes + totalStorage + totalSobrepeso + totalGastosExtra;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

            {/* COMPONENTE DE IMPRESIÓN OCULTO */}
            <div style={{display: "none"}}>
                <ReciboPago
                    ref={reciboRef}
                    viajeData={{
                        ...viaje,
                        folioPago: folioGenerado, // Folio PG-XXX generado en la transacción
                        fechaPago: new Date(),
                        empresaLiquidada: empresaSeleccionada,
                        pagadoPor: user
                    }}
                />
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            {showConfirm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
                    <div
                        className="bg-white-500 rounded-xl p-8 max-w-sm w-full shadow-2xl border-2 border-t-8 border-red-600 animate-in zoom-in duration-200">
                        <h3 className="text-xl font-black uppercase text-gray-800 tracking-tighter italic">Confirmar
                            Pago</h3>
                        <div className="my-4 p-4 bg-gray-50 rounded-lg border border-dashed border-red-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase italic">A Pagar:</p>
                            <p className="text-3xl font-black text-gray-800">${viaje.resumenFinanciero?.granTotal?.toLocaleString()}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase mt-2 italic">A la Empresa:</p>
                            <p className="text-sm font-black text-red-600 uppercase">{empresaSeleccionada}</p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowConfirm(false)}
                                    className="btn btn-sm white font-black uppercase text-[10px]">Revisar
                            </button>
                            <button onClick={ejecutarPago}
                                    className="btn btn-sm btn-error text-white font-black uppercase text-[10px] px-6">Confirmar
                                Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="bg-white-500 rounded-xl max-w-5xl w-full shadow-2xl border-2 border-t-8 border-red-600 flex flex-col max-h-[90vh]">

                {/* CABECERA */}
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 text-black">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Caja:
                            Liquidación de Viaje</h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">Viaje: #{viaje.numViaje}</p>
                    </div>
                    {!pagoCompletado && (
                        <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors">
                            <FaTimes size={24}/></button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">

                    {/* IZQUIERDA: DETALLE DE UNIDADES */}
                    <div className="flex-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2">
                            <FaCar/> Conceptos por Unidad</h3>
                        <div className="space-y-3">
                            {viaje.vehiculos.map((v, i) => (
                                <div key={i}
                                     className="p-3 border rounded-lg bg-white shadow-sm border-l-4 border-red-600">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span
                                                className="text-[11px] uppercase font-black text-gray-800">{v.lote} - {v.marca}</span>
                                            <span className="text-gray-500 font-bold text-[10px]">{v.ciudad}</span>
                                        </div>
                                        <div
                                            className="flex flex-row justify-between items-center gap-4 ">
                                            <div className="flex flex-col border-r border-gray-100 pr-4">
                                               <span
                                                   className="text-[9px] font-black text-gray-400 uppercase italic">Flete</span>
                                                <span
                                                    className="text-[12px] font-black">${parseFloat(v.flete).toLocaleString()}</span>
                                            </div>


                                            <div className="flex flex-col border-r border-gray-100 pr-4">
                                               <span
                                                   className="text-[9px] font-black text-gray-400 uppercase italic">Storage</span>
                                                <span
                                                    className="text-[12px] font-black">${parseFloat(v.storage).toLocaleString()}</span>
                                            </div>


                                            <div className="flex flex-col border-r border-gray-100 pr-4">
                                                <span className="text-[9px] font-black text-gray-400 uppercase italic">S. Peso</span>
                                                <span
                                                    className="text-[12px] font-black">${parseFloat(v.sPeso).toLocaleString()}</span>
                                            </div>


                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-gray-400 uppercase italic">G. Extra</span>
                                                <span
                                                    className="text-[12px] font-black">${parseFloat(v.gExtra).toLocaleString()}</span>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DERECHA: PANEL DE PAGO / ÉXITO */}
                    <div className="w-full md:w-80 bg-gray-50 p-6 rounded-xl border border-gray-200">
                        {pagoCompletado ? (
                            <div className="text-center animate-in zoom-in duration-300">
                                <div className="text-green-500 text-6xl flex justify-center mb-4"><FaCheckCircle/></div>
                                <h4 className="text-xl font-black uppercase text-gray-800 tracking-tighter italic">Pago
                                    Realizado</h4>
                                <p className="text-[10px] font-bold text-gray-500 mt-2">Folio: {folioGenerado}</p>

                                {/* BOTÓN PARA RE-IMPRIMIR */}
                                <ReactToPrint
                                    trigger={() => (
                                        <button ref={btnPrintRef}
                                                className="btn btn-error text-white w-full mt-8 gap-2 uppercase font-black tracking-widest">
                                            <FaPrint/> Ver Comprobante
                                        </button>
                                    )}
                                    content={() => reciboRef.current}
                                />

                                <button
                                    onClick={onClose}
                                    className="btn btn-success h-14 w-full mt-4 flex items-center justify-center gap-3 text-white font-black uppercase text-[12px] shadow-lg border-none hover:bg-green-700 transition-all"
                                >
                                    <FaCheckDouble className="text-lg"/>
                                    <div className="flex flex-col items-start leading-none">
                                        <span>Finalizar y Cerrar</span>
                                        <span
                                            className="text-[9px] opacity-80 font-bold">Viaje completado con éxito</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                    <p className="text-[9px] font-black text-blue-500 uppercase italic ">Referencia
                                        Chofer:</p>
                                    <p className="text-[11px] font-black text-blue-900 uppercase">{viaje.chofer?.empresa}</p>
                                </div>

                                <label
                                    className="text-[10px] font-black text-gray-400 uppercase mb-2 block leading-none">Transportista
                                    Oficial:</label>
                                <select
                                    className={`select select-bordered w-full font-black text-gray-700 mb-6 bg-white uppercase text-xs ${!empresaSeleccionada ? 'border-red-500 border-2' : ''}`}
                                    value={empresaSeleccionada}
                                    onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {empresas.map(emp => (
                                        <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                                    ))}
                                </select>

                                <div className="space-y-2 border-t-2 border-dashed border-gray-300 pt-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Resumen de
                                        Liquidación</h4>


                                    <div className="space-y-2 border-t-2 border-dashed border-gray-300 pt-4">

                                        <div
                                            className="flex justify-between text-[11px] font-bold text-gray-600 uppercase">
                                            <span>Total Fletes:</span>
                                            <span>${totalFletes.toLocaleString()}</span>
                                        </div>
                                        <div
                                            className="flex justify-between text-[11px] font-bold text-gray-600 uppercase">
                                            <span>Total Storages:</span>
                                            <span>${totalStorage.toLocaleString()}</span>
                                        </div>
                                        <div
                                            className="flex justify-between text-[11px] font-bold text-gray-600 uppercase">
                                            <span>Total Sobrepeso:</span>
                                            <span>${totalSobrepeso.toLocaleString()}</span>
                                        </div>
                                        <div
                                            className="flex justify-between text-[11px] font-bold text-gray-600 uppercase">
                                            <span>Total G. Extras:</span>
                                            <span>${totalGastosExtra.toLocaleString()}</span>
                                        </div>

                                        <div
                                            className="flex justify-between text-2xl font-black text-gray-800 uppercase mt-4 pt-4 border-t-4 border-red-600">
                                            <span>A Pagar:</span>
                                            <span
                                                className="text-red-600 font-black">${granTotalReal.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <p className="text-[9px] text-gray-400 text-right italic font-bold">
                                        {viaje.resumenFinanciero?.totalVehiculos} Unidades en total
                                    </p>
                                </div>
                                <button
                                    disabled={!empresaSeleccionada || procesando}
                                    onClick={() => setShowConfirm(true)} // <-- DIRECTO A LA CONFIRMACIÓN
                                    className="btn btn-success h-20 w-full text-white font-black uppercase mt-10 gap-3 text-xl shadow-2xl border-none disabled:bg-gray-300"
                                >
                                    <FaWallet size={24}/>
                                    <span>Pagar</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalLiquidacion;