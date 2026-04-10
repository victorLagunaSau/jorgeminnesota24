import React, { useState } from 'react';
import OperacionEntrada from './OperacionEntrada';  // Asegúrate de que el nombre del archivo sea correcto

const SalidaVehiculo = ({ user }) => {
    const permiso = () => {
        return user?.caja === true; // Acceso directo a 'user.caja'
    };

    if (!permiso()) {
        return (
            <div className="text-red-500 text-center mt-10">
                <h1 className="text-2xl">Acceso Denegado</h1>
                <p>No tienes permisos para acceder a esta área.</p>
            </div>
        );
    }

    return (
        <div id="area-trabajo" className="max-w-3xl mx-auto mt-6">
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl lg:text-3xl xl:text-3xl font-medium text-black-600 leading-normal text-center">
                    Área de Trabajo: <strong>Pagos de Caja.</strong>
                </h1>
                <p className="text-black-500 mt-4 mb-6 text-center">
                    Realiza las operaciones de pagos en efectivo o salidas de caja.
                </p>
            </div>

            {/* Aquí llamamos al componente OperacionEntrada */}
            <OperacionEntrada user={user} />
        </div>
    );
};

export default SalidaVehiculo;
