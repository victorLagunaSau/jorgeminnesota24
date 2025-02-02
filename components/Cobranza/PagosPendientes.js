import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";

const PagosPendientes = ({ vehiculoId, onClose, user }) => {
    const [vehiculo, setVehiculo] = useState(null);
    const [pago2, setPago2] = useState(0);
    const [pago3, setPago3] = useState(0);
    const [alertMessage, setAlertMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchVehiculo = async () => {
            try {
                const doc = await firestore().collection("vehiculos").doc(vehiculoId).get();
                if (doc.exists) {
                    const data = doc.data();
                    setVehiculo(data);
                    setPago2(data.pagos002 || 0);
                    setPago3(data.pagos003 || 0);
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

    const handlePago = async () => {
        setLoading(true);
        try {
            let updateData = {};
            let pagoTotalPendiente = vehiculo.pagoTotalPendiente || 0;
            let totalPagoRealizado = 0;

            if (pago3 !== 0) {
                if (pago3 > pagoTotalPendiente) {
                    showAlert("El monto a cobrar no puede ser mayor a lo que está pendiente de pago.", "error");
                    setLoading(false);
                    return;
                }
                updateData.pagos003 = pago3;
                totalPagoRealizado += pago3;
            }

            if (pago2 !== vehiculo.pagos002) {
                updateData.pagos002 = pago2;
                totalPagoRealizado += pago2 - (vehiculo.pagos002 || 0);
            }

            pagoTotalPendiente -= totalPagoRealizado;
            updateData.pagoTotalPendiente = pagoTotalPendiente;
            updateData.pagosPendientes = pagoTotalPendiente > 0;
            updateData.timestamp = new Date();

            await firestore().collection("vehiculos").doc(vehiculoId).update(updateData);

            await firestore().collection("movimientos").add({
                tipo: "Salida",
                binNip: vehiculo.binNip,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                cliente: vehiculo.cliente,
                telefonoCliente: vehiculo.telefonoCliente,
                descripcion: vehiculo.descripcion,
                estado: vehiculo.estado,
                ciudad: vehiculo.ciudad,
                price: vehiculo.price,
                estatus: "EN",
                usuario: user.nombre,
                idUsuario: user.id,
                timestamp: new Date(),
                pago: totalPagoRealizado,
                pagos001: vehiculo.pagos001 || 0,
                pagos002: pago2,
                pagos003: pago3,
                pagos004: 0,
                pagos005: 0,
                pagoTotalPendiente: pagoTotalPendiente,
                pagosPendientes: pagoTotalPendiente - pago2 - pago3

            });

            showAlert("Pago registrado correctamente.", "success");
            onClose();
        } catch (error) {
            showAlert("Error al procesar el pago.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h2 className="text-2xl font-bold mb-4">Registrar Pago</h2>
                {alertMessage && (
                    <div className={`alert ${alertMessage.type === "success" ? "alert-success" : "alert-error"} shadow-lg mb-4`}>
                        {alertMessage.message}
                    </div>
                )}
                {vehiculo ? (
                    <>
                        <div>
                            <p><strong>Cliente:</strong> {vehiculo.cliente}</p>
                            <p><strong>Vehículo:</strong> {vehiculo.marca} {vehiculo.modelo}</p>
                            <p><strong>Pago Total:</strong> ${vehiculo.totalPago || 0}</p>
                            <p><strong>Pago 1:</strong> ${vehiculo.pagos001 || 0}</p>
                            {vehiculo.pagos002 ? <p><strong>Pago 2:</strong> ${vehiculo.pagos002 || 0}</p> : null}
                            <p><strong>Pago pendiente:</strong> ${vehiculo.pagoTotalPendiente || 0}</p>
                        </div>

                        <div className="mt-4">
                            {vehiculo.pagos002 ? (
                                <>
                                    <label className="block text-sm mb-2">Pago 3</label>
                                    <div className="flex items-center">
                                        <span className="mr-2">$</span>
                                        <input
                                            type="number"
                                            value={pago3}
                                            onChange={(e) => setPago3(parseFloat(e.target.value) || 0)}
                                            className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                            min="0"
                                            step="any"
                                        />
                                        <span className="ml-2">Dll</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label className="block text-sm mb-2">Pago 2</label>
                                    <div className="flex items-center">
                                        <span className="mr-2">$</span>
                                        <input
                                            type="number"
                                            value={pago2}
                                            onChange={(e) => setPago2(parseFloat(e.target.value) || 0)}
                                            className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                            min="0"
                                            step="any"
                                        />
                                        <span className="ml-2">Dll</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button className={`btn btn-info ${loading ? "loading" : ""}`} onClick={handlePago} disabled={loading}>
                                {loading ? "Procesando..." : "Registrar Pago"}
                            </button>
                            <button className="btn btn-outline ml-2" onClick={onClose}>Cerrar</button>
                        </div>
                    </>
                ) : (
                    <p>Cargando datos...</p>
                )}
            </div>
        </div>
    );
};

export default PagosPendientes;
