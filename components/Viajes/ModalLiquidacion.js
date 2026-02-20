import React, {useState, useEffect, useRef} from "react";
import {firestore} from "../../firebase/firebaseIni";
import {FaWallet, FaTimes, FaCar, FaPrint, FaCheckCircle, FaCheckDouble, FaTruck} from "react-icons/fa";
import ReactToPrint from "react-to-print";
import ReciboPago from "./ReciboPago";

const ModalLiquidacion = ({viaje, user, onClose}) => {
    // ESTADOS
    const [procesando, setProcesando] = useState(false);
    const [pagoCompletado, setPagoCompletado] = useState(false);
    const [folioGenerado, setFolioGenerado] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    // Automatizamos la empresa: Si el viaje tiene empresaNombre, la usamos de una vez.
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState(viaje.empresaNombre || viaje.chofer?.empresa || "");

    const reciboRef = useRef();
    const btnPrintRef = useRef();

    // CÁLCULO DE TOTALES (Mantenemos tu lógica exacta)
    const totalFletes = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.flete) || 0), 0);
    const totalStorage = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.storage) || 0), 0);
    const totalSobrepeso = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.sPeso) || 0), 0);
    const totalGastosExtra = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.gExtra) || 0), 0);
    const granTotalReal = totalFletes + totalStorage + totalSobrepeso + totalGastosExtra;

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

                // --- 1. ACTIVACIÓN DE VEHÍCULOS Y REGISTRO DE MOVIMIENTOS ---
                viaje.vehiculos.forEach((v) => {
                    const vehiculoRef = firestore().collection("vehiculos").doc(v.lote);
                    const movimientoRef = firestore().collection("movimientos").doc(); // ID Automático

                    const dataComun = {
                        active: true,
                        almacen: v.almacen || "PENDIENTE",
                        asignado: false,
                        binNip: v.lote,
                        ciudad: v.ciudad || "",
                        cliente: v.clienteNombre || v.clienteAlt || "SIN ASIGNAR",
                        clienteAlt: v.clienteAlt || "",
                        clienteId: v.clienteId || "",
                        clienteNombre: v.clienteNombre || "",
                        clienteTelefono: v.clienteTelefono || "",
                        comentariosChofer: null,
                        descripcion: "",
                        estado: v.estado || "",
                        estatus: "EB", // En Bodega para la tabla de vehiculos
                        gastosExtra: parseFloat(v.gExtra || 0),
                        gatePass: "X",
                        marca: v.marca || "",
                        modelo: v.modelo || "",
                        // Lógica Financiera: price es lo que se cobra, flete lo que se paga
                        price: String(v.precioVenta || v.flete || "0"),
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
                    };

                    // Guardar en la colección de VEHICULOS (Inventario activo)
                    transaction.set(vehiculoRef, dataComun);

                    // Guardar en la colección de MOVIMIENTOS (Historial de Auditoría)
                    transaction.set(movimientoRef, {
                        ...dataComun,
                        idUsuario: user?.id || "Admin_ID",
                        usuario: user?.nombre || "Admin",
                        timestamp: new Date(), // Fecha exacta del pago
                        tipo: "+",             // Indicador de entrada
                        tipoRegistro: "EB",     // Proceso de Registro/Pago
                        estatus: "EB"          // Estatus específico para el log
                    });
                });

                // --- 2. HISTORIAL DE PAGADOS (Expediente del Viaje) ---
                const viajePagadoData = {
                    ...viaje,
                    folioPago: nuevoFolioContable,
                    fechaPago: new Date(),
                    pagadoPor: {id: user?.id, nombre: user?.nombre},
                    empresaLiquidada: empresaSeleccionada,
                    estatus: "PAGADO",
                    resumenFinanciero: {
                        ...viaje.resumenFinanciero,
                        totalFletes,
                        totalStorage,
                        totalSobrepeso,
                        totalGastosExtra,
                        granTotal: granTotalReal
                    }
                };

                transaction.set(firestore().collection("viajesPagados").doc(nuevoFolioContable), viajePagadoData);

                // --- 3. LIMPIEZA Y ACTUALIZACIÓN DE CONSECUTIVO ---
                transaction.delete(firestore().collection("viajesPendientes").doc(viaje.id));
                transaction.update(consecutivoRef, {"Viajes pagados": proximoFolio});

                setFolioGenerado(nuevoFolioContable);
            });

            setPagoCompletado(true);
            setShowConfirm(false);

            // Disparo de impresión automática
            setTimeout(() => {
                if (btnPrintRef.current) btnPrintRef.current.click();
            }, 500);

        } catch (error) {
            console.error("Error en pago:", error);
            alert("Error al procesar el pago: " + error);
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

            <div style={{display: "none"}}>
                <ReciboPago
                    ref={reciboRef}
                    viajeData={{
                        ...viaje,
                        folioPago: folioGenerado,
                        fechaPago: new Date(),
                        empresaLiquidada: empresaSeleccionada,
                        pagadoPor: user
                    }}
                />
            </div>

            {showConfirm && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 font-sans text-black">
                    <div
                        className="bg-white-500 rounded-xl p-8 max-w-sm w-full shadow-2xl border-2 border-t-8 border-red-600 animate-in zoom-in duration-200">
                        <h3 className="text-xl font-black uppercase tracking-tighter italic">Confirmar Liquidación</h3>
                        <div
                            className="my-4 p-4 bg-gray-50 rounded-lg border border-dashed border-red-200 leading-tight">
                            <p className="text-[10px] font-black text-gray-400 uppercase italic">Empresa a Pagar:</p>
                            <p className="text-md font-black text-red-600 uppercase mb-3">{empresaSeleccionada}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase italic">Total de la
                                Operación:</p>
                            <p className="text-3xl font-black text-gray-800">${granTotalReal.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowConfirm(false)}
                                    className="btn btn-sm btn-ghost font-black uppercase text-[10px]">Cerrar
                            </button>
                            <button onClick={ejecutarPago}
                                    className="btn btn-sm btn-error text-white-500 font-black uppercase text-[10px] px-6">Confirmar
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
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-red-600">Liquidación
                            Final</h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest italic">Expediente:
                            #{viaje.numViaje}</p>
                    </div>
                    {!pagoCompletado && (
                        <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors">
                            <FaTimes size={24}/></button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">

                    {/* DETALLE UNIDADES */}
                    <div className="flex-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2">
                            <FaCar/> Desglose de Unidades ({viaje.vehiculos.length})
                        </h3>
                        <div className="space-y-3">
                            {viaje.vehiculos.map((v, i) => (
                                <div key={i}
                                     className="p-3 border rounded-lg bg-white-500 shadow-sm border-l-4 border-red-600">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[11px] font-black uppercase text-gray-800 italic">{v.lote} - {v.marca}</p>
                                            <p className="text-gray-400 font-bold text-[9px] uppercase leading-none">{v.ciudad}</p>
                                        </div>
                                        <div className="flex gap-4 text-center">
                                            {[
                                                {label: 'Flete', val: v.flete},
                                                {label: 'Storage', val: v.storage},
                                                {label: 'S.Peso', val: v.sPeso},
                                                {label: 'Extra', val: v.gExtra}
                                            ].map((c, idx) => (
                                                <div key={idx}
                                                     className="flex flex-col border-r last:border-none pr-4 last:pr-0">
                                                    <span
                                                        className="text-[8px] font-black text-gray-400 uppercase">{c.label}</span>
                                                    <span
                                                        className="text-[11px] font-black text-black">${parseFloat(c.val).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PANEL DE PAGO */}
                    <div className="w-full md:w-80 bg-gray-50 p-6 rounded-xl border border-gray-200 text-black">
                        {pagoCompletado ? (
                            <div className="text-center animate-in zoom-in duration-300">
                                <div className="text-green-500 text-6xl flex justify-center mb-4"><FaCheckCircle/></div>
                                <h4 className="text-xl font-black uppercase text-gray-800 tracking-tighter">Éxito</h4>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase italic italic tracking-tighter">Folio
                                    Contable: {folioGenerado}</p>

                                <ReactToPrint
                                    trigger={() => (
                                        <button ref={btnPrintRef}
                                                className="btn btn-error text-white-500 w-full mt-8 uppercase font-black tracking-widest gap-2">
                                            <FaPrint/> Imprimir Recibo
                                        </button>
                                    )}
                                    content={() => reciboRef.current}
                                />
                                <button onClick={onClose}
                                        className="btn btn-success h-14 w-full mt-4 text-white-500 font-black uppercase text-[12px] gap-2">
                                    <FaCheckDouble/> Finalizar Operación
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 p-4 bg-red-600 rounded-lg shadow-lg text-white-500">
                                    <div className="flex items-center gap-2 mb-2 border-b border-red-500 pb-2">
                                        <FaTruck className="text-xl"/>
                                        <p className="text-[10px] font-black uppercase italic">Transportista:</p>
                                    </div>
                                    <p className="text-md font-black uppercase italic leading-tight">{empresaSeleccionada}</p>
                                    <p className="text-[9px] mt-2 opacity-80 uppercase font-bold italic">MC: {viaje.chofer?.mc || 'N/A'}</p>
                                </div>

                                <div className="space-y-2 border-t-2 border-dashed border-gray-300 pt-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4">Resumen
                                        Contable</h4>
                                    {[
                                        {l: 'Total Fletes', v: totalFletes},
                                        {l: 'Total Storages', v: totalStorage},
                                        {l: 'Total Sobrepeso', v: totalSobrepeso},
                                        {l: 'Total Gastos Extras', v: totalGastosExtra}
                                    ].map((row, i) => (
                                        <div key={i}
                                             className="flex justify-between text-[11px] font-bold text-gray-600 uppercase italic">
                                            <span>{row.l}:</span>
                                            <span>${row.v.toLocaleString()}</span>
                                        </div>
                                    ))}

                                    <div
                                        className="flex justify-between text-2xl font-black text-gray-800 uppercase mt-6 pt-4 border-t-4 border-red-600 italic">
                                        <span>Total:</span>
                                        <span
                                            className="text-red-600 font-black">${granTotalReal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    disabled={!empresaSeleccionada || procesando}
                                    onClick={() => setShowConfirm(true)}
                                    className="btn btn-error h-20 w-full text-white-500 font-black uppercase mt-10 gap-3 text-xl shadow-2xl border-none"
                                >
                                    <FaWallet size={24}/>
                                    <span>Pagar Ahora</span>
                                </button>
                                <p className="text-center text-[9px] text-gray-400 font-bold uppercase mt-4 italic tracking-widest">
                                    Esta acción es irreversible
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalLiquidacion;