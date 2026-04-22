import React, { useRef } from 'react';
import ReactToPrint from "react-to-print";
import { toWords } from 'number-to-words';
import moment from 'moment';

const ComponentToPrint = React.forwardRef(({ data }, ref) => {
    const timestamp = moment().format('DD/MM/YYYY HH:mm:ss');
    const montoNum = parseFloat(data.anticipoPago || 0);
    const montoEnLetras = toWords(montoNum).toUpperCase() + " DLL";

    const Recibo = ({ title }) => (
        <div className="p-4" style={{ border: '3px dashed #999', marginBottom: '16px' }}>
            {/* Header - Fondo gris con marca de agua */}
            <div style={{ backgroundColor: '#e5e5e5', padding: '12px 16px', marginBottom: '12px', position: 'relative' }}>
                <div className="flex justify-between items-center">
                    <img src="/assets/Logoprint.png" className="w-15 mr-1" alt="Logo" style={{ opacity: 0.5 }} />
                    <div className="text-center flex-1">
                        <p style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '4px', color: '#555' }}>
                            ANTICIPO - NO ES RECIBO DE PAGO
                        </p>
                        <p style={{ fontSize: '10px', color: '#777', fontWeight: 700, letterSpacing: '2px' }}>
                            COMPROBANTE DE PAGO ADELANTADO
                        </p>
                    </div>
                    <p className="text-gray-400 text-xs">{title}</p>
                </div>
            </div>

            {/* Marca diagonal */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-25deg)',
                    fontSize: '60px',
                    fontWeight: 900,
                    color: 'rgba(0,0,0,0.04)',
                    letterSpacing: '10px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}>
                    ANTICIPO
                </div>

                <div className="flex" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="w-1/3 p-2" style={{ borderLeft: '2px dashed #bbb' }}>
                        <p style={{ fontSize: '10px', color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Procedencia</p>
                        <p className="text-black">Estado: <strong>{data.estado}</strong></p>
                        <p className="text-black">Ciudad: <strong>{data.ciudad}</strong></p>
                        <p className="text-black mt-2">Lote: <strong className="text-lg">{data.binNip}</strong></p>
                    </div>
                    <div className="w-1/3 p-2" style={{ borderLeft: '2px dashed #bbb' }}>
                        <p style={{ fontSize: '10px', color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Cliente</p>
                        <h3 className="font-bold text-black">{data.cliente}</h3>
                        {data.telefonoCliente && (
                            <p className="text-sm text-black">{data.telefonoCliente}</p>
                        )}
                        <p style={{ fontSize: '10px', color: '#999', fontWeight: 700, textTransform: 'uppercase', marginTop: '8px' }}>Vehículo</p>
                        <h3 className="font-bold text-black">{data.marca} {data.modelo}</h3>
                    </div>
                    <div className="w-1/3 p-2" style={{ borderLeft: '2px dashed #bbb' }}>
                        <p style={{ fontSize: '10px', color: '#999', fontWeight: 700 }}>FLETE (REF.)</p>
                        <p className="text-black font-bold">$ {data.price} DLL</p>

                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            border: '3px double #555',
                            backgroundColor: '#f0f0f0',
                        }}>
                            <p style={{ fontSize: '10px', fontWeight: 900, color: '#555', letterSpacing: '2px' }}>ANTICIPO RECIBIDO:</p>
                            <p style={{ fontSize: '24px', fontWeight: 900, color: '#333' }}>$ {montoNum} DLL</p>
                            <p style={{ fontSize: '9px', color: '#666' }}>({montoEnLetras})</p>
                        </div>

                        <p style={{ fontSize: '8px', color: '#999', marginTop: '8px', lineHeight: '1.3' }}>
                            * Este comprobante NO es un recibo de pago final.
                            Sujeto a cargos adicionales al momento de la entrega.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '2px dashed #bbb', marginTop: '12px', paddingTop: '8px' }}>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-black" style={{ fontSize: '10px' }}>Fecha: {timestamp}</p>
                        <p className="text-black mt-6">________________</p>
                        <p style={{ fontSize: '10px', color: '#666' }}>Nombre y firma del Cliente</p>
                    </div>
                    <div className="text-right">
                        <p className="text-black mt-6">________________</p>
                        <p style={{ fontSize: '10px', color: '#666' }}>Registrado por: {data.usuario}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div ref={ref} className="m-4" style={{ maxWidth: "90%", marginLeft: "auto", marginRight: "auto" }}>
            <Recibo title="Cliente" />
            <Recibo title="Oficina" />
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
