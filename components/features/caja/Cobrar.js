import React, { useState, useRef } from 'react';
import PagoVehiculo from './PagoVehiculo';
import ReciboAdelanto from './ReciboAdelanto';
import { FaPrint } from 'react-icons/fa';

const Cobrar = ({ vehiculo, user }) => {
    const [showRecibo, setShowRecibo] = useState(false);
    const montoAnticipo = parseFloat(vehiculo?.[0]?.anticipoPago || 0);
    const tieneAnticipo = montoAnticipo > 0;

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
