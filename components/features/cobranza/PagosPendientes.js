import React, { useState, useEffect, useRef } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import ReciboPP from "./ReciboPP";
import ReactToPrint from "react-to-print";

// Calcula el saldo pendiente soportando el modelo nuevo (saldoFiado/abonosFiado)
// y el legacy (pagoTotalPendiente/pagos001..005).
const obtenerSaldo = (data) => {
    if (data.estadoPago === "fiado" || typeof data.saldoFiado === "number") {
        return parseFloat(data.saldoFiado) || 0;
    }
    return parseFloat(data.pagoTotalPendiente) || 0;
};

const esFormatoNuevo = (data) =>
    data.estadoPago === "fiado" ||
    data.estadoPago === "pagado" ||
    Array.isArray(data.abonosFiado);

const PagosPendientes = ({ vehiculoId, onClose, user }) => {
    const [vehiculo, setVehiculo] = useState(null);
    const [montoEfectivo, setMontoEfectivo] = useState(0);
    const [montoCC, setMontoCC] = useState(0);
    const [alertMessage, setAlertMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fechaPago] = useState(new Date().toISOString().split("T")[0]);
    const componentRef = useRef();
    const [pagoExitoso, setPagoExitoso] = useState(false);
    const reactToPrintRef = useRef();
    const [ultimoAbono, setUltimoAbono] = useState(null);

    useEffect(() => {
        const fetchVehiculo = async () => {
            try {
                const doc = await firestore().collection("vehiculos").doc(vehiculoId).get();
                if (doc.exists) {
                    setVehiculo(doc.data());
                } else {
                    showAlert("Vehículo no encontrado.", "error");
                    onClose();
                }
            } catch (error) {
                showAlert("Error al cargar los datos del vehículo.", "error");
            }
        };
        fetchVehiculo();
    }, [vehiculoId]);

    const showAlert = (message, type) => {
        setAlertMessage({ message, type });
        setTimeout(() => setAlertMessage(null), 3000);
    };

    const saldoActual = vehiculo ? obtenerSaldo(vehiculo) : 0;
    const abonoTotal = (parseFloat(montoEfectivo) || 0) + (parseFloat(montoCC) || 0);

    const handlePago = async () => {
        if (abonoTotal <= 0) {
            showAlert("Ingresa un monto a abonar.", "error");
            return;
        }
        if (abonoTotal > saldoActual + 0.0001) {
            showAlert("El abono no puede ser mayor al saldo pendiente.", "error");
            return;
        }

        setLoading(true);
        try {
            const nuevoSaldo = parseFloat((saldoActual - abonoTotal).toFixed(2));
            const liquidado = nuevoSaldo <= 0;

            const abono = {
                monto: abonoTotal,
                efectivo: parseFloat(montoEfectivo) || 0,
                cc: parseFloat(montoCC) || 0,
                fecha: new Date(),
                usuario: user.nombre,
                idUsuario: user.id,
            };

            const updateData = {
                timestamp: new Date(),
            };

            if (esFormatoNuevo(vehiculo)) {
                updateData.saldoFiado = nuevoSaldo;
                updateData.estadoPago = liquidado ? "pagado" : "fiado";
                updateData.abonosFiado = firestore.FieldValue.arrayUnion(abono);
            } else {
                // Migración ligera: llevamos el registro legacy al modelo nuevo
                // sin borrar los campos viejos, para que conviva.
                const abonosPrevios = [];
                for (let i = 2; i <= 5; i++) {
                    const key = `pagos00${i}`;
                    const monto = parseFloat(vehiculo[key]) || 0;
                    if (monto > 0) {
                        abonosPrevios.push({
                            monto,
                            efectivo: monto,
                            cc: 0,
                            fecha: vehiculo.timestamp || new Date(),
                            usuario: "(migrado)",
                            idUsuario: "",
                            legacy: true,
                        });
                    }
                }
                updateData.saldoFiado = nuevoSaldo;
                updateData.creditoOtorgado =
                    parseFloat(vehiculo.pagoTotalPendiente) || 0;
                updateData.estadoPago = liquidado ? "pagado" : "fiado";
                updateData.abonosFiado = [...abonosPrevios, abono];
                updateData.pagosPendientes = !liquidado;
                updateData.pagoTotalPendiente = nuevoSaldo;
            }

            await firestore().collection("vehiculos").doc(vehiculoId).update(updateData);

            await firestore().collection("movimientos").add({
                tipo: "Abono",
                estatus: "AB",
                binNip: vehiculo.binNip,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                cliente: vehiculo.cliente,
                telefonoCliente: vehiculo.telefonoCliente,
                estado: vehiculo.estado,
                ciudad: vehiculo.ciudad,
                usuario: user.nombre,
                idUsuario: user.id,
                timestamp: new Date(),
                cajaRecibo: parseFloat(montoEfectivo) || 0,
                cajaCC: parseFloat(montoCC) || 0,
                cajaCambio: 0,
                montoAbono: abonoTotal,
                saldoFiadoAntes: saldoActual,
                saldoFiadoDespues: nuevoSaldo,
                estadoPago: liquidado ? "pagado" : "fiado",
                folioVenta: vehiculo.folioVenta || null,
            });

            setUltimoAbono(abono);
            setPagoExitoso(true);
            showAlert(
                liquidado
                    ? "Fiado liquidado. El vehículo queda pagado."
                    : "Abono registrado correctamente.",
                "success"
            );

            setTimeout(() => {
                if (reactToPrintRef.current) {
                    reactToPrintRef.current.handlePrint();
                }
            }, 500);
        } catch (error) {
            console.error(error);
            showAlert("Error al procesar el pago.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h2 className="text-2xl font-bold mb-4">Registrar Abono</h2>
                {alertMessage && (
                    <div
                        className={`alert ${
                            alertMessage.type === "success" ? "alert-success" : "alert-error"
                        } shadow-lg mb-4`}
                    >
                        {alertMessage.message}
                    </div>
                )}
                {vehiculo ? (
                    <>
                        <div>
                            <p>
                                Fecha del Pago: <strong>{fechaPago}</strong>
                            </p>
                        </div>
                        <div>
                            <p>
                                <strong>Cliente:</strong> {vehiculo.cliente}
                            </p>
                            <p>
                                <strong>Vehículo:</strong> {vehiculo.marca} {vehiculo.modelo}
                            </p>
                            <p>
                                <strong>Total venta:</strong> ${vehiculo.totalPago || 0}
                            </p>
                            {vehiculo.creditoOtorgado != null && (
                                <p>
                                    <strong>Crédito otorgado:</strong> $
                                    {parseFloat(vehiculo.creditoOtorgado).toFixed(2)}
                                </p>
                            )}
                            <p className="text-red-600 text-lg font-bold">
                                Saldo pendiente: ${saldoActual.toFixed(2)}
                            </p>
                        </div>

                        {Array.isArray(vehiculo.abonosFiado) && vehiculo.abonosFiado.length > 0 && (
                            <div className="mt-3 p-2 bg-gray-50 rounded">
                                <p className="font-semibold text-sm mb-1">Abonos previos:</p>
                                <ul className="text-xs list-disc ml-4">
                                    {vehiculo.abonosFiado.map((a, i) => (
                                        <li key={i}>
                                            ${parseFloat(a.monto).toFixed(2)}{" "}
                                            {a.fecha?.toDate
                                                ? `— ${a.fecha.toDate().toLocaleDateString()}`
                                                : ""}{" "}
                                            {a.usuario ? `(${a.usuario})` : ""}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm mb-2">Abono en Efectivo</label>
                            <div className="flex items-center">
                                <span className="mr-2">$</span>
                                <input
                                    type="number"
                                    value={montoEfectivo}
                                    onChange={(e) =>
                                        setMontoEfectivo(parseFloat(e.target.value) || 0)
                                    }
                                    className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                    min="0"
                                    step="any"
                                    disabled={pagoExitoso}
                                />
                                <span className="ml-2">Dll</span>
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="block text-sm mb-2">Abono en CC</label>
                            <div className="flex items-center">
                                <span className="mr-2">$</span>
                                <input
                                    type="number"
                                    value={montoCC}
                                    onChange={(e) => setMontoCC(parseFloat(e.target.value) || 0)}
                                    className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                    min="0"
                                    step="any"
                                    disabled={pagoExitoso}
                                />
                                <span className="ml-2">Dll</span>
                            </div>
                        </div>

                        <p className="mt-3 text-lg">
                            Total abono: <strong>${abonoTotal.toFixed(2)}</strong>
                        </p>
                        <p className="text-md text-gray-700">
                            Saldo resultante:{" "}
                            <strong>${Math.max(0, saldoActual - abonoTotal).toFixed(2)}</strong>
                        </p>

                        <div className="mt-4 flex justify-end">
                            {!pagoExitoso && (
                                <button
                                    className={`btn btn-info ${loading ? "loading" : ""}`}
                                    onClick={handlePago}
                                    disabled={loading}
                                >
                                    {loading ? "Procesando..." : "Registrar Abono"}
                                </button>
                            )}
                            <button className="btn btn-outline ml-2" onClick={onClose}>
                                Cerrar
                            </button>
                        </div>

                        {pagoExitoso && (
                            <div className="mt-2 flex justify-end">
                                <ReactToPrint
                                    trigger={() => (
                                        <button className="btn btn-secondary ml-2">
                                            Imprimir Recibo
                                        </button>
                                    )}
                                    content={() => componentRef.current}
                                    ref={reactToPrintRef}
                                />
                                <div style={{ display: "none" }}>
                                    <ReciboPP
                                        ref={componentRef}
                                        vehiculo={vehiculo}
                                        abono={ultimoAbono}
                                        fechaPago={fechaPago}
                                        user={user}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p>Cargando datos...</p>
                )}
            </div>
        </div>
    );
};

export default PagosPendientes;
