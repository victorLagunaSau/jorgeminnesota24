import React, {useEffect, useState} from 'react';
import {firestore} from "../../firebase/firebaseIni";

const EditarViajes = ({viaje}) => {
    const [vehiculosNoAsignados, setVehiculosNoAsignados] = useState([]);
    const [vehiculosAsignados, setVehiculosAsignados] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [storage, setStorage] = useState('');
    const [sobrePeso, setSobrePeso] = useState('');
    const [gastosExtra, setGastosExtra] = useState('');
    const [comentarios, setComentarios] = useState('');
    const [titulo, setTitulo] = useState('');

    useEffect(() => {
        const unsubscribeNoAsignados = firestore()
            .collection('vehiculos')
            .where('asignado', '==', false)
            .onSnapshot(snapshot => {
                const vehiculosNoAsignados = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                setVehiculosNoAsignados(vehiculosNoAsignados);
            }, error => {
                console.error("Error al obtener los vehículos no asignados:", error);
            });

        const unsubscribeAsignados = firestore()
            .collection('vehiculos')
            .where('idViaje', '==', viaje.id)
            .onSnapshot(snapshot => {
                const vehiculosAsignados = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                setVehiculosAsignados(vehiculosAsignados);
            }, error => {
                console.error("Error al obtener los vehículos asignados:", error);
            });

        return () => {
            unsubscribeNoAsignados();
            unsubscribeAsignados();
        };
    }, [viaje.id]);

    const filteredVehiculos = vehiculosNoAsignados.filter(vehiculo =>
        vehiculo.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehiculo.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehiculo.binNip.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSearchTermChange = event => {
        setSearchTerm(event.target.value);
    };

    const handleOpenModal = (vehiculo) => {
        setSelectedVehiculo(vehiculo);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedVehiculo(null);
        setStorage('');
        setSobrePeso('');
        setGastosExtra('');
        setComentarios('');
        setTitulo('');
    };

    const handleAsignarVehiculo = async () => {
        if (!selectedVehiculo) return;

        const vehiculoRef = firestore().collection('vehiculos').doc(selectedVehiculo.id);
        const fechaAsignacion = new Date();

        try {
            await firestore().runTransaction(async (transaction) => {
                transaction.update(vehiculoRef, {
                    asignado: true,
                    estatus: "IN",
                    consecutivoViaje: viaje.consecutivo,
                    nombreTransportista: viaje.nombreTransportista,
                    trailaNumero: viaje.trailaNumero,
                    idViaje: viaje.id,
                    fechaAsignacion: fechaAsignacion,
                    storage: storage,
                    sobrePeso: sobrePeso,
                    gastosExtra: gastosExtra,
                    comentariosChofer: comentarios,
                    titulo: titulo
                });
            });

            handleCloseModal(); // Cerrar modal al asignar
        } catch (error) {
            console.error("Error al asignar el vehículo:", error);
        }
    };

    const handleDesasignarVehiculo = async (vehiculo) => {
        const vehiculoRef = firestore().collection('vehiculos').doc(vehiculo.id);

        try {
            await firestore().runTransaction(async (transaction) => {
                transaction.update(vehiculoRef, {
                    asignado: false,
                    estatus: "PR",
                    consecutivoViaje: null,
                    nombreTransportista: null,
                    trailaNumero: null,
                    idViaje: null,
                    fechaAsignacion: null,
                    storage: null,
                    sobrePeso: null,
                    gastosExtra: null,
                    comentarios: null,
                    titulo: null
                });
            });
        } catch (error) {
            console.error("Error al desasignar el vehículo:", error);
        }
    };

    return (
        <div className="modal-box" style={{minWidth: '1200px'}}>
            <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            </form>
            <div className="flex mb-4 justify-between m-6">
                <p className="text-m mr-4">Viaje: <strong className="text-2xl">#{viaje.consecutivo}</strong></p>
                <p className="text-m mr-4">Transportista: <strong
                    className="text-2xl">{viaje.nombreTransportista}</strong></p>
                <p className="text-m">Traila: <strong className="text-2xl">#{viaje.trailaNumero}</strong></p>
            </div>
            <div className="m-4 text-black-500 flex">
                <div className="m-2" style={{flex: 3}}>
                    <h2 className="text-xl font-bold mb-4">Vehículos Asignados</h2>
                    <table className="table-auto table-zebra w-full">
                        <thead>
                        <tr>
                            <th className="w-1/12">Num:</th>
                            <th className="w-8/12">Vehículo</th>
                        </tr>
                        </thead>
                        <tbody>
                        {vehiculosAsignados.map((vehiculo, index) => (
                            <tr key={vehiculo.id}>
                                <td className="border w-1/12">
                                    <p className="m-4 text-2xl">{index + 1}</p>
                                </td>
                                <td className="border w-8/12 p-2">
                                    <div>
                                        {/* Estado, Bin Nip y Tipo en un solo renglón */}
                                        <p>
                                            Estado: <strong>{vehiculo.estado}</strong>
                                            &nbsp;| Bin Nip: <strong>{vehiculo.binNip}</strong>
                                            &nbsp;| Tipo: <strong>{vehiculo.tipoVehiculo}</strong>
                                            &nbsp;| Modelo: <strong>{vehiculo.modelo}</strong>
                                            &nbsp;| Título: <strong>{vehiculo.titulo || "N/A"}</strong>
                                        </p>
                                        <p>

                                        </p>
                                        <p></p>
                                        <p>Storage: <strong>{vehiculo.storage || "0"}</strong></p>
                                        <p>Sobrepeso: <strong>{vehiculo.sobrePeso || "0"}</strong></p>
                                        <p>Gastos Extra: <strong>{vehiculo.gastosExtra || "0"}</strong></p>
                                        <p>Comentarios: <strong>{vehiculo.comentarios || " "}</strong></p>
                                    </div>
                                    <button
                                        className="btn btn-error btn-sm"
                                        onClick={() => handleDesasignarVehiculo(vehiculo)}
                                    >
                                        No Asignar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="mr-4" style={{flex: 1}}>
                    <h2 className="text-xl font-bold mb-4">Vehículos No Asignados</h2>
                    <input
                        type="text"
                        placeholder="Buscar por ciudad"
                        value={searchTerm}
                        onChange={handleSearchTermChange}
                        className="input input-bordered mb-4 w-full"
                    />
                    <table className="table-auto table-zebra w-full">
                        <thead>
                        <tr>
                            <th className="w-9/12">Vehículo</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredVehiculos.map((vehiculo) => (
                            <tr key={vehiculo.id}>
                                <td className="border w-9/12 p-2">
                                    <div>
                                        <p>Estado: <strong>{vehiculo.estado}</strong> Ciudad: <strong>{vehiculo.ciudad}</strong>
                                        </p>
                                        <p>Bin Nip: <strong>{vehiculo.binNip}</strong></p>
                                        <p>Modelo: <strong>{vehiculo.modelo}</strong></p>
                                        <p>Tipo: <strong>{vehiculo.tipoVehiculo}</strong></p>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => handleOpenModal(vehiculo)}
                                    >
                                        Asignar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para asignar vehículo */}
            {showModal && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Asignar Vehículo</h3>
                        <div className="form-control">
                            <label className="label">Storage:</label>
                            <input
                                type="number"
                                value={storage}
                                onChange={(e) => setStorage(e.target.value)}
                                className="input input-bordered"
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">Sobrepeso:</label>
                            <input
                                type="text"
                                value={sobrePeso}
                                onChange={(e) => setSobrePeso(e.target.value)}
                                className="input input-bordered"
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">Gastos Extra:</label>
                            <input
                                type="text"
                                value={gastosExtra}
                                onChange={(e) => setGastosExtra(e.target.value)}
                                className="input input-bordered"
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">Comentarios:</label>
                            <input
                                type="text"
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                                className="input input-bordered"
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">Título:</label>
                            <select
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                className="select select-bordered"
                            >
                                <option value="">Seleccionar Título</option>
                                <option value="Título 1">NO</option>
                                <option value="Título 2">SI</option>
                                {/* Agregar más opciones según sea necesario */}
                            </select>
                        </div>
                        <div className="modal-action">
                            <button className="btn btn-success" onClick={handleAsignarVehiculo}>Aceptar</button>
                            <button className="btn" onClick={handleCloseModal}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditarViajes;
