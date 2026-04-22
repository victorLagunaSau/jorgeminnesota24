import React from "react";

const TablaVehiculos = ({ vehiculosData, totalPago, totalCaja, totalCC, totalPendientes }) => {
  const groupByDate = () => {
    const grouped = {};
    const filteredData = vehiculosData.filter(movement => parseFloat(movement.totalPago) !== 0);
    filteredData.forEach((movement) => {
      const date = new Date(movement.timestamp.seconds * 1000).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(movement);
    });
    return grouped;
  };

  const groupedData = groupByDate();

  const getPendienteRow = (m) =>
    typeof m.saldoFiado === "number"
      ? parseFloat(m.saldoFiado)
      : (parseFloat(m.pagoTotalPendiente) || 0);

  return (
    <div className="table-container">
      <h3 className="text-lg font-semibold mt-4">Vehículos</h3>
      <table className="min-w-full bg-white border text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 border">Fecha</th>
            <th className="px-2 py-1 border">Usuario</th>
            <th className="px-2 py-1 border">Vehículo</th>
            <th className="px-2 py-1 border">Venta</th>
            <th className="px-2 py-1 border">Caja</th>
            <th className="px-2 py-1 border">CC</th>
            <th className="px-2 py-1 border">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedData).length === 0 ? (
            <tr>
              <td colSpan="7" className="px-2 py-1 border text-center">No se encontraron movimientos.</td>
            </tr>
          ) : (
            Object.entries(groupedData).map(([date, movements]) => {
              const subtotalPago = movements.reduce((sum, m) => sum + (parseFloat(m.totalPago) || 0), 0);
              const subtotalCaja = movements.reduce((sum, m) => sum + ((parseFloat(m.cajaRecibo) || 0) - (parseFloat(m.cajaCambio) || 0)), 0);
              const subtotalCC = movements.reduce((sum, m) => sum + (parseFloat(m.cajaCC) || 0), 0);
              const subtotalPendientes = movements.reduce((sum, m) => sum + getPendienteRow(m), 0);

              return (
                <React.Fragment key={date}>
                  {movements.map((movement) => {
                    const totalPagoRow = parseFloat(movement.totalPago) || 0;
                    const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
                    const cc = parseFloat(movement.cajaCC) || 0;
                    const pendientes = getPendienteRow(movement);
                    const esFiado = movement.estadoPago === "fiado" || (movement.pagosPendientes && movement.estadoPago !== "pagado");

                    return (
                      <tr key={movement.id} className={esFiado ? "bg-orange-50" : ""}>
                        <td className="px-2 py-1 border">{date}</td>
                        <td className="px-2 py-1 border">{movement.usuario || "Sin usuario"}</td>
                        <td className="px-2 py-1 border">
                          <p>Bin: <strong>{movement.binNip}</strong></p>
                          <p>Modelo: <strong>{movement.marca} {movement.modelo}</strong></p>
                          <p>Cliente: <strong>{movement.cliente} - {movement.ciudad}</strong></p>
                          {esFiado && <p className="text-orange-700 font-bold">FIADO</p>}
                        </td>
                        <td className="px-2 py-1 border text-right">{totalPagoRow.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                        <td className="px-2 py-1 border text-right">{caja.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                        <td className="px-2 py-1 border text-right">{cc.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                        <td className="px-2 py-1 border text-right">{pendientes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan="3" className="px-2 py-1 border text-right">Subtotal del día:</td>
                    <td className="px-2 py-1 border text-right">{subtotalPago.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-2 py-1 border text-right">{subtotalCaja.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-2 py-1 border text-right">{subtotalCC.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-2 py-1 border text-right">{subtotalPendientes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                  </tr>
                  <tr><td colSpan="7" className="py-2"></td></tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="3" className="px-2 py-1 border font-semibold text-right">Totales Generales:</td>
            <td className="px-2 py-1 border font-semibold text-right">{totalPago.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
            <td className="px-2 py-1 border font-semibold text-right">{totalCaja.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
            <td className="px-2 py-1 border font-semibold text-right">{totalCC.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
            <td className="px-2 py-1 border font-semibold text-right">{totalPendientes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TablaVehiculos;
