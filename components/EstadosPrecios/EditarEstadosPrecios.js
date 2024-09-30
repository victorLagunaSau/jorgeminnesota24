import { useState, useEffect } from "react";
import firebase from "firebase/app";
import "firebase/firestore";

const EditarEstadosPrecios = ({ currentRegions, closeModal }) => {
    const [updatedRegions, setUpdatedRegions] = useState([]);
    const [alertMessage, setAlertMessage] = useState('');

    useEffect(() => {
        if (currentRegions) {
            setUpdatedRegions([...currentRegions.regions]);
        }
    }, [currentRegions]);

    const handleCityChange = (index, value) => {
        const updatedRegionsCopy = [...updatedRegions];
        updatedRegionsCopy[index].city = value;
        setUpdatedRegions(updatedRegionsCopy);
    };

    const handlePriceChange = (index, value) => {
        const updatedRegionsCopy = [...updatedRegions];
        updatedRegionsCopy[index].price = value;
        setUpdatedRegions(updatedRegionsCopy);
    };

    const handleDeleteRegion = (index) => {
        const updatedRegionsCopy = [...updatedRegions];
        updatedRegionsCopy.splice(index, 1);
        setUpdatedRegions(updatedRegionsCopy);
    };

    const handleAddRegion = () => {
        const newRegion = { city: '', price: '', isNew: true };
        setUpdatedRegions([newRegion, ...updatedRegions]);
    };

    const handleNewCheckboxChange = (index, isChecked) => {
        const updatedRegionsCopy = [...updatedRegions];
        updatedRegionsCopy[index].isNew = isChecked;
        setUpdatedRegions(updatedRegionsCopy);
    };

    const handleSave = () => {
        const isEmpty = updatedRegions.some(region => region.city === '' || region.price === '');

        if (isEmpty) {
            setAlertMessage("Todos los campos deben estar completos antes de guardar.");
            return;
        }

        const db = firebase.firestore();
        const estadoRef = db.collection("province").doc(currentRegions.id);

        estadoRef.update({
            regions: updatedRegions
        })
            .then(() => {
                setAlertMessage("¡Guardado con éxito!");
                setTimeout(() => {
                    setAlertMessage('');
                    closeModal(); // Cierra el modal después de guardar
                }, 2000);
            })
            .catch((error) => {
                console.error("Error al actualizar datos en Firebase:", error);
                setAlertMessage("Error al actualizar datos en Firebase.");
            });
    };

    // Función para borrar el estado
    const handleDeleteState = () => {
        const db = firebase.firestore();
        const estadoRef = db.collection("province").doc(currentRegions.id);

        estadoRef.delete()
            .then(() => {
                setAlertMessage("¡Estado eliminado con éxito!");
                setTimeout(() => {
                    setAlertMessage('');
                    closeModal(); // Cerrar el modal tras eliminar el estado
                }, 2000);
            })
            .catch((error) => {
                console.error("Error al eliminar el estado de Firebase:", error);
                setAlertMessage("Error al eliminar el estado.");
            });
    };

    return (
        <div className="overflow-x-auto bg-white-100 p-5 rounded-md">
            {/* Mostrar mensaje de alerta si existe */}
            {alertMessage && (
                <div role="alert" className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none"
                         viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <span>{alertMessage}</span>
                </div>
            )}

            {/* Mostrar nombre del estado */}
            {currentRegions && (
                <div className="text-2xl mt-8">
                    <h2>{currentRegions.state}</h2>
                </div>
            )}

            {/* Mostrar tabla solo si hay regiones */}
            <table className="table">
                <thead>
                <tr>
                    <th>Nueva</th>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {updatedRegions.map((region, index) => (
                    <tr key={index}>
                        <th>
                            <label>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={region.isNew}
                                    onChange={(e) => handleNewCheckboxChange(index, e.target.checked)}
                                />
                            </label>
                        </th>
                        <td>
                            <input
                                type="text"
                                value={region.city}
                                onChange={(e) => handleCityChange(index, e.target.value)}
                                className="input input-bordered input-sm w-full bg-white-500"
                            />
                        </td>
                        <td>
                            <input
                                type="number"
                                value={region.price}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                className="input input-bordered input-sm w-full bg-white-500"
                            />
                        </td>
                        <td>
                            <button
                                onClick={() => handleDeleteRegion(index)}
                                className="btn btn-danger btn-circle btn-sm"
                            >
                                X
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Botón para agregar región */}
            <button
                onClick={handleAddRegion}
                className="btn btn-primary mt-4 text-white-500"
            >
                Agregar Región
            </button>



            {/* Botones de cerrar y guardar */}
            <div className="modal-action mt-4">
                            {/* Mostrar botón de borrar estado solo si regions está vacío */}
            {updatedRegions.length === 0 && (
                <button
                    onClick={handleDeleteState}
                    className="btn btn-danger mt-4 m-2 text-white-500"
                >
                    Borrar Estado
                </button>
            )}
                <button
                    onClick={closeModal}
                    className="btn btn-primary mt-2 m-2 text-white-500"
                >
                    Cerrar
                </button>
                <button className="btn btn-primary mt-2 m-2 text-white-500" onClick={handleSave}>
                    Guardar
                </button>
            </div>
        </div>
    );
};

export default EditarEstadosPrecios;
