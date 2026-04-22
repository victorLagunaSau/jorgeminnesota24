import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminData } from "../../../context/adminData";
import { firestore } from "../../../firebase/firebaseIni";
import FormCliente from "./FormCliente";
import {
    FaTimes, FaSearch, FaChevronLeft, FaChevronRight,
    FaPhone, FaMapMarkerAlt, FaEdit, FaUserPlus
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
    const [loadingVehiculos, setLoadingVehiculos] = useState(false);

    // Vehículos no entregados + entregados con fiado pendiente (nuevo o legacy)
    const [todosVehiculos, setTodosVehiculos] = useState([]);
    const [vehiculosFiados, setVehiculosFiados] = useState([]);
    const [vehiculosLegacy, setVehiculosLegacy] = useState([]);

    const xPagina = 15;

    // Vehículos aún no entregados (adeudan precio completo)
    useEffect(() => {
        const unsub = firestore()
            .collection("vehiculos")
            .where("estatus", "!=", "EN")
            .onSnapshot((snap) => {
                setTodosVehiculos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        return () => unsub();
    }, []);

    // Vehículos entregados con fiado pendiente (modelo nuevo)
    useEffect(() => {
        const unsub = firestore()
            .collection("vehiculos")
            .where("estadoPago", "==", "fiado")
            .onSnapshot((snap) => {
                setVehiculosFiados(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        return () => unsub();
    }, []);

    // Legacy: entregados con pagos pendientes en el esquema viejo
    useEffect(() => {
        const unsub = firestore()
            .collection("vehiculos")
            .where("pagosPendientes", "==", true)
            .onSnapshot((snap) => {
                setVehiculosLegacy(
                    snap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(v => v.estadoPago !== "pagado")
                );
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

    // Calcular deuda y vehículos por cliente combinando:
    //  - vehículos aún no entregados (precio completo)
    //  - vehículos entregados con fiado (saldoFiado)
    //  - vehículos legacy con pagosPendientes (pagoTotalPendiente)
    const getDeudaCliente = (nombreCliente) => {
        const enPatio = todosVehiculos.filter(v => v.cliente === nombreCliente);
        const deudaPatio = enPatio.reduce((sum, v) => sum + calcularPrecioVehiculo(v), 0);

        const fiadosCliente = vehiculosFiados.filter(v => v.cliente === nombreCliente);
        const deudaFiado = fiadosCliente.reduce(
            (sum, v) => sum + (parseFloat(v.saldoFiado) || 0),
            0
        );

        // Legacy: solo los que NO están ya contados como fiado nuevo
        const idsFiado = new Set(fiadosCliente.map(v => v.id));
        const legacyCliente = vehiculosLegacy.filter(
            v => v.cliente === nombreCliente && !idsFiado.has(v.id)
        );
        const deudaLegacy = legacyCliente.reduce(
            (sum, v) => sum + (parseFloat(v.pagoTotalPendiente) || 0),
            0
        );

        return {
            vehiculos: enPatio.length + fiadosCliente.length + legacyCliente.length,
            deuda: deudaPatio + deudaFiado + deudaLegacy,
        };
    };

    const clientes = useMemo(() => {
        return [...clientesRaw]
            .map(c => ({
                ...c,
                ...getDeudaCliente(c.cliente),
            }))
            .sort((a, b) => b.deuda - a.deuda);
    }, [clientesRaw, todosVehiculos, vehiculosFiados, vehiculosLegacy]);

    // Mantener clienteSeleccionado sincronizado con datos en tiempo real
    useEffect(() => {
        if (clienteSeleccionado) {
            const actualizado = clientes.find(c => c.id === clienteSeleccionado.id);
            if (actualizado) setClienteSeleccionado(actualizado);
        }
    }, [clientes]);

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
            return;
        }

        setLoadingVehiculos(true);

        const unsubVehiculos = firestore()
            .collection("vehiculos")
            .where("cliente", "==", clienteSeleccionado.cliente)
            .onSnapshot((snap) => {
                setVehiculosCliente(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingVehiculos(false);
            });

        return () => unsubVehiculos();
    }, [clienteSeleccionado]);

    // Un vehículo tiene deuda si aún no sale del patio, o si salió fiado (nuevo/legacy)
    const vehiculoConDeuda = (v) =>
        v.estatus !== "EN" ||
        v.estadoPago === "fiado" ||
        (v.pagosPendientes === true && v.estadoPago !== "pagado");

    const montoDeudaVehiculo = (v) => {
        if (v.estatus !== "EN") return calcularPrecioVehiculo(v);
        if (v.estadoPago === "fiado") return parseFloat(v.saldoFiado) || 0;
        if (v.pagosPendientes) return parseFloat(v.pagoTotalPendiente) || 0;
        return 0;
    };

    const calcularDeudaVehiculos = () =>
        vehiculosCliente
            .filter(vehiculoConDeuda)
            .reduce((sum, v) => sum + montoDeudaVehiculo(v), 0);

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
        const vehiculosPendientes = vehiculosCliente.filter(vehiculoConDeuda);
        const enEspera = vehiculosPendientes.filter(v => v.estatus !== "EN");
        const totalEspera = enEspera.reduce((sum, v) => sum + montoDeudaVehiculo(v), 0);

        const vehiculosFiadosCliente = vehiculosCliente.filter(
            (v) => v.estadoPago === "fiado" || (v.pagosPendientes === true && v.estadoPago !== "pagado")
        );
        const deudaFiadaCliente = vehiculosFiadosCliente.reduce(
            (sum, v) => sum + (parseFloat(v.saldoFiado) || parseFloat(v.pagoTotalPendiente) || 0),
            0
        );

        const deudaTotal = deudaVehiculos;

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
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">En Espera</p>
                        <p className="text-2xl font-black text-gray-800">${totalEspera.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-400 mt-1">{enEspera.length} vehículo{enEspera.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="rounded-xl p-5 shadow-md border-2" style={{ backgroundColor: '#f5e6c8', borderColor: '#c9a96e' }}>
                        <p className="text-xs font-black uppercase mb-2" style={{ color: '#8b6914' }}>Deuda Fiada</p>
                        <p className="text-2xl font-black" style={{ color: '#6b4f10' }}>
                            ${deudaFiadaCliente.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs font-black uppercase mt-1" style={{ color: '#a07d2e' }}>
                            {vehiculosFiadosCliente.length} fiada{vehiculosFiadosCliente.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 shadow-md text-white">
                        <p className="text-xs font-bold text-white uppercase mb-2">Total a Pagar</p>
                        <p className="text-3xl font-black text-white">${deudaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Tabla En Espera */}
                <div className="mb-10">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                        En Espera ({enEspera.length})
                    </p>
                    {loadingVehiculos ? (
                        <span className="loading loading-spinner loading-sm text-gray-300"></span>
                    ) : enEspera.length === 0 ? (
                        <p className="text-gray-300 text-sm">Sin vehículos en espera</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                                        <th className="py-2">Lote</th>
                                        <th>Vehículo</th>
                                        <th>Origen</th>
                                        <th>Estatus</th>
                                        <th className="text-right">Flete</th>
                                        <th className="text-right">Storage</th>
                                        <th className="text-right">Extras</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {enEspera.map((v) => (
                                        <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="font-mono font-bold text-blue-600">{v.binNip}</td>
                                            <td className="text-gray-700">{v.marca} {v.modelo}</td>
                                            <td className="text-gray-400">{v.ciudad}, {v.estado}</td>
                                            <td className="text-xs font-bold text-gray-400">{v.estatus}</td>
                                            <td className="text-right">${parseFloat(v.price || 0).toFixed(2)}</td>
                                            <td className="text-right">${parseFloat(v.storage || 0).toFixed(2)}</td>
                                            <td className="text-right">${(parseFloat(v.sobrePeso || 0) + parseFloat(v.gastosExtra || 0)).toFixed(2)}</td>
                                            <td className="text-right font-bold">${montoDeudaVehiculo(v).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="text-sm">
                                        <td colSpan="7" className="text-right text-gray-400 font-bold uppercase text-[10px] pt-2">Subtotal</td>
                                        <td className="text-right font-black pt-2">${totalEspera.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Tabla Fiados */}
                <div className="mb-10">
                    <p className="text-xs font-black text-orange-500 uppercase tracking-wide mb-3">
                        Fiados ({vehiculosFiadosCliente.length})
                    </p>
                    {loadingVehiculos ? (
                        <span className="loading loading-spinner loading-sm text-gray-300"></span>
                    ) : vehiculosFiadosCliente.length === 0 ? (
                        <p className="text-gray-300 text-sm">Sin vehículos fiados</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm w-full">
                                <thead>
                                    <tr className="border-b border-orange-200 text-[10px] text-orange-400 font-bold uppercase">
                                        <th className="py-2">Fecha Cobro</th>
                                        <th>Lote</th>
                                        <th>Vehículo</th>
                                        <th className="text-right">Precio</th>
                                        <th className="text-right">Abono</th>
                                        <th className="text-right">Cobrado</th>
                                        <th className="text-right">Pendiente</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {vehiculosFiadosCliente.map((v) => {
                                        const saldo = parseFloat(v.saldoFiado) || parseFloat(v.pagoTotalPendiente) || 0;
                                        const precio = calcularPrecioVehiculo(v);
                                        const cobrado = (parseFloat(v.cajaRecibo) || 0) - (parseFloat(v.cajaCambio) || 0) + (parseFloat(v.cajaCC) || 0);
                                        const fechaCobro = v.timestamp?.seconds
                                            ? new Date(v.timestamp.seconds * 1000).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : v.timestamp instanceof Date
                                                ? v.timestamp.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '-';
                                        return (
                                            <tr key={v.id} className="border-b border-gray-50 hover:bg-orange-50/30">
                                                <td className="text-gray-500 text-xs whitespace-nowrap">{fechaCobro}</td>
                                                <td className="font-mono font-bold text-blue-600">{v.binNip}</td>
                                                <td className="text-gray-700">{v.marca} {v.modelo}</td>
                                                <td className="text-right">${precio.toFixed(2)}</td>
                                                <td className="text-right text-green-600">${cobrado.toFixed(2)}</td>
                                                <td className="text-right font-bold">${cobrado.toFixed(2)}</td>
                                                <td className="text-right font-bold text-orange-600">${saldo.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="text-sm">
                                        <td colSpan="6" className="text-right text-orange-400 font-bold uppercase text-[10px] pt-2">Subtotal</td>
                                        <td className="text-right font-black text-orange-600 pt-2">${deudaFiadaCliente.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
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
                                        onSuccess={cerrarForm}
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
