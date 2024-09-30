import React, { useState } from "react";
import {firestore} from '../../firebase/firebaseIni';

const Report = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const movementsSnapshot = await firestore()
        .collection("movimientos")
        .where("timestamp", ">=", new Date(startTimestamp))
        .where("timestamp", "<=", new Date(endTimestamp))
        .get();

      const movementsData = movementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMovements(movementsData);
    } catch (error) {
      console.error("Error fetching movements:", error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="home">
      <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
        Reporte de <strong>Movimientos</strong>.
      </h3>
      <div className="flex flex-col md:flex-row md:items-center justify-between mt-4">
        <div className="mb-4 md:mb-0">
          <label className="block text-black-500">Fecha Inicial:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
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
          onClick={fetchMovements}
          className="bg-red-500 text-white-100 px-4 py-2 rounded-lg"
        >
          Aceptar
        </button>
      </div>

      {loading ? (
        <p className="mt-4">Loading...</p>
      ) : (
        movements.length > 0 && (
          <div className="overflow-x-auto mt-5">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Almacen</th>
                  <th>Asignado</th>
                  <th>Bin/Nip</th>
                  <th>Ciudad</th>
                  <th>Cliente</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Estatus</th>
                  <th>Gate Pass</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Precio</th>
                  <th>Teléfono Cliente</th>
                  <th>Timestamp</th>
                  <th>Tipo</th>
                  <th>Tipo Registro</th>
                  <th>Tipo Vehículo</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement, index) => (
                  <tr key={movement.id}>
                    <th>{index + 1}</th>
                    <td>{movement.almacen}</td>
                    <td>{movement.asignado ? "Sí" : "No"}</td>
                    <td>{movement.binNip}</td>
                    <td>{movement.ciudad}</td>
                    <td>{movement.cliente}</td>
                    <td>{movement.descripcion}</td>
                    <td>{movement.estado}</td>
                    <td>{movement.estatus}</td>
                    <td>{movement.gatePass}</td>
                    <td>{movement.marca}</td>
                    <td>{movement.modelo}</td>
                    <td>{movement.price}</td>
                    <td>{movement.telefonoCliente}</td>
                    <td>{new Date(movement.timestamp.seconds * 1000).toLocaleString()}</td>
                    <td>{movement.tipo}</td>
                    <td>{movement.tipoRegistro}</td>
                    <td>{movement.tipoVehiculo}</td>
                    <td>{movement.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default Report;
