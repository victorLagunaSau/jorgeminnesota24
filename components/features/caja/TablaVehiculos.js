import React from "react";

const TablaVehiculos = ({ vehiculosData, totalPago, totalCaja, totalCC, totalPendientes }) => {
  // Función para agrupar los vehículos solo por fecha
  const groupByDate = () => {
    const grouped = {};

    // Filtramos movimientos con totalPago = 0 (comentado para posible futuro uso)
    const filteredData = vehiculosData.filter(movement => {
      // Si en el futuro quieres quitar este filtro, solo comenta la siguiente línea
      return parseFloat(movement.totalPago) !== 0;
    });

    filteredData.forEach((movement) => {
      const date = new Date(movement.timestamp.seconds * 1000).toLocaleDateString();

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push(movement);
    });

    return grouped;
  };

  const groupedData = groupByDate();

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
            <th className="px-2 py-1 border">Pendientes</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedData).length === 0 ? (
            <tr>
              <td colSpan="7" className="px-2 py-1 border text-center">No se encontraron movimientos.</td>
            </tr>
          ) : (
            Object.entries(groupedData).map(([date, movements]) => {
              // Calcular subtotales por día
              const subtotalPago = movements.reduce((sum, m) => sum + (parseFloat(m.totalPago) || 0), 0);
              const subtotalCaja = movements.reduce((sum, m) => sum + ((parseFloat(m.cajaRecibo) || 0) - (parseFloat(m.cajaCambio) || 0)), 0);
              const subtotalCC = movements.reduce((sum, m) => sum + (parseFloat(m.cajaCC) || 0), 0);
              const subtotalPendientes = movements.reduce((sum, m) => sum + (parseFloat(m.pagoTotalPendiente) || 0), 0);

              return (
                <React.Fragment key={date}>
                  {movements.map((movement, index) => {
                    const totalPago = parseFloat(movement.totalPago) || 0;
                    const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
                    const cc = parseFloat(movement.cajaCC) || 0;
                    const pendientes = parseFloat(movement.pagoTotalPendiente) || 0;

                    return (
                      <tr key={movement.id}>
                        <td className="px-2 py-1 border">
                          {date}
                        </td>
                        <td className="px-2 py-1 border">
                          {movement.usuario || "Sin usuario"}
                        </td>
                        <td className="px-2 py-1 border">
                          <p>Bin: <strong>{movement.binNip}</strong></p>
                          <p>Modelo: <strong>{movement.marca} {movement.modelo}</strong></p>
                          <p>Cliente: <strong>{movement.cliente} - {movement.ciudad}</strong></p>
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
                  {/* Subtotal por día */}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan="3" className="px-2 py-1 border text-right">Subtotal del día:</td>
                    <td className="px-2 py-1 border text-right">
                      {subtotalPago.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="px-2 py-1 border text-right">
                      {subtotalCaja.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="px-2 py-1 border text-right">
                      {subtotalCC.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="px-2 py-1 border text-right">
                      {subtotalPendientes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                  </tr>
                  {/* Espacio entre días */}
                  <tr>
                    <td colSpan="7" className="py-2"></td>
                  </tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="3" className="px-2 py-1 border font-semibold text-right">Totales Generales:</td>
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
};

export default TablaVehiculos;