import React, {useState, useEffect} from "react";
import {firestore} from "../../firebase/firebaseIni";
import moment from 'moment';

const FormDatosViaje = ({
                            nombreTransportista,
                            setNombreTransportista,
                            setConsecutivo,
                            setIdViaje,
                            setDatosAutoVisible,
                            user
                        }) => {
    const [error, setError] = useState('');
    useEffect(() => {
        let timeoutId;
        if (error) {
            // Configura un temporizador para limpiar el error después de 5 segundos
            timeoutId = setTimeout(() => {
                setError('');
            }, 5000);
        }

        // Limpia el temporizador al desmontar el componente
        return () => clearTimeout(timeoutId);
    }, [error]);


    const getConsecutivo = async () => {
        try {
            const consecutivoRef = await firestore().collection("config").doc("consecutivos").get();
            const data = consecutivoRef.data();
            const actualConsecutivo = data.viajes;
            const nuevoConsecutivo = actualConsecutivo + 1;
            await firestore().collection("config").doc("consecutivos").update({
                viajes: nuevoConsecutivo
            });
            setConsecutivo(nuevoConsecutivo);
            handleSaveToFirebase(nuevoConsecutivo);
        } catch (error) {
            console.error('Error al obtener el contador de consecutivos:', error);
        }
    };

    const handleSaveToFirebase = async (nuevoConsecutivo) => {
                    const timestamp = moment().toDate();
        if (nombreTransportista) {
            try {
                const docRef = await firestore()
                    .collection("viajes")
                    .add({
                        active: true,
                        nombreTransportista: nombreTransportista,
                        estatus: "PR",
                        consecutivo: nuevoConsecutivo,
                        usuario: user.nombre,
                        idUsuario: user.id,
                        hora: timestamp
                    });

                const idViaje = docRef.id;
                setIdViaje(idViaje);
                setDatosAutoVisible(true);
                // Aquí puedes manejar el éxito del guardado
            } catch (error) {
                console.error('Error al guardar datos de viaje:', error);
                // Aquí puedes manejar el error del guardado
            }
        } else {
            setError('Transportista es obligatorio para iniciar un viaje');
        }
    };

    const handleSubmit = async () => {
        if (!nombreTransportista) {
            setError('Todos los campos son obligatorios');
            return;
        }
        await getConsecutivo();
    };
    return (
        <form id="datosViaje">
            <h1 className="text-2xl font-bold mb-4">Registro de Viajes</h1>
            {error && (
                <div>
                    <div
                        role="alert"
                        className="alert alert-warning"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none"
                             viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}
                <div className="flex flex-wrap">
                    <div className="w-1/2 p-1">
                        <label htmlFor="nombreTransportista" className="block text-black-500">Transportista:</label>
                        <input
                            type="text"
                            id="nombreTransportista"
                            value={nombreTransportista}
                            onChange={(e) => setNombreTransportista(e.target.value)}
                            className="input input-bordered w-full mt-1  bg-white-100"
                        />
                    </div>
                    <div className="w-1/2 p-1">
                        <label htmlFor="nombreTransportista" className="block text-black-500">TRAILA:</label>
                        <input
                            type="text"
                            id="nombreTransportista"
                            value={nombreTransportista}
                            onChange={(e) => setNombreTransportista(e.target.value)}
                            className="input input-bordered w-full mt-1  bg-white-100"
                        />
                    </div>
                </div>

            <div className="flex justify-center mt-4">
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn btn-primary text-black-500 text-lg"
                >
                    Iniciar
                </button>
            </div>
        </form>
    );
};

export default FormDatosViaje;
