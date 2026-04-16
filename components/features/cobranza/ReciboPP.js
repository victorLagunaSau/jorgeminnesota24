import React, { forwardRef } from "react";
import moment from "moment";
import { toWords } from "number-to-words";

const ReciboPP = forwardRef(({ vehiculo, abono, fechaPago, user }, ref) => {
    const montoAbono = parseFloat(abono?.monto) || 0;
    const efectivoAbono = parseFloat(abono?.efectivo) || 0;
    const ccAbono = parseFloat(abono?.cc) || 0;

    // Total pagado acumulado (modelo nuevo: totalPago - saldoFiado; legacy: suma pagos00X)
    const totalVenta = parseFloat(vehiculo?.totalPago) || 0;
    const saldoDespues = Math.max(
        0,
        (parseFloat(vehiculo?.saldoFiado) || parseFloat(vehiculo?.pagoTotalPendiente) || 0) -
            montoAbono
    );
    const totalPagado = totalVenta - saldoDespues;

    const totalPagadoPalabras = Number.isFinite(totalPagado)
        ? toWords(Math.round(totalPagado)).toUpperCase() + " DÓLARES"
        : "";

    const abonosPrevios = Array.isArray(vehiculo?.abonosFiado)
        ? vehiculo.abonosFiado
        : [];

    const Recibo = ({ title }) => (
        <div
            className="border-2 border-gray-400 p-4 my-4"
            style={{ fontFamily: "Arial", fontSize: "14px" }}
        >
            <div className="flex justify-between mb-2">
                <img src="/assets/Logoprint.png" className="w-15 mr-1" alt="Logo" />
                <h2 className="text-lg font-bold">RECIBO DE ABONO / PAGO FIADO</h2>
                <div>
                    <p>
                        <strong>Fecha:</strong> {moment(fechaPago).format("DD/MM/YYYY")}
                    </p>
                    <p className="text-sm italic">{title}</p>
                </div>
            </div>
            <hr className="mb-2" />
            <div className="mb-2">
                <p>
                    <strong>Cliente:</strong> {vehiculo?.cliente}{" "}
                    <strong>Vehículo:</strong> {vehiculo?.marca} {vehiculo?.modelo}{" "}
                    <strong>Descripción:</strong> {vehiculo?.descripcion}
                </p>
            </div>
            <div className="mb-2 text-xl">
                <p>Este comprobante corresponde a un abono por:</p>
                <p>
                    <strong>${montoAbono.toFixed(2)}</strong> dólares.
                </p>
                {efectivoAbono > 0 && (
                    <p className="text-base">Efectivo: ${efectivoAbono.toFixed(2)}</p>
                )}
                {ccAbono > 0 && <p className="text-base">Tarjeta (CC): ${ccAbono.toFixed(2)}</p>}
            </div>
            <div className="mb-2">
                <p>
                    <strong>Total de Venta:</strong> ${totalVenta.toFixed(2)}
                </p>
                <p>
                    <strong>Total Pagado acumulado:</strong> ${totalPagado.toFixed(2)} (
                    {totalPagadoPalabras})
                </p>
                <p className="text-xl">
                    <strong>Restante por Pagar:</strong> ${saldoDespues.toFixed(2)}
                </p>
                {abonosPrevios.length > 0 && (
                    <div className="mt-2">
                        <p className="font-semibold">Abonos previos:</p>
                        <ul className="ml-4 list-disc text-sm">
                            {abonosPrevios.map((a, i) => (
                                <li key={i}>
                                    ${parseFloat(a.monto).toFixed(2)}{" "}
                                    {a.fecha?.toDate
                                        ? `— ${a.fecha.toDate().toLocaleDateString()}`
                                        : ""}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <div className="mt-4 flex justify-between items-end">
                <p>
                    <strong>Atendido por:</strong> {user?.nombre}
                </p>
                <div className="text-center mt-8">
                    __________________________
                    <br />
                    <strong>Firma del Cliente</strong>
                </div>
            </div>
        </div>
    );

    return (
        <div ref={ref} className="p-6" style={{ maxWidth: "700px", margin: "auto" }}>
            <Recibo title="Copia Cliente" />
            <Recibo title="Copia Oficina" />
        </div>
    );
});

export default ReciboPP;
