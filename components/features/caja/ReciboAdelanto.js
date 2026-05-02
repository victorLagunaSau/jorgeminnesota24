import React, { useRef } from 'react';
import ReactToPrint from "react-to-print";
import { toWords } from 'number-to-words';
import moment from 'moment';

const ComponentToPrint = React.forwardRef(({ data }, ref) => {
    const timestamp = moment().format('DD/MM/YYYY HH:mm');
    const montoNum = parseFloat(data.anticipoPago || 0);
    const montoEnLetras = toWords(montoNum).toUpperCase() + " DOLLARS";

    return (
        <div ref={ref} style={{ padding: '40px 50px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Georgia, serif' }}>
            {/* Encabezado */}
            <div style={{ textAlign: 'center', borderBottom: '3px solid #111', paddingBottom: '16px', marginBottom: '24px' }}>
                <img src="/assets/Logoprint.png" alt="Logo" style={{ height: '50px', margin: '0 auto 8px' }} />
                <h1 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '6px', color: '#111', margin: 0 }}>
                    COMPROBANTE DE ANTICIPO
                </h1>
                <p style={{ fontSize: '11px', color: '#888', marginTop: '4px', letterSpacing: '2px' }}>
                    JORGE MINNESOTA LOGISTIC LLC
                </p>
            </div>

            {/* Fecha y folio */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', fontSize: '13px', color: '#444' }}>
                <span><strong>Fecha:</strong> {timestamp}</span>
                <span><strong>Lote:</strong> {data.binNip}</span>
            </div>

            {/* Recibimos de */}
            <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
                    Recibimos de
                </p>
                <p style={{ fontSize: '24px', fontWeight: 900, color: '#111', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
                    {data.cliente}
                </p>
            </div>

            {/* Monto */}
            <div style={{
                border: '2px solid #111',
                padding: '20px 24px',
                marginBottom: '24px',
                textAlign: 'center',
            }}>
                <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '8px' }}>
                    La cantidad de
                </p>
                <p style={{ fontSize: '42px', fontWeight: 900, color: '#111', margin: '0 0 4px' }}>
                    $ {montoNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} DLL
                </p>
                <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
                    ({montoEnLetras})
                </p>
            </div>

            {/* Concepto y método */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', fontSize: '13px' }}>
                <div>
                    <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2px' }}>Concepto</p>
                    <p style={{ color: '#111', fontWeight: 700 }}>Anticipo de flete — {data.marca} {data.modelo}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2px' }}>Método de pago</p>
                    <p style={{ color: '#111', fontWeight: 700 }}>{data.metodoPago === 'cc' ? 'Tarjeta / CC' : 'Efectivo'}</p>
                </div>
            </div>

            {/* Nota */}
            <p style={{ fontSize: '10px', color: '#999', textAlign: 'center', marginBottom: '36px', lineHeight: '1.5' }}>
                Este comprobante ampara únicamente el anticipo recibido. El monto total del servicio de flete
                será determinado al momento de la entrega del vehículo, pudiendo incluir cargos adicionales
                por storage, sobrepeso u otros gastos.
            </p>

            {/* Firma / Sello de caja */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
                <div style={{ textAlign: 'center', width: '50%' }}>
                    <div style={{ borderBottom: '1px solid #111', marginBottom: '6px', height: '40px' }}></div>
                    <p style={{ fontSize: '11px', color: '#666' }}>Firma / Sello de caja — {data.usuario}</p>
                </div>
            </div>
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
