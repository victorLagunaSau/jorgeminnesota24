import React, { useState, useEffect, useRef } from 'react';
import { firestore } from '../../firebase/firebaseIni';
import moment from 'moment';

const FormViajes = ({ user }) => {
    const [nombreTransportista, setNombreTransportista] = useState('');
    const [idTransportista, setIdTransportista] = useState('');
    const [trailaNumero, setTrailaNumero] = useState('');
    const [notas, setNotas] = useState('');
    const [usuarios, setUsuarios] = useState([]);
    const [error, setError] = useState('');
    const [guardadoExito, setGuardadoExito] = useState('');

    const modalRef = useRef(null);

    useEffect(() => {
        let errorTimeoutId, successTimeoutId;

        if (error) {
            errorTimeoutId = setTimeout(() => {
                setError('');
            }, 5000);
        }

        if (guardadoExito) {
            successTimeoutId = setTimeout(() => {
                setGuardadoExito('');
            }, 5000);
        }

        return () => {
            clearTimeout(errorTimeoutId);
            clearTimeout(successTimeoutId);
        };
    }, [error, guardadoExito]);

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const usersSnapshot = await firestore()
                    .collection("users")
                    .where("tipo", "in", ["admin", "chofer"])
                    .get();

                const usersData = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setUsuarios(usersData);
            } catch (error) {
                console.error('Error fetching usuarios:', error);
            }
        };

        fetchUsuarios();
    }, []);

    const handleSubmit = async () => {
        if (!nombreTransportista || !trailaNumero) {
            setError('Todos los campos son obligatorios');
            return;
        }
        await getConsecutivo();
    };

    const getConsecutivo = async () => {
        try {
            const consecutivoRef = await firestore().collection("config").doc("consecutivos").get();
            const data = consecutivoRef.data();
            const actualConsecutivo = data.viajes;
            const nuevoConsecutivo = actualConsecutivo + 1;
            await firestore().collection("config").doc("consecutivos").update({
                viajes: nuevoConsecutivo
            });
            handleSaveToFirebase(nuevoConsecutivo);
        } catch (error) {
            console.error('Error al obtener el contador de consecutivos:', error);
        }
    };

    const handleSaveToFirebase = async (nuevoConsecutivo) => {
        const timestamp = moment().toDate();
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
                    timestamp: timestamp,
                    notas: notas,
                    trailaNumero: trailaNumero
                });
            setNombreTransportista('');
            setTrailaNumero('');
            setNotas('');
            setGuardadoExito('Viaje registrado exitosamente');
            modalRef.current.close();
        } catch (error) {
            console.error('Error al guardar datos de viaje:', error);
            setError('Error al guardar datos de viaje');
        }
    };



    return (
        <div className="bg-white-100 py-10 px-4">
            <div className="mx-auto">
                <div>
                    {guardadoExito && (
                        <div role="alert" className="alert alert-success">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{guardadoExito}</span>
                        </div>
                    )}
                    <form id="datosViaje">
                        <h1 className="text-2xl font-bold mb-4">Registro de Viajes</h1>
                        {error && (
                            <div>
                                <div role="alert" className="alert alert-warning">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap">
                            <div className="w-1/2 p-1">
                                <label htmlFor="nombreTransportista" className="block text-black-500">* Transportista:</label>
                                <input
                                    type="text"
                                    id="nombreTransportista"
                                    value={nombreTransportista}
                                    onChange={(e) => setNombreTransportista(e.target.value)}
                                    className="input input-bordered w-full mt-1 bg-white-100"
                                />

                            </div>
                            <div className="w-1/2 p-1">
                                <label htmlFor="trailaNumero" className="block text-black-500">* Traila:</label>
                                <input
                                    type="text"
                                    id="trailaNumero"
                                    value={trailaNumero}
                                    onChange={(e) => setTrailaNumero(e.target.value)}
                                    className="input input-bordered w-full mt-1 bg-white-100"
                                />
                            </div>
                        </div>
                        <div className="w-1/1 p-1">
                            <label htmlFor="notas" className="block text-black-500">Notas:</label>
                            <input
                                type="text"
                                id="notas"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                className="input input-bordered w-full mt-1 bg-white-100"
                            />
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
                </div>
            </div>
            <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">X</button>
            </form>
        </div>
    );
};

export default FormViajes;
