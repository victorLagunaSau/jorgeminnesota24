import React, {useState, useEffect} from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import firebase from 'firebase/app';
import 'firebase/firestore';
import moment from 'moment';
import { VEHICLE_TYPES, VEHICLE_WAREHOUSES, TITLE_OPTIONS, PHONE_CONFIG, COLLECTIONS, FIELD_LIMITS, TIMEOUTS } from "../../../constants";
import Alert from "../../ui/Alert";

const FormDatosVehiculo = ({user, onClose}) => {
    const [estado, setEstado] = useState('');
    const [ciudad, setCiudad] = useState('');
    const [price, setPrice] = useState(0);
    const [binNip, setBinNip] = useState('');
    const [gatePass, setGatePass] = useState('');
    const [tipoVehiculo, setTipoVehiculo] = useState("");
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [cliente, setCliente] = useState('');
    const [telefonoCliente, setTelefonoCliente] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [estados, setEstados] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [almacen, setAlmacen] = useState("");
    const [storage, setStorage] = useState(0);
    const [sobrePeso, setSobrePeso] = useState(0);
    const [gastosExtra, setGastosExtra] = useState(0);
    const [titulo, setTitulo] = useState('NO');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let timeoutId;
        if (error) {
            timeoutId = setTimeout(() => {
                setError('');
            }, TIMEOUTS.ERROR);
        }
        return () => clearTimeout(timeoutId);
    }, [error]);

    useEffect(() => {
        const fetchEstados = async () => {
            try {
                const estadosSnapshot = await firebase.firestore().collection(COLLECTIONS.PROVINCE).get();
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

        if (!binNip || !gatePass || !marca || !modelo || !cliente) {
            setError('Los campos Bin, Marca, Modelo y Teléfono del cliente son obligatorios.');
            return;
        }
        setSaving(true);
        try {
            if (!(await verificarBinNipEnFirebase(binNip))) {
                await handleAgregarMovimiento();
                setSuccess('Vehículo guardado con éxito.');
                limpiarFormulario();
            } else {
                setError('El bin ingresado ya existe, por favor ingrese otro.');
            }
        } finally {
            setSaving(false);
        }
    };

    const verificarBinNipEnFirebase = async (binNip) => {
        const vehiculoRef = firebase.firestore().collection(COLLECTIONS.VEHICULOS).doc(binNip);
        const doc = await vehiculoRef.get();
        return doc.exists;
    };

    const handleAgregarMovimiento = async () => {
        try {
            const timestamp = moment().toDate();
            await firebase.firestore().collection(COLLECTIONS.VEHICULOS).doc(binNip).set({
                asignado: false,
                active: true,
                binNip: binNip,
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
                estatus: "PR",
                registro: {
                    usuario: user.nombre,
                    idUsuario: user.id,
                    timestamp: timestamp
                },
                storage: storage,
                sobrePeso: sobrePeso,
                gastosExtra: gastosExtra,
                comentariosChofer: null,
                titulo: titulo,
            });
            await firebase.firestore().collection(COLLECTIONS.MOVIMIENTOS).add({
                asignado: false,
                tipo: "+",
                binNip: binNip,
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
                estatus: "PR",
                usuario: user.nombre,
                idUsuario: user.id,
                tipoRegistro: "PR",
                timestamp: timestamp,
                storage: storage,
                sobrePeso: sobrePeso,
                gastosExtra: gastosExtra,
                comentariosChofer: null,
                titulo: titulo,
            });
        } catch (error) {
            console.error("Error al agregar vehículo y movimiento:", error);
            setError('Error al agregar el vehículo. Por favor, intente nuevamente.');
        }
    };

    const limpiarFormulario = () => {
        setEstado('');
        setCiudad('');
        setPrice(0);
        setBinNip('');
        setGatePass('');
        setTipoVehiculo('');
        setMarca('');
        setModelo('');
        setCliente('');
        setTelefonoCliente('');
        setDescripcion('');
        setStorage(0);
        setSobrePeso(0);
        setGastosExtra(0);
    };

    return (
        <form id="registraAuto" className="relative">
            <button type="button" onClick={onClose} className="absolute top-2 right-2 text-red-600 hover:text-red-800">
                X
            </button>
            <h2 className="text-xl font-bold mt-6 mb-2">Agregar Vehículos</h2>
            <Alert mostrar={!!error} mensaje={error} tipo="warning" />
            <Alert mostrar={!!success} mensaje={success} tipo="success" />
            <div className="flex flex-wrap">
                <div className="w-1/2 p-1">
                    <label htmlFor="estado" className="block text-black-500">Estado:</label>
                    <select
                        id="estado"
                        value={estado}
                        onChange={(e) => {
                            setEstado(e.target.value);
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
                <div className="w-1/2 p-1">
                    <label htmlFor="ciudad" className="block text-black-500">Ciudad:</label>
                    <select
                        id="ciudad"
                        value={ciudad}
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
            </div>
            <div className="flex flex-wrap">
                <div className="w-1/8  mr-2 p-1">
                    <label htmlFor="precio" className="block text-black-500">Precio:</label>
                    <p className="text-xl">$ {price} Dll</p>
                </div>

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
                    <label htmlFor="titulo"  className="block text-black-500">Título:</label>
                    <select
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    >
                        <option value="">Seleccionar Título</option>
                        {TITLE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

            </div>
            <div className="flex flex-wrap">
                <div className="w-1/3 p-1">
                    <label htmlFor="binNip" className="block text-black-500">* Bin o Número de Lote:</label>
                    <input
                        type="text"
                        id="binNip"
                        value={binNip}
                        maxLength={FIELD_LIMITS.BIN_NIP}
                        onChange={(e) => setBinNip(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    />
                </div>
                <div className="w-1/3 p-1">
                    <label htmlFor="gatePass" className="block text-black-500">* Gate Pass/N Comprador:</label>
                    <input
                        type="text"
                        id="gatePass"
                        value={gatePass}
                        maxLength={FIELD_LIMITS.GATE_PASS}
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
                        {VEHICLE_WAREHOUSES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex flex-wrap">
                <div className="w-1/8 p-1">
                    <label htmlFor="tipoVehiculo" className="block text-black-500">Tipo de Vehiculo:</label>
                    <select
                        id="tipoVehiculo"
                        value={tipoVehiculo}
                        onChange={(e) => setTipoVehiculo(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    >
                        <option key="S" value="">Seleciona</option>
                        {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
                <div className="w-1/2 p-1">
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
                <div className="w-1/4 p-1">
                    <label htmlFor="cliente" className="block text-black-500">* Cliente:</label>
                    <input
                        type="text"
                        id="cliente"
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    />
                </div>
                <div className="w-1/8 p-1">
                    <label htmlFor="telefonoCliente" className="block text-black-500">Telefono Cliente:</label>
                    <PhoneInput
                        onlyCountries={PHONE_CONFIG.COUNTRIES}
                        country={PHONE_CONFIG.DEFAULT_COUNTRY}
                        value={telefonoCliente}
                        onChange={(value) => {
                            if (typeof value === 'string') {
                                if (value.length > 0 && value[0] !== '+') {
                                    value = '+' + value;
                                }
                                setTelefonoCliente(value);
                            } else {
                                setTelefonoCliente('');
                            }
                        }}
                        inputProps={{
                            name: 'phone',
                            required: true,
                            maxLength: 60,
                            placeholder: 'Teléfono',
                            className: 'input input-bordered w-full text-black-500 input-sm bg-white-100'
                        }}
                        inputStyle={{textAlign: 'right'}}
                    />
                </div>
                <div className="w-1/2 p-1">
                    <label htmlFor="descripcion" className="block text-black-500">Descripción/Comentarios:</label>
                    <input
                        id="descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="input input-bordered w-full text-black-500 input-sm bg-white-100"
                    />
                </div>
            </div>
            <div className="flex flex-wrap">
                <div className="w-1/4 p-1">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="btn btn-sm btn-info mt-4"
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : '+ Agregar Vehículo'}
                    </button>
                </div>
            </div>

        </form>
    );
};

export default FormDatosVehiculo;
