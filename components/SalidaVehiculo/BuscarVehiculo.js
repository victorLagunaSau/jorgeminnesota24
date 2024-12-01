import React, { useState } from 'react';
import { firestore } from "../../firebase/firebaseIni";

const BuscarVehiculo = ({ onVehiculoEncontrado }) => {
    const [binNip, setBinNip] = useState("");
    const [mensajeError, setMensajeError] = useState("");
    const [cargando, setCargando] = useState(false);
    const [estatus, setEstatus] = useState(""); // Nuevo estado para el estatus del vehículo

    // Función para buscar el vehículo en Firestore
    const buscarVehiculo = async () => {
        try {
            setCargando(true);
            setMensajeError("");
            const vehiculoSnapshot = await firestore().collection("vehiculos").doc(binNip).get();

            if (!vehiculoSnapshot.exists) {
                setMensajeError("Vehículo no encontrado");
                onVehiculoEncontrado(null, "");
                setEstatus("");
            } else {
                const vehiculo = vehiculoSnapshot.data();
                const estatusVehiculo = vehiculo.estatus || "";
                onVehiculoEncontrado(vehiculo, estatusVehiculo);
                setEstatus(estatusVehiculo); // Actualizar estatus en el estado local
            }
        } catch (error) {
            setMensajeError("Ocurrió un error al buscar el vehículo");
        } finally {
            setCargando(false);
        }
    };

    // Manejo del evento de entrada de texto
    const handleInputChange = (event) => {
        setBinNip(event.target.value);
    };

    // Manejo del botón de buscar
    const handleBuscarClick = () => {
        if (binNip.trim() === "") {
            setMensajeError("El código de rastreo no puede estar vacío");
            return;
        }
        buscarVehiculo();
    };

    return (
        <div className="buscar-vehiculo">
            {/* Campo de entrada y botón de búsqueda */}
            <div className="flex border-2 border-primary rounded-md mb-4 ">
                <input
                    type="text"
                    placeholder="Ingresa código de rastreo..."
                    className="input-lg w-full border-gray-300 rounded-l-md px-4 py-2"
                    onChange={handleInputChange}
                    value={binNip}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleBuscarClick();
                        }
                    }}
                />
                <button
                    type="button"
                    className="bg-gray-200 text-primary rounded-r-md px-4 py-2"
                    onClick={handleBuscarClick}
                >
                    Buscar
                </button>
            </div>

            {/* Indicador de carga */}
            {cargando && <span className="loading loading-ring loading-lg"></span>}

            {/* Mensaje de error */}
            {mensajeError && <div className="text-red-500">{mensajeError}</div>}

            {/* Mostrar estatus del vehículo si existe */}
            {estatus && (
                <ul className="steps steps-gray-500 mt-4 w-full max-w-3xl mx-auto mt-2">
                    {["PR", "IN", "TR", "EB", "DS", "EN"].map((step, index) => (
                        <li
                            key={index}
                            className={`step ${
                                estatus === step ||
                                index < ["PR", "IN", "TR", "EB", "DS", "EN"].indexOf(estatus)
                                    ? "step-info text-black-500 text-xs"
                                    : "text-xs"
                            }`}
                        >
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
        </div>
    );
};

export default BuscarVehiculo;
