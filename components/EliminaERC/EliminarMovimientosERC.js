// components/EliminarMovimientosERC EP.js

import React, { useState } from 'react';
import { firestore } from "../../firebase/firebaseIni";
import moment from 'moment';

const MOVIMIENTO_TIPO = "ERC";

const EliminarMovimientosERC = () => {
    const [fechaInicio, setFechaInicio] = useState(moment().format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState(moment().format('YYYY-MM-DD'));
    const [movimientos, setMovimientos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    // ------------------------------------------
    // 1. LÓGICA DE CONSULTA (MODIFICADA: QUITAR FILTRO DE TIPO EN FIRESTORE)
    // ------------------------------------------
    const buscarMovimientos = async () => {
        if (!fechaInicio || !fechaFin) {
            setMensaje("Por favor, selecciona las fechas de inicio y fin.");
            return;
        }

        setCargando(true);
        setMensaje("");
        setMovimientos([]);

        try {
            // 1. Definir rango de fechas
            const inicio = moment(fechaInicio).startOf('day').toDate();
            const fin = moment(fechaFin).endOf('day').toDate();

            const tsInicio = firestore.Timestamp.fromDate(inicio);
            const tsFin = firestore.Timestamp.fromDate(fin);

            // 2. Consulta a Firestore: SOLO por rango de fechas (para evitar el índice compuesto)
            const querySnapshot = await firestore()
                .collection("movimientos")
                .where("timestamp", ">=", tsInicio)             // Desigualdad 1
                .where("timestamp", "<=", tsFin)                // Desigualdad 2
                .get();

            if (querySnapshot.empty) {
                setMensaje(`No se encontraron movimientos en este rango de fechas.`);
                return;
            }

            // 3. Filtrado Local (en JavaScript)
            const todosLosResultados = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const resultadosFiltrados = todosLosResultados.filter(mov =>
                mov.entradaCajaTipo === MOVIMIENTO_TIPO
            );

            setMovimientos(resultadosFiltrados);
            setMensaje(`✅ Éxito: Se encontraron ${resultadosFiltrados.length} movimientos tipo "${MOVIMIENTO_TIPO}" (filtrados localmente).`);

        } catch (error) {
            console.error("Error al buscar movimientos:", error);
            setMensaje(`❌ Error en la búsqueda: ${error.message}`);
        } finally {
            setCargando(false);
        }
    };

    // ------------------------------------------
    // 2. LÓGICA DE ELIMINACIÓN INDIVIDUAL (Sin cambios)
    // ------------------------------------------
    const handleEliminar = async (idMovimiento) => {
        if (!window.confirm(`¿Estás seguro de que deseas ELIMINAR el movimiento con ID: ${idMovimiento}? Esta acción es irreversible.`)) {
            return;
        }

        try {
            await firestore().collection("movimientos").doc(idMovimiento).delete();

            setMovimientos(movs => movs.filter(mov => mov.id !== idMovimiento));
            setMensaje(`✅ Movimiento ${idMovimiento} eliminado exitosamente.`);

        } catch (error) {
            console.error("Error al eliminar movimiento:", error);
            setMensaje(`❌ Error al eliminar el movimiento: ${error.message}`);
        }
    };

    // ------------------------------------------
    // 3. UI DEL COMPONENTE (Sin cambios)
    // ------------------------------------------
    return (
        <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-3xl font-bold text-indigo-600 text-center mb-6">
                Gestión y Eliminación de Movimientos ERC
            </h1>

            {/* BUSCADORES DE FECHA */}
            <div className="flex flex-wrap gap-4 items-end mb-6 p-4 border rounded-md bg-gray-50">
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Fecha de Inicio:</label>
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="p-2 border rounded-md"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Fecha de Fin:</label>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="p-2 border rounded-md"
                    />
                </div>
                <button
                    onClick={buscarMovimientos}
                    disabled={cargando}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 disabled:opacity-50"
                >
                    {cargando ? 'Buscando...' : '🔎 Buscar Movimientos ERC'}
                </button>
            </div>

            {/* MENSAJES Y RESULTADOS */}
            {mensaje && (
                <div className={`p-3 mb-4 rounded ${mensaje.includes('Éxito') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {mensaje}
                </div>
            )}

            <hr />

            {/* TABLA DE MOVIMIENTOS */}
            {movimientos.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receptor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recibo (Caja)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {movimientos.map((mov) => (
                                <tr key={mov.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {mov.timestamp ? moment(mov.timestamp.toDate()).format('YYYY-MM-DD HH:mm') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {mov.entradaCajaReceptor || '—'}<br/>{mov.entradaCajaConceptoPago || '—'}<br/> {mov.id}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                                        ${mov.cajaRecibo ? mov.cajaRecibo.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {mov.usuario || 'Desconocido'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEliminar(mov.id)}
                                            className="text-red-600 hover:text-red-900 font-semibold"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {movimientos.length === 0 && !cargando && mensaje && !mensaje.includes('Error') && (
                <p className="text-center text-gray-500 mt-6">No hay movimientos ERC en este rango de fechas.</p>
            )}
        </div>
    );
};

export default EliminarMovimientosERC;