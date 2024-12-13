import React, { useState } from 'react';
import { firestore } from "../../firebase/firebaseIni";
import ReciboPago from './ReciboPago';

const OperacionSalida = ({ user }) => {
    const [tipoPago, setTipoPago] = useState(''); // Tipo de salida
    const [monto, setMonto] = useState(0); // Monto de la salida
    const [motivoPago, setMotivoPago] = useState(''); // Comentarios
    const [conceptoPago, setConceptoPago] = useState(''); // Concepto de pago
    const [nombreReceptor, setNombreReceptor] = useState(''); // Nombre de quien recibe
    const [loading, setLoading] = useState(false); // Para controlar el estado de carga
    const [error, setError] = useState(''); // Mensaje de error
    const [showConfirm, setShowConfirm] = useState(false); // Modal de confirmación
    const [showSuccess, setShowSuccess] = useState(false); // Modal de éxito

    const handleClose = () => {
        // Cerrar modal y reiniciar variables
        setShowSuccess(false);
        setTipoPago('');
        setMonto(0);
        setMotivoPago('');
        setConceptoPago('');
        setNombreReceptor('');
        setError('');
    };

    const handleSubmit = async () => {
        if (!tipoPago || monto <= 0 || !conceptoPago || !nombreReceptor) {
            setError('Todos los campos son obligatorios, excepto Motivo de Pago.');
            setShowConfirm(false);
            return;
        }

        setLoading(true);

        try {
            const esSalida = tipoPago === "SE";
            const cajaRecibo = esSalida ? -parseFloat(monto) : parseFloat(monto);
            const salidaCaja = esSalida ? parseFloat(monto) : 0;

            await firestore().collection("movimientos").add({
                tipo: "Pago",
                estatus: "SE",
                usuario: user.nombre,
                idUsuario: user.id,
                timestamp: new Date(),
                cajaRecibo: cajaRecibo,
                salidaCaja: salidaCaja,
                salidaCajaTipo: tipoPago,
                salidaCajaMotivoPago: motivoPago,
                salidaCajaReceptor: nombreReceptor,
                salidaCajaConceptoPago: conceptoPago,
                cajaCC: 0
            });

            setShowConfirm(false);
            setShowSuccess(true);
        } catch (err) {
            setError('Hubo un error al realizar la operación.');
            console.log(err);
        }

        setLoading(false);
    };

    const handleMontoChange = (e) => {
        let value = e.target.value;
        setMonto(value === '' || parseFloat(value) < 0 ? 0 : parseFloat(value));
    };

    const handleConceptoChange = (e) => {
        const value = e.target.value;
        if (value.length <= 40) {
            setConceptoPago(value);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            {/* Campos del formulario */}
            <div className="mb-4">
                <label className="block text-gray-700">Tipo de Salida</label>
                <select
                    value={tipoPago}
                    onChange={(e) => setTipoPago(e.target.value)}
                    className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                >
                    <option value="">Selecciona el tipo de pago</option>
                    <option value="SPV">Pago Viaje</option>
                    <option value="SPS">Pago Servicio</option>
                    <option value="SPA">Pago Autorizado</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-gray-700">Nombre de quien recibe</label>
                <input
                    type="text"
                    value={nombreReceptor}
                    onChange={(e) => setNombreReceptor(e.target.value)}
                    className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                    placeholder="Nombre del receptor"
                />
            </div>

            <div className="mb-4">
                <label className="block text-gray-700">Concepto</label>
                <input
                    type="text"
                    value={conceptoPago}
                    onChange={handleConceptoChange}
                    className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                    placeholder="Concepto de la salida"
                    maxLength={40}
                />
            </div>

            <div className="mb-4">
                <label className="block text-gray-700">Monto</label>
                <input
                    type="number"
                    value={monto}
                    onChange={handleMontoChange}
                    className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                    placeholder="Monto de salida"
                    min="0"
                    step="any"
                />
            </div>

            <div className="mb-4">
                <label className="block text-gray-700">Motivo de Pago (Opcional)</label>
                <textarea
                    value={motivoPago}
                    onChange={(e) => setMotivoPago(e.target.value)}
                    className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1 text-4xl"
                    placeholder="Comentarios adicionales"
                />
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            <button
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                className={`w-full mt-4 py-2 px-4 rounded ${loading ? 'bg-gray-400' : 'bg-blue-600'} text-white font-semibold`}
            >
                {loading ? 'Procesando...' : 'Realizar Salida'}
            </button>

            {/* Modal de confirmación */}
            {showConfirm && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="modal modal-open">
                        <div className="modal-box">
                            <h2 className="text-lg font-bold">¿Estás seguro de realizar esta salida?</h2>
                            <p>Revisa los datos antes de confirmar.</p>
                            <div className="modal-action">
                                <button
                                    className="btn btn-danger"
                                    onClick={() => setShowConfirm(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-success"
                                    onClick={handleSubmit}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de éxito */}
            {showSuccess && (
                <ReciboPago
                    onClose={handleClose}
                    tipoPago={tipoPago}
                    monto={monto}
                    conceptoPago={conceptoPago}
                    nombreReceptor={nombreReceptor}
                    motivoPago={motivoPago}
                    usuario={user.nombre}
                />
            )}
        </div>
    );
};

export default OperacionSalida;
