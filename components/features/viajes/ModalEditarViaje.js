import React, { useState } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { FaTimes, FaSave, FaPlus, FaTrash } from "react-icons/fa";
import { COLLECTIONS } from "../../../constants";

const ModalEditarViaje = ({ viaje, choferes, clientes, onClose, onGuardado }) => {
    const [saving, setSaving] = useState(false);
    const [busquedaChofer, setBusquedaChofer] = useState("");
    const [showDropdownChofer, setShowDropdownChofer] = useState(false);

    // Estado editable del viaje
    const [chofer, setChofer] = useState(viaje.chofer || { id: "", nombre: "", empresa: "" });
    const [empresaLiquidada, setEmpresaLiquidada] = useState(viaje.empresaLiquidada || "");
    const [estadoOrigen, setEstadoOrigen] = useState(viaje.estadoOrigen || "");
    const [numViaje, setNumViaje] = useState(viaje.numViaje || "");
    const [metodoPago, setMetodoPago] = useState(viaje.metodoPago || { efectivo: "", cheque: "", zelle: "" });
    const [vehiculos, setVehiculos] = useState(
        (viaje.vehiculos || []).map(v => ({ ...v }))
    );

    const actualizarVehiculo = (idx, campo, valor) => {
        setVehiculos(prev => prev.map((v, i) => i === idx ? { ...v, [campo]: valor } : v));
    };

    const eliminarVehiculo = (idx) => {
        if (vehiculos.length <= 1) return;
        setVehiculos(prev => prev.filter((_, i) => i !== idx));
    };

    const agregarVehiculo = () => {
        setVehiculos(prev => [...prev, {
            id: Date.now(),
            lote: "", marca: "", modelo: "", estado: "", ciudad: "",
            clienteNombre: "", clienteAlt: "", titulo: "NO",
            flete: "0", storage: "0", sPeso: "0", gExtra: "0",
            precioVenta: "0", storageCliente: "0", sPesoCliente: "0", gExtraCliente: "0",
            preciosClienteEditados: false
        }]);
    };

    const seleccionarChofer = (c) => {
        setChofer({ id: c.id, nombre: c.nombreChofer, empresa: c.empresaNombre || "" });
        setEmpresaLiquidada(c.empresaNombre || "");
        setShowDropdownChofer(false);
        setBusquedaChofer("");
    };

    // Totales
    const totalFletes = vehiculos.reduce((acc, v) => acc + (parseFloat(v.flete) || 0), 0);
    const totalStorage = vehiculos.reduce((acc, v) => acc + (parseFloat(v.storage) || 0), 0);
    const totalSobrepeso = vehiculos.reduce((acc, v) => acc + (parseFloat(v.sPeso) || 0), 0);
    const totalGastosExtra = vehiculos.reduce((acc, v) => acc + (parseFloat(v.gExtra) || 0), 0);
    const granTotal = totalFletes + totalStorage + totalSobrepeso + totalGastosExtra;

    const totalPrecioVenta = vehiculos.reduce((acc, v) => acc + (parseFloat(v.precioVenta) || parseFloat(v.flete) || 0), 0);
    const totalStorageCliente = vehiculos.reduce((acc, v) => acc + (v.preciosClienteEditados ? (parseFloat(v.storageCliente) || 0) : (parseFloat(v.storage) || 0)), 0);
    const totalSobrepesoCliente = vehiculos.reduce((acc, v) => acc + (v.preciosClienteEditados ? (parseFloat(v.sPesoCliente) || 0) : (parseFloat(v.sPeso) || 0)), 0);
    const totalGastosExtraCliente = vehiculos.reduce((acc, v) => acc + (v.preciosClienteEditados ? (parseFloat(v.gExtraCliente) || 0) : (parseFloat(v.gExtra) || 0)), 0);
    const granTotalCliente = totalPrecioVenta + totalStorageCliente + totalSobrepesoCliente + totalGastosExtraCliente;

    const guardar = async () => {
        setSaving(true);
        try {
            const docId = viaje.docId || viaje.numViaje;
            const batch = firestore().batch();
            const viajeRef = firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(docId);

            const dataActualizada = {
                chofer,
                empresaLiquidada,
                estadoOrigen,
                numViaje,
                metodoPago,
                vehiculos,
                resumenFinanciero: {
                    ...(viaje.resumenFinanciero || {}),
                    totalFletes,
                    totalStorage,
                    totalSobrepeso,
                    totalGastosExtra,
                    granTotal,
                    totalPrecioVenta,
                    totalStorageCliente,
                    totalSobrepesoCliente,
                    totalGastosExtraCliente,
                    granTotalCliente
                }
            };

            // Si cambió numViaje, hay que re-crear el doc con nuevo ID
            if (numViaje !== viaje.numViaje) {
                const { docId: _, ...viajeDataSinDocId } = viaje;
                const nuevoData = { ...viajeDataSinDocId, ...dataActualizada, folioPago: numViaje };
                batch.set(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(numViaje), nuevoData);
                batch.delete(viajeRef);

                // Actualizar vehiculos relacionados
                vehiculos.forEach(v => {
                    if (v.lote) {
                        const vehRef = firestore().collection(COLLECTIONS.VEHICULOS).doc(v.lote);
                        batch.update(vehRef, { numViaje, folioPago: numViaje });
                    }
                });
            } else {
                batch.update(viajeRef, dataActualizada);
            }

            // Actualizar precios en colección vehiculos
            vehiculos.forEach(v => {
                if (v.lote) {
                    const vehRef = firestore().collection(COLLECTIONS.VEHICULOS).doc(v.lote);
                    batch.update(vehRef, {
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
            onGuardado();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const choferesFiltrados = choferes.filter(c => {
        const t = busquedaChofer.toUpperCase();
        return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t);
    }).slice(0, 15);

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            {showDropdownChofer && <div className="fixed inset-0 z-[131]" onClick={() => setShowDropdownChofer(false)} />}

            <div className="bg-white rounded-xl max-w-6xl w-full shadow-2xl border-t-8 border-blue-600 flex flex-col max-h-[95vh]">
                {/* HEADER */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-blue-700">
                            Editar Viaje #{viaje.numViaje}
                        </h2>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            Folio: {viaje.folioPago}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-600">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* FILA: CHOFER + EMPRESA + ESTADO ORIGEN + NUM VIAJE + MÉTODO PAGO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Chofer */}
                        <div className="relative">
                            <label className="text-[9px] font-black text-gray-500 uppercase">Chofer</label>
                            <div
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold uppercase cursor-pointer hover:border-blue-400 flex justify-between items-center"
                                onClick={() => setShowDropdownChofer(!showDropdownChofer)}
                            >
                                <span className={chofer.nombre ? "text-blue-800" : "text-gray-400"}>
                                    {chofer.nombre || "Seleccionar..."}
                                </span>
                                <span className="text-[8px] text-gray-400">{chofer.empresa}</span>
                            </div>
                            {showDropdownChofer && (
                                <div className="absolute z-[200] w-full bg-white border-2 border-black shadow-2xl rounded-lg max-h-52 overflow-y-auto mt-1">
                                    <input
                                        type="text"
                                        placeholder="Buscar chofer..."
                                        className="w-full px-3 py-2 border-b text-sm font-bold uppercase focus:outline-none"
                                        value={busquedaChofer}
                                        onChange={(e) => setBusquedaChofer(e.target.value)}
                                        autoFocus
                                    />
                                    {choferesFiltrados.map(c => (
                                        <div
                                            key={c.id}
                                            className="px-3 py-2 cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between hover:bg-blue-600 hover:text-white"
                                            onClick={() => seleccionarChofer(c)}
                                        >
                                            <span>{c.nombreChofer}</span>
                                            <span className="text-[8px] opacity-60">{c.empresaNombre || "SIN EMPRESA"}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Empresa liquidada */}
                        <div>
                            <label className="text-[9px] font-black text-gray-500 uppercase">Empresa Liquidada</label>
                            <input
                                type="text"
                                value={empresaLiquidada}
                                onChange={(e) => setEmpresaLiquidada(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold uppercase focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Estado Origen */}
                        <div>
                            <label className="text-[9px] font-black text-gray-500 uppercase">Estado Origen</label>
                            <input
                                type="text"
                                value={estadoOrigen}
                                onChange={(e) => setEstadoOrigen(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold uppercase focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Num Viaje */}
                        <div>
                            <label className="text-[9px] font-black text-gray-500 uppercase">Número de Viaje</label>
                            <input
                                type="text"
                                value={numViaje}
                                onChange={(e) => setNumViaje(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold uppercase focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* MÉTODO DE PAGO */}
                    <div className="bg-gray-50 p-3 rounded-lg border">
                        <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Método de Pago</label>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[8px] font-bold text-green-700 uppercase">Efectivo</label>
                                <input
                                    type="number"
                                    value={metodoPago.efectivo}
                                    onChange={(e) => setMetodoPago({ ...metodoPago, efectivo: e.target.value })}
                                    placeholder="$0"
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold text-center focus:border-green-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-bold text-blue-700 uppercase">Cheque</label>
                                <input
                                    type="number"
                                    value={metodoPago.cheque}
                                    onChange={(e) => setMetodoPago({ ...metodoPago, cheque: e.target.value })}
                                    placeholder="$0"
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold text-center focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-bold text-purple-700 uppercase">Zelle</label>
                                <input
                                    type="number"
                                    value={metodoPago.zelle}
                                    onChange={(e) => setMetodoPago({ ...metodoPago, zelle: e.target.value })}
                                    placeholder="$0"
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold text-center focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* VEHÍCULOS */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase">
                                Vehículos ({vehiculos.length})
                            </label>
                            <button
                                onClick={agregarVehiculo}
                                className="btn btn-xs btn-info text-white font-black uppercase gap-1"
                            >
                                <FaPlus size={8} /> Agregar
                            </button>
                        </div>

                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full border-collapse text-[11px]">
                                <thead>
                                    <tr className="bg-gray-800 text-white text-[9px] uppercase font-black">
                                        <th className="px-2 py-2">#</th>
                                        <th className="px-2 py-2">Lote</th>
                                        <th className="px-2 py-2">Marca</th>
                                        <th className="px-2 py-2">Modelo</th>
                                        <th className="px-2 py-2">Estado</th>
                                        <th className="px-2 py-2">Ciudad</th>
                                        <th className="px-2 py-2">Cliente</th>
                                        <th className="px-2 py-2 text-center">Título</th>
                                        <th className="px-2 py-2 text-right">Flete</th>
                                        <th className="px-2 py-2 text-right">Storage</th>
                                        <th className="px-2 py-2 text-right">S.Peso</th>
                                        <th className="px-2 py-2 text-right">G.Extra</th>
                                        <th className="px-2 py-2 text-center">Total</th>
                                        <th className="px-2 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehiculos.map((v, idx) => {
                                        const total = (parseFloat(v.flete) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0);
                                        return (
                                            <tr key={idx} className="border-b hover:bg-blue-50">
                                                <td className="px-2 py-1 text-center font-bold text-gray-400">{idx + 1}</td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={v.lote || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "lote", e.target.value)}
                                                        className="w-20 px-1 py-1 border rounded text-[11px] font-mono font-bold text-center focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={v.marca || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "marca", e.target.value)}
                                                        className="w-20 px-1 py-1 border rounded text-[11px] font-bold uppercase focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={v.modelo || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "modelo", e.target.value)}
                                                        className="w-20 px-1 py-1 border rounded text-[11px] font-bold uppercase focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={v.estado || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "estado", e.target.value)}
                                                        className="w-16 px-1 py-1 border rounded text-[11px] font-bold uppercase focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={v.ciudad || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "ciudad", e.target.value)}
                                                        className="w-20 px-1 py-1 border rounded text-[11px] font-bold uppercase focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={v.clienteNombre || v.clienteAlt || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "clienteNombre", e.target.value)}
                                                        className="w-24 px-1 py-1 border rounded text-[11px] font-bold uppercase focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1 text-center">
                                                    <select
                                                        value={v.titulo || "NO"}
                                                        onChange={(e) => actualizarVehiculo(idx, "titulo", e.target.value)}
                                                        className="px-1 py-1 border rounded text-[11px] font-black focus:border-blue-500 focus:outline-none"
                                                    >
                                                        <option value="NO">NO</option>
                                                        <option value="SI">SI</option>
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="number"
                                                        value={v.flete || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "flete", e.target.value)}
                                                        className="w-16 px-1 py-1 border rounded text-[11px] font-bold text-right focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="number"
                                                        value={v.storage || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "storage", e.target.value)}
                                                        className="w-14 px-1 py-1 border rounded text-[11px] text-right focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="number"
                                                        value={v.sPeso || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "sPeso", e.target.value)}
                                                        className="w-14 px-1 py-1 border rounded text-[11px] text-right focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input
                                                        type="number"
                                                        value={v.gExtra || ""}
                                                        onChange={(e) => actualizarVehiculo(idx, "gExtra", e.target.value)}
                                                        className="w-14 px-1 py-1 border rounded text-[11px] text-right focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-1 py-1 text-center font-black text-gray-800">
                                                    ${total.toLocaleString()}
                                                </td>
                                                <td className="px-1 py-1 text-center">
                                                    {vehiculos.length > 1 && (
                                                        <button
                                                            onClick={() => eliminarVehiculo(idx)}
                                                            className="text-red-400 hover:text-red-600"
                                                            title="Eliminar vehículo"
                                                        >
                                                            <FaTrash size={10} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RESUMEN */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg border">
                            <h4 className="text-[9px] font-black text-gray-500 uppercase mb-2">Total Chofer</h4>
                            <div className="space-y-1 text-[11px] font-bold text-gray-600">
                                <div className="flex justify-between"><span>Fletes:</span><span>${totalFletes.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Storage:</span><span>${totalStorage.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Sobrepeso:</span><span>${totalSobrepeso.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>G.Extra:</span><span>${totalGastosExtra.toLocaleString()}</span></div>
                            </div>
                            <div className="flex justify-between text-lg font-black text-gray-800 mt-2 pt-2 border-t-2 border-red-600">
                                <span>Total:</span>
                                <span className="text-red-600">${granTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <h4 className="text-[9px] font-black text-blue-500 uppercase mb-2">Total Cliente</h4>
                            <div className="space-y-1 text-[11px] font-bold text-blue-600">
                                <div className="flex justify-between"><span>Precio Venta:</span><span>${totalPrecioVenta.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Storage:</span><span>${totalStorageCliente.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Sobrepeso:</span><span>${totalSobrepesoCliente.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>G.Extra:</span><span>${totalGastosExtraCliente.toLocaleString()}</span></div>
                            </div>
                            <div className="flex justify-between text-lg font-black text-blue-800 mt-2 pt-2 border-t-2 border-blue-600">
                                <span>Total:</span>
                                <span>${granTotalCliente.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <button onClick={onClose} className="btn btn-sm btn-ghost font-black uppercase text-[10px]">
                        Cancelar
                    </button>
                    <button
                        onClick={guardar}
                        disabled={saving || !numViaje.trim()}
                        className="btn btn-sm btn-success text-white font-black uppercase text-[10px] gap-2 px-8"
                    >
                        <FaSave size={12} />
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalEditarViaje;
