import React from "react";

const TablaVehiculos = ({ vehiculosData, totalPago, totalCaja, totalCC, totalPendientes }) => (
  <div className="table-container">
    <h3 className="text-lg font-semibold mt-4">Vehículos</h3>
    <table className="min-w-full bg-white border text-xs">
      <thead>
        <tr>
          <th className="px-2 py-1 border">#</th>
          <th className="px-2 py-1 border">Vehículo</th>
          <th className="px-2 py-1 border">Cliente</th>
          <th className="px-2 py-1 border">Venta</th>
          <th className="px-2 py-1 border">Caja</th>
          <th className="px-2 py-1 border">CC</th>
          <th className="px-2 py-1 border">Pendientes</th>
        </tr>
      </thead>
      <tbody>
        {vehiculosData.map((movement, index) => {
          const totalPago = parseFloat(movement.totalPago) || 0;
          const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
          const cc = parseFloat(movement.cajaCC) || 0;
          const pendientes = parseFloat(movement.pagoTotalPendiente) || 0;

          return (
            <tr key={movement.id}>
              <td className="px-2 py-1 border text-center">{index + 1}</td>
              <td className="px-2 py-1 border">
                <p>Bin: <strong>{movement.binNip}</strong></p>
                <p>Modelo: <strong>{movement.modelo}</strong></p>
              </td>
              <td className="px-2 py-1 border">
                <p>Cliente: <strong>{movement.cliente}</strong></p>
                <p>Ciudad: <strong>{movement.ciudad}</strong></p>
              </td>
              <td className="px-2 py-1 border text-right">
                {totalPago.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
              <td className="px-2 py-1 border text-right">
                {caja.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
              <td className="px-2 py-1 border text-right">
                {cc.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
              <td className="px-2 py-1 border text-right">
                {pendientes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
            </tr>
          );
        })}
        {vehiculosData.length === 0 && (
          <tr>
            <td colSpan="7" className="px-2 py-1 border text-center">No se encontraron movimientos.</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="3" className="px-2 py-1 border font-semibold text-right">Totales:</td>
          <td className="px-2 py-1 border font-semibold text-right">
            {totalPago.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </td>
          <td className="px-2 py-1 border font-semibold text-right">
            {totalCaja.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </td>
          <td className="px-2 py-1 border font-semibold text-right">
            {totalCC.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </td>
          <td className="px-2 py-1 border font-semibold text-right">
            {totalPendientes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);

export default TablaVehiculos;
