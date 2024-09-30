import React, {useEffect, useState, useRef} from 'react';
import ReactToPrint from "react-to-print";
import {firestore} from "../../firebase/firebaseIni";
import moment from 'moment';

const ComponentToPrint = React.forwardRef(({viajeId, viaje, vehiculos, setVehiculos}, ref) => {
    const [vehiculosAsignados, setVehiculosAsignados] = useState([]);

    useEffect(() => {
        const unsubscribeAsignados = firestore()
            .collection('vehiculos')
            .where('idViaje', '==', viaje.id)
            .onSnapshot(snapshot => {
                const vehiculosAsignados = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                setVehiculosAsignados(vehiculosAsignados);
                setVehiculos(vehiculosAsignados)
            }, error => {
                console.error("Error al obtener los vehículos asignados:", error);
            });
        return () => {

        };
    }, [viaje.id]);
    return (
        <div ref={ref} className="m-4" style={{maxWidth: "90%", marginLeft: "auto", marginRight: "auto"}}>
            <div className="flex items-center ">
                <img src="/assets/Logoprint.png" className="w-auto mr-4" alt="Logo"/>
                <h3 className="text-lg text-black-500 mr-4"><p>Viaje: <strong>#{viaje.consecutivo} </strong></p></h3>
                <h3 className="text-lg text-black-500 mr-4"><p> Transportista: <strong>{viaje.nombreTransportista}</strong></p></h3>
                <p>fecha: <strong>{moment(viaje.timestamp.seconds * 1000 + viaje.timestamp.nanoseconds / 1000000).format('DD/MM/YYYY')}</strong></p>
                {/*<h3 className="text-lg text-black-500">{viaje.notas}</h3>*/}
                {/*<h3 className="text-lg text-black-500">{viaje.timestamp}</h3>*/}
            </div>
            <div>Notas: {viaje.notas}</div>
            <div className="mt-5">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subasta
                        </th>
                        <th scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                        </th>
                        <th scope="col"
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vehiculo
                        </th>
                        <th scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Modelo
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 ">
                    {vehiculosAsignados.map((vehiculo, index) => (
                        <tr key={vehiculo.id}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-black-500 flex">
                                <div>
                                    <strong className="text-sm m-2">{index + 1}</strong>
                                </div>
                                <div>
                                    <div>
                                        {vehiculo.estado} - <strong>{vehiculo.ciudad}</strong>
                                    </div>
                                    <div>
                                        Nu. Lote: {vehiculo.binNip}
                                    </div>
                                    <div>
                                        Gate Pass: {vehiculo.gatePass}
                                    </div>
                                </div>
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap text-sm text-black-500 ">
                                <div>
                                    N: {vehiculo.cliente}
                                </div>
                                <div>
                                    T: {vehiculo.telefonoCliente}
                                </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-black-500">
                                <div>
                                    {vehiculo.marca}
                                </div>
                                <div>
                                    {vehiculo.modelo}
                                </div>
                                <div>
                                    Peso: {vehiculo.tipoVehiculo}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black-500">
                                <div>
                                    ▢ Titulo - Storage:$_______Dll
                                </div>
                                <div>

                                </div>
                                <div>
                                    Notas:__________________
                                </div>
                                ______________________

                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            <div className="text-center">
                <p className="w-full m-6 mt-10 text-black-500">Al firmar, se está de acuerdo con la información del
                    documento.</p>
            </div>
            <div className="flex justify-center mt-20 space-x-20">
                <div className="text-center">
                    <p className="w-full m-4 text-black-500">_________________________</p>
                    <p className="text-black-500">Transportista:</p>
                </div>
                <div className="text-center">
                    <p className="w-full m-4 text-black-500">_________________________</p>
                    <p className="text-black-500">Receptor:</p>
                </div>
            </div>
        </div>
    );
});

const ImprimeSalida = ({onClose, viajeId, viaje}) => {
    const componentRef = useRef(null);
    const [viajeIdToUpdate, setViajeIdToUpdate] = useState(null);
    const [vehiculos, setVehiculos] = useState(null);

    const actualizarEstatusTodosAutosYviaje = async () => {
        if (viajeIdToUpdate) {
            try {
                const viajeRef = firestore().collection("viajes").doc(viajeIdToUpdate);
                const updateData = {
                    active: false,
                    estatus: "DS"
                };
                await viajeRef.update(updateData);

                if (vehiculos && vehiculos.length > 0) {
                    for (const vehiculo of vehiculos) {
                        await firestore().collection("vehiculos").doc(vehiculo.id).update({
                            estatus: "DS"
                        });
                    }
                }

                document.getElementById('confirmModal').close();
            } catch (error) {
                console.error("Error al actualizar el estatus del viaje:", error);
            }
        }
    };

    return (
        <div className="modal-box w-11/12 max-w-5xl bg-white-500">
            <div className="navbar bg-neutral text-neutral-content">
                <div className="navbar-center hidden lg:flex">
                    <ul className="menu menu-horizontal">
                        <li className="btn btn-sm  left-2 mr-6 m-2 text-black-500">
                            <ReactToPrint
                                trigger={() => <a>Imprimir</a>}
                                content={() => componentRef.current}
                            />
                        </li>
                         <li className="btn btn-sm  left-2 mr-6 m-2 text-black-500">
                            <button className="" onClick={() => {
                                setViajeIdToUpdate(viaje.id);
                                document.getElementById('confirmModal').showModal();
                            }}>
                                    <div>Descargado / Cerrar Viaje</div>
                            </button>
                        </li>
                        <form method="dialog">
                            <button className="btn btn-sm absolute right-2 mr-6 text-primary" onClick={onClose}>X Cerrar
                            </button>
                        </form>
                    </ul>
                </div>
            </div>
            {/* Confirmation Modal */}
            <dialog id="confirmModal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Confirmación</h3>
                    <p className="py-4">¿Está seguro de que desea cerrar este viaje? Una vez realizado este cambio, el
                        viaje se cerrará para el chofer pero los vehículos aún estarán en espera de ser entregados al
                        cliente.</p>
                    <div className="modal-action">
                        <button className="btn btn-error" onClick={actualizarEstatusTodosAutosYviaje}>Sí</button>
                        <button className="btn" onClick={() => document.getElementById('confirmModal').close()}>No
                        </button>
                    </div>
                </div>
            </dialog>
            <ComponentToPrint ref={componentRef} viajeId={viajeId} viaje={viaje} vehiculos={vehiculos}
                              setVehiculos={setVehiculos}/>
        </div>
    );
};

export default ImprimeSalida;
