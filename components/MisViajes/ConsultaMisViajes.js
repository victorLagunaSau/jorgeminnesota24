import React, {useState, useEffect} from "react";
import {firestore} from '../../firebase/firebaseIni';
import Vehiculo from "./Vehiculo";

const ConsultaMisViajes = ({user}) => {
    const [viajes, setViajes] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (user) {
            const fetchViajes = async () => {
                try {
                    const viajesSnapshot = await firestore()
                        .collection("viajes")
                        .where("active", "==", true)
                        .where("idTransportista", "==", user.id)
                        .get();

                    const viajesData = viajesSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setViajes(viajesData);
                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching viajes:", error);
                    setLoading(false);
                }
            };
            fetchViajes();
        }
    }, [user]);
    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-1 bg-primary min-h-screen " id="clientes">
            <div className="flex justify-center items-center m-4">
                <img src="/assets/LogoW.png" className="w-auto h-10 mr-2" alt="Logo"/>
                <p className="text-center text-1xl text-white-500">
                    Viajes de: {user.nombre}
                </p>
            </div>
            <div className="max-w-3xl mx-auto">
                {viajes.length === 0 ? (
                    <div className="justify-center text-center mt-10">
                        <h3 className="text-3xl text-white-500">
                            <p className="font-bold text-white-500">No tienes viajes asignados.</p>
                        </h3>
                        <img src="/assets/sinviaje.png" className="mx-auto mt-4" alt="Sin viaje"/>
                    </div>
                ) : (
                    viajes.map(viaje => (
                        <div key={viaje.id} className="card shadow-md rounded-lg m-2 bg-gray-200">
                            <div className="">
                                <div className="flex justify-between items-center bg-black-500 p-4 rounded-t-lg ">
                                    <p className="text-gray-200">Vehículos: <strong>{viaje.vehiculos ? viaje.vehiculos.length : 0}</strong>
                                    </p>
                                    <p className="text-gray-200">Traila: <strong>{viaje.trailaNumero}</strong></p>
                                    <p className="text-gray-200"><strong>#{viaje.consecutivo}</strong></p>
                                </div>
                                <p className="text-gray-600 m-4">Descripción: <strong>{viaje.notas}</strong></p>
                                <Vehiculo viaje={viaje}/>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ConsultaMisViajes;
