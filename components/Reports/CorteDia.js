import React, { useState, useEffect } from "react";
import { firestore } from '../../firebase/firebaseIni';

const CorteDia = () => {
  const [endDate, setEndDate] = useState("");
  const [movementsData, setMovementsData] = useState([]);

  const handleButtonClick = async () => {
    console.log("Fecha seleccionada:", endDate);

    const siguienteDia = new Date(endDate);
    siguienteDia.setDate(siguienteDia.getDate() + 1);
    console.log("Día siguiente:", siguienteDia.toISOString().split("T")[0]);

    // Convertir la fecha seleccionada y el día siguiente a timestamps
    const startTimestamp = new Date(endDate).setHours(0, 0, 0, 0);
    const endTimestamp = new Date(siguienteDia).setHours(23, 59, 59, 999);

    // Consulta a Firestore
    const movementsSnapshot = await firestore()
      .collection("movimientos")
      .where("timestamp", ">=", new Date(startTimestamp))
      .where("timestamp", "<=", new Date(endTimestamp))
      .get();

    const movements = movementsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setMovementsData(movements);
  };

  return (
    <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="home">
      <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
        Reporte de <strong>Movimientos</strong>.
      </h3>

      <div className="mb-4 md:mb-0">
        <label className="block text-black-500">Fecha Final:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>

      <button
        onClick={handleButtonClick}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        Mostrar Fecha Seleccionada
      </button>

      <table className="mt-8 w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">Bin/Nip</th>
            <th className="border border-gray-300 px-4 py-2">Ciudad</th>
            <th className="border border-gray-300 px-4 py-2">Cliente</th>
          </tr>
        </thead>
        <tbody>
          {movementsData.map((movement) => (
            <tr key={movement.id}>
              <td className="border border-gray-300 px-4 py-2">{movement.binNip}</td>
              <td className="border border-gray-300 px-4 py-2">{movement.ciudad}</td>
              <td className="border border-gray-300 px-4 py-2">{movement.cliente}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CorteDia;
