import React, { useState } from 'react';
import ImprimeSalida from './ImprimeSalida';

const Pagado = ({ vehiculo }) => {
    // Extraer el primer objeto del arreglo 'vehiculo'
    const vehiculoData = vehiculo[0] || {};

    const {
        ciudad,
        estado,
        modelo,
        marca,
        price,
        pago,
        storage,
        sobrePeso,
        gastosExtra,
        totalPago,
        titulo,
        cliente,
        telefonoCliente,
        binNip,
        gatePass,
        comentarioPago
    } = vehiculoData; // Desestructuración del objeto

    const [showModal, setShowModal] = useState(false);

    const handleImprimeSalida = () => {
        setShowModal(true); // Abre el modal
    };

    const closeModal = () => {
        setShowModal(false); // Cierra el modal
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            <div>
                <label htmlFor="titulo" className="block text-black-500">Procedencia:</label>
                <div className="flex">
                    <p className="ml-2">Ciudad: <strong>{ciudad}</strong></p>
                    <p className="ml-2">Estado: <strong>{estado}</strong></p>
                </div>

                <label htmlFor="titulo" className="block text-black-500">Vehículo:</label>
                <div className="flex">
                    <p className="ml-2">Modelo: <strong>{modelo}</strong></p>
                    <p className="ml-2">Marca: <strong>{marca}</strong></p>
                    <div className="ml-2">
                        {vehiculoData.pago ? (
                            <p>Título: <strong>{vehiculoData.titulo}</strong></p>
                        ) : (
                            <p>Título: <strong>{titulo || 'NO'}</strong></p>
                        )}
                    </div>
                </div>

                <label htmlFor="titulo" className="block text-black-500">Cliente:</label>
                <p className="ml-2">Nombre: <strong>{cliente}</strong></p>
                <p className="ml-2">Teléfono: <strong>{telefonoCliente}</strong></p>
                <p className="mt-4 text-xl">Precio de transporte: <strong>$ {price} DLL</strong></p>

                <div>
                    <p>Título: <strong>{titulo || 'NO'}</strong></p>
                    <p>Pago en Dll: <strong>{pago || 0}</strong></p>
                    <p>Pago Extras por Storage: <strong>{storage || 0}</strong></p>
                    <p>Pago Sobre Peso: <strong>{sobrePeso || 0}</strong></p>
                    <p>Pago Extras: <strong>{gastosExtra || 0}</strong></p>
                    <p className="mt-4 text-xl">Total: <strong>$ {totalPago || 0} DLL</strong></p>
                </div>

                <button className="btn btn-outline btn-error m-4" onClick={handleImprimeSalida}>
                    Imprimir
                </button>
            </div>

            {/* Modal popup */}
            {showModal && (
                <div className="fixed inset-0  flex justify-center items-center z-50">
                    <div className="modal-box max-w-5xl w-full bg-white-500">
                            <ImprimeSalida
                                onClose={closeModal}
                                vehiculoData={vehiculoData} // Pasa el objeto completo
                                pago={pago}
                                storage={storage}
                                titulo={titulo}
                            />

                    </div>
                </div>
            )}
        </div>
    );
};

export default Pagado;
