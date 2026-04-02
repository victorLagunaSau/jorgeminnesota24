import React, {useState, useEffect, useRef} from "react";
import {firestore} from "../../firebase/firebaseIni";
import firebase from "firebase/app";
import {FaFilter, FaPrint, FaCheckCircle, FaTimes, FaCommentDots, FaRegCommentDots, FaTrash} from "react-icons/fa";
import ReactToPrint from "react-to-print";
import HojaVerificacion from "./HojaVerificacion";
import ModalLiquidacion from "./ModalLiquidacion";

const TablaViajes = ({user}) => {
    const [viajes, setViajes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroGeneral, setFiltroGeneral] = useState("");
    const [busquedaCliente, setBusquedaCliente] = useState({});

    const componentRef = useRef();
    const [viajeAImprimir, setViajeAImprimir] = useState(null);
    const [viajeALiquidar, setViajeALiquidar] = useState(null);
    const [modal, setModal] = useState({show: false, mensaje: "", accion: null, tipo: ""});

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

        return () => {
            unsubViajes();
            unsubClientes();
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

    const cambiarEstatus = async (viajeId, nuevoEstatus) => {
        const viaje = viajes.find(v => v.id === viajeId);
        try {
            const updateData = {estatus: nuevoEstatus, vehiculos: viaje.vehiculos};
            if (nuevoEstatus === "VERIFICADO") {
                const registro = {
                    usuario: user?.nombre || "Admin",
                    fecha: new Date(),
                    cambioVehiculos: viaje.vehiculos.map(v => ({
                        lote: v.lote, flete: v.flete, clienteConfirmado: v.clienteNombre || "Sin asignar"
                    }))
                };
                updateData.historialEdiciones = firebase.firestore.FieldValue.arrayUnion(registro);
                updateData.verificado = true;
            }
            await firestore().collection("viajesPendientes").doc(viajeId).update(updateData);
            setModal({show: false});
        } catch (error) {
            setModal({show: true, mensaje: "Error al actualizar estatus", tipo: "error"});
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
    return (
        <div className="bg-gray-100 min-h-screen font-sans text-black">
            <div style={{display: "none"}}>
                <HojaVerificacion ref={componentRef} viajeData={viajeAImprimir}/>
            </div>

            {viajeALiquidar &&
                <ModalLiquidacion viaje={viajeALiquidar} user={user} onClose={() => setViajeALiquidar(null)}/>}

            {/* MODAL DE CONFIRMACIÓN GENERAL */}
            {modal.show && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`bg-white rounded-xl p-8 max-w-sm w-full border-t-8 shadow-2xl ${modal.tipo === 'eliminar' ? 'border-red-700' : 'border-red-600'}`}>
                        <h3 className={`text-xl font-black uppercase italic tracking-tighter ${modal.tipo === 'eliminar' ? 'text-red-700 flex items-center gap-2' : ''}`}>
                            {modal.tipo === 'eliminar' && <FaTrash />}
                            Confirmar {modal.tipo === 'eliminar' ? 'Eliminación' : 'Acción'}
                        </h3>
                        <p className="text-sm mt-3 font-bold text-gray-600 leading-tight italic">{modal.mensaje}</p>
                        {modal.tipo === 'eliminar' && (
                            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-700 rounded">
                                <p className="text-[10px] font-black text-red-700 uppercase flex items-center gap-1">
                                    ⚠️ ADVERTENCIA: Esta acción no se puede deshacer
                                </p>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setModal({show: false})}
                                    className="btn btn-sm btn-ghost font-black uppercase text-[10px]">Cancelar
                            </button>
                            {modal.accion && <button onClick={modal.accion}
                                                     className={`btn btn-sm text-white font-black uppercase text-[10px] ${modal.tipo === 'eliminar' ? 'btn-error' : 'btn-error'}`}>
                                {modal.tipo === 'eliminar' ? 'Eliminar Viaje' : 'Continuar'}
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
                const estaVerificado = viajeModal?.estatus === "VERIFICADO";

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
                                                disabled={modalComentario.v?.comentarioRecepcion && estaVerificado}
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
                                <div className="bg-red-600 px-3 py-1 italic font-black text-lg skew-x-[-10deg]">
                                    VIAJE #{viaje.numViaje}
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-gray-500 leading-none">Transportista</p>
                                    <p className="text-sm font-black uppercase italic leading-none">{viaje.chofer?.nombre}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {viaje.vehiculos.some(v => v.yaPagado) && (
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
                                    const isLocked = (viaje.estatus === "EN VERIFICACION" || viaje.estatus === "VERIFICADO") && puedeEditar;
                                    const tieneComentarios = (v.comentarioRegistro && v.comentarioRegistro !== "") || (v.comentarioRecepcion && v.comentarioRecepcion !== "");

                                    return (
                                        <tr key={`${viaje.id}-${idx}`}
                                            className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${v.yaPagado ? 'bg-yellow-50' : ''}`}>
                                            <td className="p-3">
                                                {puedeEditar ? (
                                                    <div>
                                                        <input
                                                            type="text"
                                                            disabled={isLocked}
                                                            value={v.lote || ""}
                                                            maxLength={8}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'lote', e.target.value.toUpperCase())}
                                                            className={`w-24 text-center bg-gray-50 rounded border border-gray-200 outline-none text-xs font-black font-mono py-1 focus:border-blue-500 ${v.yaPagado ? 'text-yellow-700 border-yellow-500' : 'text-blue-700'}`}
                                                        />
                                                        {v.yaPagado && (
                                                            <div className="text-[7px] font-black text-yellow-700 uppercase italic mt-1 flex items-center gap-1">
                                                                ⚠️ YA PAGADO
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className={`font-mono text-xs font-black ${v.yaPagado ? 'text-yellow-700' : 'text-blue-700'}`}>{v.lote}</span>
                                                        {v.yaPagado && (
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
                                                            disabled={isLocked}
                                                            placeholder="MARCA"
                                                            value={v.marca || ""}
                                                            onChange={(e) => handleLocalEdit(viaje.id, idx, 'marca', e.target.value.toUpperCase())}
                                                            className="w-20 bg-gray-50 rounded border border-gray-200 outline-none text-[10px] uppercase font-bold text-gray-600 px-1 py-1 focus:border-blue-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            disabled={isLocked}
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
                                                <div
                                                    className="text-[11px] font-black text-red-700 uppercase leading-none">{v.ciudad}</div>
                                                <div
                                                    className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic">{v.almacen}</div>
                                            </td>

                                            {/* CLIENTE */}
                                            <td className="p-2">
                                                {user.admin ? (
                                                    <div className="relative group">
                                                        <div className="text-[8px] font-black text-blue-600 mb-1 italic flex items-center gap-1">
                                                            Ref:
                                                            <input
                                                                type="text"
                                                                disabled={isLocked}
                                                                value={v.clienteAlt || ""}
                                                                onChange={(e) => handleLocalEdit(viaje.id, idx, 'clienteAlt', e.target.value.toUpperCase())}
                                                                className="w-24 bg-gray-50 rounded border border-gray-200 outline-none text-[8px] font-black text-blue-600 px-1 focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                disabled={isLocked}
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
                                                        {busquedaCliente[`${viaje.id}-${idx}`] && !isLocked && (
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
                                                    </div>
                                                ) : puedeEditar ? (
                                                    <input
                                                        type="text"
                                                        disabled={isLocked}
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
                                                        <input type="number" disabled={isLocked} value={v[field]}
                                                               onChange={(e) => handleLocalEdit(viaje.id, idx, field, e.target.value)}
                                                               className="w-16 text-center bg-gray-50 rounded border border-gray-200 outline-none text-[11px] font-black py-1 focus:border-blue-500"/>
                                                    ) : (
                                                        <span className="text-[11px] font-bold">${v[field]}</span>
                                                    )}
                                                </td>
                                            ))}

                                            <td className="p-1 text-center">
                                                {puedeEditar ? (
                                                    <select disabled={isLocked} value={v.titulo || "NO"}
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
                                                                {viaje.estatus === "PENDIENTE" && (
                                                                    <button onClick={() => {
                                                                        const faltan = viaje.vehiculos.some(veh => !veh.clienteId);
                                                                        if (faltan) setModal({
                                                                            show: true,
                                                                            mensaje: "Asigna todos los clientes primero.",
                                                                            tipo: "error"
                                                                        });
                                                                        else setModal({
                                                                            show: true,
                                                                            mensaje: "¿Iniciar verificación física?",
                                                                            accion: () => cambiarEstatus(viaje.id, "EN VERIFICACION")
                                                                        });
                                                                    }}
                                                                            className="btn btn-xs btn-error text-white font-black text-[9px] uppercase h-10 shadow-md">Iniciar
                                                                        Verificación</button>
                                                                )}
                                                                {viaje.estatus === "EN VERIFICACION" && (
                                                                    <button onClick={() => setModal({
                                                                        show: true,
                                                                        mensaje: "¿Confirmar descarga?",
                                                                        accion: () => cambiarEstatus(viaje.id, "VERIFICADO")
                                                                    })}
                                                                            className="btn btn-xs btn-info text-white font-black text-[9px] uppercase h-10 shadow-md">Confirmar
                                                                        Descarga</button>
                                                                )}
                                                                {viaje.estatus === "VERIFICADO" && (
                                                                    <button onClick={() => setViajeALiquidar(viaje)}
                                                                            className="btn btn-xs btn-success text-white font-black text-[10px] h-10 uppercase italic shadow-md">Pagar Flete</button>
                                                                )}
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

                                                        {user.admin && viaje.estatus !== "PENDIENTE" && (
                                                            <button onClick={() => {
                                                                const anterior = viaje.estatus === "VERIFICADO" ? "EN VERIFICACION" : "PENDIENTE";
                                                                setModal({
                                                                    show: true,
                                                                    mensaje: `¿Regresar a edición? El estatus cambiará a ${anterior}`,
                                                                    accion: () => cambiarEstatus(viaje.id, anterior)
                                                                });
                                                            }}
                                                                    className="text-[8px] font-black uppercase text-red-500 underline hover:text-red-700 transition-all mt-1">
                                                                Habilitar Edición
                                                            </button>
                                                        )}

                                                        {puedeEditar && viaje.estatus !== "VERIFICADO" && (
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