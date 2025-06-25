import React from "react";

const TablaEntradas = ({ entradasData, totalRecibido }) => (
  <div className="table-container">
    <h3 className="text-lg font-semibold mt-4">Entradas</h3>
    <table className="min-w-full bg-white border text-xs">
      <thead>
        <tr>
          <th className="px-2 py-1 border">#</th>
          <th className="px-2 py-1 border">Paga</th>
          <th className="px-2 py-1 border">Concepto</th>
          <th className="px-2 py-1 border">Motivo</th>
          <th className="px-2 py-1 border">Tipo de Pago</th>
          <th className="px-2 py-1 border">Recibo</th>
        </tr>
      </thead>
      <tbody>
        {entradasData.map((entrada, index) => {
          const recibo = parseFloat(entrada.cajaRecibo) || 0;

          return (
            <tr key={entrada.id}>
              <td className="px-2 py-1 border text-center">{index + 1}</td>
              <td className="px-2 py-1 border"><strong>{entrada.entradaCajaReceptor}</strong></td>
              {/*<td className="px-2 py-1 border"><strong>{entrada.entradaCajaReceptor} {entrada.id}</strong></td>*/}
              <td className="px-2 py-1 border">{entrada.entradaCajaConceptoPago}</td>
              <td className="px-2 py-1 border">{entrada.entradaCajaMotivoPago}</td>
              <td className="px-2 py-1 border">{entrada.entradaCajaTipo}</td>
              <td className="px-2 py-1 border text-right">
                ${recibo.toFixed(2).toLocaleString('en-US')}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="5" className="px-2 py-1 font-semibold text-right border">Total Recibido</td>
          <td className="px-2 py-1 font-semibold border text-right">
            ${totalRecibido.toFixed(2).toLocaleString('en-US')}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);

export default TablaEntradas;
