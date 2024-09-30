import React, { useState, useEffect } from 'react';
import { firestore } from "../../firebase/firebaseIni";
import moment from 'moment';
import EditarViaje from "./EditarViaje";
import ImprimeViaje from "./ImprimeViaje";

const TablaViajes = () => {
    const [viajes, setViajes] = useState([]);

    useEffect(() => {
        const obtenerViajes = () => {
            try {
                const unsubscribe = firestore()
                    .collection("viajes")
                    .where("active", "==", true)
                    .onSnapshot((viajesSnapshot) => {
                        const viajesData = viajesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setViajes(viajesData);
                    });

                // Cleanup subscription on unmount
                return () => unsubscribe();
            } catch (error) {
                console.error("Error al obtener los viajes:", error);
            }
        };
        obtenerViajes();
    }, []);

    const formatearFecha = (timestamp) => {
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        return moment(date).format('DD/MM/YYYY');
    };

    return (
        <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {viajes.sort((a, b) => a.consecutivo - b.consecutivo).map((viaje, index) => (
                    <div className="card shadow-sm m-4 bg-gray-300" key={index}>
                        <dialog id={viaje.id} className="modal">
                            <EditarViaje
                                viajeId={viaje.id}
                                viaje={viaje}
                            />
                        </dialog>
                        <dialog id={viaje.id + 'Imprime'} className="modal">
                            <div className="text-black-500">Imprime</div>
                            <ImprimeViaje
                                viajeId={viaje.id}
                                viaje={viaje}
                            />
                        </dialog>
                        <div className="flex flex-col justify-center items-center">
                            <div className="card-body">
                                <p>Folio: <strong className="text-xl">{viaje.consecutivo}</strong></p>
                                <p>Chofer: <strong className="text-xl">{viaje.nombreTransportista}</strong></p>
                                <p>Traila: {viaje.trailaNumero}</p>
                                <p>Fecha: {formatearFecha(viaje.timestamp)}</p>
                                <div className="flex flex-col items-center justify-center">
                                    <button className="btn btn-outline btn-success m-4 bg-white-100" onClick={() => document.getElementById(viaje.id).showModal()}>Asignar Vehículos</button>
                                    <button className="btn btn-outline btn-info m-4 bg-white-100" onClick={() => document.getElementById(viaje.id + 'Imprime').showModal()}>Imprime/Cerrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TablaViajes;
