import React, {useState, useEffect} from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import firebase from 'firebase/app';
import 'firebase/firestore';

const FormEditVehiculo = ({vehiculo, onClose}) => {
    const [estado, setEstado] = useState(vehiculo.estado);
    const [ciudad, setCiudad] = useState(vehiculo.ciudad);
    const [price, setPrice] = useState(0);
    const [gatePass, setGatePass] = useState('');
    const [tipoVehiculo, setTipoVehiculo] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [cliente, setCliente] = useState('');
    const [telefonoCliente, setTelefonoCliente] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [estados, setEstados] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [almacen, setAlmacen] = useState('');

    const [storage, setStorage] = useState(0);
    const [sobrePeso, setSobrePeso] = useState(0);
    const [gastosExtra, setGastosExtra] = useState(0);
    const [titulo, setTitulo] = useState('NO');

    const [estatus, setEstatus] = useState('');

    useEffect(() => {
        let timeoutId;
        if (error) {
            timeoutId = setTimeout(() => {
                setError('');
            }, 5000);
        }
        return () => clearTimeout(timeoutId);
    }, [error]);

    useEffect(() => {
        const fetchEstados = async () => {
            try {
                const estadosSnapshot = await firebase.firestore().collection("province").get();
                const estadosData = estadosSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    state: doc.data().state,
                    regions: doc.data().regions
                }));
                setEstados(estadosData);
            } catch (error) {
                console.error("Error fetching estados:", error);
            }
        };
        fetchEstados();
    }, []);
    useEffect(() => {
        if (vehiculo) {
            setEstado(vehiculo.estado);
            setCiudad(vehiculo.ciudad);
            setPrice(vehiculo.price);
            setGatePass(vehiculo.gatePass);
            setTipoVehiculo(vehiculo.tipoVehiculo);
            setMarca(vehiculo.marca);
            setModelo(vehiculo.modelo);
            setCliente(vehiculo.cliente);
            setTelefonoCliente(vehiculo.telefonoCliente);
            setDescripcion(vehiculo.descripcion);
            setAlmacen(vehiculo.almacen);
            setEstatus(vehiculo.estatus);
            setStorage(vehiculo.storage !== undefined ? vehiculo.storage : 0);
            setSobrePeso(vehiculo.sobrePeso !== undefined ? vehiculo.sobrePeso : 0);
            setGastosExtra(vehiculo.gastosExtra !== undefined ? vehiculo.gastosExtra : 0);
            setTitulo(vehiculo.titulo !== undefined ? vehiculo.titulo : 'NO');
        }
    }, [vehiculo]);

    const handleEstadoChange = (estado) => {
        const selectedEstado = estados.find((e) => e.state === estado);
        if (selectedEstado) {
            setCiudades(selectedEstado.regions);
            setEstado(estado);
        }
    };

    const handleSubmit = async () => {
        setSuccess('');
        setError('');

        if (!gatePass || !marca || !modelo || !cliente) {
            setError('Los campos Bin, Marca, Modelo y Teléfono del cliente son obligatorios.');
            return;
        }

        await handleActualizarVehiculo();
        setSuccess('Vehículo actualizado con éxito.');
        onClose(); // Cerrar el formulario después de una actualización exitosa
    };

    const handleActualizarVehiculo = async () => {
        try {
            await firebase.firestore().collection("vehiculos").doc(vehiculo.binNip).update({
                gatePass: gatePass,
                almacen: almacen,
                tipoVehiculo: tipoVehiculo,
                marca: marca,
                modelo: modelo,
                cliente: cliente,
                telefonoCliente: telefonoCliente,
                descripcion: descripcion,
                estado: estado,
                ciudad: ciudad,
                price: price,
                storage: storage,
                sobrePeso: sobrePeso,
                gastosExtra: gastosExtra,
                titulo: titulo,
                estatus: estatus,
            });
        } catch (error) {
            console.error("Error al actualizar vehículo:", error);
            setError('Error al actualizar el vehículo. Por favor, intente nuevamente. Error:');
        }
    };
    const handleDeleteVehiculo = async () => {
        try {
            await firebase.firestore().collection("vehiculos").doc(vehiculo.binNip).delete();
            setSuccess('Vehículo eliminado con éxito.');
            onClose(); // Cierra el modal después de la eliminación
        } catch (error) {
            console.error("Error al eliminar el vehículo:", error);
            setError('Error al eliminar el vehículo. Por favor, intente nuevamente.');
        }
    };

    return (
        <form id="editarAuto" className="relative">
            <button type="button" onClick={onClose} className="absolute top-2 right-2 text-red-600 hover:text-red-800">
                X
            </button>
            <h2 className="text-xl font-bold mt-6 mb-2">Editar Vehículo: {vehiculo.binNip}</h2>
            {error && (
                <div>
                    <div role="alert" className="alert alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none"
                             viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}
            <div className="w-1/8 p-1">
                <label htmlFor="titulo" className="block text-black-500">Estatus:</label>
                <select
                    className="ml-2 p-1 border border-gray-300 rounded-md"
                    value={estatus}
                    onChange={(e) => setEstatus(e.target.value)}
                >
                    <option value="">Todos</option>
                    <option value="PR">Registrado</option>
                    <option value="IN">Cargando</option>
                    <option value="TR">En Viaje</option>
                    <option value="EB">En Brownsville</option>
                    <option value="DS">Descargado</option>
                </select>

            </div>
            <div className="flex flex-wrap">
                <div className="w-1/3 p-1">
                    <label htmlFor="estado" className="block text-black-500">Estado: {estado}</label>
                    <select
                        id="estado"
                        value=""
                        onChange={(e) => {
                            handleEstadoChange(e.target.value);
                        }}
                        className="select input-bordered w-full text-black-500 input-sm bg-white-100"
                    >
                        <option value="">Seleccione...</option>
                        {estados.map((estado) => (
                            <option key={estado.id} value={estado.state}>{estado.state}</option>
                        ))}
                    </select>
                </div>
                <div className="w-1/3 p-1">
                    <label htmlFor="ciudad" className="block text-black-500">Ciudad: {ciudad}</label>
                    <select
                        id="ciudad"
                        value=""
                        onChange={(e) => {
                            setCiudad(e.target.value);
                            const selectedCiudad = ciudades.find((c) => c.city === e.target.value);
                            if (selectedCiudad) {
                                setPrice(selectedCiudad.price);
                            }
                        }}
                        className="select input-bordered w-full text-black-500 input-sm bg-white-100"
                        disabled={estados.length === 0}
                    >
                        <option value="">Seleccione...</option>
                        {ciudades.map((ciudad) => (
                            <option key={ciudad.city} value={ciudad.city}>{ciudad.city}</option>
                        ))}
                    </select>
                </div>
                <div className="w-1/4 p-1">
                    <label htmlFor="precio" className="block text-black-500">Precio:</label>
                    <p className="text-xl">$ {price} Dll</p>
                </div>
            </div>
            <div className="flex flex-wrap">
                <div className="w-1/3 p-1">
                    <label htmlFor="gatePass" className="block text-black-500">* Gate Pass/N Comprador:</label>
                    <input
                        type="text"
                        id="gatePass"
                        value={gatePass}
                        maxLength={12}
                        onChange={(e) => setGatePass(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    />
                </div>
                <div className="w-1/8 p-1">
                    <label htmlFor="almacen" className="block text-black-500">Almacén:</label>
                    <select
                        id="almacen"
                        value={almacen}
                        onChange={(e) => setAlmacen(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    >
                        <option key="S" value="">Seleciona</option>
                        <option key="Copart" value="Copart">Copart</option>
                        <option key="Adesa" value="Adesa">Adesa</option>
                        <option key="Manheim" value="Manheim">Manheim</option>
                        <option key="Insurance Auto Auctions" value="Insurance Auto Auctions">Insurance Auto Auctions
                        </option>
                    </select>
                </div>
            </div>
            <div className="flex flex-wrap">
                <div className="w-1/8 p-1">
                    <label htmlFor="tipoVehiculo" className="block text-black-500">Tipo de Vehículo:</label>
                    <select
                        id="tipoVehiculo"
                        value={tipoVehiculo}
                        onChange={(e) => setTipoVehiculo(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    >
                        <option key="S" value="">Seleciona</option>
                        <option key="A" value="A">A Ligero</option>
                        <option key="B" value="B">B Mediano</option>
                        <option key="C" value="C">C Pesado</option>
                    </select>
                </div>
                <div className="w-1/4 p-1">
                    <label htmlFor="marca" className="block text-black-500">* Marca:</label>
                    <input
                        type="text"
                        id="marca"
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    />
                </div>
                <div className="w-1/4 p-1">
                    <label htmlFor="modelo" className="block text-black-500">* Modelo:</label>
                    <input
                        type="text"
                        id="modelo"
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    />
                </div>
            </div>
            <div className="flex flex-wrap">
                <div className="w-1/2 p-1">
                    <label htmlFor="cliente" className="block text-black-500">* Nombre del Cliente:</label>
                    <input
                        type="text"
                        id="cliente"
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    />
                </div>
                <div className="w-1/2 p-1">
                    <label htmlFor="telefonoCliente" className="block text-black-500">Teléfono del Cliente:</label>
                    <PhoneInput
                        country={'us'}
                        value={telefonoCliente}
                        onChange={setTelefonoCliente}
                        inputStyle={{width: '100%'}}
                    />
                </div>
            </div>
            <div className="flex flex-wrap">
                <div className="w-full p-1">
                    <label htmlFor="descripcion" className="block text-black-500">Descripción:</label>
                    <textarea
                        id="descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="textarea textarea-bordered w-full text-black-500 textarea-sm bg-white-100"
                    />
                </div>
            </div>
            <div className="flex flex-wrap">
                <div className="w-1/8 p-1">
                    <label htmlFor="binNip" className="block text-black-500">Storage</label>
                    <input
                        type="number"
                        id="storage"
                        value={storage}
                        onChange={(e) => setStorage(Math.max(0, e.target.value))}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                        min="0"
                    />
                </div>
                <div className="w-1/8 p-1">
                    <label htmlFor="sobrePeso" className="block text-black-500">Sobre peso</label>
                    <input
                        type="number"
                        id="sobrePeso"
                        value={sobrePeso}
                        onChange={(e) => setSobrePeso(Math.max(0, e.target.value))}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                        min="0"
                    />
                </div>
                <div className="w-1/8 p-1">
                    <label htmlFor="gastosExtra" className="block text-black-500">Gastos Extras</label>
                    <input
                        type="number"
                        id="gastosExtra"
                        value={gastosExtra}
                        onChange={(e) => setGastosExtra(Math.max(0, e.target.value))}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                        min="0"
                    />
                </div>
                <div className="w-1/8 p-1">
                    <label htmlFor="titulo" className="block text-black-500">Título:</label>
                    <select
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    >
                        <option value="">Seleccionar Título</option>
                        <option value="NO">NO</option>
                        <option value="SI">SI</option>
                        {/* Agregar más opciones según sea necesario */}
                    </select>
                </div>
            </div>
            <div className="flex justify-between mt-5">
                <button
                    type="button"
                    onClick={handleDeleteVehiculo}
                    className="btn btn-sm btn-danger w-1/6"
                >
                    Eliminar
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn btn-primary text-white-100 w-1/3"
                >
                    Actualizar
                </button>
            </div>
            {success && <p className="text-green-600 mt-4">{success}</p>}
        </form>
    );
};

export default FormEditVehiculo;
