// hooks/useBusquedaMovimientos.js
import { firestore } from "../../firebase/firebaseIni";

/**
 * Hook para buscar todos los movimientos de una lista de vehículos y verificar el estatus de cobro.
 * @param {string[]} binNips - Array de códigos binNip a buscar.
 */
export const useBusquedaMovimientos = () => {

    const buscarMovimientos = async (binNips) => {
        const resultados = {};

        if (!binNips || binNips.length === 0) return resultados;

        // Dividir IDs en lotes de 10 debido a la limitación 'in' de Firestore
        const batches = [];
        for (let i = 0; i < binNips.length; i += 10) {
            batches.push(binNips.slice(i, i + 10));
        }

        try {
            // Recorrer los lotes de IDs para realizar consultas separadas
            for (const batch of batches) {

                // Consulta de Firebase: WHERE binNip IN [batch de IDs]
                const querySnapshot = await firestore()
                    .collection("movimientos")
                    .where("binNip", "in", batch)
                    .get();

                if (querySnapshot.empty) {
                    continue; // Pasa al siguiente lote si el actual está vacío
                }

                // Procesar los resultados y agrupar por vehículo
                querySnapshot.docs.forEach(doc => {
                    const movimiento = doc.data();

                    // 🚨 CORRECCIÓN CRÍTICA: Adjuntar el ID del documento (doc.id)
                    movimiento.docId = doc.id;

                    const id = movimiento.binNip;

                    if (!resultados[id]) {
                        resultados[id] = {
                            movimientos: [],
                            cobrado: false, // Flag de estatus EN
                        };
                    }

                    // Se agrega el movimiento al historial (ahora con docId)
                    resultados[id].movimientos.push(movimiento);

                    // Verificar si existe el estatus "EN"
                    if (movimiento.estatus === "EN") {
                        resultados[id].cobrado = true;
                    }
                });
            }

            // Aseguramos que los IDs que no encontraron movimientos tengan una estructura vacía
            binNips.forEach(id => {
                if (!resultados[id]) {
                    resultados[id] = {
                        movimientos: [],
                        cobrado: false,
                    };
                }
            });


            return resultados;
        } catch (error) {
            console.error("Error al buscar movimientos:", error);
            throw new Error("Fallo la búsqueda de movimientos en Firebase.");
        }
    };

    return { buscarMovimientos };
};