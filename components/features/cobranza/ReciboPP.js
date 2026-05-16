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
            className="border border-gray-400 p-2 my-1"
            style={{ fontFamily: "Arial", fontSize: "11px" }}
        >
            <div className="flex justify-between items-center mb-1">
                <img src="/assets/Logoprint.png" style={{ height: "28px" }} alt="Logo" />
                <h2 className="text-sm font-bold">RECIBO DE ABONO / PAGO FIADO</h2>
                <div className="text-right">
                    <p><strong>Fecha:</strong> {moment(fechaPago).format("DD/MM/YYYY")}</p>
                    <p className="text-xs italic">{title}</p>
                </div>
            </div>
            <hr className="mb-1" />
            <p className="text-lg font-black text-center mb-1">LOTE: {vehiculo?.binNip}</p>
            <div className="flex gap-4 mb-1">
                <p><strong>Cliente:</strong> {vehiculo?.cliente}</p>
                <p><strong>Vehículo:</strong> {vehiculo?.marca} {vehiculo?.modelo}</p>
                <p><strong>Descripción:</strong> {vehiculo?.descripcion}</p>
            </div>
            <div className="mb-1">
                <p className="text-base">Abono: <strong>${montoAbono.toFixed(2)}</strong> dólares
                    {efectivoAbono > 0 && <span> — Efectivo: ${efectivoAbono.toFixed(2)}</span>}
                    {ccAbono > 0 && <span> — CC: ${ccAbono.toFixed(2)}</span>}
                </p>
            </div>
            <div className="flex gap-4 mb-1">
                <p><strong>Total Venta:</strong> ${totalVenta.toFixed(2)}</p>
                <p><strong>Pagado acumulado:</strong> ${totalPagado.toFixed(2)}</p>
                <p className="text-base font-bold"><strong>Restante:</strong> ${saldoDespues.toFixed(2)}</p>
            </div>
            {abonosPrevios.length > 0 && (
                <div className="mb-1">
                    <span className="font-semibold">Abonos previos: </span>
                    {abonosPrevios.map((a, i) => (
                        <span key={i} className="text-xs">
                            ${parseFloat(a.monto).toFixed(2)}{a.fecha?.toDate ? ` (${a.fecha.toDate().toLocaleDateString()})` : ""}{i < abonosPrevios.length - 1 ? ", " : ""}
                        </span>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-end mt-2">
                <p><strong>Atendido por:</strong> {user?.nombre}</p>
                <div className="text-center">
                    __________________________
                    <br />
                    <span className="text-xs font-bold">Firma del Cliente</span>
                </div>
            </div>
        </div>
    );

    return (
        <div ref={ref} className="p-2" style={{ maxWidth: "700px", margin: "auto" }}>
            <Recibo title="Copia Cliente" />
            <Recibo title="Copia Oficina" />
        </div>
    );
});

export default ReciboPP;
