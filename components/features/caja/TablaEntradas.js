import React, { useState } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";

const TablaEntradas = ({ entradasData, totalRecibido, isAdminMaster, onDataChange }) => {
  const [cambiando, setCambiando] = useState(null);

  const cambiarASalida = async (entrada) => {
    if (cambiando) return;
    setCambiando(entrada.id);
    try {
      const docRef = firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(entrada.id);
      await docRef.update({
        estatus: "SE",
        tipo: "Pago",
        salidaCaja: entrada.cajaRecibo || 0,
        salidaCajaReceptor: entrada.entradaCajaReceptor || "",
        salidaCajaConceptoPago: entrada.entradaCajaConceptoPago || "",
        salidaCajaMotivoPago: entrada.entradaCajaMotivoPago || "",
        salidaCajaTipo: entrada.entradaCajaTipo || "",
        cajaRecibo: 0,
      });
      if (onDataChange) onDataChange();
    } catch (e) {
      alert("Error al cambiar a salida: " + e.message);
    } finally {
      setCambiando(null);
    }
  };

  // Función para agrupar las entradas por fecha
  const groupByDate = () => {
    const grouped = {};

    // Filtramos entradas con recibo = 0 (comentado para posible futuro uso)
    const filteredData = entradasData.filter(entrada => {
      // Si en el futuro quieres quitar este filtro, solo comenta la siguiente línea
      return parseFloat(entrada.cajaRecibo) !== 0;
    });

    filteredData.forEach((entrada) => {
      const date = new Date(entrada.timestamp.seconds * 1000).toLocaleDateString();

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push(entrada);
    });

    return grouped;
  };

  const groupedData = groupByDate();

  return (
    <div className="table-container">
      <h3 className="text-lg font-semibold mt-4">Entradas</h3>
      <table className="min-w-full bg-white border text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 border">Fecha</th>
            <th className="px-2 py-1 border">Usuario</th>
            <th className="px-2 py-1 border">Pagador</th>
            <th className="px-2 py-1 border">Concepto</th>
            <th className="px-2 py-1 border">Motivo</th>
            <th className="px-2 py-1 border">Tipo de Pago</th>
            <th className="px-2 py-1 border">Recibo</th>
            {isAdminMaster && <th className="px-2 py-1 border">Cambiar</th>}
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedData).length === 0 ? (
            <tr>
              <td colSpan={isAdminMaster ? 8 : 7} className="px-2 py-1 border text-center">No se encontraron entradas.</td>
            </tr>
          ) : (
            Object.entries(groupedData).map(([date, entradas]) => {
              // Calcular subtotal por día
              const subtotalRecibido = entradas.reduce((sum, entrada) =>
                sum + (parseFloat(entrada.cajaRecibo) || 0), 0);

              return (
                <React.Fragment key={date}>
                  {entradas.map((entrada, index) => {
                    const recibo = parseFloat(entrada.cajaRecibo) || 0;

                    return (
                      <tr key={entrada.id}>
                        <td className="px-2 py-1 border">
                          {date}
                        </td>
                        <td className="px-2 py-1 border">
                          {entrada.usuario || "Sin usuario"}
                        </td>
                        <td className="px-2 py-1 border">
                          <strong>{entrada.entradaCajaReceptor}</strong>
                        </td>
                        <td className="px-2 py-1 border">{entrada.entradaCajaConceptoPago}</td>
                        <td className="px-2 py-1 border">{entrada.entradaCajaMotivoPago}</td>
                        <td className="px-2 py-1 border">{entrada.entradaCajaTipo}</td>
                        <td className="px-2 py-1 border text-right">
                          ${recibo.toFixed(2).toLocaleString('en-US')}
                        </td>
                        {isAdminMaster && (
                          <td className="px-2 py-1 border text-center">
                            <button
                              onClick={() => cambiarASalida(entrada)}
                              disabled={cambiando === entrada.id}
                              className="text-[9px] font-black uppercase px-2 py-1 rounded border transition-colors bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                            >
                              {cambiando === entrada.id ? '...' : '→ Salida'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Subtotal por día */}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={isAdminMaster ? 7 : 6} className="px-2 py-1 border text-right">Subtotal del día:</td>
                    <td className="px-2 py-1 border text-right">
                      ${subtotalRecibido.toFixed(2).toLocaleString('en-US')}
                    </td>
                  </tr>
                  {/* Espacio entre días */}
                  <tr>
                    <td colSpan={isAdminMaster ? 8 : 7} className="py-2"></td>
                  </tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={isAdminMaster ? 7 : 6} className="px-2 py-1 font-semibold text-right border">Total General Recibido</td>
            <td className="px-2 py-1 font-semibold border text-right">
              ${totalRecibido.toFixed(2).toLocaleString('en-US')}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TablaEntradas;