import React from 'react';
import PagoVehiculo from './PagoVehiculo';

const Cobrar = ({ vehiculo, user }) => {
    const tieneAnticipo = parseFloat(vehiculo?.[0]?.anticipoPago || 0) > 0;
    const montoAnticipo = parseFloat(vehiculo?.[0]?.anticipoPago || 0);

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            {tieneAnticipo && (
                <div className="mb-4 p-3 rounded-lg border-l-8 border-green-600 bg-green-100 shadow">
                    <p className="text-lg font-black text-green-800 uppercase">
                        Este vehículo tiene un pago adelantado de ${montoAnticipo} DLL
                    </p>
                    <p className="text-sm text-green-700">
                        Al cobrar, el sistema descontará automáticamente el anticipo del total.
                    </p>
                </div>
            )}
            <PagoVehiculo vehiculo={vehiculo} user={user} />
        </div>
    );
};

export default Cobrar;
