import React, { useState, useEffect } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import PagoVehiculo from './PagoVehiculo';
import ReciboAdelanto from './ReciboAdelanto';
import { FaPrint, FaExclamationTriangle } from 'react-icons/fa';

const Cobrar = ({ vehiculo, user }) => {
    const [showRecibo, setShowRecibo] = useState(false);
    const [deudaWarning, setDeudaWarning] = useState(null);
    const montoAnticipo = parseFloat(vehiculo?.[0]?.anticipoPago || 0);
    const tieneAnticipo = montoAnticipo > 0;

    const clienteNombre = vehiculo?.[0]?.cliente;

    useEffect(() => {
        if (!clienteNombre) return;
        const verificarDeuda = async () => {
            try {
                const snap = await firestore()
                    .collection("vehiculos")
                    .where("cliente", "==", clienteNombre)
                    .where("estadoPago", "==", "fiado")
                    .get();
                if (!snap.empty) {
                    const total = snap.docs.reduce((sum, doc) => {
                        const d = doc.data();
                        return sum + (parseFloat(d.saldoFiado) || parseFloat(d.pagoTotalPendiente) || 0);
                    }, 0);
                    if (total > 0) {
                        setDeudaWarning(`El cliente "${clienteNombre}" tiene deuda pendiente de $${total.toFixed(2)} en cobranza.`);
                    }
                }
            } catch (e) {}
        };
        verificarDeuda();
    }, [clienteNombre]);

    const datosRecibo = tieneAnticipo ? {
        binNip: vehiculo[0]?.binNip || '',
        marca: vehiculo[0]?.marca || '',
        modelo: vehiculo[0]?.modelo || '',
        cliente: vehiculo[0]?.cliente || '',
        telefonoCliente: vehiculo[0]?.telefonoCliente || '',
        estado: vehiculo[0]?.estado || '',
        ciudad: vehiculo[0]?.ciudad || '',
        price: vehiculo[0]?.price || 0,
        anticipoPago: montoAnticipo,
        usuario: vehiculo[0]?.anticipoUsuario || user?.nombre || 'Admin',
    } : null;

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            {deudaWarning && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white border-2 border-red-400 rounded-2xl p-8 w-full max-w-xl shadow-2xl text-center">
                        <FaExclamationTriangle className="text-red-500 mx-auto mb-4" size={50} />
                        <h3 className="text-xl font-black text-red-600 uppercase mb-4">CLIENTE CON DEUDA PENDIENTE</h3>
                        <p className="text-lg font-semibold text-gray-700">{deudaWarning}</p>
                        <div className="flex justify-center mt-6">
                            <button
                                type="button"
                                className="btn bg-red-500 hover:bg-red-600 text-white border-none font-bold text-base uppercase px-10"
                                onClick={() => setDeudaWarning(null)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {tieneAnticipo && (
                <button
                    onClick={() => setShowRecibo(true)}
                    className="btn btn-sm btn-outline mb-4 gap-2 text-gray-600"
                >
                    <FaPrint /> Reimprimir recibo de anticipo
                </button>
            )}
            <PagoVehiculo vehiculo={vehiculo} user={user} />

            {showRecibo && datosRecibo && (
                <div className="fixed inset-0 flex justify-center items-center z-50">
                    <div className="modal-box max-w-5xl w-full bg-white">
                        <ReciboAdelanto
                            onClose={() => setShowRecibo(false)}
                            data={datosRecibo}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cobrar;
