import React, { useState, useEffect, useRef } from "react";
import { firestore } from "../../firebase/firebaseIni";
import { FaFilter, FaCheckDouble, FaHistory, FaUserShield, FaPrint, FaWallet } from "react-icons/fa";
import ReactToPrint from "react-to-print";
import HojaVerificacion from "./HojaVerificacion";
import ModalLiquidacion from "./ModalLiquidacion"; // Nuevo componente

const TablaViajes = ({ user }) => {
    const [viajes, setViajes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroGeneral, setFiltroGeneral] = useState("");

    // Estados para Impresión y Liquidación
    const componentRef = useRef();
    const [viajeAImprimir, setViajeAImprimir] = useState(null);
    const [viajeALiquidar, setViajeALiquidar] = useState(null);
    const [modal, setModal] = useState({ show: false, mensaje: "", accion: null, tipo: "" });

    useEffect(() => {
        const unsubViajes = firestore().collection("viajesPendientes")
            .orderBy("fechaCreacion", "desc")
            .onSnapshot(snap => {
                setViajes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });

        const unsubClientes = firestore().collection("clientes")
            .onSnapshot(snap => {
                setClientes(snap.docs.map(doc => ({
                    id: doc.id,
                    nombre: doc.data().cliente,
                    telefono: doc.data().telefonoCliente
                })));
            });

        return () => { unsubViajes(); unsubClientes(); };
    }, []);

const handleLocalEdit = (viajeId, vehiculoIdx, field, value) => {
    const nuevosViajes = viajes.map(viaje => {
        if (viaje.id === viajeId) {
            const nuevosVehiculos = [...viaje.vehiculos];
            let valorFinal = value;

            // Lógica para números
            if (['flete', 'storage', 'sPeso', 'gExtra'].includes(field)) {
                valorFinal = value === "" ? "0" : parseFloat(value).toString();
            }

            // --- NUEVA LÓGICA PARA CLIENTE ---
            if (field === 'clienteId') {
                const clienteEncontrado = clientes.find(c => c.id === value);
                nuevosVehiculos[vehiculoIdx].clienteId = value;
                nuevosVehiculos[vehiculoIdx].clienteNombre = clienteEncontrado ? clienteEncontrado.nombre : "";
                nuevosVehiculos[vehiculoIdx].clienteTelefono = clienteEncontrado ? clienteEncontrado.telefono : "";
            } else {
                nuevosVehiculos[vehiculoIdx][field] = valorFinal;
            }

            nuevosVehiculos[vehiculoIdx].editadoManualmente = true;
            return { ...viaje, vehiculos: nuevosVehiculos };
        }
        return viaje;
    });
    setViajes(nuevosViajes);
};

const cambiarEstatus = async (viajeId, nuevoEstatus) => {
    const viaje = viajes.find(v => v.id === viajeId);
    // ... validación de clientes existentes ...

    try {
        const updateData = { estatus: nuevoEstatus, vehiculos: viaje.vehiculos };

        if (nuevoEstatus === "VERIFICADO") {
            const registro = {
                usuario: user?.nombre || "Admin",
                idUsuario: user?.id || "",
                fecha: new Date(),
                // Guardamos el lote, el flete Y EL CLIENTE CONFIRMADO en el historial
                cambioVehiculos: viaje.vehiculos.map(v => ({
                    lote: v.lote,
                    flete: v.flete,
                    clienteConfirmado: v.clienteNombre || "Sin asignar"
                }))
            };
            updateData.historialEdiciones = firestore.FieldValue.arrayUnion(registro);
            updateData.verificado = true;
            updateData.ultimaEdicion = { usuario: user?.nombre, fecha: new Date() };
        }
        await firestore().collection("viajesPendientes").doc(viajeId).update(updateData);
        setModal({ show: false });
    } catch (error) {
        setModal({ show: true, mensaje: "Error en base de datos.", tipo: "error" });
    }
};

    const viajesFiltrados = viajes.filter(viaje => {
        const term = filtroGeneral.toLowerCase();
        return viaje.numViaje.toLowerCase().includes(term) || viaje.chofer?.nombre.toLowerCase().includes(term);
    });

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 font-sans overflow-hidden">

            {/* COMPONENTES OCULTOS Y MODALES */}
            <div style={{ display: "none" }}>
                <HojaVerificacion ref={componentRef} viajeData={viajeAImprimir} />
            </div>

            {viajeALiquidar && (
                <ModalLiquidacion
                    viaje={viajeALiquidar}
                    user={user}
                    onClose={() => setViajeALiquidar(null)}
                />
            )}

            {modal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white-500 rounded-xl p-8 max-w-sm w-full shadow-2xl border-2 border-t-8 border-red-600 animate-in fade-in zoom-in duration-200">
                        <h3 className={`text-xl font-black uppercase tracking-tighter ${modal.tipo === 'error' ? 'text-red-600' : 'text-gray-800'}`}>
                            {modal.tipo === 'error' ? 'Acción Bloqueada' : 'Confirmación'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-3 font-semibold leading-relaxed">{modal.mensaje}</p>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setModal({ show: false })} className="btn btn-sm white font-black uppercase text-[10px]">Cerrar</button>
                            {modal.accion && (
                                <button onClick={modal.accion} className="btn btn-sm btn-error text-white font-black uppercase text-[10px] px-6">Continuar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-2xl p-4 font-black text-gray-800 uppercase tracking-tighter leading-none">Viajes pendientes</h2>

            <div className="bg-gray-100 p-4 border-b flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border shadow-sm">
                    <FaFilter className="text-gray-400 text-xs" />
                    <input type="text" placeholder="Filtrar por Chofer, Viaje..." className="bg-transparent outline-none text-[12px] w-80 font-medium" value={filtroGeneral} onChange={(e) => setFiltroGeneral(e.target.value)} />
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-auto">Panel de Verificación Operativa</div>
            </div>

            <div className="overflow-x-auto">
                <table className="table table-compact w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="text-[10px] uppercase text-gray-400 bg-white sticky top-0 z-20 shadow-sm">
                            <th className="p-3 border-r border-b">Viaje / Estatus</th>
                            <th className="p-3 border-r border-b text-center">Lote</th>
                            <th className="p-3 border-r border-b">Vehículo</th>
                            <th className="p-3 border-r border-b text-red-600">Ciudad / Almacén</th>
                            <th className="p-3 border-r border-b w-48 text-center">Cliente Oficial</th>
                            <th className="p-3 border-r border-b text-center text-blue-800 font-black">Flete</th>
                            <th className="p-3 border-r border-b text-center">Storage</th>
                            <th className="p-3 border-r border-b text-center">S. Peso</th>
                            <th className="p-3 border-r border-b text-center">G. Extra</th>
                            <th className="p-3 bg-blue-50 border-b text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {viajesFiltrados.map((viaje, vIndex) => (
                            viaje.vehiculos.map((v, idx) => {
                                const isLocked = viaje.estatus === "EN VERIFICACION" || viaje.estatus === "VERIFICADO";
                                const rowBgColor = vIndex % 2 === 0 ? "bg-white-500" : "bg-gray-100";

                                return (
                                    <tr key={`${viaje.id}-${idx}`} className={`hover:bg-blue-50/20 transition-colors ${rowBgColor} ${isLocked ? 'opacity-90' : ''}`}>
                                        {idx === 0 && (
                                            <td rowSpan={viaje.vehiculos.length} className="border-r border-b p-3 align-top bg-gray-50/20 w-44">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-black text-red-600 leading-none">#{viaje.numViaje}</span>
                                                    <span className="text-[11px] font-black uppercase text-gray-800">{viaje.chofer?.nombre}</span>
                                                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full mt-2 w-fit ${viaje.estatus === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-600' : viaje.estatus === 'EN VERIFICACION' ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                                                        {viaje.estatus}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="border-r border-b p-2 font-mono text-[11px] font-black text-blue-700 text-center">{v.lote}</td>
                                        <td className="border-r border-b p-2 text-[10px] uppercase font-bold text-gray-500">{v.marca}</td>

                                        <td className="border-r border-b p-2">
                                            <div className="text-[12px] font-black text-red-700 uppercase leading-none">{v.ciudad}</div>
                                            <div className="mt-1">
                                                <select
                                                    disabled={isLocked}
                                                    value={v.almacen || "pendiente"}
                                                    onChange={(e) => handleLocalEdit(viaje.id, idx, 'almacen', e.target.value)}
                                                    className="bg-transparent border-none text-[10px] font-bold text-gray-500 uppercase p-0 h-auto focus:ring-0 cursor-pointer hover:text-red-600"
                                                >
                                                    <option value="Copart">Copart</option>
                                                    <option value="Adesa">Adesa</option>
                                                    <option value="Manheim">Manheim</option>
                                                    <option value="Insurance Auto Auctions">Insurance Auto Auctions</option>
                                                    <option value="pendiente">Pendiente</option>
                                                </select>
                                            </div>
                                        </td>

                                        <td className="border-r border-b p-1">
                                            <div className="text-[8px] font-black text-blue-600 mb-1 px-1 italic">Ref: {v.clienteAlt}</div>
                                            <select disabled={isLocked} value={v.clienteId || ""} onChange={(e) => handleLocalEdit(viaje.id, idx, 'clienteId', e.target.value)} className="select select-bordered select-xs w-full font-bold text-[10px] uppercase h-8">
                                                <option value="">-- ASIGNAR --</option>
                                                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                            </select>
                                        </td>
                                        <td className="border-r border-b p-1 bg-blue-50/10 text-center font-black text-blue-900">
                                            <input type="number" disabled={isLocked} value={v.flete} onFocus={(e) => v.flete == "0" && handleLocalEdit(viaje.id, idx, 'flete', "")} onChange={(e) => handleLocalEdit(viaje.id, idx, 'flete', e.target.value)} className="w-full text-center bg-transparent outline-none text-[11px]" />
                                        </td>
                                        <td className="border-r border-b p-1 text-center">
                                            <input type="number" disabled={isLocked} value={v.storage} onFocus={(e) => v.storage == "0" && handleLocalEdit(viaje.id, idx, 'storage', "")} onChange={(e) => handleLocalEdit(viaje.id, idx, 'storage', e.target.value)} className="w-full text-center bg-transparent outline-none text-[11px]" />
                                        </td>
                                        <td className="border-r border-b p-1 text-center">
                                            <input type="number" disabled={isLocked} value={v.sPeso} onFocus={(e) => v.sPeso == "0" && handleLocalEdit(viaje.id, idx, 'sPeso', "")} onChange={(e) => handleLocalEdit(viaje.id, idx, 'sPeso', e.target.value)} className="w-full text-center bg-transparent outline-none text-[11px]" />
                                        </td>
                                        <td className="border-r border-b p-1 text-center">
                                            <input type="number" disabled={isLocked} value={v.gExtra} onFocus={(e) => v.gExtra == "0" && handleLocalEdit(viaje.id, idx, 'gExtra', "")} onChange={(e) => handleLocalEdit(viaje.id, idx, 'gExtra', e.target.value)} className="w-full text-center bg-transparent outline-none text-[11px]" />
                                        </td>

                                        {idx === 0 && (
                                            <td rowSpan={viaje.vehiculos.length} className="border-b p-3 bg-blue-50/30 align-middle text-center w-44">
                                                <div className="flex flex-col gap-3">
                                                    {viaje.estatus === "PENDIENTE" && (
                                                        <button onClick={() => {
                                                            const faltan = viaje.vehiculos.some(v => !v.clienteId || v.clienteId === "");
                                                            if (faltan) setModal({ show: true, mensaje: "⚠️ BLOQUEO: Asigna todos los clientes antes.", tipo: "error" });
                                                            else setModal({ show: true, mensaje: "¿Deseas enviar este viaje a Verificación Física?", accion: () => cambiarEstatus(viaje.id, "EN VERIFICACION") });
                                                        }} className="btn h-14 flex flex-col items-center justify-center btn-error text-white font-black w-full shadow-md uppercase leading-tight py-2 text-[10px]">
                                                            <span>Iniciar</span><span>Verificación</span>
                                                        </button>
                                                    )}
                                                    {viaje.estatus === "EN VERIFICACION" && (
                                                        <div className="flex flex-col gap-2">
                                                            <button onClick={() => setModal({ show: true, mensaje: "¿Confirmas la carga física?", accion: () => cambiarEstatus(viaje.id, "VERIFICADO") })} className="btn h-14 flex flex-col items-center justify-center btn-info text-white font-black w-full shadow-md uppercase leading-tight py-2 text-[10px]">
                                                                <span>Confirmar</span><span>Verificación</span>
                                                            </button>
                                                            <button onClick={() => cambiarEstatus(viaje.id, "PENDIENTE")} className="btn btn-xs btn-ghost text-[9px] font-bold underline text-gray-400 normal-case">Editar nuevamente</button>
                                                            <ReactToPrint
                                                                onBeforeGetContent={async () => {
                                                                    setViajeAImprimir(viaje);
                                                                    return new Promise((resolve) => setTimeout(resolve, 300));
                                                                }}
                                                                trigger={() => (<button className="btn btn-xs btn-outline font-black gap-1 uppercase text-[9px]"><FaPrint /> Hoja</button>)}
                                                                content={() => componentRef.current}
                                                            />
                                                        </div>
                                                    )}
                                                    {viaje.estatus === "VERIFICADO" && (
                                                        <div className="flex flex-col gap-2">
                                                            <button
                                                                onClick={() => setViajeALiquidar(viaje)}
                                                                className="btn h-16 flex flex-col items-center justify-center btn-success text-white font-black w-full gap-1 shadow-lg uppercase leading-tight py-2 text-[11px]"
                                                            >
                                                                <FaWallet className="text-lg" /><span>Pagar Viaje</span>
                                                            </button>
                                                            <button onClick={() => cambiarEstatus(viaje.id, "PENDIENTE")} className="btn btn-xs btn-ghost text-[9px] font-bold underline text-gray-400 normal-case mt-2">Corregir</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TablaViajes;