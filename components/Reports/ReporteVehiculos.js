// components/ReporteVehiculos.js

import React, { useState, useMemo } from 'react';
import { firestore } from "../../firebase/firebaseIni";
import moment from 'moment';

const ReporteVehiculos = () => {
    const [fechaInicio, setFechaInicio] = useState(moment().format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState(moment().format('YYYY-MM-DD'));
    const [vehiculos, setVehiculos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    // ------------------------------------------
    // 1. LÓGICA DE CONSULTA POR FECHA
    // ------------------------------------------
    const buscarVehiculos = async () => {
        if (!fechaInicio || !fechaFin) {
            setMensaje("Por favor, selecciona las fechas de inicio y fin.");
            return;
        }

        setCargando(true);
        setMensaje("");
        setVehiculos([]);

        try {
            // 1. Definir rango de fechas
            const inicio = moment(fechaInicio).startOf('day').toDate();
            const fin = moment(fechaFin).endOf('day').toDate();

            const tsInicio = firestore.Timestamp.fromDate(inicio);
            const tsFin = firestore.Timestamp.fromDate(fin);

            // 2. Consulta a Firestore: Por rango en el campo 'timestamp' (o 'fechaRegistro')
            // ADVERTENCIA: Esta consulta requiere que 'timestamp' sea un campo indexado.
            // Si el campo de fecha se llama diferente (ej: fechaRegistro), cámbialo aquí.
            const querySnapshot = await firestore()
                .collection("vehiculos")
                .where("timestamp", ">=", tsInicio) // Asumiendo que 'timestamp' existe en /vehiculos/
                .where("timestamp", "<=", tsFin)
                .get();

            if (querySnapshot.empty) {
                setMensaje(`No se encontraron vehículos registrados en el rango de ${fechaInicio} a ${fechaFin}.`);
                return;
            }

            // 3. Mapear resultados con el ID del documento
            const resultados = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setVehiculos(resultados);
            setMensaje(` Éxito: Se encontraron ${resultados.length} vehículos en el rango de fechas.`);

        } catch (error) {
            console.error("Error al buscar vehículos:", error);
            setMensaje(` Error en la búsqueda. (Asegúrate que el campo 'timestamp' exista y esté indexado en /vehiculos/): ${error.message}`);
        } finally {
            setCargando(false);
        }
    };

    // ------------------------------------------
    // 2. EXTRACCIÓN DINÁMICA DE ENCABEZADOS Y DATOS
    // ------------------------------------------
    const [allKeys, tableData] = useMemo(() => {
        if (vehiculos.length === 0) {
            return [[], []];
        }

        // Obtener todas las claves únicas de todos los vehículos
        const keys = new Set();
        keys.add("ID (binNip)"); // Agregamos el ID del documento primero

        vehiculos.forEach(vehiculo => {
            Object.keys(vehiculo).forEach(key => {
                // Evitar el 'id' duplicado si ya lo pusimos como 'ID (binNip)'
                if (key !== 'id') {
                    keys.add(key);
                }
            });
        });

        const headers = Array.from(keys);

        // Mapear los datos de los vehículos al orden de los encabezados
        const data = vehiculos.map(vehiculo => {
            const row = {};
            headers.forEach(header => {
                if (header === "ID (binNip)") {
                    row[header] = vehiculo.id;
                } else {
                    let value = vehiculo[header];

                    // Formato especial para Timestamp (si existe)
                    if (header === 'timestamp' && value && typeof value.toDate === 'function') {
                        value = moment(value.toDate()).format('YYYY-MM-DD HH:mm:ss');
                    } else if (typeof value === 'object' && value !== null) {
                        // Si es un objeto complejo (ej: coordenadas, sub-documentos), lo serializamos
                        value = JSON.stringify(value);
                    }

                    row[header] = value !== undefined ? value : ''; // Usar cadena vacía para celdas vacías
                }
            });
            return row;
        });

        return [headers, data];
    }, [vehiculos]);

    // Función para manejar la copia al portapapeles (útil para Excel)
    const handleCopyToClipboard = () => {
        const headerRow = allKeys.join('\t');
        const dataRows = tableData.map(row =>
            allKeys.map(key => row[key]).join('\t')
        ).join('\n');

        const csvContent = headerRow + '\n' + dataRows;

        navigator.clipboard.writeText(csvContent)
            .then(() => {
                setMensaje(` Éxito: ${tableData.length} filas copiadas al portapapeles. Pégalas en Excel.`);
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                setMensaje(' Error al copiar los datos. Inténtalo manualmente.');
            });
    };


    // ------------------------------------------
    // 3. UI DEL COMPONENTE
    // ------------------------------------------
    return (
        <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-3xl font-bold text-teal-600 text-center mb-6">
                Generador de Reporte Completo de Vehículos
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
                    onClick={buscarVehiculos}
                    disabled={cargando}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition duration-150 disabled:opacity-50"
                >
                    {cargando ? 'Consultando...' : ' Generar Reporte por Fecha'}
                </button>
            </div>

            {/* MENSAJES Y ACCIONES */}
            {mensaje && (
                <div className={`p-3 mb-4 rounded ${mensaje.includes('Éxito') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {mensaje}
                </div>
            )}

            {tableData.length > 0 && (
                <div className="mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">Reporte listo: {tableData.length} vehículos encontrados.</p>
                    <button
                        onClick={handleCopyToClipboard}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-150"
                    >
                         Copiar Datos para Excel
                    </button>
                </div>
            )}

            <hr className="mb-6"/>

            {/* TABLA DE RESULTADOS DINÁMICA */}
            {tableData.length > 0 && (
                <div className="mt-6 overflow-x-auto border rounded-md shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                {allKeys.map(key => (
                                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">
                                        {key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tableData.map((row, index) => (
                                <tr key={index} className="hover:bg-yellow-50">
                                    {allKeys.map(key => (
                                        <td key={key} className="px-6 py-3 whitespace-nowrap text-xs text-gray-800 max-w-xs overflow-hidden truncate">
                                            {row[key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {vehiculos.length === 0 && !cargando && !mensaje.includes('Error') && (
                <p className="text-center text-gray-500 mt-6">Utiliza los filtros de fecha para generar el reporte.</p>
            )}
        </div>
    );
};

export default ReporteVehiculos;