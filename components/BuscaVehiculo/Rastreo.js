import { useEffect, useState } from 'react';
import { firestore } from "../../firebase/firebaseIni";

const Rastreo = () => {
    const [bin, setBin] = useState(null);
    const [estatus, setEstatus] = useState("");
    const [modelo, setModelo] = useState("");
    const [marca, setMarca] = useState("");
    const [ciudad, setCiudad] = useState("");
    const [estado, setEstado] = useState("");
    const [mensajeError, setMensajeError] = useState("");
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const binFromUrl = window.location.hash.substring(1);
        if (binFromUrl) {
            setBin(binFromUrl);
            buscarVehiculo(binFromUrl);
        }
    }, []);

    const buscarVehiculo = async (binNip) => {
        try {
            setCargando(true);
            await new Promise(resolve => setTimeout(resolve, 2000));
            const vehiculoSnapshot = await firestore().collection("vehiculos").doc(binNip).get();
            if (!vehiculoSnapshot.exists) {
                setEstatus("");
                setMensajeError("Vehículo no encontrado");
            } else {
                const vehiculo = vehiculoSnapshot.data();
                setEstatus(vehiculo.estatus);
                setMarca(vehiculo.marca);
                setModelo(vehiculo.modelo);
                setCiudad(vehiculo.ciudad);
                setEstado(vehiculo.estado);
                setMensajeError("");
            }
        } catch (error) {
            setMensajeError("Ocurrió un error al buscar el vehículo");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="mt-28 mb-24">
            <div className="container mt-28 w-full max-w-3xl mx-auto"/>-
                <div className="container mt-28 w-full max-w-3xl mx-auto text-center">
                    <h1>Rastreo de tu vehiculo</h1>
                    {cargando ? (
                        <div>
                            <span className="loading loading-ring loading-lg"></span>
                            <p className="text-4xl text-red-500 mt-4">Buscando</p>
                        </div>
                    ) : (
                        <>
                            {mensajeError && <div className="text-red-500">{mensajeError}</div>}
                            {estatus && (
                                <ul className="steps steps-gray-500 mt-4">
                                    {["PR", "IN", "TR", "EB", "DS" , "EN"].map((step, index) => (
                                        <li key={index}
                                            className={`step ${estatus === step || index < ["PR", "IN", "TR", "EB", "DS", "EN"].indexOf(estatus) ? "step-info text-black-500 text-xs" : "text-xs"}`}>
                                            {step === "PR" && "Registrado"}
                                            {step === "IN" && "Cargando"}
                                            {step === "TR" && "En Viaje"}
                                            {step === "EB" && "En Brownsville"}
                                            {step === "DS" && "Descargado"}
                                            {step === "EN" && "Entregado"}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {estatus && (
                                <div className="w-full max-w-3xl mx-auto mt-2">
                                    <div className="bg-gray-100 shadow-md p-6 rounded-md">
                                        {estatus === "PR" && (
                                            <div>
                                                <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                                    Registrado
                                                </p>
                                                <p className="text-black-500">Tu vehículo está asignado y en espera de ser recogido.</p>
                                            </div>
                                        )}
                                        {estatus === "IN" && (
                                            <div>
                                                <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                                    Cargando
                                                </p>
                                                <p className="text-black-500">Tu vehículo fue cargado en nuestra unidad de transporte.</p>
                                            </div>
                                        )}
                                        {estatus === "TR" && (
                                            <div>
                                                <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                                    En Viaje
                                                </p>
                                                <p className="text-black-500">Tu vehículo está en camino a Brownsville.</p>
                                            </div>
                                        )}
                                        {estatus === "EB" && (
                                            <div>
                                                <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                                    En Brownsville
                                                </p>
                                                <p className="text-black-500">Tu vehículo ha llegado a la ciudad de Brownsville.</p>
                                            </div>
                                        )}
                                        {estatus === "DS" && (
                                            <div>
                                                <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                                    Descargado
                                                </p>
                                                <p className="text-black-500">Tu vehículo está esperando que lo recojas.</p>
                                            </div>
                                        )}
                                        {estatus === "EN" && (
                                            <div>
                                                <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                                    Entregado
                                                </p>
                                                <p className="text-black-500">Tu vehículo fue entregado</p>
                                            </div>
                                        )}
                                        <p>Modelo: <strong>{modelo}</strong></p>
                                        <p>Marca: <strong>{marca}</strong></p>
                                        <p>Viaja desde</p>
                                        <p>Ciudad: <strong>{ciudad}</strong></p>
                                        <p>Estado: <strong>{estado}</strong></p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
        </div>
    );
};

export default Rastreo;
