import React, {useRef} from 'react';
import ReactToPrint from "react-to-print";
import {toWords} from 'number-to-words';
import moment from 'moment';

const ComponentToPrint = React.forwardRef(({vehiculoData}, ref) => {

    const timestamp = moment().format('DD/MM/YYYY HH:mm:ss');

    const parseNumberOrZero = (value) => {
        const parsedValue = parseFloat(value);
        return isNaN(parsedValue) ? 0 : parsedValue;
    };
    const vehiculoPrice = parseNumberOrZero(vehiculoData.price);
    const montoPago = parseNumberOrZero(vehiculoData.pago);
    const montoStorage = parseNumberOrZero(vehiculoData.storage);
    const datoSobrePeso = parseNumberOrZero(vehiculoData.sobrePeso);
    const datoGastosExtra = parseNumberOrZero(vehiculoData.gastosExtra);
    const montoTotal = parseNumberOrZero(vehiculoData.totalPago);


    // Convertir los valores a palabras
    const montoEnDolares = toWords(vehiculoPrice).toUpperCase() + " DLL";
    const montoEnDolaresTotal = toWords(montoTotal).toUpperCase() + " DLL";
    const ReciboSalida = ({title}) => (
        <div className="border-gray-300 p-4">
            <div className="w-full flex justify-between border-t border-gray-300 pt-1">
                <img src="/assets/Logoprint.png" className="w-15 mr-1" alt="Logo"/>
                <p className="text-black-500">
                    <strong className="mr-3"> RECIBO DE ENTREGA </strong> Fecha: {
                    vehiculoData.timestamp && vehiculoData.timestamp.seconds
                        ? moment(vehiculoData.timestamp.seconds * 1000).format('DD/MM/YYYY HH:mm:ss')
                        : moment().format('DD/MM/YYYY HH:mm:ss') // Si no hay timestamp, muestra la fecha actual
                }
                </p>
                <p className="text-gray-400">{title}</p>
            </div>
            <div className="flex">
                <div className="w-1/3 border-l text-gray-400 p-2">
                    <p>Procedencia:</p>
                    <p className="text-black-500">Estado: <strong
                        className="text-lg text-black-500">{vehiculoData.estado}</strong></p>
                    <p className="text-black-500">Ciudad: <strong
                        className="text-lg text-black-500">{vehiculoData.ciudad}</strong></p>
                    <p className="text-black-500">Bin Nip: <strong
                        className="text-lg text-black-500">{vehiculoData.binNip}</strong></p>
                    <p className="text-black-500">Gatepass: <strong
                        className="text-lg text-black-500">{vehiculoData.gatePass}</strong></p>
                </div>
                <div className="w-1/3 border-l border-gray-300 p-2">
                    <p className="text-sm text-black-500">Cliente:</p>
                    <h3 className="text-sm font-bold text-black-500">{vehiculoData.cliente}</h3>

                    <p className="text-sm text-black-500">Modelo:</p>
                    <h3 className="font-bold text-black-500">{vehiculoData.modelo}</h3>
                    <p className="text-sm text-black-500">Marca:</p>
                    <h3 className="font-bold text-black-500">{vehiculoData.marca}</h3>


                </div>
                <div className="w-1/3 border-l border-gray-300 ">
                    <p className="w-full pt-2 text-black-500 mt-24 ml-3">________________</p>
                    <p className="text-sm text-black-500 ml-3">Nombre y firma del Receptor:</p>
                </div>
                <p></p>
            </div>
        </div>
    );

    const InfoPagos = ({title}) => (
        <div className="border-gray-300 p-4">
            <div className="w-full flex justify-between border-t border-gray-300 pt-1">
                <img src="/assets/Logoprint.png" className="w-15 mr-1" alt="Logo"/>
                <p className="text-black-500">
                    <strong className="mr-3"> RECIBO DE ENTREGA </strong> Fecha: {
                    vehiculoData.timestamp && vehiculoData.timestamp.seconds
                        ? moment(vehiculoData.timestamp.seconds * 1000).format('DD/MM/YYYY HH:mm:ss')
                        : moment().format('DD/MM/YYYY HH:mm:ss') // Si no hay timestamp, muestra la fecha actual
                }
                </p>

                <p className="text-gray-400">{title}</p>
            </div>
            <div className="flex">
                <div className="w-1/3 border-l text-gray-400 p-2">
                    <p>Procedencia:</p>
                    <p className="text-black-500">Estado: <strong
                        className="text-lg text-black-500">{vehiculoData.estado}</strong></p>
                    <p className="text-black-500">Ciudad: <strong
                        className="text-lg text-black-500">{vehiculoData.ciudad}</strong></p>
                    <div>
                        <p className="text-black-500">Costo: <strong
                            className="text-lg text-black-500">$ {vehiculoData.price} DLL</strong></p>
                        <p className="text-sm text-black-500">({montoEnDolares})</p>
                    </div>
                    <p className="text-black-500">Bin Nip: <strong
                        className="text-lg text-black-500">{vehiculoData.binNip}</strong></p>
                    <p className="text-black-500">Gatepass: <strong
                        className="text-lg text-black-500">{vehiculoData.gatePass}</strong></p>
                </div>
                <div className="w-1/3 border-l border-gray-300 p-2">
                    <p className="text-sm text-black-500">Cliente:</p>
                    <h3 className="text-sm font-bold text-black-500">{vehiculoData.cliente}</h3>

                    <p className="text-sm text-black-500">Modelo:</p>
                    <h3 className="font-bold text-black-500">{vehiculoData.modelo}</h3>
                    <p className="text-sm text-black-500">Marca:</p>
                    <h3 className="font-bold text-black-500">{vehiculoData.marca}</h3>

                    <p className="w-full pt-2 text-black-500 mt-4">________________</p>
                    <p className="text-sm text-black-500">Nombre y firma del Receptor:</p>
                </div>
                <div className="w-1/3 border-l border-gray-300 ">
                    <p className="text-sm text-black-500 ml-1 ">Importe: <strong>$ {montoPago} DLL</strong></p>
                    <p className="text-sm text-black-500 ml-1 ">Storage: <strong>$ {montoStorage} DLL</strong></p>
                    <p className="text-sm text-black-500 ml-1 ">Sobre Peso: <strong>$ {datoSobrePeso} DLL</strong></p>
                    <p className="text-sm text-black-500 ml-1 ">Extras: <strong>$ {datoGastosExtra} DLL</strong></p>
                    <p className="text-xl text-black-500 ml-1 ">Total: <strong>$ {montoTotal} DLL</strong></p>
                    {vehiculoData.pagosPendientes && (
                        <div>
                            <h2 className="text-xl text-red-500">Pagos Pendientes</h2>
                            <p>Pagos Parciales:</p>
                            <ul className="list-disc ml-6">
                                {vehiculoData.pagos001 > 0 && <li>Pago 1: ${vehiculoData.pagos001}</li>}
                                {vehiculoData.pagos002 > 0 && <li>Pago 2: ${vehiculoData.pagos002}</li>}
                                {vehiculoData.pagos003 > 0 && <li>Pago 3: ${vehiculoData.pagos003}</li>}
                                {vehiculoData.pagos004 > 0 && <li>Pago 4: ${vehiculoData.pagos004}</li>}
                                {vehiculoData.pagos005 > 0 && <li>Pago 5: ${vehiculoData.pagos005}</li>}
                            </ul>
                            <p>Total Pendiente: <strong>${vehiculoData.pagoTotalPendiente}</strong></p>
                        </div>
                    )}
                </div>
                <p></p>
            </div>

        </div>
    );

    return (
        <div ref={ref} className="m-4" style={{maxWidth: "90%", marginLeft: "auto", marginRight: "auto"}}>
            <ReciboSalida title="Copia: Salida" />
            <InfoPagos title="Copia: Cliente pendiente de pago"/>
            <InfoPagos title="Copia: Oficina pendiente de pago"/>

            Comentarios: {vehiculoData.comentarioPago}
        </div>
    );
});

const ImprimeSalida = ({onClose, vehiculoData, pago, storage, titulo}) => {
    const componentRef = useRef(null);
    return (
        <div className="">
            <div className="navbar bg-neutral text-neutral-content">
                <div className="navbar-center hidden lg:flex">
                    <ul className="menu menu-horizontal">
                        <li className="m-2 btn btn-sm btn-ghost right-2 mr-4">
                            <ReactToPrint
                                trigger={() => <a>Imprimir</a>}
                                content={() => componentRef.current}
                            />
                        </li>
                        <form method="dialog">
                            <button className="btn btn-sm btn-ghost absolute right-2 mr-8" onClick={onClose}>Cerrar
                            </button>
                        </form>
                    </ul>
                </div>
            </div>
            <ComponentToPrint ref={componentRef} vehiculoData={vehiculoData} pago={pago} storage={storage}
                              titulo={titulo}/>
        </div>
    );
};

export default ImprimeSalida;