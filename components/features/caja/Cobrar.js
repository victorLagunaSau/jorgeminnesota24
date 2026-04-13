import React, { useState } from 'react';
import { FaMoneyBillWave, FaBook } from 'react-icons/fa';  // Importa los iconos
import PagoCaja from './PagoCaja';  // Importa el formulario de PagoCaja
import PagoPendiente from './PagoPendiente';  // Importa el formulario de Cuenta Pendiente

const Cobrar = ({ vehiculo, user }) => {
    const [tipoPago, setTipoPago] = useState(null);  // Controla el tipo de pago seleccionado (efectivo o pendiente)

    const tieneAnticipo = parseFloat(vehiculo?.[0]?.anticipoPago || 0) > 0;
    const montoAnticipo = parseFloat(vehiculo?.[0]?.anticipoPago || 0);

    const handleRegresar = () => {
        setTipoPago(null); // Restablece el estado a null para mostrar los botones nuevamente
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">

            {/* Banner de anticipo */}
            {tieneAnticipo && !tipoPago && (
                <div className="mb-4 p-3 rounded-lg border-l-8 border-green-600 bg-green-100 shadow">
                    <p className="text-lg font-black text-green-800 uppercase">
                        Este vehículo tiene un pago adelantado de ${montoAnticipo} DLL
                    </p>
                    <p className="text-sm text-green-700">
                        Al cobrar, el sistema descontará automáticamente el anticipo del total.
                    </p>
                </div>
            )}

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
