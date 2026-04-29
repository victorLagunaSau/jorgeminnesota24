import React, { useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { firestore } from "../../../firebase/firebaseIni";
import { FaMoneyBillWave, FaCheckCircle, FaExclamationTriangle, FaSearch, FaPrint, FaCreditCard } from 'react-icons/fa';
import moment from 'moment';
import ReciboAdelanto from './ReciboAdelanto';

const PagoAdelantado = ({ user }) => {
    // Datos del vehículo
    const [binNip, setBinNip] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [cliente, setCliente] = useState('');
    const [telefonoCliente] = useState('');
    const [estado, setEstado] = useState('');
    const [ciudad, setCiudad] = useState('');
    const [price, setPrice] = useState(0);

    // Monto adelantado y método de pago
    const [montoAdelanto, setMontoAdelanto] = useState(0);
    const [metodoPago, setMetodoPago] = useState('efectivo'); // 'efectivo' o 'cc'

    // Estados del componente
    const [estados, setEstados] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [mensajeError, setMensajeError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');
    const [vehiculoExistente, setVehiculoExistente] = useState(null);
    const [buscando, setBuscando] = useState(false);

    // Modal de confirmación y recibo
    const [modalConfirmar, setModalConfirmar] = useState(false);
    const [modalRecibo, setModalRecibo] = useState(false);
    const [datosRecibo, setDatosRecibo] = useState(null);

    // Cargar estados/provincias
    useEffect(() => {
        const fetchEstados = async () => {
            try {
                const snap = await firebase.firestore().collection("province").get();
                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    state: doc.data().state,
                    regions: doc.data().regions || []
                }));
                setEstados(data);
            } catch (error) {
                console.error("Error fetching estados:", error);
            }
        };
        fetchEstados();
    }, []);

    // Limpiar mensajes después de 5 segundos
    useEffect(() => {
        if (mensajeError || mensajeExito) {
            const t = setTimeout(() => {
                setMensajeError('');
                setMensajeExito('');
            }, 5000);
            return () => clearTimeout(t);
        }
    }, [mensajeError, mensajeExito]);

    const handleEstadoChange = (value) => {
        setEstado(value);
        const sel = estados.find(e => e.state === value);
        if (sel) {
            setCiudades(sel.regions);
            if (sel.regions.length > 0) {
                setCiudad(sel.regions[0].city);
                const p = parseFloat(sel.regions[0].price || 0);
                setPrice(p);
                setMontoAdelanto(p);
            }
        } else {
            setCiudades([]);
            setCiudad('');
            setPrice(0);
        }
    };

    const handleCiudadChange = (value) => {
        setCiudad(value);
        const selEstado = estados.find(e => e.state === estado);
        const selRegion = selEstado?.regions?.find(r => r.city === value);
        if (selRegion) {
            const p = parseFloat(selRegion.price || 0);
            setPrice(p);
            setMontoAdelanto(p);
        }
    };

    // Buscar si el lote ya existe en vehiculos
    const buscarLote = async () => {
        if (!binNip.trim()) {
            setMensajeError("Ingresa un número de lote.");
            return;
        }
        setBuscando(true);
        setVehiculoExistente(null);
        try {
            const doc = await firestore().collection("vehiculos").doc(binNip.trim()).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.estatus === "PA") {
                    setMensajeError("Este lote ya tiene un pago adelantado registrado.");
                } else if (data.estatus === "EN") {
                    setMensajeError("Este lote ya fue entregado/pagado.");
                } else {
                    // Vehículo existe, prellenar datos
                    setVehiculoExistente(data);
                    setMarca(data.marca || '');
                    setModelo(data.modelo || '');
                    setCliente(data.cliente || '');
                    setTelefonoCliente(data.telefonoCliente || '');
                    setEstado(data.estado || '');
                    setCiudad(data.ciudad || '');
                    setPrice(parseFloat(data.price || 0));
                    setMontoAdelanto(parseFloat(data.price || 0));
                    // Cargar ciudades del estado
                    const sel = estados.find(e => e.state === data.estado);
                    if (sel) setCiudades(sel.regions);
                }
            }
        } catch (error) {
            console.error("Error buscando lote:", error);
        } finally {
            setBuscando(false);
        }
    };

    const validarFormulario = () => {
        if (!binNip.trim()) return "El número de lote es obligatorio.";
        if (!marca.trim()) return "La marca es obligatoria.";
        if (!modelo.trim()) return "El modelo es obligatorio.";
        if (!cliente.trim()) return "El cliente es obligatorio.";
        if (!estado) return "Selecciona un estado.";
        if (!ciudad) return "Selecciona una ciudad.";
        if (montoAdelanto <= 0) return "El monto del adelanto debe ser mayor a 0.";
        return null;
    };

    const handleConfirmar = () => {
        const error = validarFormulario();
        if (error) {
            setMensajeError(error);
            return;
        }
        setModalConfirmar(true);
    };

    const ejecutarPagoAdelantado = async () => {
        setModalConfirmar(false);
        setCargando(true);
        setMensajeError('');

        try {
            const timestamp = moment().toDate();
            const lote = binNip.trim();

            if (vehiculoExistente) {
                // Vehículo ya existe → actualizar con datos de anticipo
                await firestore().collection("vehiculos").doc(lote).update({
                    anticipoPago: parseFloat(montoAdelanto),
                    anticipoMetodo: metodoPago,
                    anticipoTimestamp: timestamp,
                    anticipoUsuario: user.nombre || "Admin",
                    anticipoIdUsuario: user.id || "N/A",
                    estatusAnterior: vehiculoExistente.estatus,
                });
            } else {
                // Vehículo NO existe → crear nuevo con estatus PA
                await firestore().collection("vehiculos").doc(lote).set({
                    binNip: lote,
                    marca: marca,
                    modelo: modelo,
                    cliente: cliente,
                    telefonoCliente: telefonoCliente,
                    estado: estado,
                    ciudad: ciudad,
                    price: price,
                    estatus: "PA",
                    asignado: false,
                    active: true,
                    storage: 0,
                    sobrePeso: 0,
                    gastosExtra: 0,
                    titulo: "NO",
                    anticipoPago: parseFloat(montoAdelanto),
                    anticipoMetodo: metodoPago,
                    anticipoTimestamp: timestamp,
                    anticipoUsuario: user.nombre || "Admin",
                    anticipoIdUsuario: user.id || "N/A",
                    registro: {
                        usuario: user.nombre,
                        idUsuario: user.id,
                        timestamp: timestamp
                    }
                });
            }

            // Registrar movimiento (cajaRecibo/cajaCC para que el corte lo separe)
            const monto = parseFloat(montoAdelanto);
            await firestore().collection("movimientos").add({
                tipo: "Anticipo",
                binNip: lote,
                marca: marca,
                modelo: modelo,
                cliente: cliente,
                telefonoCliente: telefonoCliente,
                estado: estado,
                ciudad: ciudad,
                price: price,
                anticipoPago: monto,
                cajaRecibo: metodoPago === 'efectivo' ? monto : 0,
                cajaCC: metodoPago === 'cc' ? monto : 0,
                cajaCambio: 0,
                metodoPagoAnticipo: metodoPago,
                estatus: "PA",
                usuario: user.nombre,
                idUsuario: user.id,
                timestamp: timestamp,
            });

            setDatosRecibo({
                binNip: lote,
                marca, modelo, cliente, telefonoCliente,
                estado, ciudad, price,
                anticipoPago: parseFloat(montoAdelanto),
                metodoPago: metodoPago,
                usuario: user.nombre || "Admin",
            });
            setMensajeExito(`Pago adelantado de $${montoAdelanto} DLL registrado para lote ${lote}`);
            setModalRecibo(true);
            limpiarFormulario();
        } catch (error) {
            console.error("Error registrando pago adelantado:", error);
            setMensajeError("Error al registrar el pago adelantado: " + (error.message || error));
        } finally {
            setCargando(false);
        }
    };

    const limpiarFormulario = () => {
        setBinNip('');
        setMarca('');
        setModelo('');
        setCliente('');
        setEstado('');
        setCiudad('');
        setPrice(0);
        setMontoAdelanto(0);
        setMetodoPago('efectivo');
        setCiudades([]);
        setVehiculoExistente(null);
    };

    const permiso = () => user?.caja === true;

    if (!permiso()) {
        return (
            <div className="text-red-500 text-center mt-10">
                <h1 className="text-2xl">Acceso Denegado</h1>
                <p>No tienes permisos para acceder a esta área.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto mt-6">
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl lg:text-3xl font-medium text-black leading-normal text-center">
                    Área de Trabajo: <strong>Pago Adelantado</strong>
                </h1>
                <p className="text-gray-500 mt-2 mb-6 text-center">
                    Registra el pago anticipado de un vehículo antes de que llegue.
                </p>
            </div>

            {/* Alertas */}
            {mensajeError && (
                <div className="alert alert-error mb-4 shadow-md text-white font-bold">
                    <FaExclamationTriangle />
                    <span>{mensajeError}</span>
                </div>
            )}
            {mensajeExito && (
                <div className="alert alert-success mb-4 shadow-md text-white font-bold">
                    <FaCheckCircle />
                    <span>{mensajeExito}</span>
                </div>
            )}

            <div className="bg-white shadow-md rounded-lg p-6">
                {/* Buscar lote */}
                <div className="mb-4">
                    <label className="block text-black font-bold mb-1">Número de Lote (BIN):</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={binNip}
                            onChange={(e) => setBinNip(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') buscarLote(); }}
                            className="input input-bordered w-full bg-white text-black"
                            placeholder="Ingresa el lote..."
                            maxLength={16}
                        />
                        <button
                            onClick={buscarLote}
                            className="btn btn-info text-white gap-1"
                            disabled={buscando}
                        >
                            <FaSearch /> {buscando ? "..." : "Buscar"}
                        </button>
                    </div>
                    {vehiculoExistente && (
                        <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-500 text-sm text-blue-800 font-bold">
                            Vehículo encontrado — {vehiculoExistente.marca} {vehiculoExistente.modelo} — Estatus: {vehiculoExistente.estatus}. Se le agregará el anticipo.
                        </div>
                    )}
                </div>

                {/* Datos del vehículo */}
                <div className="flex flex-wrap">
                    <div className="w-1/2 p-1">
                        <label className="block text-black text-sm font-bold">Marca:</label>
                        <input
                            type="text"
                            value={marca}
                            onChange={(e) => setMarca(e.target.value)}
                            className="input input-bordered input-sm w-full bg-white text-black"
                        />
                    </div>
                    <div className="w-1/2 p-1">
                        <label className="block text-black text-sm font-bold">Modelo:</label>
                        <input
                            type="text"
                            value={modelo}
                            onChange={(e) => setModelo(e.target.value)}
                            className="input input-bordered input-sm w-full bg-white text-black"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap">
                    <div className="w-full p-1">
                        <label className="block text-black text-sm font-bold">Cliente:</label>
                        <input
                            type="text"
                            value={cliente}
                            onChange={(e) => setCliente(e.target.value)}
                            className="input input-bordered input-sm w-full bg-white text-black"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap">
                    <div className="w-1/2 p-1">
                        <label className="block text-black text-sm font-bold">Estado:</label>
                        <select
                            value={estado}
                            onChange={(e) => handleEstadoChange(e.target.value)}
                            className="select select-bordered select-sm w-full bg-white text-black"
                        >
                            <option value="">Seleccione...</option>
                            {estados.map(e => (
                                <option key={e.id} value={e.state}>{e.state}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-1/2 p-1">
                        <label className="block text-black text-sm font-bold">Ciudad:</label>
                        <select
                            value={ciudad}
                            onChange={(e) => handleCiudadChange(e.target.value)}
                            className="select select-bordered select-sm w-full bg-white text-black"
                            disabled={ciudades.length === 0}
                        >
                            <option value="">Seleccione...</option>
                            {ciudades.map(c => (
                                <option key={c.city} value={c.city}>{c.city}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-end">
                    <div className="w-1/3 p-1">
                        <label className="block text-gray-500 text-sm">Precio flete (referencia):</label>
                        <p className="text-lg font-bold">$ {price} DLL</p>
                    </div>
                </div>

                {/* Monto del adelanto */}
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                    <label className="block text-green-800 font-black text-lg mb-1">
                        <FaMoneyBillWave className="inline mr-2" />
                        Monto que paga el cliente:
                    </label>
                    <div className="flex items-center">
                        <span className="text-2xl font-bold mr-2">$</span>
                        <input
                            type="number"
                            value={montoAdelanto}
                            onChange={(e) => {
                                const val = e.target.value;
                                setMontoAdelanto(val === "" || parseFloat(val) < 0 ? 0 : parseFloat(val));
                            }}
                            className="input input-bordered input-lg w-full bg-white text-black text-3xl font-bold text-center"
                            min="0"
                            step="any"
                        />
                        <span className="text-2xl font-bold ml-2">DLL</span>
                    </div>
                    {montoAdelanto < price && montoAdelanto > 0 && (
                        <p className="text-orange-600 font-bold text-sm mt-1">
                            El cliente paga ${montoAdelanto} de ${price} — al llegar se cobrará la diferencia + extras
                        </p>
                    )}

                    {/* Método de pago */}
                    <div className="mt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMetodoPago('efectivo')}
                            className={`btn btn-sm flex-1 gap-1 font-black uppercase ${metodoPago === 'efectivo' ? 'btn-success text-white' : 'btn-outline btn-success'}`}
                        >
                            <FaMoneyBillWave /> Efectivo
                        </button>
                        <button
                            type="button"
                            onClick={() => setMetodoPago('cc')}
                            className={`btn btn-sm flex-1 gap-1 font-black uppercase ${metodoPago === 'cc' ? 'btn-info text-white' : 'btn-outline btn-info'}`}
                        >
                            <FaCreditCard /> CC
                        </button>
                    </div>
                </div>

                {/* Botón registrar */}
                <div className="mt-6">
                    <button
                        className="btn btn-success text-white w-full text-lg gap-2"
                        onClick={handleConfirmar}
                        disabled={cargando}
                    >
                        <FaMoneyBillWave />
                        {cargando ? "Procesando..." : "Registrar Pago Adelantado"}
                    </button>
                </div>
            </div>

            {/* Modal de confirmación */}
            {modalConfirmar && (
                <div className="modal modal-open">
                    <div className="modal-box bg-white">
                        <h3 className="font-bold text-lg text-black">Confirmar Pago Adelantado</h3>
                        <div className="py-4 text-black">
                            <p><strong>Lote:</strong> {binNip}</p>
                            <p><strong>Vehículo:</strong> {marca} {modelo}</p>
                            <p><strong>Cliente:</strong> {cliente}</p>
                            <p><strong>Destino:</strong> {ciudad}, {estado}</p>
                            <p className="text-2xl font-black text-green-700 mt-3">
                                Anticipo: ${montoAdelanto} DLL
                            </p>
                            <p className={`text-sm font-black mt-1 ${metodoPago === 'cc' ? 'text-blue-600' : 'text-green-600'}`}>
                                Método: {metodoPago === 'cc' ? 'CC' : 'Efectivo'}
                            </p>
                            {vehiculoExistente && (
                                <p className="text-sm text-blue-600 mt-2 font-bold">
                                    El anticipo se agregará al vehículo existente (estatus {vehiculoExistente.estatus}).
                                </p>
                            )}
                            {!vehiculoExistente && (
                                <p className="text-sm text-gray-500 mt-2">
                                    Se creará un nuevo registro con estatus "PA" (Pago Adelantado).
                                </p>
                            )}
                        </div>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setModalConfirmar(false)}>
                                Cancelar
                            </button>
                            <button className="btn btn-success text-white" onClick={ejecutarPagoAdelantado}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de recibo para imprimir */}
            {modalRecibo && datosRecibo && (
                <div className="fixed inset-0 flex justify-center items-center z-50">
                    <div className="modal-box max-w-5xl w-full bg-white">
                        <ReciboAdelanto
                            onClose={() => setModalRecibo(false)}
                            data={datosRecibo}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagoAdelantado;
