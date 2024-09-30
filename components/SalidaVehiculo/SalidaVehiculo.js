import React, {useState} from 'react';
import {firestore} from "../../firebase/firebaseIni";
import ImprimeSalida from "./ImprimeSalida";

const SalidaVehiculo = (user) => {
    const [binNip, setBinNip] = useState("");
    const [estatus, setEstatus] = useState("");
    const [modelo, setModelo] = useState("");
    const [marca, setMarca] = useState("");
    const [ciudad, setCiudad] = useState("");
    const [estado, setEstado] = useState("");
    const [vehiculoData, setVehiculoData] = useState([]);
    const [pago, setPago] = useState(0);
    const [storage, setStorage] = useState(0);
    const [titulo, setTitulo] = useState("");
    const [showModal, setShowModal] = useState("");
    const [precio, setPrecio] = useState("");
    const [recibo, setRecibo] = useState(0);

    const [mensajeError, setMensajeError] = useState("");
    const [cargando, setCargando] = useState(false);

    const timestamp = new Date();

    const buscarVehiculo = async () => {
        try {
            setCargando(true);
            await new Promise(resolve => setTimeout(resolve, 2000));
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
                setVehiculoData(vehiculo);
                setPrecio(vehiculo.price);
                setPago(0);
                setStorage(0);
                setTitulo("");

            }
        } catch (error) {
            setMensajeError("Ocurrió un error al buscar el vehículo");
        } finally {
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

    const handleDarSalida = async () => {
        if (!pago) {
            setMensajeError("El campo de pago no puede estar vacío");
            return;
        }

        try {
            const totalPago = parseFloat(storage) + parseFloat(pago);
            setCargando(true);
            await firestore().collection("vehiculos").doc(binNip).update({
                estatus: "EN",
                timestamp: timestamp,
                pago: pago,
                storage: storage,
                totalPago: totalPago,
                titulo: titulo,
            });
            setEstatus("EN");
            await firestore().collection("movimientos").add({
                tipo: "Salida",
                binNip: binNip,
                marca: vehiculoData.marca,
                modelo: vehiculoData.modelo,
                cliente: vehiculoData.cliente,
                telefonoCliente: vehiculoData.telefonoCliente,
                descripcion: vehiculoData.descripcion,
                estado: vehiculoData.estado,
                ciudad: vehiculoData.ciudad,
                price: vehiculoData.price,
                estatus: "EN",
                usuario: user.user.nombre,
                idUsuario: user.user.id,
                tipoRegistro: "EN",
                timestamp: timestamp,
                pago: pago,
                storage: storage,
                totalPago: totalPago,
                titulo: titulo,
            });
            setMensajeError("");
        } catch (error) {
            setMensajeError("Ocurrió un error al actualizar el estatus del vehículo y registrar el movimiento");
        } finally {
            setCargando(false);
        }
    };

    const handleImprimeSalida = () => {
        setShowModal(true);
    };

    return (
        <div id="serch">
            {showModal && (
                <dialog id="modalDatosViaje" className="modal" open>
                    <ImprimeSalida vehiculoData={vehiculoData} pago={pago} storage={storage} titulo={titulo}
                                   onClose={() => setShowModal(false)}/>
                </dialog>
            )}
            <div className="flex flex-col items-center justify-center">
                <div>
                    <h1 className="text-2xl lg:text-3xl xl:text-3xl font-medium text-black-600 leading-normal text-center">
                        Cobro de <strong>vehículo</strong>.
                    </h1>
                    <p className="text-black-500 mt-4 mb-6 text-center">
                        Busca un vehiculo para darle salida de Inventario
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
                </div>
                {cargando ? <span className="loading loading-ring loading-lg"></span> : ""}
                {mensajeError && <div className="text-red-500">{mensajeError}</div>}
                {estatus && (
                    <ul className="steps steps-gray-500 mt-4">
                        {["PR", "IN", "TR", "EB", "DS", "EN"].map((step, index) => (
                            <li key={index}
                                className={`step ${estatus === step || index < ["PR", "IN", "TR", "EB", "DS", "EN"].indexOf(estatus) ? "step-info text-black-500 text-xs" : "text-xs"}`}>
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
                {estatus && (
                    <div className="w-full max-w-3xl mx-auto mt-2">
                        <div className="bg-gray-100 shadow-md p-6 rounded-md">
                            {estatus === "PR" && (
                                <div>
                                    <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                        Registrado
                                    </p>
                                </div>
                            )}
                            {estatus === "IN" && (
                                <div>
                                    <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                        Cargando
                                    </p>
                                </div>
                            )}
                            {estatus === "TR" && (
                                <div>
                                    <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                        En Viaje
                                    </p>
                                </div>
                            )}
                            {estatus === "EB" && (
                                <div>
                                    <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                        En Brownsville
                                    </p>
                                </div>
                            )}
                            {estatus === "DS" && (
                                <div>
                                    <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                        Descargado
                                    </p>
                                </div>
                            )}
                            {estatus === "EN" && (
                                <div>
                                    <p className="text-2xl lg:text-3xl xl:text-3xl font-medium text-blue-700 leading-normal">
                                        Entregado
                                    </p>
                                    <p className="text-black-500">V ehículo fue entregado</p>
                                </div>
                            )}
                            <label htmlFor="titulo" className="block text-black-500">Procedencia:</label>
                            <div className="flex ">
                                <p className="ml-2">Ciudad: <strong>{ciudad}</strong></p>
                                <p className="ml-2">Estado: <strong>{estado}</strong></p>
                            </div>
                            <label htmlFor="titulo" className="block text-black-500">Vehiculo:</label>
                            <div className="flex ">
                                <p className="ml-2">Modelo: <strong>{modelo}</strong></p>
                                <p className="ml-2">Marca: <strong>{marca}</strong></p>
                                {estatus === "EN" ? (
                                    <div className="ml-2">
                                        {vehiculoData.pago ? (
                                            <div>
                                                <p>Título: <strong>{vehiculoData.titulo}</strong></p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p>Título: <strong>{titulo}</strong></p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>

                            {estatus === "EN" ? null : (
                                <div>
                                    <div className="p-1">
                                        <label htmlFor="titulo" className="block text-black-500">Título:</label>
                                        <select
                                            id="tipoVehiculo"
                                            value={titulo}
                                            onChange={(e) => setTitulo(e.target.value)}
                                            className="input input-bordered w-full text-black-500 input-lg bg-white-100"
                                        >
                                            <option key="NO" value="NO">NO</option>
                                            <option key="SI" value="SI">SI</option>
                                        </select>
                                    </div>
                                </div>
                            )
                            }
                            <p className="mt-4 text-xl">Precio de transporte: <strong>$ {precio} DLL</strong></p>
                            {estatus === "EN" ? (
                                <div>
                                    {vehiculoData.pago ? (
                                        <div>
                                            <p>Pago en Dll: <strong>{vehiculoData.pago}</strong></p>
                                            <p>Pago Extras por Storage: <strong>{vehiculoData.storage}</strong></p>
                                            <p className="mt-4 text-xl">Total: <strong>$ {parseFloat(vehiculoData.storage) + parseFloat(vehiculoData.pago)} DLL</strong>
                                            </p>

                                        </div>
                                    ) : (
                                        <div>
                                            <p>Pago en Dll: <strong>{pago}</strong></p>
                                            <p>Pago Extras por Storage: <strong>{storage}</strong></p>
                                            <p className="mt-4 text-xl">Total: <strong>$ {parseFloat(storage) + parseFloat(pago)} DLL</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div className="p-1">
                                        <label htmlFor="pago" className="block text-black-500">Pago en Dll:</label>
                                        <div className="flex items-center">
                                            $ <input
                                            type="number"
                                            id="pago"
                                            value={pago}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                if (value === "" || parseFloat(value) < 0) {
                                                    setPago(0);
                                                } else {
                                                    if (parseFloat(value) > 0) {
                                                        value = parseFloat(value).toString();
                                                    }
                                                    setPago(value);
                                                }
                                            }}
                                            className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                            min="0"
                                            step="any"
                                        /> Dll
                                        </div>
                                    </div>

                                    <div className="p-1">
                                        <label htmlFor="storage" className="block text-black-500">Pago Extras por
                                            Storage Overhead:</label>
                                        <div className="flex items-center">
                                            $ <input
                                            type="number"
                                            id="storage"
                                            value={storage}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                if (value === "" || parseFloat(value) < 0) {
                                                    setStorage(0);
                                                } else {
                                                    if (parseFloat(value) > 0) {
                                                        value = parseFloat(value).toString();
                                                    }
                                                    setStorage(value);
                                                }
                                            }}
                                            className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                            min="0"
                                            step="any"
                                        /> Dll
                                        </div>
                                    </div>

                                    <p className="mt-4 text-xl">Total: <strong>$ {parseFloat(storage) + parseFloat(pago)} DLL</strong>
                                    </p>

                                    <div className="p-1">
                                        <label htmlFor="recibo" className="block text-black-500">Recibo:</label>
                                        <div className="flex items-center">
                                            $ <input
                                            type="number"
                                            id="recibo"
                                            value={recibo}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                if (value === "" || parseFloat(value) < 0) {
                                                    setRecibo(0);
                                                } else {
                                                    if (parseFloat(value) > 0) {
                                                        value = parseFloat(value).toString();
                                                    }
                                                    setRecibo(value);
                                                }
                                            }}
                                            className="input input-bordered w-full text-black-500 input-lg bg-white-100 mx-1"
                                            min="0"
                                            step="any"
                                        /> Dll
                                        </div>
                                    </div>

                                    <p className="mt-4 text-xl">Cambio: <strong>$ {+parseFloat(recibo) - (parseFloat(storage) + parseFloat(pago))} DLL</strong>
                                    </p>
                                </div>

                            )
                            }
                            {
                                estatus === "EN" ? (
                                    <button className="btn btn-outline btn-error m-4" onClick={handleImprimeSalida}>
                                        Imprimir
                                    </button>
                                ) : (
                                    <button className="btn btn-info btn-sm m-3" onClick={handleDarSalida}>
                                        Dar Salida
                                    </button>
                                )
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalidaVehiculo;
