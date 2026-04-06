// components/EliminaVehiculos.js
import React, { useState, useMemo } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { useBusquedaMovimientos } from './useBusquedaMovimientos'; // ¡Asegúrate de la ruta!

// Función auxiliar para descargar el archivo JSON de respaldo
const descargarJSON = (data, filename) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const EliminaVehiculos = () => {
    const { buscarMovimientos } = useBusquedaMovimientos();

    const [binNipsList, setBinNipsList] = useState("");
    const [mensajeError, setMensajeError] = useState("");
    const [cargando, setCargando] = useState(false);

    const [clasificacionResultados, setClasificacionResultados] = useState({
        aptos: [],
        noAptos: [],
        datosAptosJson: null // Array de { binNip, data_vehiculo_final, movimientos }
    });

    // ------------------------------------------
    // GENERADOR DE LISTA DE CONFIRMACIÓN (Requiere 'movimiento.docId')
    // ------------------------------------------
    const listaConfirmacion = useMemo(() => {
        if (!clasificacionResultados.datosAptosJson) return '';

        return clasificacionResultados.datosAptosJson.map(vehiculo => {
            const binNip = vehiculo.binNip;
            // Solo incluimos IDs que existan (para evitar errores en la vista previa)
            const idsMovimientos = vehiculo.movimientos.map(mov => mov.docId).filter(id => id).join(', ');

            return `${binNip}, ${idsMovimientos}`;
        }).join('\n');
    }, [clasificacionResultados.datosAptosJson]);


    // ------------------------------------------
    // FUNCIÓN DE VERIFICACIÓN (CORRECCIÓN 1: Agregar vehiculoData al JSON)
    // ------------------------------------------
    const handleVerificarVehiculos = async () => {
        const idsToProcess = binNipsList
            .split(/[,\s]+/)
            .map(id => id.trim())
            .filter(id => id.length > 0);

        if (idsToProcess.length === 0) {
            setMensajeError("Ingresa al menos un código BIN/NIP.");
            return;
        }

        try {
            setCargando(true);
            setMensajeError("");
            setClasificacionResultados({ aptos: [], noAptos: [], datosAptosJson: null });

            // 1. Obtener movimientos de /movimientos/
            const movimientosPorVehiculo = await buscarMovimientos(idsToProcess);

            // 2. Obtener la data final de /vehiculos/ (Múltiples batches para evitar el límite de 10)
            let vehiculosDataMap = {};
            const vehiculosBatches = [];
            for (let i = 0; i < idsToProcess.length; i += 10) {
                vehiculosBatches.push(idsToProcess.slice(i, i + 10));
            }

            for (const batch of vehiculosBatches) {
                const snap = await firestore()
                    .collection("vehiculos")
                    .where(firestore.FieldPath.documentId(), "in", batch)
                    .get();
                snap.docs.forEach(doc => {
                    vehiculosDataMap[doc.id] = doc.data();
                });
            }

            let vehiculosAptos = [];
            let vehiculosNoAptos = [];
            let datosParaJson = [];

            // 3. Clasificación y Unión de Datos
            for (const id of idsToProcess) {
                const movimientosData = movimientosPorVehiculo[id];
                const vehiculoData = vehiculosDataMap[id];

                if (!vehiculoData) {
                    vehiculosNoAptos.push({ id, motivo: "No existe en /vehiculos" });
                } else if (!movimientosData) {
                    vehiculosNoAptos.push({ id, motivo: "No tiene movimientos registrados" });
                } else if (!movimientosData.cobrado) {
                    vehiculosNoAptos.push({ id, motivo: "No tiene movimiento con estatus \"EN\" (Cobrado)" });
                } else {
                    // Es apto
                    vehiculosAptos.push(id);
                    // 🚩 CORRECCIÓN 1 APLICADA: Incluir vehiculoData
                    datosParaJson.push({
                        binNip: id,
                        data_vehiculo_final: vehiculoData, // <-- DATA DEL VEHÍCULO AÑADIDA
                        movimientos: movimientosData.movimientos
                    });
                }
            }

            setClasificacionResultados({
                aptos: vehiculosAptos,
                noAptos: vehiculosNoAptos,
                datosAptosJson: datosParaJson
            });

            if (vehiculosAptos.length === 0) {
                setMensajeError(`⚠️ Ninguno de los vehículos ingresados cumple la condición de borrado.`);
            } else {
                setMensajeError(`✅ Verificación completada. ${vehiculosAptos.length} vehículo(s) aptos para borrado. Revisa la sección de JSON para copiar la evidencia COMPLETA.`);
            }

        } catch (error) {
            console.error("Error durante la verificación:", error);
            setMensajeError("Ocurrió un error al verificar los vehículos. Revisa la consola.");
        } finally {
            setCargando(false);
        }
    };

// ------------------------------------------
// FUNCIÓN DE ELIMINACIÓN CONDICIONAL (CORRECCIÓN 2: Validar docId)
// ------------------------------------------
const handleEliminarVehiculos = async () => {
    const { aptos, datosAptosJson } = clasificacionResultados;

    if (aptos.length === 0) {
        setMensajeError("No hay vehículos aptos para eliminar. Primero verifica la lista.");
        return;
    }

    // Contar el total de movimientos a borrar para la confirmación
    const totalMovimientosABorrar = datosAptosJson.map(v => v.movimientos.length).reduce((a, b) => a + b, 0);

    const confirmacion = window.confirm(
        `Estás a punto de ELIMINAR ${aptos.length} vehículo(s) de /vehiculos/ y TODOS sus ${totalMovimientosABorrar} movimientos relacionados de /movimientos/. ¿Deseas generar el respaldo JSON y proceder?`
    );

    if (!confirmacion) {
        setMensajeError("Proceso de eliminación cancelado por el usuario.");
        return;
    }

    try {
        setCargando(true);
        setMensajeError("");
        let movimientosEliminadosCount = 0;
        let movimientosFallidosCount = 0;


        // 1. Generar Respaldo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        descargarJSON(datosAptosJson, `respaldo_movimientos_eliminados_${timestamp}.json`);

        // 2. Eliminación en Batch
        const batch = firestore().batch();

        // A. ELIMINAR PRIMERO LOS DOCUMENTOS HIJOS (/movimientos/)
        datosAptosJson.forEach(vehiculo => {
            vehiculo.movimientos.forEach(movimiento => {
                // 🚩 CORRECCIÓN 2 APLICADA: Solo intenta borrar si movimiento.docId existe y no es vacío
                if (movimiento.docId) {
                    const movimientoDocRef = firestore().collection("movimientos").doc(movimiento.docId);
                    batch.delete(movimientoDocRef);
                    movimientosEliminadosCount++;
                } else {
                    // Esto indica que el hook 'useBusquedaMovimientos' NO está devolviendo el docId
                    console.error(`Movimiento sin ID (docId) para el vehículo ${vehiculo.binNip}. Imposible borrar.`);
                    movimientosFallidosCount++;
                }
            });
        });

        // B. ELIMINAR DESPUÉS LOS DOCUMENTOS PADRE (/vehiculos/)
        aptos.forEach(id => {
            const docRef = firestore().collection("vehiculos").doc(id);
            batch.delete(docRef);
        });

        // Ejecutar todas las eliminaciones en orden: Hijos -> Padre
        await batch.commit();

        // 3. Resultado Final
        let mensajeFinal = `✅ ÉXITO: ${aptos.length} vehículo(s) eliminados de /vehiculos/ y ${movimientosEliminadosCount} movimiento(s) eliminados de /movimientos/. El respaldo JSON ha sido descargado.`;

        if (movimientosFallidosCount > 0) {
             mensajeFinal += ` ⚠️ ATENCIÓN: ${movimientosFallidosCount} movimientos no pudieron ser borrados porque les falta el ID del documento ('docId'). Revisa el hook de búsqueda.`;
        }
        if (clasificacionResultados.noAptos.length > 0) {
             mensajeFinal += ` **Advertencia**: ${clasificacionResultados.noAptos.length} vehículo(s) no fueron eliminados (Ver lista de no aptos).`;
        }

        setMensajeError(mensajeFinal);
        setBinNipsList("");
        setClasificacionResultados({ aptos: [], noAptos: [], datosAptosJson: null });

    } catch (error) {
        console.error("Error en la eliminación múltiple:", error);
        setMensajeError("Ocurrió un error grave al intentar la eliminación dual. Revisa la consola y tu hook de búsqueda.");
    } finally {
        setCargando(false);
    }
};

    // ------------------------------------------
    // 4. RENDERIZADO DEL COMPONENTE
    // ------------------------------------------
    const { aptos, noAptos, datosAptosJson } = clasificacionResultados;

    return (
        <div id="elimina-vehiculos" className="max-w-4xl mx-auto mt-6 p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-3xl font-bold text-red-600 text-center mb-6">
                Eliminación Condicional y Respaldo de Movimientos
            </h1>
            <p className="text-gray-600 mb-4 text-center">
                Ingresa los códigos BIN/NIP. El sistema verificará, clasificará y te permitirá borrar solo los vehículos con movimientos cobrados ("EN").
            </p>

            {/* Área de Texto para IDs */}
            <div className="mb-4">
                <textarea
                    rows="4"
                    placeholder="Ej: 51072555, 12345678, 98765432..."
                    className="w-full border-2 border-red-300 p-3 rounded-md focus:border-red-500 focus:ring focus:ring-red-200"
                    value={binNipsList}
                    onChange={(e) => setBinNipsList(e.target.value)}
                    disabled={cargando}
                />
            </div>

            {/* Botón de Verificación */}
            <button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-200 mb-4"
                onClick={handleVerificarVehiculos}
                disabled={cargando || binNipsList.trim().length === 0}
            >
                {cargando ? "Verificando..." : "1. Verificar Vehículos"}
            </button>

            {/* Mensaje de Error / Éxito */}
            {mensajeError && (
                <div className={`mt-4 px-4 py-3 rounded relative ${
                    mensajeError.includes("ÉXITO") || mensajeError.includes("Verificación completada") ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"
                }`}>
                    {mensajeError}
                </div>
            )}

            {/* ------------------------------------- */}
            {/* SECCIÓN DE RESULTADOS Y ELIMINACIÓN */}
            {/* ------------------------------------- */}

            {aptos.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-md">
                    <h3 className="text-xl font-semibold text-green-800 mb-2">✅ Vehículos Aptos para Borrado ({aptos.length})</h3>
                    <p className="text-green-700 mb-3">La información de sus movimientos está lista para copiar (JSON de Evidencia).</p>

                    {/* NUEVA SECCIÓN: LISTA DE CONFIRMACIÓN */}
                    <div className="mb-4">
                        <h4 className="font-bold text-lg text-gray-700 mb-1">Lista de IDs de Movimiento Encontrados:</h4>
                        <textarea
                            rows="5"
                            readOnly
                            value={listaConfirmacion}
                            className="w-full border border-gray-300 p-3 rounded-md bg-white text-gray-900 font-mono text-sm resize-none focus:outline-none"
                        />
                    </div>

                    {/* JSON Visible y Copiable */}
                    <details className="mb-4">
                        <summary className="cursor-pointer font-bold text-gray-700 hover:text-gray-900">
                            Ver JSON de Evidencia Completa (Datos del Vehículo + Movimientos)
                        </summary>
                        <textarea
                            rows="10"
                            readOnly
                            value={JSON.stringify(datosAptosJson, null, 2)}
                            className="w-full border border-gray-300 p-3 rounded-md bg-gray-800 text-green-400 font-mono text-sm resize-none focus:outline-none mt-2"
                        />
                    </details>


                    {/* Botón de Eliminación (Acción Final) */}
                    <button
                        type="button"
                        className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition duration-200"
                        onClick={handleEliminarVehiculos}
                        disabled={cargando}
                    >
                        {cargando ? "Eliminando..." : `2. ELIMINAR ${aptos.length} Vehículo(s) y Generar Respaldo`}
                    </button>
                </div>
            )}

            {/* Lista de No Aptos */}
            {noAptos.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
                    <h3 className="text-xl font-semibold text-yellow-800 mb-2">❌ Vehículos No Aptos ({noAptos.length})</h3>
                    <p className="text-yellow-700 mb-2">Estos códigos no cumplen las reglas de borrado y no serán eliminados:</p>

                    {/* Lista fácil de checar */}
                    <ul className="list-disc list-inside ml-4">
                        {noAptos.map(item => (
                            <li key={item.id} className="text-sm text-gray-700">
                                <strong>{item.id}</strong>: {item.motivo}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default EliminaVehiculos;