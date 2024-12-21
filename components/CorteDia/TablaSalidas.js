import React from "react";

const TablaSalidas = ({ salidasData, totalSalidas }) => (
  <div>
    <h3 className="text-lg font-semibold mt-4">Pagos / Salidas</h3>
    <table className="table-auto w-full border-collapse border border-gray-200 text-xs">
      <thead>
        <tr>
          <th className="border px-2 py-1">#</th>
          <th className="border px-2 py-1">Receptor</th>
          <th className="border px-2 py-1">Concepto</th>
          <th className="border px-2 py-1">Motivo</th>
          <th className="border px-2 py-1">Tipo de Pago</th>
          <th className="border px-2 py-1">Salida</th>
        </tr>
      </thead>
      <tbody>
        {salidasData.map((salida, index) => {
          const salidaCaja = parseFloat(salida.salidaCaja) || 0;

          return (
            <tr key={salida.id}>
              <td className="border px-2 py-1 text-center">{index + 1}</td>
              <td className="border px-2 py-1">{salida.salidaCajaReceptor}</td>
              <td className="border px-2 py-1">{salida.salidaCajaConceptoPago}</td>
              <td className="border px-2 py-1">{salida.salidaCajaMotivoPago}</td>
              <td className="border px-2 py-1">{salida.salidaCajaTipo}</td>
              <td className="border px-2 py-1 text-right">
                ${salidaCaja.toFixed(2).toLocaleString('en-US')}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="5" className="text-right font-semibold px-2 py-1 border">Total Salidas:</td>
          <td className="border px-2 py-1 font-semibold text-right">
            ${totalSalidas.toFixed(2).toLocaleString('en-US')}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);

export default TablaSalidas;
