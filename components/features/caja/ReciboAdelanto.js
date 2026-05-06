import React, { useRef } from 'react';
import ReactToPrint from "react-to-print";
import { toWords } from 'number-to-words';
import moment from 'moment';

const Ticket = ({ data, timestamp, montoNum, montoEnLetras, copia }) => (
    <div style={{ padding: '15px 40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Georgia, serif' }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: '6px', marginBottom: '10px' }}>
            <img src="/assets/Logoprint.png" alt="Logo" style={{ height: '30px', margin: '0 auto 4px' }} />
            <h1 style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '4px', color: '#111', margin: 0 }}>
                COMPROBANTE DE ANTICIPO
            </h1>
            <p style={{ fontSize: '9px', color: '#888', marginTop: '2px', letterSpacing: '2px' }}>
                JORGE MINNESOTA LOGISTIC LLC — {copia}
            </p>
        </div>

        {/* Fecha, lote y cliente en una fila */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px', color: '#444' }}>
            <span><strong>Fecha:</strong> {timestamp}</span>
            <span><strong>Lote:</strong> {data.binNip}</span>
            <span><strong>Cliente:</strong> {data.cliente}</span>
        </div>

        {/* Monto */}
        <div style={{
            border: '2px solid #111',
            padding: '8px 16px',
            marginBottom: '10px',
            textAlign: 'center',
        }}>
            <p style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '4px' }}>
                La cantidad de
            </p>
            <p style={{ fontSize: '28px', fontWeight: 900, color: '#111', margin: '0 0 2px' }}>
                $ {montoNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} DLL
            </p>
            <p style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>
                ({montoEnLetras})
            </p>
        </div>

        {/* Concepto y método */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px' }}>
            <div>
                <p style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1px' }}>Concepto</p>
                <p style={{ color: '#111', fontWeight: 700 }}>Anticipo de flete — {data.marca} {data.modelo}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1px' }}>Método de pago</p>
                <p style={{ color: '#111', fontWeight: 700 }}>{data.metodoPago === 'cc' ? 'Tarjeta / CC' : 'Efectivo'}</p>
            </div>
        </div>

        {/* Nota */}
        <p style={{ fontSize: '8px', color: '#999', textAlign: 'center', marginBottom: '10px', lineHeight: '1.3' }}>
            Este comprobante ampara únicamente el anticipo recibido. El monto total del servicio de flete
            será determinado al momento de la entrega del vehículo, pudiendo incluir cargos adicionales
            por storage, sobrepeso u otros gastos.
        </p>

        {/* Firma */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
                <div style={{ borderBottom: '1px solid #111', marginBottom: '3px', height: '20px' }}></div>
                <p style={{ fontSize: '9px', color: '#666' }}>Firma / Sello — {data.usuario}</p>
            </div>
        </div>
    </div>
);

const ComponentToPrint = React.forwardRef(({ data }, ref) => {
    const timestamp = moment().format('DD/MM/YYYY HH:mm');
    const montoNum = parseFloat(data.anticipoPago || 0);
    const montoEnLetras = toWords(montoNum).toUpperCase() + " DOLLARS";

    return (
        <div ref={ref}>
            <Ticket data={data} timestamp={timestamp} montoNum={montoNum} montoEnLetras={montoEnLetras} copia="COPIA CLIENTE" />

            {/* Línea de corte */}
            <div style={{ borderTop: '3px dashed #999', margin: '0 50px', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50)', backgroundColor: '#fff', padding: '0 12px', fontSize: '10px', color: '#999', letterSpacing: '2px' }}>
                    ✂ CORTAR AQUÍ
                </span>
            </div>

            <Ticket data={data} timestamp={timestamp} montoNum={montoNum} montoEnLetras={montoEnLetras} copia="COPIA CAJA" />
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
