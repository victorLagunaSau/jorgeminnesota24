import React, { useState, useRef } from "react";
import { firestore } from '../../firebase/firebaseIni';
import ReactToPrint from "react-to-print";

// Componente para mostrar e imprimir la tabla de movimientos
const ReporteMovimientos = React.forwardRef(({ endDate, movementsData, totalPago, totalCaja, totalCC, totalPendientes }, ref) => (
  <div ref={ref} className="m-4" style={{ maxWidth: "90%", marginLeft: "auto", marginRight: "auto" }}>
    <div className="encabezado-impresion w-full flex justify-between border-t border-gray-300 pt-1 hidden-print">
      <img src="/assets/Logoprint.png" className="w-15 mr-2" alt="Logo" />
      <p className="text-gray-400">Corte de caja</p>
    </div>
    <h3 className="mt-8 text-xl font-semibold">Corte del día: {endDate}</h3>
    <table className="mt-4 w-full border-collapse border border-gray-300">
      <thead>
        <tr>
          <th className="border border-gray-300 px-4 py-2">Vehiculo</th>
          <th className="border border-gray-300 px-4 py-2">Cliente</th>
          <th className="border border-gray-300 px-4 py-2">Venta</th>
          <th className="border border-gray-300 px-4 py-2">Caja</th>
          <th className="border border-gray-300 px-4 py-2">CC</th>
          <th className="border border-gray-300 px-4 py-2">Pendientes</th>
        </tr>
      </thead>
      <tbody>
        {movementsData.map((movement) => {
          const totalPago = parseFloat(movement.totalPago) || 0;
          const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
          const cc = (parseFloat(movement.cajaCC) || 0);
          const pendientes = (parseFloat(movement.pagoTotalPendiente) || 0);
          return (
            <tr key={movement.id}>
              <td className="border border-gray-300 px-4 py-2">
                <p>Bin: <strong>{movement.binNip}</strong></p>
                <p>Modelo: <strong>{movement.modelo}</strong></p>
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <p>Cliente: <strong>{movement.cliente}</strong></p>
                <p>Ciudad: <strong>{movement.ciudad}</strong></p>
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {totalPago.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                })}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {caja.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                })}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {cc.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                })}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {pendientes.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                })}
              </td>
            </tr>
          );
        })}
        {movementsData.length === 0 && (
          <tr>
            <td colSpan="6" className="border border-gray-300 px-4 py-2 text-center">No se encontraron movimientos.</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="2" className="border border-gray-300 px-4 py-2 text-right font-semibold">Totales:</td>
          <td className="border border-gray-300 px-4 py-2 font-semibold">
            {totalPago.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD'
            })}
          </td>
          <td className="border border-gray-300 px-4 py-2 font-semibold">
            {totalCaja.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD'
            })}
          </td>
          <td className="border border-gray-300 px-4 py-2 font-semibold">
            {totalCC.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD'
            })}
          </td>
          <td className="border border-gray-300 px-4 py-2 font-semibold">
            {totalPendientes.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD'
            })}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
));

// Componente principal de Corte del Día
const CorteDia = () => {
  const [endDate, setEndDate] = useState("");
  const [movementsData, setMovementsData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const componentRef = useRef(null); // Referencia para ReactToPrint

  const handleButtonClick = async () => {
    if (!endDate) {
      setErrorMessage("Por favor, selecciona una fecha.");
      return;
    }

    setErrorMessage("");

    const siguienteDia = new Date(endDate);
    siguienteDia.setDate(siguienteDia.getDate() + 1);

    const startTimestamp = new Date(siguienteDia).setHours(0, 0, 0, 0);
    const endTimestamp = new Date(siguienteDia).setHours(23, 59, 59, 999);

    // Consulta a Firestore para obtener todos los movimientos en el rango de fechas
    const movementsSnapshot = await firestore()
      .collection("movimientos")
      .where("timestamp", ">", new Date(startTimestamp))
      .where("timestamp", "<", new Date(endTimestamp))
      .get();

    const movements = movementsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const filteredMovements = movements.filter(movement => movement.estatus === "EN");
    setMovementsData(filteredMovements);
  };

  const totalPago = movementsData.reduce((total, movement) => total + (parseFloat(movement.totalPago) || 0), 0);
  const totalCaja = movementsData.reduce((total, movement) => {
    const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
    return total + caja;
  }, 0);
  const totalCC = movementsData.reduce((total, movement) => total + (parseFloat(movement.cajaCC) || 0), 0);
  const totalPendientes = movementsData.reduce((total, movement) => total + (parseFloat(movement.pagoTotalPendiente) || 0), 0);

  return (
    <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="home">
      <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
        Reporte de <strong>Movimientos</strong>.
      </h3>

      <div className="mb-4 md:mb-0">
        <label className="block text-black-500">Fecha Final: {endDate}</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>

      {errorMessage && (
        <div className="text-red-500 mb-2">{errorMessage}</div>
      )}

      <button
        onClick={handleButtonClick}
        className="bg-red-500 text-white-100 px-4 py-2 rounded-lg m-3"
      >
        Hacer corte
      </button>

      <ReactToPrint
        trigger={() => (
          <button className="bg-blue-500 text-white-100 px-4 py-2 rounded-lg m-3">
            Imprimir Corte
          </button>
        )}
        content={() => componentRef.current}
      />

      {/* Tabla de movimientos para mostrar e imprimir */}
      <ReporteMovimientos
        ref={componentRef}
        endDate={endDate}
        movementsData={movementsData}
        totalPago={totalPago}
        totalCaja={totalCaja}
        totalCC={totalCC}
        totalPendientes={totalPendientes}
      />
    </div>
  );
};

export default CorteDia;
