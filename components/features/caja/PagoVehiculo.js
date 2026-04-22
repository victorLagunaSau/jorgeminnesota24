import React, { useState } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import Pagado from './Pagado';
import moment from 'moment';

const PagoVehiculo = ({ vehiculo, user }) => {
    const {
        ciudad,
        estado,
        modelo,
        marca,
        price,
        storage,
        sobrePeso,
        gastosExtra,
        comentarioRegistro,
        comentarioRecepcion,
        anticipoPago,
    } = vehiculo[0] || {};

    const montoAnticipo = parseFloat(anticipoPago || 0);
    const tieneAnticipo = montoAnticipo > 0;

    const notaRegistroTxt = (comentarioRegistro || "").trim();
    const notaRecepcionTxt = (comentarioRecepcion || "").trim();
    const notaCombinada = [notaRegistroTxt, notaRecepcionTxt].filter(Boolean).join(" — ");
    const tieneNotas = notaCombinada !== "";

    const [pago, setPago] = useState(price || 0);
    const [storageState, setStorage] = useState(storage || 0);
    const [sobrePesoState, setSobrePeso] = useState(sobrePeso || 0);
    const [gastosExtraState, setGastosExtra] = useState(gastosExtra || 0);
    const [recibo, setRecibo] = useState(0);
    const [reciboCC, setReciboCC] = useState(0);
    const [credito, setCredito] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [mensajeError, setMensajeError] = useState("");
    const [movimientoGuardado, setMovimientoGuardado] = useState(false);
    const [cobrado, setCobrado] = useState(false);
    const [vehiculoActualizado, setVehiculoActualizado] = useState([]);

    const total =
        parseFloat(sobrePesoState) +
        parseFloat(gastosExtraState) +
        parseFloat(storageState) +
        parseFloat(pago);
    const totalConAnticipo = total - montoAnticipo;
    const restante = totalConAnticipo > 0 ? totalConAnticipo : 0;
    const montoACubrir = tieneAnticipo ? restante : total;

    const pEfectivo = parseFloat(recibo) || 0;
    const pCC = parseFloat(reciboCC) || 0;
    const pCredito = parseFloat(credito) || 0;
    const cubierto = pEfectivo + pCC + pCredito;

    // Si hay crédito, no puede haber cambio (efectivo+CC no debe exceder total)
    // Si no hay crédito, el cambio se calcula como sobra de efectivo+CC
    const cajaCambio = pCredito > 0
        ? 0
        : (pEfectivo + pCC - montoACubrir);

    const esFiado = pCredito > 0;

    const ID_USUARIO_PERMITIDO = "BdRfEmYfd7ZLjWQHB06uuT6w2112";
    const edicionPermitida = user.id === ID_USUARIO_PERMITIDO;

    const handleDarSalida = async () => {
        if (cargando || movimientoGuardado) return;

        if (pCredito > 0 && pEfectivo + pCC + pCredito !== montoACubrir) {
            setMensajeError(
                `Si hay crédito, la suma de Efectivo + CC + Crédito debe ser exactamente $${montoACubrir.toFixed(
                    2
                )}.`
            );
            return;
        }
        if (pCredito === 0 && cubierto < montoACubrir) {
            setMensajeError("El cliente no ha cubierto el total, aún falta dinero.");
            return;
        }

        setCargando(true);

        try {
            const totalPago = total;
            let nuevoFolio = null;

            await firestore().runTransaction(async (transaction) => {
                const folioRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");
                const folioDoc = await transaction.get(folioRef);

                if (!folioDoc.exists) {
                    throw "Documento de consecutivos no existe";
                }

                const data = folioDoc.data();
                const folioActual = data.folioventa || 0;
                nuevoFolio = folioActual + 1;

                transaction.update(folioRef, { folioventa: nuevoFolio });
            });

            const payload = {
                estatus: "EN",
                timestamp: new Date(),
                pago: parseFloat(pago) || 0,
                storage: parseFloat(storageState) || 0,
                totalPago: parseFloat(totalPago) || 0,
                cajaRecibo: pEfectivo,
                cajaCC: pCC,
                cajaCambio: parseFloat(cajaCambio) || 0,
                sobrePeso: parseFloat(sobrePesoState) || 0,
                gastosExtra: parseFloat(gastosExtraState) || 0,
                folioVenta: nuevoFolio,
                anticipoPago: montoAnticipo || 0,
                estadoPago: esFiado ? "fiado" : "pagado",
                creditoOtorgado: pCredito,
                saldoFiado: pCredito,
                abonosFiado: [],
                pagosPendientes: false,
            };

            await firestore()
                .collection(COLLECTIONS.VEHICULOS)
                .doc(vehiculo[0].binNip)
                .update(payload);

            await firestore().collection(COLLECTIONS.MOVIMIENTOS).add({
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
                cajaRecibo: pEfectivo,
                cajaCambio: parseFloat(cajaCambio) || 0,
                cajaCC: pCC,
                sobrePeso: parseFloat(sobrePesoState) || 0,
                gastosExtra: parseFloat(gastosExtraState) || 0,
                folioVenta: nuevoFolio,
                anticipoPago: montoAnticipo || 0,
                estadoPago: esFiado ? "fiado" : "pagado",
                creditoOtorgado: pCredito,
                saldoFiado: pCredito,
                pagosPendientes: false,
            });

            setVehiculoActualizado([
                {
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
                    pago,
                    storage: storageState,
                    totalPago,
                    sobrePeso: sobrePesoState,
                    gastosExtra: gastosExtraState,
                    titulo: vehiculo[0].titulo,
                    cajaRecibo: pEfectivo,
                    cajaCambio: cajaCambio,
                    cajaCC: pCC,
                    folioVenta: nuevoFolio,
                    anticipoPago: montoAnticipo || 0,
                    estadoPago: esFiado ? "fiado" : "pagado",
                    creditoOtorgado: pCredito,
                    saldoFiado: pCredito,
                },
            ]);

            setMovimientoGuardado(true);
            setMensajeError("");
            setPago(0);
            setStorage(0);
            setSobrePeso(0);
            setGastosExtra(0);
            setRecibo(0);
            setReciboCC(0);
            setCredito(0);
            setCobrado(true);
        } catch (error) {
            console.error("Error al registrar movimiento:", error);
            let mensaje = "Ocurrió un error al procesar el pago.";
            if (typeof error === "string") mensaje += " Detalles: " + error;
            else if (error instanceof Error) mensaje += " Detalles: " + error.message;
            else if (error?.code) mensaje += ` Código: ${error.code}`;
            setMensajeError(mensaje);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            <p className="text-black-500 text-3xl">
                <strong className="mr-3">Registro de vehículo: </strong>{" "}
                {vehiculo &&
                vehiculo[0] &&
                vehiculo[0].registro &&
                vehiculo[0].registro.timestamp &&
                vehiculo[0].registro.timestamp.seconds
                    ? moment(vehiculo[0].registro.timestamp.seconds * 1000).format(
                          'DD/MM/YYYY HH:mm:ss'
                      )
                    : moment().format('DD/MM/YYYY HH:mm:ss')}
            </p>
            {cobrado ? (
                <Pagado vehiculo={vehiculoActualizado} />
            ) : (
                <div>
                    <label className="block text-black-500">Procedencia:</label>
                    <div className="flex">
                        <p className="ml-2">Ciudad: <strong>{ciudad}</strong></p>
                        <p className="ml-2">Estado: <strong>{estado}</strong></p>
                    </div>
                    <label className="block text-black-500">Vehículo:</label>
                    <div className="flex">
                        <p className="ml-2">Modelo: <strong>{modelo}</strong></p>
                        <p className="ml-2">Marca: <strong>{marca}</strong></p>
                    </div>
                    <p className="mt-4 text-xl">
                        Precio de transporte: <strong>$ {price} DLL</strong>
                    </p>

                    {tieneNotas && (
                        <div className="mt-4 p-1 rounded-xl border-l-8 border-red-700 bg-red-500 shadow-lg">
                            <p className="text-2xl font-black text-white uppercase tracking-widest mb-3">
                                Nota:
                            </p>
                            <p className="text-2xl font-black text-black leading-snug">
                                {notaCombinada}
                            </p>
                        </div>
                    )}

                    {tieneAnticipo && (
                        <div className="mt-4 p-4 rounded-xl border-l-8 border-green-700 bg-green-100 shadow-lg">
                            <p className="text-xl font-black text-green-800 uppercase">
                                Pago Adelantado: ${montoAnticipo} DLL
                            </p>
                            <p className="text-lg font-bold text-black mt-1">
                                Total sin anticipo: ${total.toFixed(2)} DLL
                            </p>
                            <p className="text-2xl font-black text-green-700 mt-1">
                                Resta por cobrar: ${restante.toFixed(2)} DLL
                            </p>
                        </div>
                    )}

                    <div className="p-1">
                        <div className="flex items-center">
                            $ <input
                                type="number"
                                value={pago}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setPago(v === "" || parseFloat(v) < 0 ? 0 : parseFloat(v).toString());
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                                disabled={!edicionPermitida}
                            /> Dll
                        </div>
                    </div>
                    <div className="p-1">
                        <label className="block text-black-500">Storage Overhead:</label>
                        <div className="flex items-center">
                            $ <input
                                type="number"
                                value={storageState}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setStorage(v === "" || parseFloat(v) < 0 ? 0 : parseFloat(v).toString());
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                                disabled={!edicionPermitida}
                            /> Dll
                        </div>
                    </div>
                    <div className="p-1">
                        <label className="block text-black-500">Pago Sobre Peso:</label>
                        <div className="flex items-center">
                            $ <input
                                type="number"
                                value={sobrePesoState}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setSobrePeso(v === "" || parseFloat(v) < 0 ? 0 : parseFloat(v).toString());
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                                disabled={!edicionPermitida}
                            /> Dll
                        </div>
                    </div>
                    <div className="p-1">
                        <label className="block text-black-500">Gastos Extras:</label>
                        <div className="flex items-center">
                            $ <input
                                type="number"
                                value={gastosExtraState}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setGastosExtra(v === "" || parseFloat(v) < 0 ? 0 : parseFloat(v).toString());
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                min="0"
                                step="any"
                                disabled={!edicionPermitida}
                            /> Dll
                        </div>
                    </div>
                    <div className="p-1 mt-2">
                        <label className="block text-black-500 font-bold">Recibo Efectivo:</label>
                        <div className="flex items-center">
                            $ <input
                                type="number"
                                value={recibo}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setRecibo(v === "" || parseFloat(v) < 0 ? 0 : parseFloat(v).toString());
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                                min="0"
                                step="any"
                            /> Dll
                        </div>
                    </div>
                    <div className="p-1">
                        <label className="block text-black-500 font-bold">Recibo CC:</label>
                        <div className="flex items-center">
                            $ <input
                                type="number"
                                value={reciboCC}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setReciboCC(v === "" || parseFloat(v) < 0 ? 0 : parseFloat(v).toString());
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                                min="0"
                                step="any"
                            /> Dll
                        </div>
                    </div>
                    <div className="p-1">
                        <label className="block text-black-500 font-bold text-orange-700">
                            Crédito (Fiado al Cliente):
                        </label>
                        <div className="flex items-center">
                            $ <input
                                type="number"
                                value={credito}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setCredito(v === "" || parseFloat(v) < 0 ? 0 : parseFloat(v).toString());
                                }}
                                className="input input-bordered w-full text-black-500 input-lg bg-orange-50 mx-1 text-4xl border-orange-300"
                                min="0"
                                step="any"
                            /> Dll
                        </div>
                    </div>

                    <p className="mt-4 text-4xl">Total: <strong>$ {total.toFixed(2)} DLL</strong></p>
                    {tieneAnticipo && (
                        <p className="mt-2 text-2xl text-green-700">
                            Anticipo: <strong>- ${montoAnticipo} DLL</strong>
                        </p>
                    )}
                    {tieneAnticipo && (
                        <p className="mt-2 text-3xl font-black text-green-800">
                            A cobrar: <strong>$ {restante.toFixed(2)} DLL</strong>
                        </p>
                    )}
                    <p className="mt-2 text-2xl">
                        Efectivo + CC + Crédito: <strong>$ {cubierto.toFixed(2)} DLL</strong>
                    </p>
                    {pCredito === 0 && (
                        <p className="mt-2 text-3xl">
                            Cambio: <strong>$ {cajaCambio.toFixed(2)} DLL</strong>
                        </p>
                    )}
                    {esFiado && (
                        <div className="mt-4 p-3 rounded-lg border-l-8 border-orange-600 bg-orange-100">
                            <p className="text-lg font-black text-orange-800 uppercase">
                                Este vehículo saldrá como FIADO
                            </p>
                            <p className="text-md text-orange-900">
                                Crédito: ${pCredito.toFixed(2)} DLL — se registrará como
                                deuda del cliente <strong>{vehiculo[0]?.cliente}</strong>.
                            </p>
                        </div>
                    )}

                    {mensajeError && (
                        <div className="mt-3 text-red-600 font-semibold">{mensajeError}</div>
                    )}

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

export default PagoVehiculo;
