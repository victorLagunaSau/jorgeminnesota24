import React, { useState, useRef } from "react";
import { firestore } from '../../firebase/firebaseIni';
import ReactToPrint from "react-to-print";

// Componente para mostrar e imprimir la tabla de movimientos
const ReporteMovimientos = React.forwardRef(({ endDate, movementsData, totalPago }, ref) => (
  <div ref={ref} className="m-4" style={{ maxWidth: "90%", marginLeft: "auto", marginRight: "auto" }}>
          <div className="encabezado-impresion w-full flex justify-between border-t border-gray-300 pt-1 hidden-print">
      <img src="/assets/Logoprint.png" className="w-15 mr-2" alt="Logo" />
      <p className="text-gray-400">Corte de caja</p>
    </div>
    <h3 className="mt-8 text-xl font-semibold">Corte del día: {endDate}</h3>
    <table className="mt-4 w-full border-collapse border border-gray-300">
      <thead>
        <tr>
          <th className="border border-gray-300 px-4 py-2">Bin/Nip</th>
          <th className="border border-gray-300 px-4 py-2">Ciudad</th>
          <th className="border border-gray-300 px-4 py-2">Cliente</th>
          <th className="border border-gray-300 px-4 py-2">Modelo</th>
          <th className="border border-gray-300 px-4 py-2">Pago (USD)</th>
        </tr>
      </thead>
      <tbody>
        {movementsData.map((movement) => (
          <tr key={movement.id}>
            <td className="border border-gray-300 px-4 py-2">{movement.binNip}</td>
            <td className="border border-gray-300 px-4 py-2">{movement.ciudad}</td>
            <td className="border border-gray-300 px-4 py-2">{movement.cliente}</td>
            <td className="border border-gray-300 px-4 py-2">{movement.modelo}</td>
            <td className="border border-gray-300 px-4 py-2">
              {parseFloat(movement.totalPago).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}
            </td>
          </tr>
        ))}
        {movementsData.length === 0 && (
          <tr>
            <td colSpan="5" className="border border-gray-300 px-4 py-2 text-center">No se encontraron movimientos.</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="4" className="border border-gray-300 px-4 py-2 text-right font-semibold">Total:</td>
          <td className="border border-gray-300 px-4 py-2 font-semibold">
            {totalPago.toLocaleString('en-US', {
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
  const totalPago = movementsData.reduce((total, movement) => {
    const pagoValue = parseFloat(movement.totalPago) || 0;
    return total + pagoValue;
  }, 0);

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
      />
    </div>
  );
};

export default CorteDia;
