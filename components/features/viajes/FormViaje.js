import React, {useState, useEffect, useRef, useMemo} from "react";
import ReactToPrint from "react-to-print";
import {firestore} from "../../../firebase/firebaseIni";
import { useAdminData } from "../../../context/adminData";
import {
    FaTrash, FaCheckCircle, FaExclamationCircle,
    FaPrint, FaCar, FaCheckDouble, FaTimes, FaLink,
    FaStickyNote, FaRegStickyNote, FaKey
} from "react-icons/fa";
import HojaVerificacion from "./HojaVerificacion";

const FormViaje = ({user, onViajeCreado}) => {
    // --- DATOS DEL CONTEXTO COMPARTIDO ---
    const { choferes: choferesRaw, clientes: clientesRaw } = useAdminData();

    // Verificar si es Admin Master
    const isAdminMaster = user?.adminMaster === true;

    // --- ESTADOS DE CONTROL ---
    const [viajeIniciado, setViajeIniciado] = useState(false);
    const [provincias, setProvincias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [alertMessage, setAlertMessage] = useState({msg: '', tipo: ''});

    // --- ESTADOS PARA MODAL DE ÉXITO E IMPRESIÓN ---
    const [mostrarModalExito, setMostrarModalExito] = useState(false);
    const [viajeReciente, setViajeReciente] = useState(null);

    // --- REFERENCIAS (Para la impresión automática) ---
    const componenteRef = useRef();
    const btnPrintRef = useRef();

    const [busquedaChofer, setBusquedaChofer] = useState("");
    const [mostrarLista, setMostrarLista] = useState(false);

    // Estado para modal de comentario
    const [modalComentario, setModalComentario] = useState({ visible: false, vehiculoId: null, texto: "" });

    // Estado para dropdown de cliente en cada fila
    const [clienteDropdownId, setClienteDropdownId] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [clienteDropdownIdx, setClienteDropdownIdx] = useState(0);

    // Estados para token de chofer temporal
    const [mostrarModalToken, setMostrarModalToken] = useState(false);
    const [tokenInput, setTokenInput] = useState("");
    const [validandoToken, setValidandoToken] = useState(false);
    const [tokenValido, setTokenValido] = useState(false);
    const [choferManual, setChoferManual] = useState("");
    const [tokenUsado, setTokenUsado] = useState(null);

    const [encabezado, setEncabezado] = useState({
        numViaje: "",
        choferId: "",
        choferManual: "", // Para chofer ingresado con token
        fecha: new Date().toLocaleDateString()
    });

    const [vehiculos, setVehiculos] = useState([]);

// --- FILTRADO DE CHOFERES DESDE CONTEXTO ---
    const choferes = useMemo(() => {
        if (!user || !choferesRaw.length) return [];

        if (!user.admin) {
            // Si no es admin: Ve sus choferes (empresaId) O choferes donde es líder (empresaLiderId)
            return choferesRaw
                .filter(c => c.empresaId === user.id || c.empresaLiderId === user.id)
                .map(c => ({
                    id: c.id,
                    nombre: c.nombreChofer,
                    telefono: c.telefonoChofer || "",
                    empresa: c.empresaNombre,
                    empresaLiderId: c.empresaLiderId || "",
                    empresaLiderNombre: c.empresaLiderNombre || "",
                    esSubcontratado: c.empresaLiderId === user.id && c.empresaId !== user.id
                }));
        } else {
            // Si es admin: Ve todos
            return choferesRaw.map(c => ({
                id: c.id,
                nombre: c.nombreChofer,
                telefono: c.telefonoChofer || "",
                empresa: c.empresaNombre,
                empresaLiderId: c.empresaLiderId || "",
                empresaLiderNombre: c.empresaLiderNombre || "",
                esSubcontratado: false
            }));
        }
    }, [choferesRaw, user]);

    // --- CARGA DE PROVINCIAS ---
    useEffect(() => {
        if (!user) return;

        const unsubProvincias = firestore().collection("province").orderBy("state", "asc")
            .onSnapshot(snap => {
                setProvincias(snap.docs.map(doc => ({
                    id: doc.id,
                    state: doc.data().state,
                    regions: doc.data().regions || []
                })));
                setLoading(false);
            });

        return () => unsubProvincias();
    }, [user]);

    // --- FUNCIÓN PARA INICIAR VIAJE (número se asigna al pagar) ---
    const iniciarViajeConFolio = async () => {
        setLoading(true);
        try {
            setViajeIniciado(true);
        } catch (e) {
            setAlertMessage({msg: "Error al iniciar viaje", tipo: 'error'});
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCIÓN PARA VALIDAR TOKEN ---
    const validarToken = async () => {
        if (!tokenInput || tokenInput.trim() === "") return;

        setValidandoToken(true);
        try {
            const tokenDoc = await firestore().collection("tokensChofer").doc(tokenInput.toUpperCase()).get();

            if (!tokenDoc.exists) {
                setAlertMessage({ msg: "Token inválido", tipo: 'error' });
                setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 3000);
                setValidandoToken(false);
                return;
            }

            const tokenData = tokenDoc.data();
            const ahora = new Date();
            const expira = tokenData.fechaExpiracion?.toDate?.() || new Date(tokenData.fechaExpiracion);

            if (expira < ahora) {
                setAlertMessage({ msg: "Token expirado", tipo: 'error' });
                setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 3000);
                setValidandoToken(false);
                return;
            }

            // Token válido
            setTokenValido(true);
            setTokenUsado(tokenInput.toUpperCase());
            setMostrarModalToken(false);
            setAlertMessage({ msg: "Token válido. Ahora ingresa el nombre del chofer.", tipo: 'success' });
            setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 3000);
        } catch (e) {
            setAlertMessage({ msg: "Error al validar token", tipo: 'error' });
        } finally {
            setValidandoToken(false);
        }
    };

    // Confirmar chofer manual con token
    const confirmarChoferManual = () => {
        if (!choferManual || choferManual.trim() === "") {
            setAlertMessage({ msg: "Ingresa el nombre del chofer", tipo: 'error' });
            setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 3000);
            return;
        }

        setEncabezado(prev => ({
            ...prev,
            choferId: "TEMPORAL_" + tokenUsado,
            choferManual: choferManual.trim().toUpperCase()
        }));
        setBusquedaChofer(choferManual.trim().toUpperCase() + " (TEMPORAL)");
        setMostrarLista(false);
    };

    // Cancelar modo token
    const cancelarModoToken = () => {
        setTokenValido(false);
        setTokenUsado(null);
        setChoferManual("");
        setTokenInput("");
        setEncabezado(prev => ({ ...prev, choferId: "", choferManual: "" }));
        setBusquedaChofer("");
    };

    // --- LÓGICA DE LA TABLA ---
    const agregarFila = () => {
        if (vehiculos.length >= 13) return;
        setVehiculos([...vehiculos, {
            id: Date.now(),
            lote: "", marca: "", modelo: "", clienteAlt: "",
            clienteId: "",         // ID del cliente seleccionado
            clienteConfirmado: false, // Si el cliente fue seleccionado de la lista
            almacen: "Copart",
            estado: "", ciudad: "",
            flete: "0",        // Se usará para el COST (chofer) - Editable
            precioVenta: 0,    // Se usará para el PRICE (cliente) - OCULTO
            storage: "0", sPeso: "0", gExtra: "0", titulo: "NO",
            comentarioRegistro: "",
            yaPagado: false    // Indica si el lote ya existe en vehiculos (pagado)
        }]);
    };

    const handleTableChange = (id, field, value) => {
        const nuevosVehiculos = vehiculos.map(v => {
            if (v.id === id) {
                let valorFinal = value;
                if (['storage', 'sPeso', 'gExtra', 'flete'].includes(field)) {
                    valorFinal = value === "" ? "0" : parseFloat(value).toString();
                }

                let actualizacion = {...v, [field]: valorFinal};

                if (field === 'estado') {
                    const estadoData = provincias.find(p => p.state === value);
                    if (estadoData && estadoData.regions?.length > 0) {
                        actualizacion.ciudad = estadoData.regions[0].city;
                        // LOGICA DE COSTO VS PRECIO
                        actualizacion.flete = (estadoData.regions[0].cost || 0).toString();
                        actualizacion.precioVenta = parseFloat(estadoData.regions[0].price || 0);
                    } else {
                        actualizacion.ciudad = "";
                        actualizacion.flete = "0";
                        actualizacion.precioVenta = 0;
                    }
                }

                if (field === 'ciudad') {
                    const estadoData = provincias.find(p => p.state === v.estado);
                    const regionData = estadoData?.regions?.find(r => r.city === value);
                    if (regionData) {
                        // LOGICA DE COSTO VS PRECIO
                        actualizacion.flete = (regionData.cost || 0).toString();
                        actualizacion.precioVenta = parseFloat(regionData.price || 0);
                    } else {
                        actualizacion.flete = "0";
                        actualizacion.precioVenta = 0;
                    }
                }
                return actualizacion;
            }
            return v;
        });
        setVehiculos(nuevosVehiculos);
    };

    const validarLoteUnico = async (id, loteValue) => {
        if (!loteValue?.trim()) return;
        const loteLimpio = loteValue.toUpperCase().trim();
        try {
            const [docV, docT] = await Promise.all([
                firestore().collection("vehiculos").doc(loteLimpio).get(),
                firestore().collection("lotesEnTransito").doc(loteLimpio).get()
            ]);

            if (docV.exists) {
                // Lote YA PAGADO - Permitir pero marcar como advertencia
                // Solo mostrar alerta visual si es admin
                if (user.admin) {
                    setAlertMessage({msg: `⚠️ ADVERTENCIA: Lote ${loteLimpio} ya está pagado. Se registrará para actualizar precios.`, tipo: 'warning'});
                    setTimeout(() => setAlertMessage({msg: '', tipo: ''}), 5000);
                }
                setVehiculos(vehiculos.map(v => v.id === id ? {...v, yaPagado: true} : v));
            } else if (docT.exists) {
                // Validar si el viaje asignado realmente sigue existiendo; si no, es huérfano
                const viajeAsignadoId = docT.data()?.viajeAsignado;
                let huerfano = false;
                if (!viajeAsignadoId) {
                    huerfano = true;
                } else {
                    const viajeDoc = await firestore().collection("viajesPendientes").doc(viajeAsignadoId).get();
                    if (!viajeDoc.exists) huerfano = true;
                }

                if (huerfano) {
                    await firestore().collection("lotesEnTransito").doc(loteLimpio).delete();
                    setVehiculos(vehiculos.map(v => v.id === id ? {...v, yaPagado: false} : v));
                } else {
                    // Lote en tránsito - No permitir
                    setAlertMessage({msg: `Lote ${loteLimpio} ya está en tránsito`, tipo: 'error'});
                    setVehiculos(vehiculos.map(v => v.id === id ? {...v, lote: ""} : v));
                    setTimeout(() => setAlertMessage({msg: '', tipo: ''}), 5000);
                }
            } else {
                // Lote nuevo - Limpiar marca de pagado si existía
                setVehiculos(vehiculos.map(v => v.id === id ? {...v, yaPagado: false} : v));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const esValido = vehiculos.length > 0 && vehiculos.every(v =>
        v.lote.trim().length === 8 && v.marca.trim() !== "" && v.clienteAlt.trim() !== "" && parseFloat(v.flete) > 0
    );

    const getClientesFiltrados = (vehiculoId) => {
        const vehiculoActual = vehiculos.find(v => v.id === vehiculoId);
        const busqueda = vehiculoActual?.clienteAlt || '';
        return clientesRaw.filter(c =>
            c.cliente?.toLowerCase().includes(busqueda.toLowerCase())
        ).slice(0, 10);
    };

    const seleccionarCliente = (vehiculoId, c) => {
        setVehiculos(prev => prev.map(veh =>
            veh.id === vehiculoId
                ? {
                    ...veh,
                    clienteAlt: c.cliente,
                    clienteId: c.id,
                    clienteNombre: c.cliente,
                    clienteTelefono: c.telefonoCliente || "",
                    clienteConfirmado: true
                }
                : veh
        ));
        setClienteDropdownId(null);
        setClienteDropdownIdx(0);
    };

    // --- ACCIÓN FINALIZAR CON TRANSACCIÓN ---
    const finalizarViaje = async () => {
        if (!esValido) return;
        setGuardando(true);
        try {
            // Generar un ID temporal para el documento (el número real se asigna al pagar)
            const docId = `TEMP_${Date.now()}`;

            const tFlete = vehiculos.reduce((acc, v) => acc + parseFloat(v.flete || 0), 0);

            // Verificar si es chofer temporal (con token)
            const esChoferTemporal = encabezado.choferId?.startsWith("TEMPORAL_");
            let choferData;

            if (esChoferTemporal) {
                choferData = {
                    id: encabezado.choferId,
                    nombre: encabezado.choferManual,
                    empresa: "PENDIENTE DE ASIGNAR",
                    telefono: "",
                    esTemporal: true,
                    tokenUsado: tokenUsado
                };
            } else {
                choferData = choferes.find(c => c.id === encabezado.choferId);
            }

            const viajeData = {
                numViaje: "",
                chofer: choferData,
                choferTemporal: esChoferTemporal,
                empresaId: user.id,
                empresaLiderId: esChoferTemporal ? "" : (choferData?.empresaLiderId || ""),
                estatus: "PENDIENTE",
                fechaCreacion: new Date(),
                creadoPor: {
                    id: user?.id || "N/A",
                    nombre: user?.nombre || "Admin",
                    tipo: user?.tipo || "desconocido"
                },
                resumenFinanciero: {
                    totalFletes: tFlete,
                    totalSoloGastos: vehiculos.reduce((acc, v) => acc + (parseFloat(v.storage) + parseFloat(v.sPeso) + parseFloat(v.gExtra)), 0),
                    totalVehiculos: vehiculos.length
                },
                vehiculos: vehiculos.map((v, index) => ({...v, order: index + 1}))
            };

            const batch = firestore().batch();

            batch.set(firestore().collection("viajesPendientes").doc(docId), viajeData);

            vehiculos.forEach(v => {
                batch.set(firestore().collection("lotesEnTransito").doc(v.lote), {
                    viajeAsignado: docId,
                    choferNombre: choferData?.nombre || encabezado.choferManual,
                    fechaBloqueo: new Date()
                });
            });

            await batch.commit();
            setViajeReciente(viajeData);

            // Si hay callback de redirección (modo administrativo), redirigir automáticamente
            if (onViajeCreado) {
                setAlertMessage({msg: `Viaje creado exitosamente. Redirigiendo...`, tipo: 'success'});
                setGuardando(false);

                // Limpiar estados y redirigir después de un breve momento
                setTimeout(() => {
                    setVehiculos([]);
                    setEncabezado({numViaje: "", choferId: "", choferManual: "", fecha: new Date().toLocaleDateString()});
                    setViajeIniciado(false);
                    setBusquedaChofer("");
                    setTokenValido(false);
                    setTokenUsado(null);
                    setChoferManual("");
                    setTokenInput("");
                    setAlertMessage({msg: '', tipo: ''});
                    onViajeCreado();
                }, 1500);
            } else {
                // Modo normal (carriers): mostrar modal de éxito
                setMostrarModalExito(true);
                setGuardando(false);
            }

        } catch (e) {
            setAlertMessage({msg: "Error al guardar viaje: " + e.message, tipo: 'error'});
            setGuardando(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 font-sans text-black">

            <div style={{display: "none"}}>
                <HojaVerificacion ref={componenteRef} viajeData={viajeReciente}/>
            </div>

            {/* MODAL DE ÉXITO */}
            {mostrarModalExito && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div
                        className="bg-white rounded-xl max-w-md w-full shadow-2xl border-2 border-t-8 border-blue-600 p-8 text-center animate-in zoom-in">
                        <div className="text-blue-600 text-6xl flex justify-center mb-4"><FaCheckCircle/></div>
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">Viaje
                            Registrado</h4>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mt-2">
                            El número de viaje se asignará al momento del pago</p>

                        <div className="my-6 p-4 bg-blue-50 rounded-lg border border-dashed border-blue-200">
                            <p className="text-lg font-black text-gray-800 uppercase leading-none">{viajeReciente?.chofer?.nombre}</p>
                            <p className="text-[10px] font-black text-gray-400 mt-2 uppercase">{viajeReciente?.vehiculos?.length} UNIDADES
                                EN TRÁNSITO</p>
                        </div>

                        <ReactToPrint
                            trigger={() => (
                                <button ref={btnPrintRef}
                                        className="btn btn-info text-white w-full h-14 uppercase font-black tracking-widest gap-2">
                                    <FaPrint/> Imprimir PDF
                                </button>
                            )}
                            content={() => componenteRef.current}
                        />

                        <button onClick={() => {
                            setVehiculos([]);
                            setEncabezado({numViaje: "", choferId: "", choferManual: "", fecha: new Date().toLocaleDateString()});
                            setViajeIniciado(false);
                            setMostrarModalExito(false);
                            setBusquedaChofer("");
                            // Resetear estados del token
                            setTokenValido(false);
                            setTokenUsado(null);
                            setChoferManual("");
                            setTokenInput("");
                        }} className="btn btn-success text-white w-full mt-4 h-14 gap-3 font-black uppercase shadow-lg">
                            <FaCheckDouble/> Registrar Nuevo Viaje
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL DE COMENTARIO */}
            {modalComentario.visible && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border-2 border-t-4 border-orange-500 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <FaStickyNote className="text-orange-600" size={18}/>
                            </div>
                            <div>
                                <h4 className="text-lg font-black uppercase text-gray-800">Nota del Vehículo</h4>
                                <p className="text-[10px] text-gray-400 uppercase">Comentario opcional para este lote</p>
                            </div>
                        </div>
                        <textarea
                            autoFocus
                            value={modalComentario.texto}
                            onChange={(e) => setModalComentario({...modalComentario, texto: e.target.value.toUpperCase()})}
                            placeholder="Escribe una nota..."
                            className="textarea textarea-bordered w-full h-32 text-[14px] font-medium uppercase"
                            style={{fontSize: '16px'}}
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setModalComentario({ visible: false, vehiculoId: null, texto: "" })}
                                className="btn btn-ghost flex-1 font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    handleTableChange(modalComentario.vehiculoId, 'comentarioRegistro', modalComentario.texto);
                                    setModalComentario({ visible: false, vehiculoId: null, texto: "" });
                                }}
                                className="btn btn-warning text-white flex-1 font-bold gap-2"
                            >
                                <FaCheckCircle/> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE TOKEN */}
            {mostrarModalToken && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border-2 border-t-4 border-blue-600 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FaKey className="text-blue-600" size={18}/>
                            </div>
                            <div>
                                <h4 className="text-lg font-black uppercase text-gray-800">Token de Acceso</h4>
                                <p className="text-[10px] text-gray-400 uppercase">Ingresa el token proporcionado</p>
                            </div>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                            placeholder="Ej: ABC123"
                            className="input input-bordered w-full text-center text-2xl font-black tracking-widest uppercase"
                            maxLength={6}
                            style={{fontSize: '24px'}}
                            onKeyPress={(e) => e.key === 'Enter' && validarToken()}
                        />
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                            Solicita el token al administrador
                        </p>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setMostrarModalToken(false);
                                    setTokenInput("");
                                }}
                                className="btn btn-ghost flex-1 font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={validarToken}
                                disabled={validandoToken || tokenInput.length < 6}
                                className="btn btn-info text-white flex-1 font-bold gap-2"
                            >
                                {validandoToken ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                    <><FaCheckCircle/> Validar</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DROPDOWN DE CLIENTES - Solo para admins, renderizado fuera del overflow */}
            {user?.admin && clienteDropdownId && (
                <>
                    <div
                        className="fixed inset-0 z-[90]"
                        onClick={() => setClienteDropdownId(null)}
                    />
                    <div
                        className="fixed z-[100] w-64 bg-white border-2 shadow-2xl rounded-lg max-h-52 overflow-y-auto border-blue-400"
                        style={{ top: dropdownPos.top, left: dropdownPos.left }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {(() => {
                            const filtrados = getClientesFiltrados(clienteDropdownId);

                            return (
                                <>
                                    {filtrados.map((c, idx) => (
                                        <div
                                            key={c.id}
                                            className={`p-3 cursor-pointer text-[12px] font-black uppercase border-b last:border-none transition-colors ${
                                                idx === clienteDropdownIdx ? 'bg-blue-600 text-white' : 'hover:bg-blue-100'
                                            }`}
                                            onMouseEnter={() => setClienteDropdownIdx(idx)}
                                            onClick={() => seleccionarCliente(clienteDropdownId, c)}
                                        >
                                            <span>{c.cliente}</span>
                                            {c.apodoCliente && (
                                                <span className="text-[9px] opacity-70 block">{c.apodoCliente}</span>
                                            )}
                                        </div>
                                    ))}
                                    {filtrados.length === 0 && (
                                        <div className="p-3 text-gray-400 text-[11px] italic font-bold text-center">
                                            No se encontró cliente...
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </>
            )}

            {alertMessage.msg && (
                <div
                    className={`alert ${
                        alertMessage.tipo === 'success' ? 'alert-success' :
                        alertMessage.tipo === 'warning' ? 'alert-warning' :
                        'alert-error'
                    } mb-4 font-bold text-[12px] ${alertMessage.tipo === 'warning' ? 'text-gray-800' : 'text-white'}`}>
                    <FaExclamationCircle/> <span>{alertMessage.msg}</span>
                </div>
            )}

            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 border-b pb-4">Registra un Nuevo
                Viaje</h2>

            <div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 items-end">
                <div>
                    <label className="block text-[10px] md:text-[10px] font-black text-gray-400 uppercase mb-1 italic">
                        Núm. Viaje
                    </label>
                    <input
                        type="text"
                        disabled={true}
                        className="input input-bordered input-md md:input-sm w-full text-black font-bold uppercase text-center text-[16px] md:text-[14px] bg-gray-100"
                        value=""
                        placeholder="Se asigna al pagar"
                        style={{fontSize: '16px'}}
                    />
                </div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] md:text-[10px] font-black text-gray-600 uppercase italic">Chofer *</label>
                        {/* Botón de Token */}
                        {!viajeIniciado && !tokenValido && (
                            <button
                                onClick={() => setMostrarModalToken(true)}
                                className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase"
                                title="¿Chofer no está en la lista? Usa un token"
                            >
                                <FaKey size={10} /> Token
                            </button>
                        )}
                        {tokenValido && (
                            <button
                                onClick={cancelarModoToken}
                                className="text-[9px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 uppercase"
                            >
                                <FaTimes size={10} /> Cancelar Token
                            </button>
                        )}
                    </div>

                    {/* INPUT DE BÚSQUEDA O CHOFER MANUAL */}
                    {tokenValido ? (
                        // Modo Token: Input para chofer manual
                        <div className="flex gap-2">
                            <input
                                type="text"
                                disabled={viajeIniciado || encabezado.choferId}
                                placeholder="Nombre del chofer..."
                                className="input input-bordered input-md md:input-sm flex-1 bg-blue-50 text-black font-bold uppercase text-[16px] md:text-[14px] border-blue-300"
                                value={choferManual}
                                onChange={(e) => setChoferManual(e.target.value.toUpperCase())}
                                style={{fontSize: '16px'}}
                            />
                            {!encabezado.choferId && (
                                <button
                                    onClick={confirmarChoferManual}
                                    className="btn btn-sm btn-info text-white font-black"
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    ) : (
                        // Modo normal: Búsqueda de chofer
                        <div className="relative">
                            <input
                                type="text"
                                disabled={viajeIniciado}
                                placeholder={loading ? "Cargando..." : "Escribe para buscar chofer..."}
                                className="input input-bordered input-md md:input-sm w-full bg-white text-black font-bold uppercase pr-8 text-[16px] md:text-[14px]"
                                value={busquedaChofer}
                                onFocus={() => setMostrarLista(true)}
                                onChange={(e) => {
                                    setBusquedaChofer(e.target.value);
                                    setMostrarLista(true);
                                }}
                                style={{fontSize: '16px'}}
                            />
                            {busquedaChofer && !viajeIniciado && (
                                <button
                                    className="absolute right-2 top-2 text-gray-400"
                                    onClick={() => {
                                        setBusquedaChofer("");
                                        setEncabezado({...encabezado, choferId: ""});
                                    }}
                                >
                                    <FaTimes size={12}/>
                                </button>
                            )}

                            {/* LISTA DESPLEGABLE FILTRADA */}
                            {mostrarLista && !viajeIniciado && (
                                <div className="absolute z-[100] w-full bg-white border shadow-2xl rounded-md max-h-60 overflow-y-auto mt-1 border-red-200">
                                    {choferes
                                        .filter(c => c.nombre.toLowerCase().includes(busquedaChofer.toLowerCase()))
                                        .map(c => (
                                            <div
                                                key={c.id}
                                                className="p-3 hover:bg-red-600 hover:text-white cursor-pointer text-[11px] font-black uppercase border-b last:border-none flex justify-between items-center"
                                                onClick={() => {
                                                    setEncabezado({...encabezado, choferId: c.id});
                                                    setBusquedaChofer(c.nombre);
                                                    setMostrarLista(false);
                                                }}
                                            >
                                                <span>{c.nombre}</span>
                                                <span className="text-[9px] opacity-70">
                                                    {c.esSubcontratado ? "Subcontratado" : c.empresa}
                                                </span>
                                            </div>
                                        ))
                                    }
                                    {choferes.filter(c => c.nombre.toLowerCase().includes(busquedaChofer.toLowerCase())).length === 0 && (
                                        <div className="p-3 text-gray-400 text-[10px] italic font-bold">
                                            No se encontró al chofer...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                <div
                    className="text-center font-mono font-bold text-gray-500 uppercase text-xs">{encabezado.fecha}</div>

                <button onClick={viajeIniciado ? () => {
                    setViajeIniciado(false);
                    setBusquedaChofer("");
                } : iniciarViajeConFolio}
                        disabled={!encabezado.choferId}
                        className={`btn btn-sm w-full font-black ${viajeIniciado ? 'btn-outline' : 'btn-error text-white'}`}>
                    {viajeIniciado ? "Modificar Chofer" : "Iniciar Registro"}
                </button>
            </div>

            <div
                className={`transition-all duration-500 ${viajeIniciado ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-4">
                    <span
                        className="text-[11px] font-black uppercase text-gray-400 italic">Unidades: {vehiculos.length} / 13</span>
                    <button onClick={agregarFila} disabled={vehiculos.length >= 13}
                            className="btn btn-sm btn-info text-white font-black px-8">+ Agregar
                    </button>
                </div>

                <div className="overflow-x-auto border rounded-xl shadow-inner max-h-[600px] md:max-h-[400px] -webkit-overflow-scrolling-touch">
                    <table className="table table-compact w-full">
                        <thead>
                        <tr className="text-[11px] md:text-[10px] uppercase bg-gray-100 text-gray-500 sticky top-0 z-20">
                            <th className="p-2">#</th>
                            <th className="p-2 min-w-[110px]">Lote *</th>
                            <th className="p-2 min-w-[100px]">Marca *</th>
                            <th className="p-2 min-w-[100px]">Modelo *</th>
                            <th className="p-2 min-w-[130px]">Cliente *</th>
                            <th className="p-2 min-w-[100px]">Almacén</th>
                            <th className="p-2 min-w-[90px]">Estado *</th>
                            <th className="p-2 min-w-[110px]">Ciudad *</th>
                            <th className="p-2 min-w-[80px] text-blue-800">Flete</th>
                            <th className="p-2 min-w-[70px]">Storage</th>
                            <th className="p-2 min-w-[70px]">S. Peso</th>
                            <th className="p-2 min-w-[70px]">G. Extra</th>
                            <th className="p-2 min-w-[70px]">Título</th>
                            <th className="p-2 min-w-[40px] text-orange-600">Nota</th>
                            <th className="p-2"></th>
                        </tr>
                        </thead>
                        <tbody className="bg-white">
                        {vehiculos.map((v, i) => (
                            <tr key={v.id} className={`${user.admin && v.yaPagado ? 'bg-yellow-100 border-l-4 border-yellow-500' : 'bg-gray-200'}`}>
                                <td className="font-mono text-[12px] md:text-[10px] text-gray-400 italic p-2">{i + 1}</td>
                                <td className="p-1">
                                    <input
                                        type="text"
                                        value={v.lote}
                                        maxLength={8}
                                        onBlur={(e) => validarLoteUnico(v.id, e.target.value)}
                                        onChange={(e) => handleTableChange(v.id, 'lote', e.target.value)}
                                        className={`input input-sm md:input-xs w-full font-black text-[14px] md:text-[12px] ${
                                            user.admin && v.yaPagado ? 'text-yellow-700 bg-yellow-50' :
                                            v.lote.length === 8 ? 'text-blue-700' : 'text-red-600'
                                        }`}
                                        placeholder="8 dígitos"
                                        style={{fontSize: '16px'}}
                                    />
                                    {user.admin && v.yaPagado && (
                                        <span className="text-[8px] font-black text-yellow-700 uppercase italic block mt-1">YA PAGADO</span>
                                    )}
                                </td>
                                <td className="p-1"><input type="text" value={v.marca}
                                           onChange={(e) => handleTableChange(v.id, 'marca', e.target.value.toUpperCase())}
                                           className="input input-sm md:input-xs w-full bg-white uppercase font-bold text-[14px] md:text-[12px]"
                                           style={{fontSize: '16px'}}/></td>
                                <td className="p-1"><input type="text" value={v.modelo}
                                           onChange={(e) => handleTableChange(v.id, 'modelo', e.target.value.toUpperCase())}
                                           className="input input-sm md:input-xs w-full bg-white uppercase font-bold text-[14px] md:text-[12px]"
                                           style={{fontSize: '16px'}}/></td>
                                <td className="p-1">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={v.clienteAlt}
                                            onChange={(e) => {
                                                const nuevoValor = e.target.value.toUpperCase();
                                                setVehiculos(vehiculos.map(veh =>
                                                    veh.id === v.id
                                                        ? { ...veh, clienteAlt: nuevoValor, clienteConfirmado: false, clienteId: '', clienteNombre: '' }
                                                        : veh
                                                ));
                                                setClienteDropdownIdx(0);
                                            }}
                                            onFocus={(e) => {
                                                if (user?.admin) {
                                                    const rect = e.target.getBoundingClientRect();
                                                    setDropdownPos({ top: rect.bottom + 2, left: rect.left });
                                                    setClienteDropdownId(v.id);
                                                    setClienteDropdownIdx(0);
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setClienteDropdownId(prev => prev === v.id ? null : prev);
                                                }, 150);
                                            }}
                                            onKeyDown={(e) => {
                                                if (!user?.admin || clienteDropdownId !== v.id) return;
                                                const lista = getClientesFiltrados(v.id);
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setClienteDropdownIdx(i => Math.min(i + 1, Math.max(lista.length - 1, 0)));
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setClienteDropdownIdx(i => Math.max(i - 1, 0));
                                                } else if (e.key === 'Enter') {
                                                    if (lista[clienteDropdownIdx]) {
                                                        e.preventDefault();
                                                        seleccionarCliente(v.id, lista[clienteDropdownIdx]);
                                                    }
                                                } else if (e.key === 'Tab') {
                                                    if (lista[clienteDropdownIdx] && !v.clienteConfirmado) {
                                                        seleccionarCliente(v.id, lista[clienteDropdownIdx]);
                                                    } else {
                                                        setClienteDropdownId(null);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setClienteDropdownId(null);
                                                }
                                            }}
                                            className={`input input-sm md:input-xs w-full uppercase font-bold text-[14px] md:text-[12px] ${
                                                v.clienteConfirmado
                                                    ? 'bg-green-50 border-green-400 text-green-800'
                                                    : 'bg-white'
                                            }`}
                                            placeholder={user?.admin ? "Buscar cliente..." : "Cliente..."}
                                            style={{fontSize: '16px'}}
                                        />
                                        {v.clienteConfirmado && (
                                            <span className="absolute -top-2 -right-1 text-[8px] font-black text-green-700 bg-white px-1 rounded pointer-events-none">✓</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-1">
                                    <select value={v.almacen}
                                            onChange={(e) => handleTableChange(v.id, 'almacen', e.target.value)}
                                            className="select select-sm md:select-xs w-full font-bold text-[14px] md:text-[12px]"
                                            style={{fontSize: '16px'}}>
                                        <option value="Copart">Copart</option>
                                        <option value="IAA">IAA</option>
                                        <option value="Manheim">Manheim</option>
                                        <option value="Adesa">Adesa</option>
                                        <option value="Otra">Otra</option>
                                    </select>
                                </td>
                                <td className="p-1">
                                    <select value={v.estado}
                                            onChange={(e) => handleTableChange(v.id, 'estado', e.target.value)}
                                            className="select select-sm md:select-xs w-full text-red-800 font-bold text-[14px] md:text-[12px]"
                                            style={{fontSize: '16px'}}>
                                        <option value="">-- ST --</option>
                                        {provincias.map(p => <option key={p.id} value={p.state}>{p.state}</option>)}
                                    </select>
                                </td>
                                <td className="p-1">
                                    <select value={v.ciudad}
                                            onChange={(e) => handleTableChange(v.id, 'ciudad', e.target.value)}
                                            className="select select-sm md:select-xs w-full text-red-800 font-bold text-[14px] md:text-[12px]"
                                            style={{fontSize: '16px'}}>
                                        {provincias.find(p => p.state === v.estado)?.regions.map((r, idx) => (
                                            <option key={idx} value={r.city}>{r.city}</option>))}
                                    </select>
                                </td>
                                <td className="p-1">
                                    <input
                                        type="number"
                                        value={v.flete}
                                        onChange={(e) => handleTableChange(v.id, 'flete', e.target.value)}
                                        className="input input-sm md:input-xs w-24 md:w-20 text-center font-black text-blue-900 bg-blue-50 text-[14px] md:text-[12px]"
                                        placeholder="0"
                                        style={{fontSize: '16px'}}
                                    />
                                </td>
                                <td className="p-1">
                                    <input type="number" value={v.storage}
                                           onChange={(e) => handleTableChange(v.id, 'storage', e.target.value)}
                                           className="input input-sm md:input-xs w-20 md:w-16 text-center text-[14px] md:text-[12px]"
                                           style={{fontSize: '16px'}}/>
                                </td>
                                <td className="p-1">
                                    <input type="number" value={v.sPeso}
                                           onChange={(e) => handleTableChange(v.id, 'sPeso', e.target.value)}
                                           className="input input-sm md:input-xs w-20 md:w-16 text-center text-[14px] md:text-[12px]"
                                           style={{fontSize: '16px'}}/>
                                </td>
                                <td className="p-1">
                                    <input type="number" value={v.gExtra}
                                           onChange={(e) => handleTableChange(v.id, 'gExtra', e.target.value)}
                                           className="input input-sm md:input-xs w-20 md:w-16 text-center text-[14px] md:text-[12px]"
                                           style={{fontSize: '16px'}}/>
                                </td>
                                <td className="p-1">
                                    <select value={v.titulo}
                                            onChange={(e) => handleTableChange(v.id, 'titulo', e.target.value)}
                                            className="select select-sm md:select-xs w-full font-bold text-[14px] md:text-[12px]"
                                            style={{fontSize: '16px'}}>
                                        <option value="NO">NO</option>
                                        <option value="SI">SI</option>
                                    </select>
                                </td>
                                <td className="p-1 text-center">
                                    <button
                                        onClick={() => setModalComentario({ visible: true, vehiculoId: v.id, texto: v.comentarioRegistro })}
                                        className={`p-2 rounded-lg transition-colors ${v.comentarioRegistro ? 'text-orange-600 bg-orange-100' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                                        title={v.comentarioRegistro || "Agregar nota"}
                                    >
                                        {v.comentarioRegistro ? <FaStickyNote size={16}/> : <FaRegStickyNote size={16}/>}
                                    </button>
                                </td>
                                <td>
                                    <button onClick={() => setVehiculos(vehiculos.filter(veh => veh.id !== v.id))}
                                            className="text-red-400"><FaTrash size={12}/></button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={finalizarViaje} disabled={!esValido || guardando}
                        className="btn btn-error text-white font-black px-16 gap-3 shadow-xl">
                    {guardando ? <span className="loading loading-spinner"></span> : <FaCheckCircle/>} FINALIZAR VIAJE
                </button>
            </div>
        </div>
    );
};

export default FormViaje;