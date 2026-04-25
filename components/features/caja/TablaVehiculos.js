import React, { useState } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";

const TablaVehiculos = ({ vehiculosData, totalPago, totalCaja, totalCC, totalPendientes, isAdminMaster, onDataChange }) => {
  const [cambiando, setCambiando] = useState(null);

  const cambiarMetodoPago = async (movement) => {
    if (cambiando) return;
    setCambiando(movement.id);
    try {
      const cc = parseFloat(movement.cajaCC) || 0;
      const recibo = parseFloat(movement.cajaRecibo) || 0;
      const cambio = parseFloat(movement.cajaCambio) || 0;
      const cajaNet = recibo - cambio;

      const docRef = firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(movement.id);

      if (cc > 0 && cajaNet === 0) {
        // CC → Caja: mover todo de CC a efectivo
        await docRef.update({ cajaCC: 0, cajaRecibo: cc, cajaCambio: 0 });
      } else if (cajaNet > 0 && cc === 0) {
        // Caja → CC: mover todo de efectivo a CC
        await docRef.update({ cajaCC: cajaNet, cajaRecibo: 0, cajaCambio: 0 });
      } else if (cc > 0 && cajaNet > 0) {
        // Mixto: mover todo a caja
        await docRef.update({ cajaCC: 0, cajaRecibo: cc + cajaNet, cajaCambio: 0 });
      }
      if (onDataChange) onDataChange();
    } catch (e) {
      alert("Error al cambiar método de pago: " + e.message);
    } finally {
      setCambiando(null);
    }
  };
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
            {isAdminMaster && <th className="px-2 py-1 border">Cambiar</th>}
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedData).length === 0 ? (
            <tr>
              <td colSpan={isAdminMaster ? 8 : 7} className="px-2 py-1 border text-center">No se encontraron movimientos.</td>
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
                        {isAdminMaster && (
                          <td className="px-2 py-1 border text-center">
                            {(cc > 0 || caja > 0) && (
                              <button
                                onClick={() => cambiarMetodoPago(movement)}
                                disabled={cambiando === movement.id}
                                className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-colors ${
                                  cc > 0
                                    ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                                    : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                }`}
                              >
                                {cambiando === movement.id
                                  ? '...'
                                  : cc > 0 && caja === 0
                                    ? '→ Caja'
                                    : caja > 0 && cc === 0
                                      ? '→ CC'
                                      : '→ Caja'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={isAdminMaster ? 4 : 3} className="px-2 py-1 border text-right">Subtotal del día:</td>
                    <td className="px-2 py-1 border text-right">{subtotalPago.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-2 py-1 border text-right">{subtotalCaja.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-2 py-1 border text-right">{subtotalCC.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-2 py-1 border text-right">{subtotalPendientes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                  </tr>
                  <tr><td colSpan={isAdminMaster ? 8 : 7} className="py-2"></td></tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={isAdminMaster ? 4 : 3} className="px-2 py-1 border font-semibold text-right">Totales Generales:</td>
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
