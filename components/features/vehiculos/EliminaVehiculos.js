import React, { useState, useMemo } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { useBusquedaMovimientos } from './useBusquedaMovimientos';
import { FaTrash, FaSearch, FaShieldAlt, FaExclamationTriangle } from "react-icons/fa";

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

const EliminaVehiculos = ({ user }) => {
    const { buscarMovimientos } = useBusquedaMovimientos();

    const [binNipsList, setBinNipsList] = useState("");
    const [mensajeError, setMensajeError] = useState("");
    const [cargando, setCargando] = useState(false);

    const [clasificacionResultados, setClasificacionResultados] = useState({
        aptos: [],
        noAptos: [],
        datosAptosJson: null
    });

    const isAdminMaster = user?.adminMaster === true;

    const listaConfirmacion = useMemo(() => {
        if (!clasificacionResultados.datosAptosJson) return '';
        return clasificacionResultados.datosAptosJson.map(vehiculo => {
            const idsMovimientos = vehiculo.movimientos.map(mov => mov.docId).filter(id => id).join(', ');
            const viajesInfo = vehiculo.viajesRelacionados?.length
                ? ` | Viajes: ${vehiculo.viajesRelacionados.map(v => v.docId).join(', ')}`
                : '';
            return `${vehiculo.binNip}, ${idsMovimientos}${viajesInfo}`;
        }).join('\n');
    }, [clasificacionResultados.datosAptosJson]);

    // VERIFICACION
    const handleVerificarVehiculos = async () => {
        const idsToProcess = binNipsList
            .split(/[,\s]+/)
            .map(id => id.trim())
            .filter(id => id.length > 0);

        if (idsToProcess.length === 0) {
            setMensajeError("Ingresa al menos un codigo BIN/NIP.");
            return;
        }

        try {
            setCargando(true);
            setMensajeError("");
            setClasificacionResultados({ aptos: [], noAptos: [], datosAptosJson: null });

            const movimientosPorVehiculo = await buscarMovimientos(idsToProcess);

            let vehiculosDataMap = {};
            const vehiculosBatches = [];
            for (let i = 0; i < idsToProcess.length; i += 10) {
                vehiculosBatches.push(idsToProcess.slice(i, i + 10));
            }
            for (const batch of vehiculosBatches) {
                const snap = await firestore()
                    .collection(COLLECTIONS.VEHICULOS)
                    .where(firestore.FieldPath.documentId(), "in", batch)
                    .get();
                snap.docs.forEach(doc => {
                    vehiculosDataMap[doc.id] = doc.data();
                });
            }

            // Buscar viajes pagados que contengan estos lotes
            const viajesPagadosSnap = await firestore()
                .collection(COLLECTIONS.VIAJES_PAGADOS)
                .get();

            const viajesPorLote = {};
            viajesPagadosSnap.docs.forEach(doc => {
                const data = doc.data();
                if (Array.isArray(data.vehiculos)) {
                    data.vehiculos.forEach(v => {
                        if (idsToProcess.includes(v.lote)) {
                            if (!viajesPorLote[v.lote]) viajesPorLote[v.lote] = [];
                            viajesPorLote[v.lote].push({
                                docId: doc.id,
                                totalVehiculos: data.vehiculos.length,
                                data: data
                            });
                        }
                    });
                }
            });

            // Buscar en lotesEnTransito
            const lotesTransitoMap = {};
            for (const batch of vehiculosBatches) {
                for (const id of batch) {
                    const loteDoc = await firestore()
                        .collection(COLLECTIONS.LOTES_EN_TRANSITO)
                        .doc(id)
                        .get();
                    if (loteDoc.exists) {
                        lotesTransitoMap[id] = true;
                    }
                }
            }

            let vehiculosAptos = [];
            let vehiculosNoAptos = [];
            let datosParaJson = [];

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
                    vehiculosAptos.push(id);
                    datosParaJson.push({
                        binNip: id,
                        data_vehiculo_final: vehiculoData,
                        movimientos: movimientosData.movimientos,
                        viajesRelacionados: viajesPorLote[id] || [],
                        tieneLosteEnTransito: !!lotesTransitoMap[id]
                    });
                }
            }

            setClasificacionResultados({
                aptos: vehiculosAptos,
                noAptos: vehiculosNoAptos,
                datosAptosJson: datosParaJson
            });

            if (vehiculosAptos.length === 0) {
                setMensajeError("Ninguno de los vehiculos ingresados cumple la condicion de borrado.");
            } else {
                const totalViajes = datosParaJson.reduce((sum, d) => sum + (d.viajesRelacionados?.length || 0), 0);
                setMensajeError(
                    `Verificacion completada. ${vehiculosAptos.length} vehiculo(s) aptos. ` +
                    `${totalViajes} viaje(s) pagado(s) relacionados encontrados.`
                );
            }
        } catch (error) {
            console.error("Error durante la verificacion:", error);
            setMensajeError("Ocurrio un error al verificar los vehiculos.");
        } finally {
            setCargando(false);
        }
    };

    // ELIMINACION
    const handleEliminarVehiculos = async () => {
        const { aptos, datosAptosJson } = clasificacionResultados;

        if (aptos.length === 0) {
            setMensajeError("No hay vehiculos aptos para eliminar.");
            return;
        }

        const totalMovimientos = datosAptosJson.reduce((sum, v) => sum + v.movimientos.length, 0);
        const totalViajes = datosAptosJson.reduce((sum, v) => sum + (v.viajesRelacionados?.length || 0), 0);

        const confirmacion = window.confirm(
            `ELIMINAR:\n` +
            `- ${aptos.length} vehiculo(s) de /vehiculos/\n` +
            `- ${totalMovimientos} movimiento(s) de /movimientos/\n` +
            `- Limpiar ${totalViajes} viaje(s) pagado(s)\n` +
            `- Limpiar lotesEnTransito si existen\n\n` +
            `Se descargara un respaldo JSON antes de borrar.\n` +
            `¿Confirmar eliminacion total?`
        );

        if (!confirmacion) {
            setMensajeError("Eliminacion cancelada.");
            return;
        }

        try {
            setCargando(true);
            setMensajeError("");
            let movimientosEliminados = 0;
            let movimientosFallidos = 0;
            let viajesLimpiados = 0;
            let lotesLimpiados = 0;

            // 1. Respaldo JSON
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            descargarJSON(datosAptosJson, `respaldo_eliminacion_total_${timestamp}.json`);

            const batch = firestore().batch();

            for (const vehiculo of datosAptosJson) {
                // A. Eliminar movimientos
                vehiculo.movimientos.forEach(mov => {
                    if (mov.docId) {
                        batch.delete(firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(mov.docId));
                        movimientosEliminados++;
                    } else {
                        movimientosFallidos++;
                    }
                });

                // B. Eliminar vehiculo
                batch.delete(firestore().collection(COLLECTIONS.VEHICULOS).doc(vehiculo.binNip));

                // C. Limpiar lotesEnTransito
                if (vehiculo.tieneLosteEnTransito) {
                    batch.delete(firestore().collection(COLLECTIONS.LOTES_EN_TRANSITO).doc(vehiculo.binNip));
                    lotesLimpiados++;
                }

                // D. Limpiar viajes pagados
                for (const viaje of (vehiculo.viajesRelacionados || [])) {
                    if (viaje.totalVehiculos <= 1) {
                        // Si era el unico vehiculo, eliminar el viaje completo
                        batch.delete(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(viaje.docId));
                    } else {
                        // Si hay mas vehiculos, solo remover este del array
                        const vehiculosActualizados = viaje.data.vehiculos.filter(
                            v => v.lote !== vehiculo.binNip
                        );
                        batch.update(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(viaje.docId), {
                            vehiculos: vehiculosActualizados
                        });
                    }
                    viajesLimpiados++;
                }
            }

            await batch.commit();

            let msg = `ELIMINACION EXITOSA:\n` +
                `- ${aptos.length} vehiculo(s) eliminados\n` +
                `- ${movimientosEliminados} movimiento(s) eliminados\n` +
                `- ${viajesLimpiados} viaje(s) limpiados\n` +
                `- ${lotesLimpiados} lote(s) en transito limpiados`;

            if (movimientosFallidos > 0) {
                msg += `\n- ${movimientosFallidos} movimiento(s) sin docId (no eliminados)`;
            }

            setMensajeError(msg);
            setBinNipsList("");
            setClasificacionResultados({ aptos: [], noAptos: [], datosAptosJson: null });

        } catch (error) {
            console.error("Error en la eliminacion:", error);
            setMensajeError("Error grave al eliminar. Revisa la consola.");
        } finally {
            setCargando(false);
        }
    };

    // BLOQUEO: Solo Admin Master
    if (!isAdminMaster) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-8 bg-white shadow-lg rounded-2xl text-center">
                <FaShieldAlt className="mx-auto text-red-400 mb-4" size={48} />
                <h2 className="text-xl font-black text-gray-800 uppercase mb-2">Acceso Restringido</h2>
                <p className="text-gray-500">Solo el Admin Master puede eliminar vehiculos entregados y sus registros.</p>
            </div>
        );
    }

    const { aptos, noAptos, datosAptosJson } = clasificacionResultados;

    return (
        <div className="max-w-4xl mx-auto mt-6 p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <FaTrash className="text-red-600" size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                        Eliminar Vehiculos Entregados
                    </h1>
                    <p className="text-xs text-gray-400 font-bold uppercase">
                        Vehiculo + Movimientos + Viaje Pagado + Lotes en Transito
                    </p>
                </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                    <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-red-700">
                        <p className="font-black uppercase mb-1">Accion irreversible</p>
                        <p>Se eliminara el vehiculo, todos sus movimientos, su referencia en viajes pagados y lotes en transito.
                        Se descargara un respaldo JSON antes de borrar.</p>
                    </div>
                </div>
            </div>

            {/* Input */}
            <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    Codigos BIN / NIP (separados por coma o espacio)
                </label>
                <textarea
                    rows="3"
                    placeholder="Ej: 51072555, 12345678, 98765432..."
                    className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 text-gray-800 font-mono"
                    value={binNipsList}
                    onChange={(e) => setBinNipsList(e.target.value)}
                    disabled={cargando}
                />
            </div>

            {/* Boton Verificar */}
            <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase py-3 px-4 rounded-xl transition-colors mb-4 flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleVerificarVehiculos}
                disabled={cargando || binNipsList.trim().length === 0}
            >
                <FaSearch />
                {cargando ? "Verificando..." : "1. Verificar Vehiculos"}
            </button>

            {/* Mensaje */}
            {mensajeError && (
                <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-bold whitespace-pre-line ${
                    mensajeError.includes("EXITOSA") || mensajeError.includes("completada")
                        ? "bg-green-50 border border-green-300 text-green-700"
                        : mensajeError.includes("cancelada") || mensajeError.includes("Ninguno")
                            ? "bg-yellow-50 border border-yellow-300 text-yellow-700"
                            : "bg-red-50 border border-red-300 text-red-700"
                }`}>
                    {mensajeError}
                </div>
            )}

            {/* Resultados Aptos */}
            {aptos.length > 0 && (
                <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl">
                    <h3 className="text-lg font-black text-green-800 mb-3">
                        Vehiculos Aptos ({aptos.length})
                    </h3>

                    {/* Resumen de lo que se va a eliminar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-white rounded-lg p-3 text-center border">
                            <p className="text-2xl font-black text-gray-800">{aptos.length}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Vehiculos</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border">
                            <p className="text-2xl font-black text-gray-800">
                                {datosAptosJson.reduce((s, v) => s + v.movimientos.length, 0)}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Movimientos</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border">
                            <p className="text-2xl font-black text-gray-800">
                                {datosAptosJson.reduce((s, v) => s + (v.viajesRelacionados?.length || 0), 0)}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Viajes Pagados</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border">
                            <p className="text-2xl font-black text-gray-800">
                                {datosAptosJson.filter(v => v.tieneLosteEnTransito).length}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Lotes Transito</p>
                        </div>
                    </div>

                    {/* Lista de confirmacion */}
                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">
                            IDs de documentos a eliminar:
                        </label>
                        <textarea
                            rows="4"
                            readOnly
                            value={listaConfirmacion}
                            className="w-full border border-gray-200 p-3 rounded-lg bg-white text-gray-900 font-mono text-xs resize-none"
                        />
                    </div>

                    {/* JSON respaldo */}
                    <details className="mb-4">
                        <summary className="cursor-pointer font-bold text-sm text-gray-600 hover:text-gray-800">
                            Ver JSON de Evidencia Completa
                        </summary>
                        <textarea
                            rows="10"
                            readOnly
                            value={JSON.stringify(datosAptosJson, null, 2)}
                            className="w-full border border-gray-300 p-3 rounded-lg bg-gray-800 text-green-400 font-mono text-xs resize-none mt-2"
                        />
                    </details>

                    {/* Boton Eliminar */}
                    <button
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={handleEliminarVehiculos}
                        disabled={cargando}
                    >
                        <FaTrash />
                        {cargando ? "Eliminando..." : `2. ELIMINAR TODO (${aptos.length} vehiculo(s))`}
                    </button>
                </div>
            )}

            {/* No aptos */}
            {noAptos.length > 0 && (
                <div className="mt-6 p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <h3 className="text-lg font-black text-yellow-800 mb-2">
                        No Aptos ({noAptos.length})
                    </h3>
                    <ul className="space-y-1">
                        {noAptos.map(item => (
                            <li key={item.id} className="text-sm text-gray-700 flex items-center gap-2">
                                <span className="font-mono font-bold text-yellow-700">{item.id}</span>
                                <span className="text-gray-400">-</span>
                                <span>{item.motivo}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default EliminaVehiculos;
