import React, {useEffect, useState} from 'react';
import {firestore} from "../../firebase/firebaseIni";

const EditarViajes = ({viaje, viajeId}) => {
    const [vehiculosNoAsignados, setVehiculosNoAsignados] = useState([]);
    const [vehiculosAsignados, setVehiculosAsignados] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    useEffect(() => {
        const unsubscribeNoAsignados = firestore()
            .collection('vehiculos')
            .where('asignado', '==', false)
            .onSnapshot(snapshot => {
                const vehiculosNoAsignados = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                setVehiculosNoAsignados(vehiculosNoAsignados);
            }, error => {
                console.error("Error al obtener los vehículos no asignados:", error);
            });
        const unsubscribeAsignados = firestore()
            .collection('vehiculos')
            .where('idViaje', '==', viaje.id)
            .onSnapshot(snapshot => {
                const vehiculosAsignados = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                setVehiculosAsignados(vehiculosAsignados);
            }, error => {
                console.error("Error al obtener los vehículos asignados:", error);
            });
        return () => {
            unsubscribeNoAsignados();
            unsubscribeAsignados();
        };
    }, [viaje.id]);

    const filteredVehiculos = vehiculosNoAsignados.filter(vehiculo =>
        vehiculo.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehiculo.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const handleSearchTermChange = event => {
        setSearchTerm(event.target.value);
    };
    const handleAsignarVehiculo = async (vehiculo) => {
        const vehiculoRef = firestore().collection('vehiculos').doc(vehiculo.id);
        const fechaAsignacion = new Date();
        try {
            await firestore().runTransaction(async (transaction) => {
                transaction.update(vehiculoRef, {
                    asignado: true,
                    estatus: "IN",
                    consecutivoViaje: viaje.consecutivo,
                    nombreTransportista: viaje.nombreTransportista,
                    trailaNumero: viaje.trailaNumero,
                    idViaje: viaje.id,
                    fechaAsignacion: fechaAsignacion
                });
            });
        } catch (error) {
            console.error("Error al asignar el vehículo:", error);
        }
    };

    const handleDesasignarVehiculo = async (vehiculo) => {
        const vehiculoRef = firestore().collection('vehiculos').doc(vehiculo.id);
        try {
            await firestore().runTransaction(async (transaction) => {
                transaction.update(vehiculoRef, {
                    asignado: false,
                    estatus: "PR",
                    consecutivoViaje: null,
                    nombreTransportista: null,
                    trailaNumero: null,
                    idViaje: null,
                    fechaAsignacion: null,
                    viaje: null
                });
            });
            console.log(`Vehículo ${vehiculo.id} desasignado correctamente.`);
        } catch (error) {
            console.error("Error al desasignar el vehículo:", error);
        }
    };
    return (
        <div className="modal-box" style={{minWidth: '1200px'}}>
            <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            </form>
            <div>
                <div className="flex mb-4 justify-between m-6">
                    <p className="text-m mr-4">Viaje: <strong className="text-2xl">#{viaje.consecutivo}</strong></p>
                    <p className="text-m  mr-4">Transportista: <strong
                        className="text-2xl">{viaje.nombreTransportista}</strong></p>
                    <p className="text-m ">Traila: <strong className="text-2xl">#{viaje.trailaNumero}</strong></p>
                </div>
                <div className="m-4 text-black-500 flex">
                    <div className="mr-4" style={{flex: 1}}>
                        <div>
                            <h2 className="text-xl font-bold mb-4">Vehículos No Asignados</h2>

                            <input
                                type="text"
                                placeholder="Buscar por ciudad"
                                value={searchTerm}
                                onChange={handleSearchTermChange}
                                className="input input-bordered mb-4 w-full"
                            />
                            <table className="table-auto table-zebra w-full">
                                <thead>
                                <tr>
                                    <th className="w-9/12">Vehículo</th>
                                    <th className="w-3/12">Desasignar</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredVehiculos.map((vehiculo) => (
                                    <tr key={vehiculo.id}>
                                        <td className="border w-9/12 p-2">
                                            <div>

                                                <p>Estado: <strong>{vehiculo.estado}</strong> Ciudad: <strong>{vehiculo.ciudad}</strong>
                                                </p>
                                                <p>Bin Nip: <strong>{vehiculo.binNip}</strong></p>
                                                <p>Modelo: <strong>{vehiculo.modelo}</strong></p>
                                                <p>Tipo: <strong>{vehiculo.tipoVehiculo}</strong></p>
                                            </div>
                                        </td>
                                        <td className="border w-3/12">
                                            <div className="flex justify-center items-center">
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => handleAsignarVehiculo(vehiculo)}
                                                >
                                                    Asignar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="ml-4" style={{flex: 1}}>
                        <div>
                            <h2 className="text-xl font-bold mb-4">Vehículos Asignados</h2>
                            <table className="table-auto table-zebra w-full">
                                <thead>
                                <tr>
                                    <th className="w-1/12">Num:</th>
                                    <th className="w-8/12">Vehículo</th>
                                    <th className="w-2/12">Desasignar</th>
                                </tr>
                                </thead>
                                <tbody>
                                {vehiculosAsignados.map((vehiculo, index) => (
                                    <tr key={vehiculo.id}>
                                        <td className="border w-1/12">
                                            <p className="m-4 text-2xl">{index + 1}</p>
                                        </td>
                                        <td className="border w-8/12 p-2">
                                            <div>
                                                <p>Estado: <strong>{vehiculo.estado}</strong> Ciudad: <strong>{vehiculo.ciudad}</strong>
                                                </p>
                                                <p>Bin Nip: <strong>{vehiculo.binNip}</strong></p>
                                                <p>Modelo: <strong>{vehiculo.modelo}</strong></p>
                                                <p>Tipo: <strong>{vehiculo.tipoVehiculo}</strong></p>
                                                {vehiculo.estatus === "TR" ? (
                                                    <div className="text-2xl bg-green-200"><p
                                                        className="m-1">Cargado</p></div>
                                                ) : (
                                                    <div className="text-2xl bg-orange-200"><p
                                                        className="m-1">Pendiente</p></div>
                                                )}

                                            </div>
                                        </td>
                                        <td className="border w-2/12">
                                            <div className="flex justify-center items-center">
                                                <button
                                                    className="btn btn-error btn-sm"
                                                    onClick={() => handleDesasignarVehiculo(vehiculo)}
                                                >
                                                    No Asignar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default EditarViajes;
