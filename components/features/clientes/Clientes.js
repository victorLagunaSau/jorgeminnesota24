import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminData } from "../../../context/adminData";
import { firestore } from "../../../firebase/firebaseIni";
import FormCliente from "./FormCliente";
import {
    FaTimes, FaPlus, FaSearch, FaChevronLeft, FaChevronRight,
    FaPhone, FaMapMarkerAlt, FaCar, FaFileInvoiceDollar,
    FaCopy, FaCheck, FaEdit, FaTrash, FaUserPlus
} from "react-icons/fa";

const Clientes = ({ user }) => {
    const { clientes: clientesRaw, loading } = useAdminData();

    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [copiadoId, setCopiadoId] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [clienteAEditar, setClienteAEditar] = useState(null);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [vehiculosCliente, setVehiculosCliente] = useState([]);
    const [cargosExtra, setCargosExtra] = useState([]);
    const [loadingVehiculos, setLoadingVehiculos] = useState(false);

    // Todos los vehículos no entregados para calcular deudas
    const [todosVehiculos, setTodosVehiculos] = useState([]);

    const [showCargoForm, setShowCargoForm] = useState(false);
    const [nuevoCargo, setNuevoCargo] = useState({ monto: "", descripcion: "" });
    const [savingCargo, setSavingCargo] = useState(false);

    const xPagina = 15;

    // Cargar todos los vehículos no entregados una vez
    useEffect(() => {
        const unsub = firestore()
            .collection("vehiculos")
            .where("estatus", "!=", "EN")
            .onSnapshot((snap) => {
                const vehiculos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTodosVehiculos(vehiculos);
            });
        return () => unsub();
    }, []);

    // Calcular precio total de un vehículo
    const calcularPrecioVehiculo = (v) => {
        const price = parseFloat(v.price) || 0;
        const storage = parseFloat(v.storage) || 0;
        const sobrePeso = parseFloat(v.sobrePeso) || 0;
        const gastosExtra = parseFloat(v.gastosExtra) || 0;
        return price + storage + sobrePeso + gastosExtra;
    };

    // Calcular deuda y vehículos por cliente
    const getDeudaCliente = (nombreCliente) => {
        const vehiculosDelCliente = todosVehiculos.filter(v => v.cliente === nombreCliente);
        const total = vehiculosDelCliente.reduce((sum, v) => sum + calcularPrecioVehiculo(v), 0);
        return { vehiculos: vehiculosDelCliente.length, deuda: total };
    };

    // Ordenar clientes por deuda (mayor a menor)
    const clientes = useMemo(() => {
        return [...clientesRaw]
            .map(c => ({
                ...c,
                ...getDeudaCliente(c.cliente)
            }))
            .sort((a, b) => b.deuda - a.deuda);
    }, [clientesRaw, todosVehiculos]);

    const filtrados = clientes.filter(c => {
        const b = busqueda.toLowerCase();
        const ubi = `${c.ciudadCliente || ''} ${c.estadoCliente || ''} ${c.paisCliente || ''}`.toLowerCase();
        return c.cliente?.toLowerCase().includes(b) || c.telefonoCliente?.includes(b) ||
               c.apodoCliente?.toLowerCase().includes(b) || ubi.includes(b);
    });

    const paginados = filtrados.slice((pagina - 1) * xPagina, pagina * xPagina);
    const totalPags = Math.ceil(filtrados.length / xPagina) || 1;

    const copiarTelefono = (tel, id) => {
        navigator.clipboard.writeText(tel);
        setCopiadoId(id);
        setTimeout(() => setCopiadoId(null), 2000);
    };

    useEffect(() => {
        if (!clienteSeleccionado) {
            setVehiculosCliente([]);
            setCargosExtra([]);
            return;
        }

        setLoadingVehiculos(true);

        const unsubVehiculos = firestore()
            .collection("vehiculos")
            .where("cliente", "==", clienteSeleccionado.cliente)
            .onSnapshot((snap) => {
                const vehiculos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVehiculosCliente(vehiculos);
                setLoadingVehiculos(false);
            });

        const unsubCargos = firestore()
            .collection("clientes")
            .doc(clienteSeleccionado.id)
            .collection("cargosExtra")
            .orderBy("fecha", "desc")
            .onSnapshot((snap) => {
                const cargos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCargosExtra(cargos);
            });

        return () => {
            unsubVehiculos();
            unsubCargos();
        };
    }, [clienteSeleccionado]);

    const calcularDeudaVehiculos = () => {
        return vehiculosCliente
            .filter(v => v.estatus !== "EN")
            .reduce((sum, v) => sum + calcularPrecioVehiculo(v), 0);
    };

    const calcularCargosNoPagados = () => {
        return cargosExtra
            .filter(c => !c.pagado)
            .reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
    };

    const agregarCargoExtra = async () => {
        if (!nuevoCargo.monto || !nuevoCargo.descripcion.trim()) {
            alert("Completa monto y descripción");
            return;
        }

        setSavingCargo(true);
        try {
            await firestore()
                .collection("clientes")
                .doc(clienteSeleccionado.id)
                .collection("cargosExtra")
                .add({
                    monto: parseFloat(nuevoCargo.monto),
                    descripcion: nuevoCargo.descripcion.trim(),
                    fecha: new Date(),
                    pagado: false,
                    registradoPor: user?.nombre || "Admin"
                });

            setNuevoCargo({ monto: "", descripcion: "" });
            setShowCargoForm(false);
        } catch (error) {
            console.error("Error al agregar cargo:", error);
            alert("Error al agregar cargo");
        } finally {
            setSavingCargo(false);
        }
    };

    const marcarCargoPagado = async (cargoId) => {
        try {
            await firestore()
                .collection("clientes")
                .doc(clienteSeleccionado.id)
                .collection("cargosExtra")
                .doc(cargoId)
                .update({ pagado: true, fechaPago: new Date() });
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const eliminarCargo = async (cargoId) => {
        if (!confirm("¿Eliminar este cargo?")) return;
        try {
            await firestore()
                .collection("clientes")
                .doc(clienteSeleccionado.id)
                .collection("cargosExtra")
                .doc(cargoId)
                .delete();
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const handleEditarCliente = (cliente) => {
        setClienteAEditar(cliente);
        setShowFormModal(true);
    };

    const handleNuevoCliente = () => {
        setClienteAEditar(null);
        setShowFormModal(true);
    };

    const cerrarForm = () => {
        setShowFormModal(false);
        setClienteAEditar(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg text-red-600"></span>
            </div>
        );
    }

    // VISTA DETALLE DE CLIENTE
    if (clienteSeleccionado) {
        const deudaVehiculos = calcularDeudaVehiculos();
        const deudaCargos = calcularCargosNoPagados();
        const deudaTotal = deudaVehiculos + deudaCargos;
        const vehiculosPendientes = vehiculosCliente.filter(v => v.estatus !== "EN");

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => setClienteSeleccionado(null)}
                        className="btn btn-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border-none font-bold gap-2"
                    >
                        <FaChevronLeft /> Volver
                    </button>
                    <button
                        onClick={() => handleEditarCliente(clienteSeleccionado)}
                        className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none font-bold gap-2"
                    >
                        <FaEdit /> Editar
                    </button>
                </div>

                {/* Card Principal del Cliente */}
                <div className="bg-gradient-to-r from-red-500 to-red-500 rounded-2xl p-6 mb-6 text-white shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <p className="text-red-200 text-xs font-bold uppercase tracking-widest">Cliente #{clienteSeleccionado.folio}</p>
                            <h2 className="text-3xl font-black uppercase tracking-tight mt-1">
                                {clienteSeleccionado.cliente}
                            </h2>
                            {clienteSeleccionado.apodoCliente && (
                                <p className="text-red-100 text-sm mt-1">"{clienteSeleccionado.apodoCliente}"</p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-4">
                                <div className="flex items-center gap-2">
                                    <FaPhone className="text-red-200" size={12} />
                                    <span className="text-sm">{clienteSeleccionado.telefonoCliente}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-red-200" size={12} />
                                    <span className="text-sm">{clienteSeleccionado.ciudadCliente}, {clienteSeleccionado.estadoCliente}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center min-w-[180px]">
                            <p className="text-red-100 text-xs font-bold uppercase">Balance Total</p>
                            <p className="text-4xl font-black mt-1">
                                ${deudaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Resumen Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FaCar className="text-blue-600" />
                            </div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Vehículos</p>
                        </div>
                        <p className="text-2xl font-black text-gray-800">${deudaVehiculos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-400 mt-1">{vehiculosPendientes.length} pendientes</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <FaFileInvoiceDollar className="text-orange-600" />
                            </div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Cargos Extra</p>
                        </div>
                        <p className="text-2xl font-black text-gray-800">${deudaCargos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-400 mt-1">{cargosExtra.filter(c => !c.pagado).length} pendientes</p>
                    </div>
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 shadow-md text-white">
                        <p className="text-xs font-bold text-white uppercase">Total a Pagar</p>
                        <p className="text-3xl font-black text-white mt-2">${deudaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Vehículos Pendientes */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 mb-6">
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                        <FaCar className="text-red-600" /> Vehículos Pendientes
                    </h3>
                    {loadingVehiculos ? (
                        <div className="text-center py-8">
                            <span className="loading loading-spinner text-red-600"></span>
                        </div>
                    ) : vehiculosPendientes.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <FaCar className="mx-auto text-4xl mb-2 opacity-30" />
                            <p>No hay vehículos pendientes</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-100">
                                        <th className="text-gray-500 font-bold uppercase text-xs py-3">Lote</th>
                                        <th className="text-gray-500 font-bold uppercase text-xs">Modelo</th>
                                        <th className="text-gray-500 font-bold uppercase text-xs">Origen</th>
                                        <th className="text-gray-500 font-bold uppercase text-xs">Estatus</th>
                                        <th className="text-gray-500 font-bold uppercase text-xs text-right">Flete</th>
                                        <th className="text-gray-500 font-bold uppercase text-xs text-right">Storage</th>
                                        <th className="text-gray-500 font-bold uppercase text-xs text-right">Extras</th>
                                        <th className="text-gray-500 font-bold uppercase text-xs text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehiculosPendientes.map((v) => {
                                        const total = calcularPrecioVehiculo(v);
                                        return (
                                            <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="font-mono font-bold text-blue-700">{v.binNip}</td>
                                                <td className="font-semibold text-gray-800">{v.modelo}</td>
                                                <td className="text-gray-600 text-sm">{v.ciudad}, {v.estado}</td>
                                                <td>
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase">
                                                        {v.estatus}
                                                    </span>
                                                </td>
                                                <td className="text-right text-gray-700">${parseFloat(v.price || 0).toFixed(2)}</td>
                                                <td className="text-right text-gray-700">${parseFloat(v.storage || 0).toFixed(2)}</td>
                                                <td className="text-right text-gray-700">${(parseFloat(v.sobrePeso || 0) + parseFloat(v.gastosExtra || 0)).toFixed(2)}</td>
                                                <td className="text-right font-black text-gray-900">${total.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50">
                                        <td colSpan="7" className="text-right font-bold text-gray-600 uppercase text-sm">Total Vehículos:</td>
                                        <td className="text-right font-black text-lg text-red-600">${deudaVehiculos.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Cargos Extra */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            <FaFileInvoiceDollar className="text-orange-500" /> Cargos Extra
                        </h3>
                        <button
                            onClick={() => setShowCargoForm(!showCargoForm)}
                            className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none font-bold gap-2"
                        >
                            <FaPlus /> Agregar
                        </button>
                    </div>

                    <AnimatePresence>
                        {showCargoForm && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="w-full md:w-36">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Monto $</label>
                                            <input
                                                type="number"
                                                value={nuevoCargo.monto}
                                                onChange={(e) => setNuevoCargo({ ...nuevoCargo, monto: e.target.value })}
                                                className="input input-bordered w-full bg-white text-gray-800 font-bold mt-1"
                                                placeholder="200.00"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
                                            <input
                                                type="text"
                                                value={nuevoCargo.descripcion}
                                                onChange={(e) => setNuevoCargo({ ...nuevoCargo, descripcion: e.target.value })}
                                                className="input input-bordered w-full bg-white text-gray-800 mt-1"
                                                placeholder="Ej: Storage adicional, Grúa, etc."
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button
                                                onClick={agregarCargoExtra}
                                                disabled={savingCargo}
                                                className="btn bg-green-600 hover:bg-green-700 text-white border-none font-bold"
                                            >
                                                {savingCargo ? "..." : "Guardar"}
                                            </button>
                                            <button
                                                onClick={() => setShowCargoForm(false)}
                                                className="btn bg-gray-200 hover:bg-gray-300 text-gray-700 border-none"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {cargosExtra.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <FaFileInvoiceDollar className="mx-auto text-4xl mb-2 opacity-30" />
                            <p>No hay cargos extra</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cargosExtra.map((cargo) => (
                                <div
                                    key={cargo.id}
                                    className={`flex items-center justify-between p-4 rounded-xl ${cargo.pagado ? 'bg-gray-50' : 'bg-orange-50 border border-orange-200'}`}
                                >
                                    <div className="flex-1">
                                        <p className={`font-bold ${cargo.pagado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                            {cargo.descripcion}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {cargo.fecha?.toDate?.().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) || '-'}
                                            {cargo.pagado && cargo.fechaPago && (
                                                <span className="ml-2 text-green-600 font-semibold">
                                                    • Pagado {cargo.fechaPago?.toDate?.().toLocaleDateString('es-MX')}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-black text-xl ${cargo.pagado ? 'text-gray-400' : 'text-orange-600'}`}>
                                            ${parseFloat(cargo.monto).toFixed(2)}
                                        </span>
                                        {!cargo.pagado && (
                                            <>
                                                <button
                                                    onClick={() => marcarCargoPagado(cargo.id)}
                                                    className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none"
                                                    title="Marcar pagado"
                                                >
                                                    <FaCheck />
                                                </button>
                                                <button
                                                    onClick={() => eliminarCargo(cargo.id)}
                                                    className="btn btn-sm bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 border-none"
                                                    title="Eliminar"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Editar */}
                <AnimatePresence>
                    {showFormModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
                            onClick={cerrarForm}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                                    <h3 className="text-xl font-black text-gray-800 uppercase">
                                        {clienteAEditar ? 'Editar Cliente' : 'Nuevo Cliente'}
                                    </h3>
                                    <button onClick={cerrarForm} className="btn btn-sm btn-circle bg-gray-100 hover:bg-gray-200 border-none">
                                        <FaTimes />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <FormCliente
                                        user={user}
                                        clienteAEditar={clienteAEditar}
                                        onSuccess={() => {
                                            cerrarForm();
                                            if (clienteAEditar) {
                                                const updatedCliente = clientes.find(c => c.id === clienteAEditar.id);
                                                if (updatedCliente) setClienteSeleccionado(updatedCliente);
                                            }
                                        }}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    // VISTA LISTA
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="mb-6">
                <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter">
                    Clientes
                </h2>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                    {clientes.length} registrados
                </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="input w-full pl-12 bg-white border-2 border-gray-200 focus:border-red-500 text-gray-800 font-semibold rounded-xl"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    />
                </div>
                <button
                    onClick={handleNuevoCliente}
                    className="btn bg-red-600 hover:bg-red-700 text-white border-none font-black uppercase gap-2 rounded-xl"
                >
                    <FaUserPlus /> Agregar Cliente
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <table className="table w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-gray-500 font-bold uppercase text-xs py-4">#</th>
                            <th className="text-gray-500 font-bold uppercase text-xs">Cliente</th>
                            <th className="text-gray-500 font-bold uppercase text-xs text-center">Vehículos</th>
                            <th className="text-gray-500 font-bold uppercase text-xs text-right">Deuda Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginados.map((c) => (
                            <tr
                                key={c.id}
                                className="border-b border-gray-50 hover:bg-red-50 cursor-pointer transition-all"
                                onClick={() => setClienteSeleccionado(c)}
                            >
                                <td className="py-4 font-bold text-gray-400">{c.folio}</td>
                                <td className="py-4">
                                    <div className="font-black text-gray-800 uppercase">{c.cliente}</div>
                                    {c.apodoCliente && (
                                        <div className="text-xs text-gray-400 italic">"{c.apodoCliente}"</div>
                                    )}
                                </td>
                                <td className="text-center">
                                    {c.vehiculos > 0 ? (
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black text-sm">
                                            {c.vehiculos}
                                        </span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                <td className="text-right">
                                    {c.deuda > 0 ? (
                                        <span className="font-black text-lg text-red-600">
                                            ${c.deuda.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    ) : (
                                        <span className="text-gray-300 font-medium">$0.00</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        className="btn btn-sm bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 font-bold rounded-lg"
                        disabled={pagina === 1}
                        onClick={() => setPagina(p => p - 1)}
                    >
                        <FaChevronLeft /> Anterior
                    </button>
                    <span className="text-sm font-bold text-gray-500">
                        Página {pagina} de {totalPags}
                    </span>
                    <button
                        className="btn btn-sm bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 font-bold rounded-lg"
                        disabled={pagina >= totalPags}
                        onClick={() => setPagina(p => p + 1)}
                    >
                        Siguiente <FaChevronRight />
                    </button>
                </div>
            </div>

            {/* Modal Nuevo Cliente */}
            <AnimatePresence>
                {showFormModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
                        onClick={cerrarForm}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                                <h3 className="text-xl font-black text-gray-800 uppercase">
                                    Nuevo Cliente
                                </h3>
                                <button onClick={cerrarForm} className="btn btn-sm btn-circle bg-gray-100 hover:bg-gray-200 border-none">
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="p-4">
                                <FormCliente
                                    user={user}
                                    clienteAEditar={clienteAEditar}
                                    onSuccess={cerrarForm}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Clientes;
