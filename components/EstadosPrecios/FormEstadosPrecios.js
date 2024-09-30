import React, { useState } from 'react';
import { firestore } from "../../firebase/firebaseIni";
import ImputAutoEstados from "../misc/ImputAutoEstados";

const FormEstadosPrecios = () => {
    const initialState = {
        selectedState: '',
        cityRegions: [],
        newCity: '',
        newPrice: '',
        confirmState: false,
        savedSuccessfully: false
    };

    const [formValues, setFormValues] = useState({ ...initialState });
    const [orderCounter, setOrderCounter] = useState(1);

    const handleConfirmState = () => {
        if (formValues.selectedState) {
            setFormValues({ ...formValues, confirmState: true });
        } else {
            // Handle error, state must be selected
        }
    };

    const handleSaveCityRegion = () => {
        if (formValues.newCity && formValues.newPrice) {
            const updatedCityRegions = [...formValues.cityRegions, { city: formValues.newCity, price: formValues.newPrice, order: orderCounter }];
            setOrderCounter(orderCounter + 1); // Incrementar el contador de orden
            setFormValues({ ...formValues, cityRegions: updatedCityRegions, newCity: '', newPrice: '' });
        } else {
            // Handle error, both city and price must be provided
        }
    };

    const handleDeleteCityRegion = (index) => {
        const updatedCityRegions = [...formValues.cityRegions];
        updatedCityRegions.splice(index, 1);
        setFormValues({ ...formValues, cityRegions: updatedCityRegions });
    };

    const handleSaveToFirebase = () => {
        if (formValues.selectedState && formValues.cityRegions.length > 0) {
            firestore()
                .collection("province")
                .add({
                    state: formValues.selectedState,
                    regions: formValues.cityRegions
                })
                .then(() => {
                    console.log('Datos guardados  correctamente.');
                    // Indicar que se guardó exitosamente
                    setFormValues({ ...formValues, savedSuccessfully: true });
                    // Reiniciar el formulario después de 2 segundos
                    setTimeout(() => {
                        setFormValues({ ...initialState });
                        setOrderCounter(1); // Reiniciar el contador de orden
                    }, 2000);
                })
                .catch((error) => {
                    console.error('Error al guardar datos:', error);
                    // Aquí puedes manejar el error, mostrar una notificación, etc.
                });
        } else {
            // Handle error, state must be selected and at least one city/region must be added
        }
    };

    return (
        <div className="min-h-[500px]">
            {!formValues.confirmState && (
                <>
                    <h3 className="justify-center text-3xl lg:text-3xl font-mediumtext-black-500">
                        Selecciona un <strong>estado</strong>.
                    </h3>
                    <p>Para iniciar, agrega un estado/región.</p>
                    <div className="flex justify-center items-center h-full m-3">
                        <ImputAutoEstados
                            onSelect={(option) => setFormValues({ ...formValues, selectedState: option })}
                        />
                    </div>

                    <div className="flex justify-center items-center h-full m-3">
                        <button
                            type="button"
                            onClick={handleConfirmState}
                            className="btn btn-outline btn-primary btn-sm"
                        >
                            Confirmar estado
                        </button>
                    </div>
                </>
            )}
            {formValues.confirmState && (
                <div>
                    <div className="flex justify-center items-center h-full">
                        <p>Seleccionado:</p>
                    </div>
                    <div className="flex justify-center items-center h-full mb-3">
                        <h3 className="text-4xl font-medium text-primary mb-4">{formValues.selectedState}</h3>
                    </div>

                    <div className="flex justify-center items-center h-full">
                        <p>Agrega una ciudad o provincia</p>
                    </div>
                    <div className="flex justify-center items-center h-full m-3">
                        <input
                            type="text"
                            placeholder="Nombre de la ciudad"
                            value={formValues.newCity}
                            onChange={(e) => setFormValues({ ...formValues, newCity: e.target.value })}
                            className="input input-bordered input-error w-full max-w-xs bg-white-500"
                        />
                    </div>
                    <div className="flex justify-center items-center h-full">
                        <p>Agrega el valor del servicio</p>
                    </div>
                    <div className="flex justify-center items-center h-full m-3">
                        <input
                            type="number"
                            placeholder="Precio"
                            value={formValues.newPrice}
                            onChange={(e) => setFormValues({ ...formValues, newPrice: e.target.value })}
                            className="input input-bordered input-error w-full max-w-xs bg-white-500 m-2"
                        />
                    </div>
                    <div className="flex justify-center items-center h-full m-3">
                        <button
                            type="button"
                            onClick={handleSaveCityRegion}
                            className="btn btn-outline btn-primary btn-sm"
                        >
                            Agregar a la lista
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '4px' }}>N</th>
                                    <th style={{ width: '30px' }}>Region</th>
                                    <th style={{ width: '6px' }}>Precio</th>
                                    <th style={{ width: '6px' }}>Borrar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formValues.cityRegions.map((cityRegion, index) => (
                                    <tr key={index}>
                                        <td style={{ width: '4px' }}>{cityRegion.order}</td>
                                        <td style={{ width: '30px' }}>{cityRegion.city}</td>
                                        <td style={{ width: '6px' }}>${cityRegion.price}</td>
                                        <td style={{ width: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCityRegion(index)}
                                                className="ml-2 btn btn-sm btn-danger"
                                            >
                                                x
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveToFirebase}
                        className="btn btn-primary mt-4"
                    >
                        Guardar
                    </button>
                    {formValues.savedSuccessfully && (
                        <div className="text-green-600 mt-2">Guardado con éxito. Reiniciando formulario...</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FormEstadosPrecios;
