// src/components/ReciboPP.js
import React, {forwardRef} from "react";
import moment from "moment";
import {toWords} from "number-to-words";

const ReciboPP = forwardRef(({vehiculo, pago2, pago3, fechaPago, user}, ref) => {
    const pago1 = parseFloat(vehiculo?.pagos001) || 0;
    const pago2Val = parseFloat(pago2) || 0;
    const pago3Val = parseFloat(pago3) || 0;
    const totalPagado = pago1 + pago2Val + pago3Val;
    const totalPendiente = parseFloat(vehiculo?.pagoTotalPendiente) || 0;
    const precioTotal = parseFloat(vehiculo?.price) || 0;

    const totalPagadoPalabras = toWords(totalPagado).toUpperCase() + " DÓLARES";

    const Recibo = ({title}) => (
        <div className="border-2 border-gray-400 p-4 my-4" style={{fontFamily: "Arial", fontSize: "14px"}}>

            <div className="flex justify-between mb-2">
                <img src="/assets/Logoprint.png" className="w-15 mr-1" alt="Logo"/>
                <h2 className="text-lg font-bold">RECIBO DE PAGO PENDIENTE</h2>
                <div>
                    <p><strong>Fecha:</strong> {moment(fechaPago).format("DD/MM/YYYY")}</p>
                    <p className="text-sm italic">{title}</p>
                </div>
            </div>
            <hr className="mb-2"/>
            <div className="mb-2">
                <p><strong>Cliente:</strong> {vehiculo?.cliente} <strong>Vehículo:</strong> {vehiculo?.marca} {vehiculo?.modelo} <strong>Descripción:</strong> {vehiculo?.descripcion}</p>
            </div>
            <div className="mb-2">
                {vehiculo?.pagos002 ? (
                    pago3Val > 0 && (
                        <div className="text-xl">
                            <p>Este comprobante corresponde a: </p>
                            <p>Tercer pago por: <strong>${pago3Val.toFixed(2)}</strong> dólares.</p>
                        </div>

                    )
                ) : (
                    pago2Val > 0 && (
                        <div className="text-xl">
                            <li>Este comprobante corresponde a: </li>
                            <p>Segundo pago por: <strong>${pago2Val.toFixed(2)}</strong> dólares.</p>
                        </div>
                    )
                )}
            </div>
            <div className="mb-2">
                <p><strong>Pagos Realizados:</strong></p>
                <ul className="ml-4 list-disc">
                    <li>Pago 1: ${pago1.toFixed(2)}</li>
                    {vehiculo?.pagos002 ? <li>Pago 2: ${pago2Val.toFixed(2)}</li> : null}
                    {vehiculo?.pagos002 ? <li>Pago 3: ${pago3Val.toFixed(2)}</li> :
                        <li>Pago 2: ${pago2Val.toFixed(2)}</li>}
                </ul>
                <p className="mt-2"><strong>Total Pagado:</strong> ${totalPagado.toFixed(2)} ({totalPagadoPalabras})</p>
                <p className="mt-2"><strong>Total de Venta:</strong> ${vehiculo.totalPago}</p>
                <p className="text-xl"><strong>Restante por Pagar:</strong> ${totalPendiente.toFixed(2)}</p>
            </div>
            <div className="mt-4 flex justify-between items-end">
                <p><strong>Atendido por:</strong> {user?.nombre}</p>
                <div className="text-center mt-8">
                    __________________________<br/>
                    <strong>Firma del Cliente</strong>
                </div>
            </div>
        </div>
    );

    return (
        <div ref={ref} className="p-6" style={{maxWidth: "700px", margin: "auto"}}>
            <Recibo title="Copia Cliente"/>
            <Recibo title="Copia Oficina"/>
        </div>
    );
});

export default ReciboPP;
