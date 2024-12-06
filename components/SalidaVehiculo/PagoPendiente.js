import React, { useState } from 'react';
import { firestore } from "../../firebase/firebaseIni";
import Pagado from './Pagado';  // Importa el componente Pagado

const PagoPendiente = ({ vehiculo, user }) => {
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
    const [pagoPrimero, setPagoPrimero] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [mensajeError, setMensajeError] = useState("");
    const [movimientoGuardado, setMovimientoGuardado] = useState(false);
    const [cobrado, setCobrado] = useState(false);
    const [vehiculoActualizado, setVehiculoActualizado] = useState([]);

    const total = parseFloat(sobrePesoState) + parseFloat(gastosExtraState) + parseFloat(storageState) + parseFloat(pago);
    const pagoTotalPendiente = total - parseFloat(pagoPrimero);

    const handleDarSalida = async () => {

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
                cajaRecibo: parseFloat(pagoPrimero) || 0,
                cajaCC: 0,
                cajaCambio: 0,
                sobrePeso: parseFloat(sobrePesoState) || 0 ,
                gastosExtra: parseFloat(gastosExtraState) || 0 ,
                pagosPendientes: true,
                pagoTotalPendiente: parseFloat(pagoTotalPendiente) || 0 ,
                pagos001: parseFloat(pagoPrimero) || 0,
                pagos002: 0,
                pagos003: 0,
                pagos004: 0,
                pagos005: 0,
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
                pago: parseFloat(pago) || 0  ,
                storage: parseFloat(storageState) || 0  ,
                totalPago: parseFloat(totalPago) || 0  ,
                cajaRecibo: parseFloat(pagoPrimero) || 0,
                cajaCambio: 0,
                cajaCC: 0,
                sobrePeso: parseFloat(sobrePesoState) || 0 ,
                gastosExtra: parseFloat(gastosExtraState) || 0 ,
                pagosPendientes: true,
                pagoTotalPendiente: pagoTotalPendiente,
                pagos001: parseFloat(pagoPrimero) || 0,
                pagos002: 0,
                pagos003: 0,
                pagos004: 0,
                pagos005: 0,
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
                cajaRecibo: parseFloat(pagoPrimero) || 0,
                cajaCambio: 0,
                cajaCC: 0,
                pagosPendientes: true,
                pagoTotalPendiente: pagoTotalPendiente,
                pagos001: parseFloat(pagoPrimero) || 0,
                pagos002: 0,
                pagos003: 0,
                pagos004: 0,
                pagos005: 0,
            }]);

            setMovimientoGuardado(true);
            setCobrado(true);
            setMensajeError("");

            setPago(0);
            setStorage(0);
            setSobrePeso(0);
            setGastosExtra(0);
            setRecibo(0);


        } catch (error) {
            setMensajeError("Ocurrió un error al actualizar el estatus del vehículo y registrar el movimiento");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
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
                            <label htmlFor="recibo" className="block text-black-500">Pago inicial:</label>
                            <div className="flex items-center">
                                $ <input
                                type="number"
                                id="pagoPrimero"
                                value={pagoPrimero}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "" || parseFloat(value) < 0) {
                                        setPagoPrimero(0);
                                    } else {
                                        setPagoPrimero(parseFloat(value).toString());
                                    }
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                                min="0"
                                step="any"
                            /> Dll
                            </div>
                        </div>


                        <p className="mt-4 text-4xl">Total: <strong>$ {total} DLL</strong></p>
                        <p className="mt-4 text-4xl">Pendiente por pagar: <strong>$ {total - parseFloat(pagoPrimero)} DLL</strong></p>
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

export default PagoPendiente;