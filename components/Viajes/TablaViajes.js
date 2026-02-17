import React, { useState, useEffect, useRef } from "react";
import { firestore } from "../../firebase/firebaseIni";
import firebase from "firebase/app";
import { FaFilter, FaPrint, FaTruckLoading, FaWallet, FaCheckDouble, FaUserShield } from "react-icons/fa";
import ReactToPrint from "react-to-print";
import HojaChofer from "./HojaChofer";
import HojaVerificacion from "./HojaVerificacion";
import ModalLiquidacion from "./ModalLiquidacion";

const TablaViajes = ({ user }) => {
    const [viajes, setViajes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroGeneral, setFiltroGeneral] = useState("");

    // Referencias y Estados de UI
    const componentRef = useRef();
    const [viajeAImprimir, setViajeAImprimir] = useState(null);
    const [viajeALiquidar, setViajeALiquidar] = useState(null);
    const [modal, setModal] = useState({ show: false, mensaje: "", accion: null, tipo: "" });

    useEffect(() => {
        if (!user) return;

        // --- CONSULTA FILTRADA ---
        let q = firestore().collection("viajesPendientes");
        if (!user.admin) {
            q = q.where("empresaId", "==", user.id);
        } else {
            q = q.orderBy("fechaCreacion", "desc");
        }

        const unsubViajes = q.onSnapshot(snap => {
            setViajes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const unsubClientes = firestore().collection("clientes").onSnapshot(snap => {
            setClientes(snap.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().cliente,
                telefono: doc.data().telefonoCliente
            })));
        });

        return () => { unsubViajes(); unsubClientes(); };
    }, [user]);

    // --- LÓGICA DE EDICIÓN (SOLO ADMIN) ---
    const handleLocalEdit = (viajeId, vehiculoIdx, field, value) => {
        if (!user.admin) return; // Seguridad extra
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
                return { ...viaje, vehiculos: nuevosVehiculos };
            }
            return viaje;
        });
        setViajes(nuevosViajes);
    };

    const cambiarEstatus = async (viajeId, nuevoEstatus) => {
        const viaje = viajes.find(v => v.id === viajeId);
        try {
            const updateData = { estatus: nuevoEstatus, vehiculos: viaje.vehiculos };
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
            setModal({ show: false });
        } catch (error) {
            setModal({ show: true, mensaje: "Error al actualizar estatus", tipo: "error" });
        }
    };

    const filtrados = viajes.filter(v =>
        v.numViaje.toLowerCase().includes(filtroGeneral.toLowerCase()) ||
        v.chofer?.nombre?.toLowerCase().includes(filtroGeneral.toLowerCase())
    );

    return (
        <div className="bg-white-500 rounded-xl shadow-md border border-gray-100 font-sans overflow-hidden text-black">

            {/* COMPONENTES OCULTOS */}
            <div style={{ display: "none" }}>
                {user.admin ?
                    <HojaVerificacion ref={componentRef} viajeData={viajeAImprimir} /> :
                    <HojaChofer ref={componentRef} viaje={viajeAImprimir} />
                }
            </div>

            {viajeALiquidar && <ModalLiquidacion viaje={viajeALiquidar} user={user} onClose={() => setViajeALiquidar(null)} />}

            {/* MODAL DE CONFIRMACIÓN */}
            {modal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black">
                    <div className="bg-white-500 rounded-xl p-8 max-w-sm w-full border-t-8 border-red-600 shadow-2xl font-sans">
                        <h3 className="text-xl font-black uppercase tracking-tighter">{modal.tipo === 'error' ? 'Error' : 'Confirmar'}</h3>
                        <p className="text-sm mt-3 font-bold text-gray-600 leading-tight uppercase italic">{modal.mensaje}</p>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setModal({ show: false })} className="btn btn-sm btn-ghost font-black uppercase text-[10px]">Cerrar</button>
                            {modal.accion && <button onClick={modal.accion} className="btn btn-sm btn-error text-white-500 font-black uppercase text-[10px]">Continuar</button>}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 bg-gray-50 border-b flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">
                    {user.admin ? "Control Administrativo" : "Mis Despachos"}
                </h2>
                <div className="flex items-center gap-2 bg-white-500 px-3 py-1 rounded-md border shadow-sm">
                    <FaFilter className="text-gray-400 text-xs" />
                    <input type="text" placeholder="Filtrar viaje..." className="bg-transparent outline-none text-[12px] w-64 font-bold uppercase" value={filtroGeneral} onChange={(e) => setFiltroGeneral(e.target.value)} />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="table table-compact w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="text-[9px] uppercase text-gray-400 bg-white-500 sticky top-0 z-20 shadow-sm">
                            <th className="p-3 border-r border-b">Viaje / Estatus</th>
                            <th className="p-3 border-r border-b">Lote</th>
                            <th className="p-3 border-r border-b">Vehículo</th>
                            <th className="p-3 border-r border-b">Ciudad / Almacén</th>
                            {user.admin && <th className="p-3 border-r border-b w-44">Cliente Oficial</th>}
                            {!user.admin && <th className="p-3 border-r border-b">Referencia</th>}
                            <th className="p-3 border-r border-b text-center text-blue-800 font-black">Flete</th>
                            <th className="p-3 border-r border-b text-center">Storage</th>
                            <th className="p-3 border-r border-b text-center">S. Peso</th>
                            <th className="p-3 border-r border-b text-center">G. Extra</th>
                            <th className="p-3 bg-blue-50 border-b text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map((viaje, vIndex) => (
                            viaje.vehiculos.map((v, idx) => {
                                const isLocked = (viaje.estatus === "EN VERIFICACION" || viaje.estatus === "VERIFICADO") && user.admin;
                                const isCarrier = !user.admin;

                                return (
                                    <tr key={`${viaje.id}-${idx}`} className={`hover:bg-blue-50/20 transition-colors ${vIndex % 2 === 0 ? "bg-white-500" : "bg-gray-50"}`}>
                                        {idx === 0 && (
                                            <td rowSpan={viaje.vehiculos.length} className="border-r border-b p-3 align-top bg-gray-50/20 w-44">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-black text-red-600">#{viaje.numViaje}</span>
                                                    <span className="text-[11px] font-black uppercase text-gray-800">{viaje.chofer?.nombre}</span>
                                                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full mt-2 w-fit ${viaje.estatus === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {viaje.estatus}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="border-r border-b p-2 font-mono text-[11px] font-black text-blue-700 text-center">{v.lote}</td>
                                        <td className="border-r border-b p-2 text-[10px] uppercase font-bold text-gray-500">{v.marca}</td>

                                        <td className="border-r border-b p-2">
                                            <div className="text-[11px] font-black text-red-700 uppercase leading-none">{v.ciudad}</div>
                                            <div className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic">{v.almacen}</div>
                                        </td>

                                        {/* COLUMNA DINÁMICA: CLIENTE ADMIN VS CARRIER */}
                                        <td className="border-r border-b p-1">
                                            {user.admin ? (
                                                <>
                                                    <div className="text-[8px] font-black text-blue-600 mb-1 italic">Ref: {v.clienteAlt}</div>
                                                    <select disabled={isLocked} value={v.clienteId || ""} onChange={(e) => handleLocalEdit(viaje.id, idx, 'clienteId', e.target.value)} className="select select-bordered select-xs w-full font-bold text-[10px] uppercase">
                                                        <option value="">-- ASIGNAR --</option>
                                                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                    </select>
                                                </>
                                            ) : (
                                                <div className="text-[10px] font-bold uppercase text-gray-500">{v.clienteAlt}</div>
                                            )}
                                        </td>

                                        {/* INPUTS SOLO SI ES ADMIN Y NO ESTÁ BLOQUEADO */}
                                        {['flete', 'storage', 'sPeso', 'gExtra'].map(field => (
                                            <td key={field} className="border-r border-b p-1 text-center font-bold">
                                                {user.admin ? (
                                                    <input
                                                        type="number"
                                                        disabled={isLocked}
                                                        value={v[field]}
                                                        onChange={(e) => handleLocalEdit(viaje.id, idx, field, e.target.value)}
                                                        className="w-full text-center bg-transparent outline-none text-[11px]"
                                                    />
                                                ) : (
                                                    <span className="text-[11px]">${v[field]}</span>
                                                )}
                                            </td>
                                        ))}

                                        {idx === 0 && (
                                            <td rowSpan={viaje.vehiculos.length} className="border-b p-3 bg-blue-50/10 align-middle text-center w-40">
                                                <div className="flex flex-col gap-2">
                                                    {user.admin ? (
                                                        <>
                                                            {viaje.estatus === "PENDIENTE" && (
                                                                <button onClick={() => {
                                                                    const faltan = viaje.vehiculos.some(veh => !veh.clienteId);
                                                                    if (faltan) setModal({ show: true, mensaje: "Asigna todos los clientes primero.", tipo: "error" });
                                                                    else setModal({ show: true, mensaje: "¿Iniciar verificación física?", accion: () => cambiarEstatus(viaje.id, "EN VERIFICACION") });
                                                                }} className="btn btn-sm btn-error text-white-500 font-black text-[9px] uppercase leading-tight py-2 h-12">
                                                                    Iniciar<br/>Verificación
                                                                </button>
                                                            )}
                                                            {viaje.estatus === "EN VERIFICACION" && (
                                                                <button onClick={() => setModal({ show: true, mensaje: "¿Confirmar descarga?", accion: () => cambiarEstatus(viaje.id, "VERIFICADO") })} className="btn btn-sm btn-info text-white-500 font-black text-[9px] uppercase leading-tight py-2 h-12">
                                                                    Confirmar<br/>Verificación
                                                                </button>
                                                            )}
                                                            {viaje.estatus === "VERIFICADO" && (
                                                                <button onClick={() => setViajeALiquidar(viaje)} className="btn btn-sm btn-success text-white-500 font-black text-[10px] h-12 uppercase italic">
                                                                    Pagar Viaje
                                                                </button>
                                                            )}
                                                            <ReactToPrint
                                                                onBeforeGetContent={() => setViajeAImprimir(viaje)}
                                                                trigger={() => <button className="btn btn-xs btn-ghost underline text-[9px] font-bold">Imprimir Hoja</button>}
                                                                content={() => componentRef.current}
                                                            />
                                                        </>
                                                    ) : (
                                                        <ReactToPrint
                                                            onBeforeGetContent={() => setViajeAImprimir(viaje)}
                                                            trigger={() => <button className="btn btn-xs btn-outline font-black uppercase text-[9px]"><FaPrint className="mr-1"/> Hoja</button>}
                                                            content={() => componentRef.current}
                                                        />
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