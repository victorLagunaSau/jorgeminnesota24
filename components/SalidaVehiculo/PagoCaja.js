import React, {useState} from 'react';
import {firestore} from "../../firebase/firebaseIni";
import Pagado from './Pagado';  // Importa el componente Pagado
import moment from 'moment'; // Importamos moment.js

const PagoCaja = ({vehiculo, user}) => {

    const {
        ciudad,
        estado,
        modelo,
        marca,
        price, // Usamos 'price' para el pago
        storage, // Usamos 'storage' para overhead
        sobrePeso, // Usamos 'sobrePeso' para el pago sobrepeso
        gastosExtra // Usamos 'gastosExtra' para los gastos adicionales
    } = vehiculo[0] || {}; // Aseguramos que el vehículo esté disponible

    // Estados iniciales
    const [pago, setPago] = useState(price || 0);
    const [storageState, setStorage] = useState(storage || 0);
    const [sobrePesoState, setSobrePeso] = useState(sobrePeso || 0);
    const [gastosExtraState, setGastosExtra] = useState(gastosExtra || 0);
    const [recibo, setRecibo] = useState(0);
    const [reciboCC, setReciboCC] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [mensajeError, setMensajeError] = useState("");
    const [movimientoGuardado, setMovimientoGuardado] = useState(false);
    const [cobrado, setCobrado] = useState(false);
    const [vehiculoActualizado, setVehiculoActualizado] = useState([]);

    const total = parseFloat(sobrePesoState) + parseFloat(gastosExtraState) + parseFloat(storageState) + parseFloat(pago);
    const cajaCambio = parseFloat(recibo) + parseFloat(reciboCC) - total;

    const handleDarSalida = async () => {

        if (cajaCambio < 0) {
            setMensajeError("El cambio no puede ser 0 o negativo.");
            return;
        }

        if (cargando || movimientoGuardado) {
            return;
        }

        setCargando(true);

        try {
            const totalPago = parseFloat(storageState) + parseFloat(sobrePesoState) + parseFloat(gastosExtraState) + parseFloat(pago);

            await new Promise((resolve) => setTimeout(resolve, 2000)); // Simula un delay

            // Guardar en la colección de vehículos
            await firestore().collection("vehiculos").doc(vehiculo[0].binNip).update({
                estatus: "EN",
                timestamp: new Date(),
                pago: parseFloat(pago) || 0,
                storage: parseFloat(storageState) || 0,
                totalPago: parseFloat(totalPago) || 0,
                cajaRecibo: parseFloat(recibo) || 0,
                cajaCC: parseFloat(reciboCC) || 0,
                cajaCambio: parseFloat(cajaCambio) || 0,
                sobrePeso: parseFloat(sobrePesoState) || 0,
                gastosExtra: parseFloat(gastosExtraState) || 0,
                pagosPendientes: false
            });

            // Guardar en la colección de movimientos
            await firestore().collection("movimientos").add({
                tipo: "Salida",
                binNip: vehiculo[0].binNip,
                marca: vehiculo[0].marca,
                modelo: vehiculo[0].modelo,
                cliente: vehiculo[0].cliente,
                telefonoCliente: vehiculo[0].telefonoCliente,
                descripcion: vehiculo[0].descripcion,
                estado: vehiculo[0].estado,
                ciudad: vehiculo[0].ciudad,
                price: vehiculo[0].price,
                estatus: "EN",
                usuario: user.nombre,
                idUsuario: user.id,
                timestamp: new Date(),
                pago: parseFloat(pago) || 0,
                storage: parseFloat(storageState) || 0,
                totalPago: parseFloat(totalPago) || 0,
                cajaRecibo: parseFloat(recibo) || 0,
                cajaCambio: parseFloat(cajaCambio) || 0,
                cajaCC: parseFloat(reciboCC) || 0,
                sobrePeso: parseFloat(sobrePesoState) || 0,
                gastosExtra: parseFloat(gastosExtraState) || 0,
                pagosPendientes: false
            });

            // Actualizamos los datos del vehículo
            setVehiculoActualizado([{
                binNip: vehiculo[0].binNip,
                marca: vehiculo[0].marca,
                modelo: vehiculo[0].modelo,
                cliente: vehiculo[0].cliente,
                telefonoCliente: vehiculo[0].telefonoCliente,
                descripcion: vehiculo[0].descripcion,
                estado: vehiculo[0].estado,
                ciudad: vehiculo[0].ciudad,
                price: vehiculo[0].price,
                estatus: "EN",
                tipoRegistro: "EN",
                timestamp: new Date(),
                pago: pago,
                storage: storageState,
                totalPago: totalPago,
                sobrePeso: sobrePesoState,
                gastosExtra: gastosExtraState,
                titulo: vehiculo[0].titulo,
                cajaRecibo: recibo,
                cajaCambio: cajaCambio,
                cajaCC: reciboCC,
            }]);

            setMovimientoGuardado(true);
            setMensajeError("");

            setPago(0);
            setStorage(0);
            setSobrePeso(0);
            setGastosExtra(0);
            setRecibo(0);

            setCobrado(true);
        } catch (error) {
            setMensajeError("Ocurrió un error al actualizar el estatus del vehículo y registrar el movimiento");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            <p className="text-black-500 text-3xl">
                <strong className="mr-3"> Fecha de Registro: </strong> {
                vehiculo &&
                vehiculo[0] &&
                vehiculo[0].registro &&
                vehiculo[0].registro.timestamp &&
                vehiculo[0].registro.timestamp.seconds
                    ? moment(vehiculo[0].registro.timestamp.seconds * 1000).format('DD/MM/YYYY HH:mm:ss')
                    : moment().format('DD/MM/YYYY HH:mm:ss') // Si no hay timestamp, muestra la fecha actual
            }
            </p>
            {cobrado ? (
                <Pagado vehiculo={vehiculoActualizado}/>
            ) : (
                <div className="">
                    <label htmlFor="titulo" className="block text-black-500">Procedencia:</label>
                    <div className="flex">
                        <p className="ml-2">Ciudad: <strong>{ciudad}</strong></p>
                        <p className="ml-2">Estado: <strong>{estado}</strong></p>
                    </div>

                    <label htmlFor="titulo" className="block text-black-500">Vehículo:</label>
                    <div className="flex">
                        <p className="ml-2">Modelo: <strong>{modelo}</strong></p>
                        <p className="ml-2">Marca: <strong>{marca}</strong></p>
                    </div>

                    <p className="mt-4 text-xl">Precio de transporte: <strong>$ {price} DLL</strong></p>

                    <div>
                        <div className="p-1">
                            <div className="flex items-center">
                                $ <input
                                type="number"
                                id="pago"
                                value={pago}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "" || parseFloat(value) < 0) {
                                        setPago(0);
                                    } else {
                                        setPago(parseFloat(value).toString());
                                    }
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                            /> Dll
                            </div>
                        </div>

                        <div className="p-1">
                            <label htmlFor="storage" className="block text-black-500">Storage Overhead:</label>
                            <div className="flex items-center">
                                $ <input
                                type="number"
                                id="storage"
                                value={storageState}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "" || parseFloat(value) < 0) {
                                        setStorage(0);
                                    } else {
                                        setStorage(parseFloat(value).toString());
                                    }
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                            /> Dll
                            </div>
                        </div>

                        <div className="p-1">
                            <label htmlFor="sobrePeso" className="block text-black-500">Pago Sobre Peso:</label>
                            <div className="flex items-center">
                                $ <input
                                type="number"
                                id="sobrePeso"
                                value={sobrePesoState}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "" || parseFloat(value) < 0) {
                                        setSobrePeso(0);
                                    } else {
                                        setSobrePeso(parseFloat(value).toString());
                                    }
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                            /> Dll
                            </div>
                        </div>

                        <div className="p-1">
                            <label htmlFor="gastosExtra" className="block text-black-500">Gastos Extras:</label>
                            <div className="flex items-center">
                                $ <input
                                type="number"
                                id="gastosExtra"
                                value={gastosExtraState}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "" || parseFloat(value) < 0) {
                                        setGastosExtra(0);
                                    } else {
                                        setGastosExtra(parseFloat(value).toString());
                                    }
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                            /> Dll
                            </div>
                        </div>

                        <div className="p-1">
                            <label htmlFor="recibo" className="block text-black-500">Recibo Efectivo:</label>
                            <div className="flex items-center">
                                $ <input
                                type="number"
                                id="recibo"
                                value={recibo}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "" || parseFloat(value) < 0) {
                                        setRecibo(0);
                                    } else {
                                        setRecibo(parseFloat(value).toString());
                                    }
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                                min="0"
                                step="any"
                            /> Dll
                            </div>
                        </div>

                        <div className="p-1">
                            <label htmlFor="recibo" className="block text-black-500">Recibo CC:</label>
                            <div className="flex items-center">
                                $ <input
                                type="number"
                                id="reciboCC"
                                value={reciboCC}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "" || parseFloat(value) < 0) {
                                        setReciboCC(0);
                                    } else {
                                        setReciboCC(parseFloat(value).toString());
                                    }
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                                min="0"
                                step="any"
                            /> Dll
                            </div>
                        </div>
                        <p className="mt-4 text-4xl">Total: <strong>$ {total} DLL</strong></p>
                        <p className="mt-4 text-4xl">Cambio: <strong>$ {parseFloat(recibo) + parseFloat(reciboCC) - total} DLL</strong>
                        </p>
                    </div>

                    <div className="mt-4">
                        <button
                            className="btn btn-primary text-white-100 w-full"
                            onClick={handleDarSalida}
                            disabled={cargando || movimientoGuardado}
                        >
                            {cargando ? "Procesando..." : "Registrar Pago"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagoCaja;
