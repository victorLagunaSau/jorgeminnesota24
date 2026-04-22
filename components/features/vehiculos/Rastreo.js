import { useEffect, useState } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import StatusSteps from "../../ui/StatusSteps";

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
                                <StatusSteps estatus={estatus} />
                            )}
                            {estatus && (
                                <div className="w-full max-w-3xl mx-auto mt-2">
                                    <div className="bg-gray-100 shadow-md p-6 rounded-md">
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
