import React, { useState } from 'react';
import { FaMoneyBillWave, FaBook } from 'react-icons/fa';  // Importa los iconos
import PagoCaja from './PagoCaja';  // Importa el formulario de PagoCaja
import PagoPendiente from './PagoPendiente';  // Importa el formulario de Cuenta Pendiente

const Cobrar = ({ vehiculo, user }) => {
    const [tipoPago, setTipoPago] = useState(null);  // Controla el tipo de pago seleccionado (efectivo o pendiente)

    const handleRegresar = () => {
        setTipoPago(null); // Restablece el estado a null para mostrar los botones nuevamente
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">

            {/* Botones para elegir tipo de pago */}
            {!tipoPago && (
                <div className="flex space-x-4 mb-4 justify-center">
                    <button
                        className="btn btn-success text-white-100 flex items-center space-x-2"
                        onClick={() => setTipoPago("efectivo")}
                    >
                        <FaMoneyBillWave className="text-xl" /> {/* Icono de billete */}
                        <span>Pago Efectivo</span>
                    </button>
                    <button
                        className="btn btn-info text-white-100 flex items-center space-x-2"
                        onClick={() => setTipoPago("pendiente")}
                    >
                        <FaBook className="text-xl" /> {/* Icono de libreta */}
                        <span>Cuenta por Pagar</span>
                    </button>
                </div>
            )}

            {/* Mostrar el formulario correspondiente al tipo de pago seleccionado */}
            {tipoPago === "efectivo" ? (
                <div>
                    <PagoCaja vehiculo={vehiculo} user={user} />
                    <div className="mt-4 text-center">
                        <button
                            className="btn btn-secondary text-white-100"
                            onClick={handleRegresar}
                        >
                            Regresar
                        </button>
                    </div>
                </div>
            ) : tipoPago === "pendiente" ? (
                <div>
                    <PagoPendiente vehiculo={vehiculo} user={user} />
                    <div className="mt-4 text-center">
                        <button
                            className="btn btn-secondary text-white-100"
                            onClick={handleRegresar}
                        >
                            Regresar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-lg text-gray-500">Seleccione un tipo de pago</div>
            )}
        </div>
    );
};

export default Cobrar;
