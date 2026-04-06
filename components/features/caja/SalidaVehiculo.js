import React, {useState} from 'react';
import BuscarVehiculo from './BuscarVehiculo';
import Pagado from './Pagado';
import Cobrar from './Cobrar';

const SalidaVehiculo = ({user}) => {
    const [vehiculo, setVehiculo] = useState([]);
    const [estatus, setEstatus] = useState("");

    // Función para verificar si el usuario tiene permiso de caja
    const permiso = () => {
        return user?.caja === true; // Acceso directo a 'user.caja'
    };

    // Maneja los datos del vehículo encontrados
    const handleVehiculoEncontrado = (vehiculoData, estatusVehiculo) => {
        setVehiculo(vehiculoData ? [vehiculoData] : []);
        setEstatus(estatusVehiculo || "");
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
        <div id="area-trabajo" className="max-w-3xl mx-auto mt-6 ">
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl lg:text-3xl xl:text-3xl font-medium text-black-600 leading-normal text-center">
                    Área de Trabajo: <strong>Cobro de vehículo.</strong>
                </h1>
                <p className="text-black-500 mt-4 mb-6 text-center">
                    Realiza las operaciones de salida y cobro de vehículos.
                </p>
            </div>


                <div className="max-w-5xl bg-white-500">
                    <BuscarVehiculo onVehiculoEncontrado={handleVehiculoEncontrado}/>
                </div>

            {/* Mostrar datos si el vehículo existe */}
            {estatus && (
                <div className="mt-4 ">
                    <p className="text-lg">Estatus del vehículo: <strong>{estatus}</strong></p>
                </div>
            )}

            {/* Renderizar componente según el estatus */}
            {estatus && (

                <div className="bg-gray-100 shadow-md p-6 rounded-md">
                    {estatus === "EN" ? (
                        <Pagado vehiculo={vehiculo}/>
                    ) : (
                        <Cobrar vehiculo={vehiculo} user={user}/>
                    )}
                </div>
            )}
        </div>
    );
};

export default SalidaVehiculo;
