import React from "react";

const TablaVehiculosPendientes = ({ vehiculosData }) => {
  // Aplicar filtros según estatus
  const prData = vehiculosData.filter(v => v.estatus === "PR");
  const enData = vehiculosData.filter(v => v.estatus === "EN");

  const enBins = new Set(enData.map(v => v.binNip));

  // PR únicos sin binNips duplicados en EN
  const prUnicos = prData.filter((v, index, self) => {
    return (
      !enBins.has(v.binNip) &&
      index === self.findIndex(obj => obj.binNip === v.binNip)
    );
  });

  // Agrupar por fecha
  const groupByDate = () => {
    const grouped = {};
    prUnicos.forEach((movement) => {
      const date = new Date(movement.timestamp.seconds * 1000).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(movement);
    });
    return grouped;
  };

  const groupedData = groupByDate();

  // Totales generales
  let totalVenta = 0, totalCaja = 0, totalCC = 0, totalPendientes = 0;

  return (
    <div className="table-container">
      <h3 className="text-lg font-semibold mt-4">Vehículos Pendientes de Pago</h3>
      <table className="min-w-full bg-white border text-xs">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-2 py-1 border">Fecha</th>
            <th className="px-2 py-1 border">Vehículo</th>
            <th className="px-2 py-1 border text-right">Venta</th>
            <th className="px-2 py-1 border text-right">Caja</th>
            <th className="px-2 py-1 border text-right">CC</th>
            <th className="px-2 py-1 border text-right">Pendientes</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedData).map(([date, movements]) => {
            let subtotalVenta = 0, subtotalCaja = 0, subtotalCC = 0, subtotalPendientes = 0;

            return (
              <React.Fragment key={date}>
                {movements.map((movement) => {
                  const venta = parseFloat(movement.price) || 0;
                  const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
                  const cc = parseFloat(movement.cajaCC) || 0;
                  const pendientes = parseFloat(movement.pagoTotalPendiente) || 0;

                  subtotalVenta += venta;
                  subtotalCaja += caja;
                  subtotalCC += cc;
                  subtotalPendientes += pendientes;

                  totalVenta += venta;
                  totalCaja += caja;
                  totalCC += cc;
                  totalPendientes += pendientes;

                  return (
                    <tr key={movement.id}>
                      <td className="px-2 py-1 border align-top">{date}</td>
                      <td className="px-2 py-1 border">
                        <p className="font-semibold">{movement.usuario || "Sin usuario"}</p>
                        <p>Bin: <strong>{movement.binNip}</strong></p>
                        <p>Modelo: <strong>{movement.marca} {movement.modelo}</strong></p>
                        <p>Cliente: <strong>{movement.cliente} - {movement.ciudad}</strong></p>
                      </td>
                      <td className="px-2 py-1 border text-right">${venta.toFixed(2)}</td>
                      <td className="px-2 py-1 border text-right">${caja.toFixed(2)}</td>
                      <td className="px-2 py-1 border text-right">${cc.toFixed(2)}</td>
                      <td className="px-2 py-1 border text-right">${pendientes.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {/* Subtotales por día */}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan="2" className="px-2 py-1 border text-right">Subtotal del día:</td>
                  <td className="px-2 py-1 border text-right">${subtotalVenta.toFixed(2)}</td>
                  <td className="px-2 py-1 border text-right">${subtotalCaja.toFixed(2)}</td>
                  <td className="px-2 py-1 border text-right">${subtotalCC.toFixed(2)}</td>
                  <td className="px-2 py-1 border text-right">${subtotalPendientes.toFixed(2)}</td>
                </tr>
                <tr><td colSpan="6" className="py-2"></td></tr>
              </React.Fragment>
            );
          })}

          {/* Totales generales */}
          <tr className="bg-green-100 font-bold text-sm">
            <td colSpan="2" className="px-2 py-2 border text-right">Totales Generales:</td>
            <td className="px-2 py-2 border text-right">${totalVenta.toFixed(2)}</td>
            <td className="px-2 py-2 border text-right">${totalCaja.toFixed(2)}</td>
            <td className="px-2 py-2 border text-right">${totalCC.toFixed(2)}</td>
            <td className="px-2 py-2 border text-right">${totalPendientes.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TablaVehiculosPendientes;
