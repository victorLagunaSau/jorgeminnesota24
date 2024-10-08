import React, {useRef} from 'react';
import ReactToPrint from "react-to-print";
import {toWords} from 'number-to-words';
import moment from 'moment';

const ComponentToPrint = React.forwardRef(({vehiculoData, pago, storage, titulo}, ref) => {
    const timestamp = moment().format('DD/MM/YYYY HH:mm:ss');
    const montoEnDolares = toWords(vehiculoData.price).toUpperCase() + " DLL";
    const montoPago = pago || vehiculoData.pago;
    const montoEnDolaresPago = toWords(montoPago).toUpperCase() + " DLL";
    const montoStorage = storage || vehiculoData.storage;
    const montoEnDolaresStorage = toWords(montoStorage).toUpperCase() + " DLL";
    const datoTitulo = titulo || vehiculoData.titulo;
    const montoTotal = parseFloat(montoPago) + parseFloat(montoStorage);
    const montoEnDolaresTotal = toWords(montoTotal).toUpperCase() + " DLL";
    console.log(vehiculoData)
    const Recibo = ({title}) => (
        <div className="border-gray-300 p-4">
            <div className="w-full flex justify-between border-t border-gray-300 pt-1">
                <img src="/assets/Logoprint.png" className="w-15 mr-2" alt="Logo"/>
                <h3 className="font-bold text-lg text-black-500">RECIBO DE ENTREGA Y PAGO</h3>
                <p className="text-gray-400">{title}</p>
            </div>
            <div className="flex">
                <div className="w-1/3 border-l text-gray-400 p-2">
                    <p >Procedencia:</p>
                    <div className="flex">
                        <div className="">
                            <p className="text-black-500">Estado:</p>
                            <h3 className="font-bold text-lg text-black-500">{vehiculoData.estado}</h3>
                        </div>
                        <div className="ml-3">
                            <p className="text-black-500">Ciudad:</p>
                            <h3 className="font-bold text-lg text-black-500">{vehiculoData.ciudad}</h3>
                        </div>
                    </div>
                    <div>
                        <p className="text-black-500 text-sm">Fecha de pago:</p>
                        <h3 className="font-bold text-sm text-black-500">{timestamp}</h3>
                    </div>
                    <div>
                        <p className="text-sm text-black-500">Costo: <strong
                            className="text-sm">$ {vehiculoData.price} DLL</strong></p>
                        <p className="text-sm text-black-500">({montoEnDolares})</p>
                    </div>
                </div>
                <div className="w-1/3 border-l border-gray-300 p-2">
                            <p className="text-sm text-black-500">Cliente:</p>
                            <h3 className="text-sm font-bold text-black-500">{vehiculoData.cliente}</h3>
                    <div className="flex">
                        <div className="">
                            <p className="text-sm text-black-500">Bin Nip:</p>
                            <h3 className="font-bold text-black-500">{vehiculoData.binNip}</h3>
                        </div>
                        <div className="ml-2">
                            <p className="text-sm text-black-500 ">Gatepass:</p>
                            <h3 className="font-bold text-black-500">{vehiculoData.gatePass}</h3>
                        </div>
                    </div>
                    <div className="flex">
                        <div className="">
                            <p className="text-sm text-black-500">Modelo:</p>
                            <h3 className="font-bold text-black-500">{vehiculoData.modelo}</h3>
                        </div>
                        <div className="ml-2">
                            <p className="text-sm text-black-500">Marca:</p>
                            <h3 className="font-bold text-black-500">{vehiculoData.marca}</h3>
                        </div>
                    </div>
                </div>
                <div className="w-1/3 border-l border-gray-300 p-4">
                        <p className="text-sm text-black-500">Importe: <strong>$ {montoPago} DLL</strong></p>
                        <p className="text-xs text-black-500">({montoEnDolaresPago})</p>
                        <p className="text-sm text-black-500">Storage: <strong>$ {montoStorage} DLL</strong></p>
                        <p className="text-xs text-black-500">({montoEnDolaresStorage})</p>
                        <p className="text-xl text-black-500">Total: <strong>$ {montoTotal} DLL</strong></p>
                        <p className="text-xs text-black-500">({montoEnDolaresTotal})</p>
                        <p className="w-full pt-2 text-black-500">________________</p>
                        <p className="text-sm text-black-500">Nombre y firma del Receptor:</p>
                </div>
            </div>


        </div>
    );

    return (
        <div ref={ref} className="m-4" style={{maxWidth: "90%", marginLeft: "auto", marginRight: "auto"}}>
            <Recibo title="Copia: Salida"/>
            <Recibo title="Copia: Cliente"/>
            <Recibo title="Copia: Archivo Oficina"/>
        </div>
    );
});

const ImprimeSalida = ({onClose, vehiculoData, pago, storage, titulo}) => {
    const componentRef = useRef(null);

    return (
        <div className="modal-box w-11/12 max-w-5xl bg-white-500">
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
                            <button className="btn btn-sm btn-ghost absolute right-2 mr-4" onClick={onClose}>Cerrar
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
