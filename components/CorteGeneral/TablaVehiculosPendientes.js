import React from "react";

const TablaVehiculosPendientes = ({ vehiculosData }) => {
  console.log("Vehículos originales:", vehiculosData);

  // Filtrar PR y EN por separado
  const prData = vehiculosData.filter(v => v.estatus === "PR");
  const enData = vehiculosData.filter(v => v.estatus === "EN");

  // Obtener binNips de EN
  const enBins = new Set(enData.map(v => v.binNip));

  // Eliminar PR duplicados con EN
  const prUnicos = prData.filter((v, index, self) => {
    return (
      !enBins.has(v.binNip) &&
      index === self.findIndex(obj => obj.binNip === v.binNip)
    );
  });

  console.log("PR válidos sin duplicados ni EN:", prUnicos);

  return (
    <div className="table-container">
      <h3 className="text-lg font-semibold mt-4">Vehículos PR sin EN duplicados</h3>
      <table className="min-w-full bg-white border text-xs">
        <thead>
          <tr>
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
          {prUnicos.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-2 py-1 border text-center">No hay vehículos PR válidos.</td>
            </tr>
          ) : (
            prUnicos.map((movement) => {
              const price = parseFloat(movement.price) || 0;
              const gastosExtra = parseFloat(movement.gastosExtra) || 0;
              const sobrePeso = parseFloat(movement.sobrePeso) || 0;
              const storage = parseFloat(movement.storage) || 0;
              const totalVehiculo = price + gastosExtra + sobrePeso + storage;

              return (
                <tr key={movement.id}>
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
            })
          )}

          {/* Totales generales */}
          {prUnicos.length > 0 && (
            <tr className="bg-black text-white font-bold">
              <td colSpan="2" className="px-2 py-1 border text-right">Totales generales:</td>
              <td className="px-2 py-1 border text-right">
                ${prUnicos.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0).toFixed(2)}
              </td>
              <td className="px-2 py-1 border text-right">
                ${prUnicos.reduce((sum, m) => sum + (parseFloat(m.gastosExtra) || 0), 0).toFixed(2)}
              </td>
              <td className="px-2 py-1 border text-right">
                ${prUnicos.reduce((sum, m) => sum + (parseFloat(m.sobrePeso) || 0), 0).toFixed(2)}
              </td>
              <td className="px-2 py-1 border text-right">
                ${prUnicos.reduce((sum, m) => sum + (parseFloat(m.storage) || 0), 0).toFixed(2)}
              </td>
              <td className="px-2 py-1 border text-right">
                ${prUnicos.reduce((sum, m) => {
                  const price = parseFloat(m.price) || 0;
                  const gastos = parseFloat(m.gastosExtra) || 0;
                  const sobrepeso = parseFloat(m.sobrePeso) || 0;
                  const storage = parseFloat(m.storage) || 0;
                  return sum + price + gastos + sobrepeso + storage;
                }, 0).toFixed(2)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaVehiculosPendientes;
