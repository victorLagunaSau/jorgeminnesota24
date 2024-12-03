import React, { useState } from 'react';
import ImprimeSalida from './ImprimeSalida';
import ImprimeSalidaSinPendientes from './ImprimeSalidaSinPendientes'; // Componente para impresiones sin pagos pendientes

const Pagado = ({ vehiculo }) => {
    // Extraer el primer objeto del arreglo 'vehiculo'
    const vehiculoData = vehiculo[0] || {};

    // Extraer propiedades con valores predeterminados
    const {
        ciudad = "Desconocido",
        estado = "Desconocido",
        modelo = "Desconocido",
        marca = "Desconocido",
        price = 0,
        pago = 0,
        storage = 0,
        sobrePeso = 0,
        gastosExtra = 0,
        totalPago = 0,
        titulo = "NO",
        cliente = "No especificado",
        telefonoCliente = "No especificado",
        pagosPendientes = false, // Valor predeterminado en caso de que no exista
        pagoTotalPendiente = 0, // Valor predeterminado en caso de que no exista
        pagos001 = 0,
        pagos002 = 0,
        pagos003 = 0,
        pagos004 = 0,
        pagos005 = 0,
    } = vehiculoData;

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
                        <p>Título: <strong>{titulo}</strong></p>
                    </div>
                </div>

                <label htmlFor="titulo" className="block text-black-500">Cliente:</label>
                <p className="ml-2">Nombre: <strong>{cliente}</strong></p>
                <p className="ml-2">Teléfono: <strong>{telefonoCliente}</strong></p>
                <p className="mt-4 text-xl">Precio de transporte: <strong>$ {price} DLL</strong></p>

                <div>
                    <p>Pago en Dll: <strong>{pago}</strong></p>
                    <p>Pago Extras por Storage: <strong>{storage}</strong></p>
                    <p>Pago Sobre Peso: <strong>{sobrePeso}</strong></p>
                    <p>Pago Extras: <strong>{gastosExtra}</strong></p>
                    <p className="mt-4 text-xl">Total: <strong>$ {totalPago} DLL</strong></p>
                </div>

                {/* Mostrar detalles de pagos pendientes solo si pagosPendientes es true */}
                {pagosPendientes && (
                    <div className="mt-4 p-4 bg-yellow-100 rounded">
                        <h2 className="text-lg font-bold text-red-500">Pagos Pendientes</h2>

                        <p>Pagos Parciales:</p>
                        <ul className="list-disc ml-6">
                            {vehiculoData.pagos001 > 0 && <li>Pago 1: ${vehiculoData.pagos001}</li>}
                                {pagos002 > 0 && <li>Pago 2: ${pagos002}</li>}
                                {pagos003 > 0 && <li>Pago 3: ${pagos003}</li>}
                                {pagos004 > 0 && <li>Pago 4: ${pagos004}</li>}
                                {pagos005 > 0 && <li>Pago 5: ${pagos005}</li>}
                        </ul>
                        <p>Total Pendiente: <strong>${pagoTotalPendiente}</strong></p>
                    </div>
                )}

                <button className="btn btn-outline btn-error m-4" onClick={handleImprimeSalida}>
                    Imprimir
                </button>
            </div>

            {/* Modal popup */}
            {showModal && (
                <div className="fixed inset-0 flex justify-center items-center z-50">
                    <div className="modal-box max-w-5xl w-full bg-white-500">
                        {/* Condición para mostrar el componente adecuado */}
                        {pagosPendientes ? (
                            <ImprimeSalidaSinPendientes
                                onClose={closeModal}
                                vehiculoData={vehiculoData} // Pasa el objeto completo
                                pago={pago}
                                storage={storage}
                                titulo={titulo}
                            />
                        ) : (
                                                        <ImprimeSalida
                                onClose={closeModal}
                                vehiculoData={vehiculoData} // Pasa el objeto completo
                                pago={pago}
                                storage={storage}
                                titulo={titulo}
                            />

                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pagado;
