import React, {useState} from 'react';
import {firestore} from "../../../firebase/firebaseIni";
import StatusSteps from "../../ui/StatusSteps";

const SearchInput = () => {
    const [binNip, setBinNip] = useState("");
    const [estatus, setEstatus] = useState("");
    const [modelo, setModelo] = useState("");
    const [marca, setMarca] = useState("");
    const [ciudad, setCiudad] = useState("");
    const [estado, setEstado] = useState("");
    const [mensajeError, setMensajeError] = useState("");
    const [cargando, setCargando] = useState(false);

    const buscarVehiculo = async () => {
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
            // Indicar que la búsqueda ha finalizado
            setCargando(false);
        }
    };

    const handleBuscarClick = () => {
        setMensajeError("");
        setEstatus("");
        buscarVehiculo();
    };
    const handleInputChange = (event) => {
        setBinNip(event.target.value);
    };
    return (
        <div id="serch">
            <div className="flex flex-col items-center justify-center">
                <div>
                    <h1 className="text-2xl lg:text-3xl xl:text-3xl font-medium text-black-600 leading-normal text-center">
                        Localiza tu <strong>vehículo</strong>.
                    </h1>
                    <p className="text-black-500 mt-4 mb-6 text-center">
                        Busca tu vehículo en tiempo real para que puedas saber si ya puedes recogerlo en nuestras
                        instalaciones,
                        solo ingresa el código de rastreo y presiona buscar.
                    </p>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="flex border-2 border-primary rounded-md">
                        <input
                            type="text"
                            placeholder="Ingresa código de rastreo..."
                            className="input-lg w-full border-gray-300 rounded-l-md px-4 py-2"
                            onChange={handleInputChange}
                            value={binNip}
                        />
                        <button
                            type="button"
                            className="bg-gray-200 text-primary rounded-r-md px-4 py-2"
                            onClick={handleBuscarClick}
                        >
                            Buscar
                        </button>
                    </div>
                </div>
                {cargando ? <span className="loading loading-ring loading-lg"></span> : ""}
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

            </div>
        </div>
    );
};

export default SearchInput;
