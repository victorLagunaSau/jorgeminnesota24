import React, {useState, useEffect, useRef} from "react";
import {firestore} from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import {FaFilter, FaPrint, FaCheckCircle, FaTimes, FaCommentDots, FaRegCommentDots, FaTrash, FaPlus, FaMinus} from "react-icons/fa";
import ReactToPrint from "react-to-print";
import HojaVerificacion from "./HojaVerificacion";

const TablaViajes = ({user}) => {
    const [viajes, setViajes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [provincias, setProvincias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroGeneral, setFiltroGeneral] = useState("");
    const [busquedaCliente, setBusquedaCliente] = useState({});

    const componentRef = useRef();
    const [viajeAImprimir, setViajeAImprimir] = useState(null);
    const [modal, setModal] = useState({show: false, mensaje: "", accion: null, tipo: ""});
    const [procesandoPago, setProcesandoPago] = useState(false);
    const btnPrintRef = useRef();
    const [estadoOrigen, setEstadoOrigen] = useState("");
    const [numViajePago, setNumViajePago] = useState("");
    const [metodoPago, setMetodoPago] = useState({ efectivo: "", cheque: "", zelle: "" });

    // Estado para el Modal de Comentarios
    const [modalComentario, setModalComentario] = useState({show: false, v: null, viajeId: null, idx: null});

    useEffect(() => {
        if (!user) return;
        let q = firestore().collection("viajesPendientes");
        if (user.admin) {
            q = q.orderBy("fechaCreacion", "desc");
        }

        const unsubViajes = q.onSnapshot(snap => {
            let viajesData = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));

            // Filtrar viajes para usuarios no-admin: mostrar viajes propios O donde es líder
            if (!user.admin) {
                viajesData = viajesData.filter(viaje =>
                    viaje.empresaId === user.id || viaje.empresaLiderId === user.id
                );
                // Ordenar del más nuevo al más viejo para carriers
                viajesData.sort((a, b) => {
                    const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion);
                    const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion);
                    return fechaB - fechaA; // Descendente (más nuevo primero)
                });
            }

            setViajes(viajesData);
            setLoading(false);
        });

        const unsubClientes = firestore().collection("clientes").onSnapshot(snap => {
            setClientes(snap.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().cliente,
                telefono: doc.data().telefonoCliente
            })));
        });

        const unsubProvincias = firestore().collection("province").orderBy("state", "asc").onSnapshot(snap => {
            setProvincias(snap.docs.map(doc => ({
                id: doc.id,
                state: doc.data().state,
                regions: doc.data().regions || []
            })));
        });

        return () => {
            unsubViajes();
            unsubClientes();
            unsubProvincias();
        };
    }, [user]);

    const handleLocalEdit = async (viajeId, vehiculoIdx, field, value) => {
        // Verificar si el usuario tiene permisos (admin o líder de ruta)
        const viaje = viajes.find(v => v.id === viajeId);
        const esLiderRuta = viaje && viaje.empresaLiderId === user.id;
        if (!user.admin && !esLiderRuta) return;

        const nuevosViajes = viajes.map(viaje => {
            if (viaje.id === viajeId) {
                const nuevosVehiculos = [...viaje.vehiculos];
                let valorFinal = value;
                if (['flete', 'storage', 'sPeso', 'gExtra'].includes(field)) {
                    valorFinal = value === "" ? "0" : parseFloat(value).toString();
                }
                if (field === 'clienteId') {
                    const clienteEncontrado = clientes.find(c => c.id === value);
                    nuevosVehiculos[vehiculoIdx].clienteId = value;
                    nuevosVehiculos[vehiculoIdx].clienteNombre = clienteEncontrado ? clienteEncontrado.nombre : "";
                    nuevosVehiculos[vehiculoIdx].clienteTelefono = clienteEncontrado ? clienteEncontrado.telefono : "";
                } else if (field === 'estado') {
                    nuevosVehiculos[vehiculoIdx].estado = value;
                    const estadoData = provincias.find(p => p.state === value);
                    if (estadoData && estadoData.regions?.length > 0) {
                        nuevosVehiculos[vehiculoIdx].ciudad = estadoData.regions[0].city;
                        nuevosVehiculos[vehiculoIdx].flete = (estadoData.regions[0].cost || 0).toString();
                        nuevosVehiculos[vehiculoIdx].precioVenta = parseFloat(estadoData.regions[0].price || 0);
                    } else {
                        nuevosVehiculos[vehiculoIdx].ciudad = "";
                        nuevosVehiculos[vehiculoIdx].flete = "0";
                        nuevosVehiculos[vehiculoIdx].precioVenta = 0;
                    }
                } else if (field === 'ciudad') {
                    nuevosVehiculos[vehiculoIdx].ciudad = value;
                    const estadoData = provincias.find(p => p.state === nuevosVehiculos[vehiculoIdx].estado);
                    const regionData = estadoData?.regions?.find(r => r.city === value);
                    if (regionData) {
                        nuevosVehiculos[vehiculoIdx].flete = (regionData.cost || 0).toString();
                        nuevosVehiculos[vehiculoIdx].precioVenta = parseFloat(regionData.price || 0);
                    } else {
                        nuevosVehiculos[vehiculoIdx].flete = "0";
                        nuevosVehiculos[vehiculoIdx].precioVenta = 0;
                    }
                } else {
                    nuevosVehiculos[vehiculoIdx][field] = valorFinal;
                }
                return {...viaje, vehiculos: nuevosVehiculos};
            }
            return viaje;
        });
        setViajes(nuevosViajes);

        // Guardar automáticamente en Firestore
        try {
            const viajeActualizado = nuevosViajes.find(v => v.id === viajeId);
            if (viajeActualizado) {
                await firestore().collection("viajesPendientes").doc(viajeId).update({
                    vehiculos: viajeActualizado.vehiculos
                });
            }
        } catch (error) {
            console.error("Error al guardar cambios:", error);
        }
    };


    const filtrados = viajes.filter(v =>
        v.numViaje.toLowerCase().includes(filtroGeneral.toLowerCase()) ||
        v.chofer?.nombre?.toLowerCase().includes(filtroGeneral.toLowerCase())
    );

    const guardarComentarioRecepcion = async () => {
        const {viajeId, idx, v} = modalComentario;
        if (!viajeId || idx === null) return;

        try {
            // Buscamos el viaje actual en nuestro estado para tener la versión más reciente de los vehículos
            const viajeActual = viajes.find(vj => vj.id === viajeId);
            const nuevosVehiculos = [...viajeActual.vehiculos];

            // El comentario ya está en el estado local gracias a handleLocalEdit,
            // así que solo lo confirmamos en Firestore.
            await firestore().collection("viajesPendientes").doc(viajeId).update({
                vehiculos: nuevosVehiculos
            });

            // Opcional: Mostrar una pequeña alerta o simplemente cerrar el modal
            setModalComentario({show: false, v: null, viajeId: null, idx: null});
            // setModal({show: true, mensaje: "Nota guardada correctamente", tipo: "success"});
        } catch (error) {
            console.error("Error al guardar comentario:", error);
            setModal({show: true, mensaje: "Error al guardar la nota", tipo: "error"});
        }
    };

    const eliminarViaje = async (viajeId) => {
        const viaje = viajes.find(v => v.id === viajeId);
        if (!viaje) return;

        try {
            // Eliminar viaje de viajesPendientes
            await firestore().collection("viajesPendientes").doc(viajeId).delete();

            // Eliminar todos los lotes en tránsito asociados
            const batch = firestore().batch();
            viaje.vehiculos.forEach(v => {
                const loteRef = firestore().collection("lotesEnTransito").doc(v.lote);
                batch.delete(loteRef);
            });
            await batch.commit();

            setModal({show: false});
        } catch (error) {
            console.error("Error al eliminar viaje:", error);
            setModal({show: true, mensaje: "Error al eliminar el viaje", tipo: "error"});
        }
    };

    // Agregar vehículo a un viaje existente
    const agregarVehiculoAViaje = async (viajeId) => {
        const viaje = viajes.find(v => v.id === viajeId);
        if (!viaje) return;

        const nuevoVehiculo = {
            id: Date.now(),
            lote: "",
            marca: "",
            modelo: "",
            clienteAlt: "",
            almacen: "Copart",
            estado: "",
            ciudad: "",
            flete: "0",
            precioVenta: 0,
            storage: "0",
            sPeso: "0",
            gExtra: "0",
            titulo: "NO",
            comentarioRegistro: "",
            comentarioRecepcion: "",
            yaPagado: false
        };

        const nuevosVehiculos = [...viaje.vehiculos, nuevoVehiculo];

        try {
            await firestore().collection("viajesPendientes").doc(viajeId).update({
                vehiculos: nuevosVehiculos
            });
        } catch (error) {
            console.error("Error al agregar vehículo:", error);
            setModal({show: true, mensaje: "Error al agregar vehículo", tipo: "error"});
        }
    };

    // Eliminar un vehículo específico de un viaje
    const eliminarVehiculoDeViaje = async (viajeId, vehiculoIdx, lote) => {
        const viaje = viajes.find(v => v.id === viajeId);
        if (!viaje) return;

        // Si solo queda un vehículo, no permitir eliminar
        if (viaje.vehiculos.length <= 1) {
            setModal({show: true, mensaje: "No puedes eliminar el último vehículo. Si deseas eliminar todo el viaje, usa el botón 'Eliminar Viaje'.", tipo: "error"});
            return;
        }

        const nuevosVehiculos = viaje.vehiculos.filter((_, idx) => idx !== vehiculoIdx);

        try {
            // Actualizar el viaje sin ese vehículo
            await firestore().collection("viajesPendientes").doc(viajeId).update({
                vehiculos: nuevosVehiculos
            });

            // Si el lote tenía un número, eliminar de lotesEnTransito
            if (lote && lote.trim() !== "") {
                await firestore().collection("lotesEnTransito").doc(lote).delete();
            }

            setModal({show: false});
        } catch (error) {
            console.error("Error al eliminar vehículo:", error);
            setModal({show: true, mensaje: "Error al eliminar el vehículo", tipo: "error"});
        }
    };

    const ejecutarPago = async (viaje) => {
        setProcesandoPago(true);
        const fechaOperacionActual = new Date();
        const empresaSeleccionada = viaje.empresaNombre || viaje.chofer?.empresa || "";
        // Usar el número de viaje ingresado al pagar
        const numViajeFinal = numViajePago.trim() || viaje.numViaje;

        // CÁLCULO DE TOTALES
        const totalFletes = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.flete) || 0), 0);
        const totalStorage = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.storage) || 0), 0);
        const totalSobrepeso = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.sPeso) || 0), 0);
        const totalGastosExtra = viaje.vehiculos.reduce((acc, v) => acc + (parseFloat(v.gExtra) || 0), 0);
        const granTotalReal = totalFletes + totalStorage + totalSobrepeso + totalGastosExtra;

        try {
            const consecutivoRef = firestore().collection("config").doc("consecutivos");

            // VERIFICAR LOTES YA PAGADOS
            const lotesExistentes = [];
            for (const v of viaje.vehiculos) {
                const docExistente = await firestore().collection("vehiculos").doc(v.lote).get();
                if (docExistente.exists) {
                    lotesExistentes.push(v.lote);
                }
            }

            // Si hay lotes pagados, mostrar confirmación
            if (lotesExistentes.length > 0) {
                const confirmar = window.confirm(
                    `⚠️ ADVERTENCIA: Los siguientes lotes YA ESTÁN PAGADOS:\n\n${lotesExistentes.join(', ')}\n\n` +
                    `Solo se actualizarán los precios (Storage, Sobrepeso, Gastos Extras) sin crear un nuevo pago.\n\n` +
                    `¿Desea continuar?`
                );
                if (!confirmar) {
                    setProcesandoPago(false);
                    return;
                }
            }

            await firestore().runTransaction(async (transaction) => {
                const conDoc = await transaction.get(consecutivoRef);
                if (!conDoc.exists) throw "El documento de consecutivos no existe";

                const ultimoFolio = conDoc.data()["Viajes pagados"] || 0;
                const proximoFolio = ultimoFolio + 1;
                const nuevoFolioContable = `PG-${proximoFolio}`;

                // --- 1. ACTIVACIÓN DE VEHÍCULOS Y REGISTRO DE MOVIMIENTOS ---
                viaje.vehiculos.forEach((v) => {
                    const vehiculoRef = firestore().collection("vehiculos").doc(v.lote);
                    const movimientoRef = firestore().collection("movimientos").doc();

                    // Verificar si el lote ya está pagado
                    const yaPagado = lotesExistentes.includes(v.lote);

                    if (yaPagado) {
                        // LOTE YA PAGADO - Solo actualizar precios
                        transaction.update(vehiculoRef, {
                            storage: parseFloat(v.storage || 0),
                            sobrePeso: parseFloat(v.sPeso || 0),
                            gastosExtra: parseFloat(v.gExtra || 0),
                            comentarioRecepcion: v.comentarioRecepcion || "",
                            ultimaActualizacionPrecios: {
                                fecha: fechaOperacionActual,
                                usuario: user?.nombre || "Admin",
                                viajeRelacionado: numViajeFinal
                            }
                        });

                        // Registrar movimiento de actualización
                        transaction.set(movimientoRef, {
                            binNip: v.lote,
                            timestamp: fechaOperacionActual,
                            tipo: "ACTUALIZACIÓN",
                            tipoRegistro: "ACTUALIZACIÓN PRECIOS",
                            storage: parseFloat(v.storage || 0),
                            sobrePeso: parseFloat(v.sPeso || 0),
                            gastosExtra: parseFloat(v.gExtra || 0),
                            numViaje: numViajeFinal,
                            usuario: user?.nombre || "Admin",
                            nota: "Actualización de precios - Lote ya pagado previamente"
                        });

                    } else {
                        // LOTE NUEVO - Crear registro completo
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
                            comentarioRegistro: v.comentarioRegistro || "",
                            comentarioRecepcion: v.comentarioRecepcion || "",
                            numViaje: numViajeFinal,
                            empresaLiderId: viaje.empresaLiderId || viaje.chofer?.empresaLiderId || "",
                            folioPago: nuevoFolioContable,
                            descripcion: "",
                            estado: v.estado || "",
                            estatus: "EB",
                            gastosExtra: parseFloat(v.gExtra || 0),
                            gatePass: "X",
                            marca: v.marca || "",
                            modelo: v.modelo || "",
                            price: String(v.precioVenta || v.flete || "0"),
                            flete: parseFloat(v.flete || 0),

                            registro: {
                                idUsuario: user?.id || "Admin_ID",
                                usuario: user?.nombre || "Admin",
                                timestamp: fechaOperacionActual
                            },
                            datosOrigen: {
                                idUsuario: viaje.creadoPor?.id,
                                usuario: viaje.creadoPor?.nombre,
                                fechaRegistro: viaje.fechaCreacion
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
                            timestamp: fechaOperacionActual,
                            tipo: "+",
                            tipoRegistro: "EB",
                            estatus: "EB"
                        });
                    }
                });

                // --- 2. HISTORIAL DE PAGADOS (Expediente del Viaje) ---
                const viajePagadoData = {
                    ...viaje,
                    numViaje: numViajeFinal,
                    folioPago: nuevoFolioContable,
                    fechaPago: fechaOperacionActual,
                    empresaLiderId: viaje.empresaLiderId || viaje.chofer?.empresaLiderId || "",
                    pagadoPor: {id: user?.id, nombre: user?.nombre},
                    empresaLiquidada: empresaSeleccionada,
                    estadoOrigen: estadoOrigen,
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
            });

            // Mostrar mensaje de éxito
            setModal({
                show: true,
                mensaje: `Pago procesado exitosamente. El PDF se imprimirá automáticamente.`,
                tipo: "success"
            });

            // Preparar el PDF para imprimir con el estado de origen y métodos de pago
            setViajeAImprimir({...viaje, numViaje: numViajeFinal, estadoOrigen: estadoOrigen, metodoPago: metodoPago});

            // Imprimir automáticamente después de un pequeño delay
            setTimeout(() => {
                if (btnPrintRef.current) {
                    btnPrintRef.current.click();
                }
                setModal({show: false});
                setEstadoOrigen("");
                setNumViajePago("");
                setMetodoPago({ efectivo: "", cheque: "", zelle: "" });
            }, 1000);

        } catch (error) {
            console.error("Error en pago:", error);
            setModal({show: true, mensaje: "Error al procesar el pago: " + error, tipo: "error"});
        } finally {
            setProcesandoPago(false);
        }
    };
    return (
        <div className="bg-gray-100 min-h-screen font-sans text-black">
            <div style={{display: "none"}}>
                <HojaVerificacion ref={componentRef} viajeData={viajeAImprimir}/>
            </div>

            {/* Botón oculto para imprimir después del pago */}
            <ReactToPrint
                trigger={() => <button ref={btnPrintRef} style={{display: 'none'}}>Print</button>}
                content={() => componentRef.current}
                documentTitle={`Hoja Pago - Folio ${viajeAImprimir?.numViaje}`}
            />

            {/* MODAL DE CONFIRMACIÓN GENERAL */}
            {modal.show && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`bg-white rounded-xl p-8 max-w-sm w-full border-t-8 shadow-2xl ${
                        modal.tipo === 'eliminar' ? 'border-red-700' :
                        modal.tipo === 'pago' ? 'border-green-600' :
                        modal.tipo === 'success' ? 'border-green-600' :
                        'border-red-600'
                    }`}>
                        <h3 className={`text-xl font-black uppercase italic tracking-tighter ${
                            modal.tipo === 'eliminar' ? 'text-red-700 flex items-center gap-2' :
                            modal.tipo === 'pago' ? 'text-green-700' :
                            modal.tipo === 'success' ? 'text-green-700 flex items-center gap-2' :
                            ''
                        }`}>
                            {modal.tipo === 'eliminar' && <FaTrash />}
                            {modal.tipo === 'success' && <FaCheckCircle />}
                            {modal.tipo === 'eliminar' ? 'Confirmar Eliminación' :
                             modal.tipo === 'pago' ? 'Confirmar Pago' :
                             modal.tipo === 'success' ? 'Pago Exitoso' :
                             'Confirmar Acción'}
                        </h3>
                        <p className="text-sm mt-3 font-bold text-gray-600 leading-tight italic">{modal.mensaje}</p>
                        {modal.tipo === 'eliminar' && (
                            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-700 rounded">
                                <p className="text-[10px] font-black text-red-700 uppercase flex items-center gap-1">
                                    ⚠️ ADVERTENCIA: Esta acción no se puede deshacer
                                </p>
                            </div>
                        )}
                        {modal.tipo === 'pago' && (
                            <>
                                <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-700 rounded">
                                    <label className="text-[9px] font-black text-red-700 uppercase block mb-2">
                                        Número de Viaje:
                                    </label>
                                    <input
                                        type="text"
                                        value={numViajePago}
                                        onChange={(e) => setNumViajePago(e.target.value.toUpperCase())}
                                        placeholder="ESCRIBE EL NÚMERO DE VIAJE"
                                        className="w-full px-3 py-2 border-2 border-red-300 rounded-md text-sm font-bold uppercase focus:border-red-600 focus:outline-none"
                                        maxLength={30}
                                    />
                                </div>
                                <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-700 rounded">
                                    <label className="text-[9px] font-black text-blue-700 uppercase block mb-2">
                                        Estado de Origen del Viaje:
                                    </label>
                                    <input
                                        type="text"
                                        value={estadoOrigen}
                                        onChange={(e) => setEstadoOrigen(e.target.value.toUpperCase())}
                                        placeholder="EJEMPLO: TEXAS, CALIFORNIA, ETC."
                                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-md text-sm font-bold uppercase focus:border-blue-600 focus:outline-none"
                                        maxLength={30}
                                    />
                                </div>
                                <div className="mt-3 p-3 bg-gray-50 border-l-4 border-gray-400 rounded">
                                    <label className="text-[9px] font-black text-gray-600 uppercase block mb-2">
                                        Método de Pago (opcional):
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[8px] font-bold text-gray-500 uppercase">Efectivo</label>
                                            <input
                                                type="number"
                                                value={metodoPago.efectivo}
                                                onChange={(e) => setMetodoPago({...metodoPago, efectivo: e.target.value})}
                                                placeholder="$0"
                                                className="w-full px-2 py-1 border-2 border-gray-300 rounded text-sm font-bold text-center focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-bold text-gray-500 uppercase">Cheque</label>
                                            <input
                                                type="number"
                                                value={metodoPago.cheque}
                                                onChange={(e) => setMetodoPago({...metodoPago, cheque: e.target.value})}
                                                placeholder="$0"
                                                className="w-full px-2 py-1 border-2 border-gray-300 rounded text-sm font-bold text-center focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-bold text-gray-500 uppercase">Zelle</label>
                                            <input
                                                type="number"
                                                value={metodoPago.zelle}
                                                onChange={(e) => setMetodoPago({...metodoPago, zelle: e.target.value})}
                                                placeholder="$0"
                                                className="w-full px-2 py-1 border-2 border-gray-300 rounded text-sm font-bold text-center focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 p-3 bg-green-50 border-l-4 border-green-700 rounded">
                                    <p className="text-[10px] font-black text-green-700 uppercase flex items-center gap-1">
                                        ✓ Se procesará el pago y se generará el PDF
                                    </p>
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-3 mt-8">
                            {modal.tipo !== 'success' && (
                                <button onClick={() => {
                                    setModal({show: false});
                                    if (modal.tipo === 'pago') {
                                        setEstadoOrigen("");
                                        setNumViajePago("");
                                        setMetodoPago({ efectivo: "", cheque: "", zelle: "" });
                                    }
                                }}
                                        className="btn btn-sm btn-ghost font-black uppercase text-[10px]">
                                    {modal.accion ? 'Cancelar' : 'Cerrar'}
                                </button>
                            )}
                            {(modal.accion || modal.viajeAPagar) && <button
                                onClick={() => {
                                    if (modal.tipo === 'pago' && modal.viajeAPagar) {
                                        ejecutarPago(modal.viajeAPagar);
                                    } else if (modal.accion) {
                                        modal.accion();
                                    }
                                }}
                                disabled={modal.tipo === 'pago' && (!estadoOrigen.trim() || !numViajePago.trim())}
                                className={`btn btn-sm text-white font-black uppercase text-[10px] ${
                                    modal.tipo === 'eliminar' ? 'btn-error' :
                                    modal.tipo === 'pago' ? 'btn-success' :
                                    'btn-error'
                                } ${modal.tipo === 'pago' && (!estadoOrigen.trim() || !numViajePago.trim()) ? 'btn-disabled' : ''}`}>
                                {modal.tipo === 'eliminar' ? 'Eliminar Viaje' :
                                 modal.tipo === 'pago' ? 'Confirmar Pago' :
                                 'Continuar'}
                            </button>}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ESPECÍFICO DE COMENTARIOS */}
            {modalComentario.show && (() => {
                const viajeModal = viajes.find(vj => vj.id === modalComentario.viajeId);
                const esLiderRutaModal = viajeModal && viajeModal.empresaLiderId === user.id;
                const puedeEditarModal = user.admin || esLiderRutaModal;

                return (
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                        <div
                            className="bg-white rounded-xl max-w-md w-full shadow-2xl border-t-8 border-blue-600 overflow-hidden">
                            <div className="p-6">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-gray-800">
                                    <FaCommentDots className="text-blue-600"/> Notas del Vehículo
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Lote: {modalComentario.v?.lote}</p>

                                <div className="mt-6 space-y-4">
                                    {/* COMENTARIO 1 (REGISTRO) */}
                                    <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Nota de Registro
                                            (Origen)</p>
                                        <p className="text-sm font-bold text-gray-700 italic">
                                            {modalComentario.v?.comentarioRegistro || "SIN COMENTARIOS EN EL REGISTRO."}
                                        </p>
                                    </div>

                                    {/* COMENTARIO 2 (RECEPCIÓN) */}
                                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                        <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Nota de Recepción
                                            (Destino)</p>
                                        {puedeEditarModal ? (
                                            <textarea
                                                placeholder="ESCRIBE AQUÍ EL COMENTARIO DE LLEGADA..."
                                                className="w-full bg-transparent border-none outline-none text-sm font-bold text-blue-900 placeholder:text-blue-200 resize-none h-20 uppercase"
                                                value={modalComentario.v?.comentarioRecepcion || ""}
                                                onChange={(e) => handleLocalEdit(modalComentario.viajeId, modalComentario.idx, 'comentarioRecepcion', e.target.value.toUpperCase())}
                                            />
                                        ) : (
                                            <p className="text-sm font-bold text-blue-700 italic">
                                                {modalComentario.v?.comentarioRecepcion || "PENDIENTE DE RECEPCIÓN."}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-6">
                                    <button
                                        onClick={() => setModalComentario({show: false, v: null, viajeId: null, idx: null})}
                                        className="btn btn-sm btn-ghost flex-1 font-black uppercase text-[10px]"
                                    >
                                        Cancelar
                                    </button>

                                    {puedeEditarModal && (
                                        <button
                                            onClick={guardarComentarioRecepcion}
                                            className="btn btn-sm btn-info flex-1 text-white font-black uppercase text-[10px]"
                                        >
                                            Guardar Nota
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div
                className="sticky top-0 z-[50] p-6 bg-white border-b-2 border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                        {user.admin ? "Control Administrativo" : "Mis Despachos"}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión de
                        Logística y Arribos</p>
                </div>
                <div
                    className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border-2 border-gray-200 focus-within:border-red-500 transition-all">
                    <FaFilter className="text-gray-400 text-xs"/>
                    <input type="text" placeholder="BUSCAR POR FOLIO O CHOFER..."
                           className="bg-transparent outline-none text-[11px] w-64 font-bold uppercase"
                           value={filtroGeneral} onChange={(e) => setFiltroGeneral(e.target.value)}/>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {filtrados.map((viaje, vIndex) => (
                    <div key={viaje.id}
                         className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden transform transition-all">

                        <div className="bg-gray-100 p-3 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="bg-red-600 px-3 py-1 italic font-black text-lg skew-x-[-10deg] flex items-center gap-2">
                                    {user.admin ? (
                                        <>
                                            <span>VIAJE #</span>
                                            <input
                                                type="text"
                                                value={viaje.numViaje}
                                                onChange={async (e) => {
                                                    const nuevoNumero = e.target.value.toUpperCase();
                                                    // Actualizar localmente
                                                    setViajes(viajes.map(v =>
                                                        v.id === viaje.id ? {...v, numViaje: nuevoNumero} : v
                                                    ));
                                                    // Guardar en Firestore
                                                    try {
                                                        await firestore().collection("viajesPendientes").doc(viaje.id).update({
                                                            numViaje: nuevoNumero
                                                        });
                                                    } catch (error) {
                                                        console.error("Error al actualizar número de viaje:", error);
                                                    }
                                                }}
                                                className="bg-white text-red-600 px-2 py-1 rounded text-center font-black w-20 focus:outline-none focus:ring-2 focus:ring-white"
                                                maxLength={10}
                                            />
                                        </>
                                    ) : (
                                        viaje.numViaje ? `VIAJE #${viaje.numViaje}` : "VIAJE - PENDIENTE"
                                    )}
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-gray-500 leading-none">Transportista</p>
                                    <p className="text-sm font-black uppercase italic leading-none">{viaje.chofer?.nombre}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {user.admin && viaje.vehiculos.some(v => v.yaPagado) && (
                                    <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-yellow-500 text-black flex items-center gap-1">
                                        ⚠️ CONTIENE LOTES PAGADOS
                                    </span>
                                )}
                                <span className={`text-[10px] font-black uppercase px-4 py-1 rounded-full ${
                                    viaje.estatus === 'PENDIENTE' ? 'bg-yellow-500 text-black' :
                                        viaje.estatus === 'VERIFICADO' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                                }`}>
                                    {viaje.estatus}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table w-full border-collapse">
                                <thead>
                                <tr className="text-[10px] uppercase text-gray-500 bg-gray-50 border-b-2 border-gray-200 italic font-black">
                                    <th className="p-1 w-8"></th>
                                    <th className="p-3">Lote</th>
                                    <th className="p-3">Vehículo</th>
                                    <th className="p-3">Ciudad / Almacén</th>
                                    {user.admin ? <th className="p-3 w-64">Cliente Oficial</th> :
                                        <th className="p-3">Referencia</th>}
                                    <th className="p-3 text-center text-blue-800">Flete</th>
                                    <th className="p-3 text-center">Storage</th>
                                    <th className="p-3 text-center text-gray-400">S. Peso</th>
                                    <th className="p-3 text-center text-gray-400">G. Extra</th>
                                    <th className="p-3 text-center">Título</th>
                                    <th className="p-3 text-center bg-gray-100">Notas</th>
                                    {/* COLUMNA DE NOTAS */}
                                    <th className="p-3 text-center bg-gray-100">Acción</th>
                                </tr>
                                </thead>
                                <tbody>
                                {viaje.vehiculos.map((v, idx) => {
                                    const esLiderRuta = viaje.empresaLiderId === user.id;
                                    const puedeEditar = user.admin || esLiderRuta;
                                    const tieneComentarios = (v.comentarioRegistro && v.comentarioRegistro !== "") || (v.comentarioRecepcion && v.comentarioRecepcion !== "");

                                    return (
                                        <tr key={`${viaje.id}-${idx}`}
                                            className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${user.admin && v.yaPagado ? 'bg-yellow-50' : ''}`}>
                                            {/* Botón para quitar vehículo */}
                                            <td className="p-1 text-center">
                                                {puedeEditar && viaje.vehiculos.length > 1 && (
                                                    <button
                                                        onClick={() => setModal({
                                                            show: true,
                                                            mensaje: `¿Eliminar el vehículo ${v.lote || '(sin lote)'} del viaje #${viaje.numViaje}?`,
                                                            accion: () => eliminarVehiculoDeViaje(viaje.id, idx, v.lote),
                                                            tipo: "eliminar"
                                                        })}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Quitar vehículo"
                                                    >
                                                        <FaMinus size={10}/>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {puedeEditar ? (
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={v.lote || ""}
                                                            maxLength={8}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'lote', e.target.value.toUpperCase())}
                                                            className={`w-24 text-center bg-gray-50 rounded border border-gray-200 outline-none text-xs font-black font-mono py-1 focus:border-blue-500 ${user.admin && v.yaPagado ? 'text-yellow-700 border-yellow-500' : 'text-blue-700'}`}
                                                        />
                                                        {user.admin && v.yaPagado && (
                                                            <div className="text-[7px] font-black text-yellow-700 uppercase italic mt-1 flex items-center gap-1">
                                                                ⚠️ YA PAGADO
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className={`font-mono text-xs font-black ${user.admin && v.yaPagado ? 'text-yellow-700' : 'text-blue-700'}`}>{v.lote}</span>
                                                        {user.admin && v.yaPagado && (
                                                            <div className="text-[7px] font-black text-yellow-700 uppercase italic mt-1">
                                                                ⚠️ YA PAGADO
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {puedeEditar ? (
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="text"
                                                            placeholder="MARCA"
                                                            value={v.marca || ""}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'marca', e.target.value.toUpperCase())}
                                                            className="w-20 bg-gray-50 rounded border border-gray-200 outline-none text-[10px] uppercase font-bold text-gray-600 px-1 py-1 focus:border-blue-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="MODELO"
                                                            value={v.modelo || ""}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'modelo', e.target.value.toUpperCase())}
                                                            className="w-20 bg-gray-50 rounded border border-gray-200 outline-none text-[10px] uppercase font-bold text-gray-600 px-1 py-1 focus:border-blue-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] uppercase font-bold text-gray-600">{v.marca} {v.modelo}</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {puedeEditar ? (
                                                    <div className="flex flex-col gap-1">
                                                        <select
                                                            value={v.estado || ""}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'estado', e.target.value)}
                                                            className="w-28 bg-gray-50 rounded border border-gray-200 outline-none text-[9px] uppercase font-bold text-gray-600 px-1 py-1 focus:border-blue-500"
                                                        >
                                                            <option value="">ESTADO</option>
                                                            {provincias.map(p => <option key={p.id} value={p.state}>{p.state}</option>)}
                                                        </select>
                                                        <select
                                                            value={v.ciudad || ""}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'ciudad', e.target.value)}
                                                            className="w-28 bg-gray-50 rounded border border-gray-200 outline-none text-[10px] uppercase font-black text-red-700 px-1 py-1 focus:border-blue-500"
                                                        >
                                                            <option value="">CIUDAD</option>
                                                            {(provincias.find(p => p.state === v.estado)?.regions || []).map((r, i) => (
                                                                <option key={i} value={r.city}>{r.city}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="text-[11px] font-black text-red-700 uppercase leading-none">{v.ciudad}</div>
                                                        <div className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic">{v.estado}</div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* CLIENTE */}
                                            <td className="p-2">
                                                {user.admin ? (
                                                    <div className="relative group">
                                                        {/* Si el cliente ya viene confirmado del registro, mostrarlo directamente */}
                                                        {v.clienteConfirmado && v.clienteNombre ? (
                                                            <div>
                                                                <div className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 font-bold">
                                                                    <FaCheckCircle size={10}/> {v.clienteNombre}
                                                                </div>
                                                                <button
                                                                    className="text-[8px] text-blue-500 hover:text-blue-700 mt-1 underline"
                                                                    onClick={() => handleLocalEdit(viaje.id, idx, 'clienteConfirmado', false)}
                                                                >
                                                                    Cambiar cliente
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="text-[8px] font-black text-blue-600 mb-1 italic flex items-center gap-1">
                                                                    Ref:
                                                                    <input
                                                                        type="text"
                                                                        value={v.clienteAlt || ""}
                                                                        onChange={(e) => handleLocalEdit(viaje.id, idx, 'clienteAlt', e.target.value.toUpperCase())}
                                                                        className="w-24 bg-gray-50 rounded border border-gray-200 outline-none text-[8px] font-black text-blue-600 px-1 focus:border-blue-500"
                                                                    />
                                                                </div>
                                                                <div className="relative">
                                                                    <input
                                                                        type="text"
                                                                        placeholder={v.clienteNombre || "BUSCAR CLIENTE..."}
                                                                        className="input input-bordered input-xs w-full font-bold text-[10px] uppercase bg-gray-50 focus:bg-white"
                                                                        value={busquedaCliente[`${viaje.id}-${idx}`] || ""}
                                                                        onChange={(e) => setBusquedaCliente({
                                                                            ...busquedaCliente,
                                                                            [`${viaje.id}-${idx}`]: e.target.value
                                                                        })}
                                                                    />
                                                                    {busquedaCliente[`${viaje.id}-${idx}`] && (
                                                                        <button className="absolute right-1 top-1 text-gray-400"
                                                                                onClick={() => setBusquedaCliente({
                                                                                    ...busquedaCliente,
                                                                                    [`${viaje.id}-${idx}`]: ""
                                                                                })}>
                                                                            <FaTimes size={10}/>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {busquedaCliente[`${viaje.id}-${idx}`] && (
                                                                    <div
                                                                        className="absolute z-[100] w-full bg-white border-2 border-blue-500 shadow-2xl rounded-md max-h-40 overflow-y-auto mt-1">
                                                                        {clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente[`${viaje.id}-${idx}`].toLowerCase())).map(cliente => (
                                                                            <div key={cliente.id}
                                                                                 className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[10px] font-black uppercase border-b"
                                                                                 onClick={() => {
                                                                                     handleLocalEdit(viaje.id, idx, 'clienteId', cliente.id);
                                                                                     setBusquedaCliente({
                                                                                         ...busquedaCliente,
                                                                                         [`${viaje.id}-${idx}`]: ""
                                                                                     });
                                                                                 }}>
                                                                                {cliente.nombre}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {v.clienteNombre && !busquedaCliente[`${viaje.id}-${idx}`] && (
                                                                    <div
                                                                        className="mt-1 text-[9px] bg-green-100 text-green-700 px-1 rounded flex items-center gap-1 font-bold">
                                                                        <FaCheckCircle size={8}/> {v.clienteNombre}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ) : puedeEditar ? (
                                                    <input
                                                        type="text"
                                                        placeholder="REFERENCIA"
                                                        value={v.clienteAlt || ""}
                                                        onChange={(e) => handleLocalEdit(viaje.id, idx, 'clienteAlt', e.target.value.toUpperCase())}
                                                        className="w-full bg-gray-50 rounded border border-gray-200 outline-none text-[10px] font-bold uppercase text-gray-600 px-2 py-1 focus:border-blue-500"
                                                    />
                                                ) : (
                                                    <div
                                                        className="text-[10px] font-bold uppercase text-gray-500 italic">{v.clienteAlt}</div>
                                                )}
                                            </td>

                                            {['flete', 'storage', 'sPeso', 'gExtra'].map(field => (
                                                <td key={field} className="p-1 text-center">
                                                    {puedeEditar ? (
                                                        <input type="number" value={v[field]}
                                                               onChange={(e) => handleLocalEdit(viaje.id, idx, field, e.target.value)}
                                                               className="w-16 text-center bg-gray-50 rounded border border-gray-200 outline-none text-[11px] font-black py-1 focus:border-blue-500"/>
                                                    ) : (
                                                        <span className="text-[11px] font-bold">${v[field]}</span>
                                                    )}
                                                </td>
                                            ))}

                                            <td className="p-1 text-center">
                                                {puedeEditar ? (
                                                    <select value={v.titulo || "NO"}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'titulo', e.target.value)}
                                                            className="select select-bordered select-xs font-black text-[10px]">
                                                        <option value="NO">NO</option>
                                                        <option value="SI">SI</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-[10px] font-black">{v.titulo}</span>
                                                )}
                                            </td>

                                            {/* CELDA DE NOTAS */}
                                            <td className="p-1 text-center bg-gray-50">
                                                <button
                                                    onClick={() => setModalComentario({
                                                        show: true,
                                                        v,
                                                        viajeId: viaje.id,
                                                        idx
                                                    })}
                                                    className={`relative p-2 rounded-lg transition-all ${tieneComentarios ? 'text-blue-600 bg-blue-100' : 'text-gray-300 hover:bg-gray-200'}`}
                                                >
                                                    {tieneComentarios ? <FaCommentDots size={18}/> :
                                                        <FaRegCommentDots size={18}/>}
                                                    {tieneComentarios &&
                                                        <span className="absolute top-1 right-1 flex h-2 w-2"><span
                                                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span
                                                            className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
                                                </button>
                                            </td>

                                            {idx === 0 && (
                                                <td rowSpan={viaje.vehiculos.length}
                                                    className="p-4 bg-gray-50/80 border-l-2 border-gray-100 align-middle">
                                                    <div className="flex flex-col gap-2 w-32 mx-auto">
                                                        {user.admin ? (
                                                            <>
                                                                {(() => {
                                                                    const faltanClientes = viaje.vehiculos.some(veh => !veh.clienteNombre);
                                                                    return (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (faltanClientes) {
                                                                                    setModal({
                                                                                        show: true,
                                                                                        mensaje: "Debes asignar todos los nombres de clientes antes de pagar el flete.",
                                                                                        tipo: "error"
                                                                                    });
                                                                                } else {
                                                                                    setEstadoOrigen(""); // Limpiar estado anterior
                                                                                    setNumViajePago(""); // Limpiar número de viaje anterior
                                                                                    setModal({
                                                                                        show: true,
                                                                                        mensaje: `¿Confirmar pago del viaje? Escribe el número de viaje y el estado de origen para procesar el pago y generar el PDF automáticamente.`,
                                                                                        viajeAPagar: viaje,
                                                                                        tipo: "pago"
                                                                                    });
                                                                                }
                                                                            }}
                                                                            disabled={faltanClientes || procesandoPago}
                                                                            className={`btn btn-xs text-white font-black text-[10px] h-10 uppercase italic shadow-md ${
                                                                                faltanClientes || procesandoPago ? 'btn-disabled bg-gray-400' : 'btn-success'
                                                                            }`}
                                                                        >
                                                                            {procesandoPago ? 'Procesando...' : 'Pagar Flete'}
                                                                        </button>
                                                                    );
                                                                })()}
                                                            </>
                                                        ) : null}

                                                        <ReactToPrint
                                                            onBeforeGetContent={() => setViajeAImprimir(viaje)}
                                                            documentTitle={`Hoja Chofer - Folio ${viaje.numViaje}`}
                                                            trigger={() => (
                                                                <button
                                                                    className="btn btn-xs bg-white hover:bg-gray-100 border-2 border-gray-300 text-gray-800 font-black text-[9px] uppercase h-10 w-full flex items-center justify-center gap-2 transition-all shadow-sm">
                                                                    <FaPrint/> PDF
                                                                </button>
                                                            )}
                                                            content={() => componentRef.current}
                                                        />

                                                        {puedeEditar && (
                                                            <button onClick={() => {
                                                                setModal({
                                                                    show: true,
                                                                    mensaje: `¿Eliminar viaje #${viaje.numViaje}? Esta acción eliminará el viaje y ${viaje.vehiculos.length} vehículo(s) asociado(s). NO SE PUEDE DESHACER.`,
                                                                    accion: () => eliminarViaje(viaje.id),
                                                                    tipo: "eliminar"
                                                                });
                                                            }}
                                                                    className="btn btn-xs btn-error text-white font-black text-[9px] uppercase h-8 w-full flex items-center justify-center gap-2 transition-all shadow-md mt-2">
                                                                <FaTrash size={10}/> ELIMINAR
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {/* Fila para agregar vehículo */}
                                {(user.admin || viaje.empresaLiderId === user.id) && (
                                    <tr className="bg-gray-50 border-t-2 border-dashed border-gray-200">
                                        <td className="p-1 text-center">
                                            <button
                                                onClick={() => agregarVehiculoAViaje(viaje.id)}
                                                className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                                title="Agregar vehículo"
                                            >
                                                <FaPlus size={10}/>
                                            </button>
                                        </td>
                                        <td colSpan="12" className="p-2 text-[10px] text-gray-400 italic">
                                            Agregar vehículo
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TablaViajes;