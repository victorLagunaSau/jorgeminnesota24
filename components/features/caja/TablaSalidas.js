import React, { useState } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";

const TablaSalidas = ({ salidasData, totalSalidas, isAdminMaster, onDataChange }) => {
  const [cambiando, setCambiando] = useState(null);

  const cambiarAEntrada = async (salida) => {
    if (cambiando) return;
    setCambiando(salida.id);
    try {
      const docRef = firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(salida.id);
      await docRef.update({
        estatus: "EE",
        tipo: "Entrada",
        cajaRecibo: salida.salidaCaja || 0,
        entradaCajaReceptor: salida.salidaCajaReceptor || "",
        entradaCajaConceptoPago: salida.salidaCajaConceptoPago || "",
        entradaCajaMotivoPago: salida.salidaCajaMotivoPago || "",
        entradaCajaTipo: salida.salidaCajaTipo || "",
        salidaCaja: 0,
      });
      if (onDataChange) onDataChange();
    } catch (e) {
      alert("Error al cambiar a entrada: " + e.message);
    } finally {
      setCambiando(null);
    }
  };

  // Función para agrupar las salidas por fecha
  const groupByDate = () => {
    const grouped = {};

    // Filtramos salidas con monto = 0 (comentado para posible futuro uso)
    const filteredData = salidasData.filter(salida => {
      // Si en el futuro quieres quitar este filtro, solo comenta la siguiente línea
      return parseFloat(salida.salidaCaja) !== 0;
    });

    filteredData.forEach((salida) => {
      const date = new Date(salida.timestamp.seconds * 1000).toLocaleDateString();

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push(salida);
    });

    return grouped;
  };

  const groupedData = groupByDate();

  return (
    <div className="table-container">
      <h3 className="text-lg font-semibold mt-4">Pagos / Salidas</h3>
      <table className="min-w-full bg-white border text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 border">Fecha</th>
            <th className="px-2 py-1 border">Usuario</th>
            <th className="px-2 py-1 border">Receptor</th>
            <th className="px-2 py-1 border">Concepto - Motivo</th>
            <th className="px-2 py-1 border">Tipo de Pago</th>
            <th className="px-2 py-1 border">Salida</th>
            {isAdminMaster && <th className="px-2 py-1 border">Cambiar</th>}
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedData).length === 0 ? (
            <tr>
              <td colSpan={isAdminMaster ? 7 : 6} className="px-2 py-1 border text-center">No se encontraron salidas.</td>
            </tr>
          ) : (
            Object.entries(groupedData).map(([date, salidas]) => {
              // Calcular subtotal por día
              const subtotalSalidas = salidas.reduce((sum, salida) =>
                sum + (parseFloat(salida.salidaCaja) || 0), 0);

              return (
                <React.Fragment key={date}>
                  {salidas.map((salida) => {
                    const salidaCaja = parseFloat(salida.salidaCaja) || 0;

                    return (
                      <tr key={salida.id}>
                        <td className="px-2 py-1 border">{date}</td>
                        <td className="px-2 py-1 border">
                          {salida.usuario || "Sin usuario"}
                        </td>
                        <td className="px-2 py-1 border">{salida.salidaCajaReceptor}</td>
                        <td className="px-2 py-1 border">{salida.salidaCajaConceptoPago} - {salida.salidaCajaMotivoPago}</td>
                        <td className="px-2 py-1 border">{salida.salidaCajaTipo}</td>
                        <td className="px-2 py-1 border text-right ">
                          -${salidaCaja.toFixed(2).toLocaleString('en-US')}
                        </td>
                        {isAdminMaster && (
                          <td className="px-2 py-1 border text-center">
                            <button
                              onClick={() => cambiarAEntrada(salida)}
                              disabled={cambiando === salida.id}
                              className="text-[9px] font-black uppercase px-2 py-1 rounded border transition-colors bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                            >
                              {cambiando === salida.id ? '...' : '→ Entrada'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Subtotal por día */}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={isAdminMaster ? 6 : 5} className="px-2 py-1 border text-right">Subtotal del día:</td>
                    <td className="px-2 py-1 border text-right ">
                      -${subtotalSalidas.toFixed(2).toLocaleString('en-US')}
                    </td>
                  </tr>
                  {/* Espacio entre días */}
                  <tr>
                    <td colSpan={isAdminMaster ? 7 : 6} className="py-2"></td>
                  </tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={isAdminMaster ? 6 : 5} className="px-2 py-1 font-semibold text-right border">Total General Salidas:</td>
            <td className="px-2 py-1 font-semibold border text-right ">
              -${totalSalidas.toFixed(2).toLocaleString('en-US')}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TablaSalidas;