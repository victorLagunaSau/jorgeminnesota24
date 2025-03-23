import React, { useState } from 'react';
import { firestore } from '../../firebase/firebaseIni';

const EntregadoVehiculo = ({ user, vehiculo, onClose }) => {
    const [confirmacion, setConfirmacion] = useState(false);

    const handleConfirmar = async () => {
        try {
            // Actualizar el vehículo en Firestore
            await firestore().collection("vehiculos").doc(vehiculo.binNip).update({
                estatus: "EN",
                pagosPendientes: false,
            });

            // Registrar el movimiento en Firestore
            await firestore().collection("movimientos").add({
                tipo: "Entregado",
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
                pagosPendientes: false,
            });

            // Cerrar el modal y limpiar
            onClose();
        } catch (error) {
            console.error("Error al entregar el vehículo:", error);
        }
    };

    const handleCancelar = () => {
        setConfirmacion(false); // Limpiar la confirmación
        onClose(); // Cerrar el modal
    };

    return (
        <dialog open={true} className="modal">
            <div className="modal-box bg-white-100">
                <h3 className="font-bold text-lg">Entregar Vehículo</h3>

                {/* Previa de los datos del vehículo y cliente */}
                {vehiculo && (
                    <div className="py-4">
                        <p><strong>ID del vehículo:</strong> {vehiculo.binNip}</p>
                        <p><strong>Cliente:</strong> {vehiculo.cliente}</p>
                        <p><strong>Teléfono:</strong> {vehiculo.telefonoCliente}</p>
                        <p><strong>Vehículo:</strong> {vehiculo.marca} {vehiculo.modelo}</p>
                        <p><strong>Estado:</strong> {vehiculo.estado}</p>
                        <p><strong>Ciudad:</strong> {vehiculo.ciudad}</p>
                    </div>
                )}

                {/* Confirmación */}
                {!confirmacion ? (
                    <div className="modal-action">
                        <button
                            className="btn btn-outline btn-error"
                            onClick={handleCancelar} // Cerrar el modal al cancelar
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-outline btn-info"
                            onClick={() => setConfirmacion(true)}
                        >
                            Confirmar Entrega
                        </button>
                    </div>
                ) : (
                    <div className="modal-action">
                        <p className="text-lg font-medium">¿Estás seguro de marcar como entregado?</p>
                        <button
                            className="btn btn-outline btn-error"
                            onClick={handleCancelar} // Cerrar el modal al cancelar
                        >
                            No, cancelar
                        </button>
                        <button
                            className="btn btn-outline btn-success"
                            onClick={handleConfirmar}
                        >
                            Sí, entregar
                        </button>
                    </div>
                )}
            </div>
        </dialog>
    );
};

export default EntregadoVehiculo;