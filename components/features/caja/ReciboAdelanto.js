import React, { useRef } from 'react';
import ReactToPrint from "react-to-print";
import { toWords } from 'number-to-words';
import moment from 'moment';

const ComponentToPrint = React.forwardRef(({ data }, ref) => {
    const timestamp = moment().format('DD/MM/YYYY HH:mm:ss');
    const montoNum = parseFloat(data.anticipoPago || 0);
    const montoEnLetras = toWords(montoNum).toUpperCase() + " DLL";

    const Recibo = ({ title }) => (
        <div className="border-gray-300 p-4">
            <div className="w-full flex justify-between border-t border-gray-300 pt-1">
                <img src="/assets/Logoprint.png" className="w-15 mr-1" alt="Logo" />
                <p className="text-black">
                    <strong className="mr-3">RECIBO DE PAGO ADELANTADO</strong>
                    Fecha: {timestamp}
                </p>
                <p className="text-gray-400">{title}</p>
            </div>
            <div className="flex">
                <div className="w-1/3 border-l text-gray-400 p-2">
                    <p>Procedencia:</p>
                    <p className="text-black">Estado: <strong className="text-lg">{data.estado}</strong></p>
                    <p className="text-black">Ciudad: <strong className="text-lg">{data.ciudad}</strong></p>
                    <p className="text-black">Lote: <strong className="text-lg">{data.binNip}</strong></p>
                </div>
                <div className="w-1/3 border-l border-gray-300 p-2">
                    <p className="text-sm text-black">Cliente:</p>
                    <h3 className="text-sm font-bold text-black">{data.cliente}</h3>
                    {data.telefonoCliente && (
                        <>
                            <p className="text-sm text-black mt-1">Teléfono:</p>
                            <h3 className="text-sm font-bold text-black">{data.telefonoCliente}</h3>
                        </>
                    )}
                    <p className="text-sm text-black mt-1">Vehículo:</p>
                    <h3 className="font-bold text-black">{data.marca} {data.modelo}</h3>
                </div>
                <div className="w-1/3 border-l border-gray-300 p-2">
                    <p className="text-sm text-black">Precio de transporte (ref.):</p>
                    <p className="text-lg font-bold text-black">$ {data.price} DLL</p>

                    <div className="mt-2 p-2 border-2 border-black">
                        <p className="text-sm text-black font-bold">ANTICIPO PAGADO:</p>
                        <p className="text-2xl font-black text-black">$ {montoNum} DLL</p>
                        <p className="text-xs text-black">({montoEnLetras})</p>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                        * Monto sujeto a cargos adicionales (storage, sobrepeso, extras) al momento de la entrega.
                    </p>
                </div>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-gray-300">
                <div className="w-1/2">
                    <p className="text-black mt-8">________________</p>
                    <p className="text-sm text-black">Nombre y firma del Cliente</p>
                </div>
                <div className="w-1/2 text-right">
                    <p className="text-black mt-8">________________</p>
                    <p className="text-sm text-black">Registrado por: {data.usuario}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div ref={ref} className="m-4" style={{ maxWidth: "90%", marginLeft: "auto", marginRight: "auto" }}>
            <Recibo title="Copia: Cliente" />
            <Recibo title="Copia: Archivo Oficina" />
        </div>
    );
});

const ReciboAdelanto = ({ onClose, data }) => {
    const componentRef = useRef(null);
    return (
        <div>
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
                            <button className="btn btn-sm btn-ghost absolute right-2 mr-8" onClick={onClose}>Cerrar</button>
                        </form>
                    </ul>
                </div>
            </div>
            <ComponentToPrint ref={componentRef} data={data} />
        </div>
    );
};

export default ReciboAdelanto;
