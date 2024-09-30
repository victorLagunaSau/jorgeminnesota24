import React, {useState, useEffect} from "react";
import {firestore} from '../../firebase/firebaseIni';

const Vehiculos = ({viaje}) => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);

    const cambiarEstatusVehiculo = async (vehiculoId, index) => {
        try {
            // Cambiar el estatus del vehículo a "TR"
            await firestore().doc(`vehiculos/${vehiculoId}`).update({
                estatus: "TR"
            });

            // Actualizar el estado local para marcar el vehículo como cargado
            const updatedVehiculos = [...vehiculos];
            updatedVehiculos[index].estatus = "TR";
            setVehiculos(updatedVehiculos);
        } catch (error) {
            console.error("Error cambiando estatus del vehículo:", error);
        }
    };

    useEffect(() => {
        const fetchVehiculos = () => {
            try {
                const unsubscribe = firestore()
                    .collection("vehiculos")
                    .where("idViaje", "==", viaje.id)
                    .onSnapshot(snapshot => {
                        const vehiculosData = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        console.log(vehiculosData);
                        setVehiculos(vehiculosData);
                        setLoading(false);
                    }, error => {
                        console.error("Error fetching vehiculos:", error);
                        setLoading(false);
                    });

                // Clean up the subscription when the component unmounts or viaje.id changes
                return () => unsubscribe();
            } catch (error) {
                console.error("Error setting up onSnapshot:", error);
                setLoading(false);
            }
        };
        fetchVehiculos();
    }, [viaje.id]);

    if (loading) {
        return <div>Loading...</div>;
    }

    const vehiculosCargados = vehiculos
        .filter(vehiculo => vehiculo.estatus === "TR")
        .sort((a, b) => a.ciudad.localeCompare(b.ciudad));
    const vehiculosNoCargados = vehiculos
        .filter(vehiculo => vehiculo.estatus === "IN")
        .sort((a, b) => a.ciudad.localeCompare(b.ciudad));

    return (
        <>
            <div className="text-3xl text-black-500 mt-4 text p-2">
                <p>Pendientes: <strong className="text-primary">{vehiculosNoCargados.length}</strong></p>
            </div>

            {vehiculosNoCargados.map((vehiculo, index) => (
                <div key={index} className="m-1 mt-3 card bg-base-100 shadow-xl">
                    <dialog id={vehiculo.binNip} className="modal">
                        <div className="modal-box p-4">
                            <div>
                                <form method="dialog">
                                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕
                                    </button>
                                </form>
                            </div>
                            <div>
                                <h3 className="font-bold text-3xl text-primary">Detalles del Vehículo</h3>
                                <p>BinNip: </p>
                                <strong className="text-3xl text-black-500">{vehiculo.binNip}</strong>
                                <p>GatePass: </p>
                                <strong className="text-3xl text-black-500">{vehiculo.gatePass}</strong>
                                <p>Cliente: </p>
                                <strong className="text-3xl text-black-500">{vehiculo.cliente}</strong>
                                <p>Almacen: </p>
                                <strong className="text-xl text-black-500">{vehiculo.almacen}</strong>
                                <div className="flex items-center text-xl bg-gray-300 p-2">
                                    <p>Marca: </p>
                                    <strong className="text-xl text-black-500">{vehiculo.marca}</strong>
                                    <p>Modelo: </p>
                                    <strong className="text-xl text-black-500">{vehiculo.modelo}</strong>
                                </div>
                                <p>Tipo de Vehículo: </p>
                                <strong className="text-xl text-black-500">{vehiculo.tipoVehiculo}</strong>
                                <div className="flex items-center text-xl bg-gray-300 ">
                                    <p className="text-gray-800 m-2">Cd: <strong>{vehiculo.ciudad}</strong></p>
                                    <p className="text-gray-800 m-2">Estado: <strong>{vehiculo.estado}</strong></p>
                                </div>
                            </div>
                            <div>
                                <button className="btn btn-outline btn-accent mt-4"
                                   onClick={() => cambiarEstatusVehiculo(vehiculo.id, index)}>Agregar a Traila
                                </button>
                            </div>
                        </div>
                    </dialog>
                    <div className="flex justify-between items-center text-xl bg-gray-300 p-4 rounded-t-lg ">
                        <p className="text-gray-800">Cd: <strong>{vehiculo.ciudad}</strong></p>
                        <p className="text-gray-600">Estado: <strong>{vehiculo.estado}</strong></p>
                    </div>
                    <div className="">
                        <p className="text-2xl bg-gray-200 p-2">Almacen: <strong>{vehiculo.almacen}</strong></p>
                        <div className="text-black-500 p-3">
                            <p>Modelo:</p>
                            <strong className="text-black-500 text-xl">{vehiculo.marca} {vehiculo.modelo}</strong>
                            <p><strong>Tipo de Vehículo:</strong> {vehiculo.tipoVehiculo}</p>
                        </div>
                        <div className="flex space-x-4 p-4">
                            <div className="w-1/2">
                                <button className="btn btn-outline btn-warning w-full"
                                        onClick={() => document.getElementById(vehiculo.binNip).showModal()}>Ver
                                    datos
                                </button>
                            </div>
                            <div className="w-1/2">
                                <button className="btn btn-outline btn-accent w-full"
                                        onClick={() => cambiarEstatusVehiculo(vehiculo.id, index)}>Agregar a Traila
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <div className="text-3xl text-black-500 mt-4 p-2 ">
                <p>Cargados: <strong className="text-green-600">{vehiculosCargados.length}</strong></p>
            </div>
            {vehiculosCargados.map((vehiculo, index) => (
                <div key={index} className="m-1 mt-3 card bg-green-100 shadow-xl">
                    <div className="flex justify-between items-center  bg-green-300 p-4 rounded-t-lg ">
                        <p className="text-black-500">Cd: <strong>{vehiculo.ciudad}</strong></p>
                        <p className="text-black-500">Estado: <strong>{vehiculo.estado}</strong></p>
                    </div>
                    <div className="text-black-500 p-3">
                        <p className="text-sm">Almacen: <strong>{vehiculo.almacen}</strong></p>
                        <p>Modelo:</p>
                        <strong className="text-black-500 ">{vehiculo.marca} {vehiculo.modelo}</strong>
                        <p><strong>Tipo de Vehículo:</strong> {vehiculo.tipoVehiculo}</p>
                    </div>
                </div>
            ))}
        </>
    );
};

export default Vehiculos;
