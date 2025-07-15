import React from "react";

const TablaVehiculosPendientes = ({ vehiculosData }) => {
  // Función para agrupar los vehículos solo por fecha
  const groupByDate = () => {
    const grouped = {};

    // Filtramos movimientos con totalPago = 0 para mostrar solo vehículos pendientes de pago
    const filteredData = vehiculosData.filter(movement => {
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
      <h3 className="text-lg font-semibold mt-4">Vehículos Pendientes de Pago</h3>
      <table className="min-w-full bg-white border text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 border">Fecha</th>
            <th className="px-2 py-1 border">Usuario</th>
            <th className="px-2 py-1 border">Vehículo</th>
            <th className="px-2 py-1 border">Precio</th>
            <th className="px-2 py-1 border">Gastos Extra</th>
            <th className="px-2 py-1 border">Sobrepeso</th>
            <th className="px-2 py-1 border">Storage</th>
            <th className="px-2 py-1 border">Total Vehículo</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedData).length === 0 ? (
            <tr>
              <td colSpan="8" className="px-2 py-1 border text-center">No se encontraron movimientos.</td>
            </tr>
          ) : (
            Object.entries(groupedData).map(([date, movements]) => {
              const totalPendienteDia = movements.reduce((sum, m) => {
                const price = parseFloat(m.price) || 0;
                const gastosExtra = parseFloat(m.gastosExtra) || 0;
                const sobrePeso = parseFloat(m.sobrePeso) || 0;
                const storage = parseFloat(m.storage) || 0;
                return sum + price + gastosExtra + sobrePeso + storage;
              }, 0);

              return (
                <React.Fragment key={date}>
                  {movements.map((movement) => {
                    const price = parseFloat(movement.price) || 0;
                    const gastosExtra = parseFloat(movement.gastosExtra) || 0;
                    const sobrePeso = parseFloat(movement.sobrePeso) || 0;
                    const storage = parseFloat(movement.storage) || 0;
                    const totalVehiculo = price + gastosExtra + sobrePeso + storage;

                    return (
                      <tr key={movement.id}>
                        <td className="px-2 py-1 border">{date}</td>
                        <td className="px-2 py-1 border">{movement.usuario || "Sin usuario"}</td>
                        <td className="px-2 py-1 border">
                          <p>Bin: <strong>{movement.binNip}</strong></p>
                          <p>Modelo: <strong>{movement.marca} {movement.modelo}</strong></p>
                          <p>Cliente: <strong>{movement.cliente} - {movement.ciudad}</strong></p>
                        </td>
                        <td className="px-2 py-1 border text-right">${price.toFixed(2)}</td>
                        <td className="px-2 py-1 border text-right">${gastosExtra.toFixed(2)}</td>
                        <td className="px-2 py-1 border text-right">${sobrePeso.toFixed(2)}</td>
                        <td className="px-2 py-1 border text-right">${storage.toFixed(2)}</td>
                        <td className="px-2 py-1 border text-right font-semibold">${totalVehiculo.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* Subtotal por día */}
                 <tr className="bg-gray-100 font-semibold">
  <td colSpan="3" className="px-2 py-1 border text-right">
    Totales del día (vehículos pendientes de pago):
  </td>
  <td className="px-2 py-1 border text-right">
    ${movements.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0).toFixed(2)}
  </td>
  <td className="px-2 py-1 border text-right">
    ${movements.reduce((sum, m) => sum + (parseFloat(m.gastosExtra) || 0), 0).toFixed(2)}
  </td>
  <td className="px-2 py-1 border text-right">
    ${movements.reduce((sum, m) => sum + (parseFloat(m.sobrePeso) || 0), 0).toFixed(2)}
  </td>
  <td className="px-2 py-1 border text-right">
    ${movements.reduce((sum, m) => sum + (parseFloat(m.storage) || 0), 0).toFixed(2)}
  </td>
  <td className="px-2 py-1 border text-right">
    ${movements.reduce((sum, m) => {
      const price = parseFloat(m.price) || 0;
      const gastos = parseFloat(m.gastosExtra) || 0;
      const sobrepeso = parseFloat(m.sobrePeso) || 0;
      const storage = parseFloat(m.storage) || 0;
      return sum + price + gastos + sobrepeso + storage;
    }, 0).toFixed(2)}
  </td>
</tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaVehiculosPendientes;
