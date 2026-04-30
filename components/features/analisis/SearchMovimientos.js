import React, { useState } from 'react';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaSearch, FaTrashAlt, FaGhost } from 'react-icons/fa';
import moment from 'moment';

const SearchMovimientos = ({ user }) => {
    const [busqueda, setBusqueda] = useState("");
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [buscado, setBuscado] = useState(false);
    const [eliminando, setEliminando] = useState(null);
    const [modo, setModo] = useState('buscar'); // 'buscar' o 'huerfanos'
    const [loadingHuerfanos, setLoadingHuerfanos] = useState(false);

    const isAdminMaster = user?.adminMaster === true;

    const buscar = async () => {
        const q = busqueda.trim();
        if (!q) return;
        setLoading(true);
        setBuscado(true);
        setModo('buscar');
        try {
            const snap = await firestore()
                .collection(COLLECTIONS.MOVIMIENTOS)
                .where("binNip", "==", q)
                .get();

            const datos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            datos.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setResultados(datos);
        } catch (error) {
            console.error("Error buscando:", error);
        } finally {
            setLoading(false);
        }
    };

    const buscarHuerfanos = async () => {
        setLoadingHuerfanos(true);
        setBuscado(true);
        setModo('huerfanos');
        setBusqueda("");
        try {
            // Traer todos los movimientos
            const movSnap = await firestore().collection(COLLECTIONS.MOVIMIENTOS).get();

            // Agrupar lotes únicos
            const lotesMov = {};
            movSnap.docs.forEach(doc => {
                const d = doc.data();
                if (d.binNip) {
                    if (!lotesMov[d.binNip]) lotesMov[d.binNip] = [];
                    lotesMov[d.binNip].push({ id: doc.id, ...d });
                }
            });

            // Verificar cuáles vehículos existen
            const lotesUnicos = Object.keys(lotesMov);
            const huerfanos = [];

            // Firestore "in" query soporta máximo 10 elementos, hacemos en lotes
            for (let i = 0; i < lotesUnicos.length; i += 10) {
                const batch = lotesUnicos.slice(i, i + 10);
                const vehSnap = await firestore()
                    .collection(COLLECTIONS.VEHICULOS)
                    .where("binNip", "in", batch)
                    .get();

                const existentes = new Set(vehSnap.docs.map(d => d.data().binNip || d.id));

                batch.forEach(lote => {
                    if (!existentes.has(lote)) {
                        // Verificar también por doc ID
                        huerfanos.push(...lotesMov[lote]);
                    }
                });
            }

            // Doble verificación: checar por doc ID los que no se encontraron por binNip
            const huerfanosVerificados = [];
            for (const mov of huerfanos) {
                const docSnap = await firestore().collection(COLLECTIONS.VEHICULOS).doc(mov.binNip).get();
                if (!docSnap.exists) {
                    huerfanosVerificados.push(mov);
                }
            }

            huerfanosVerificados.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setResultados(huerfanosVerificados);
        } catch (error) {
            console.error("Error buscando huérfanos:", error);
        } finally {
            setLoadingHuerfanos(false);
        }
    };

    const eliminarMovimiento = async (mov) => {
        if (!confirm(`¿Eliminar este movimiento?\n\nTipo: ${mov.tipo}\nLote: ${mov.binNip}\nCliente: ${mov.cliente}\n\nEsta acción no se puede deshacer.`)) return;
        setEliminando(mov.id);
        try {
            await firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(mov.id).delete();
            setResultados(prev => prev.filter(m => m.id !== mov.id));
        } catch (error) {
            console.error("Error eliminando:", error);
            alert("Error al eliminar: " + error.message);
        } finally {
            setEliminando(null);
        }
    };

    const eliminarTodosHuerfanos = async () => {
        if (!resultados.length) return;
        if (!confirm(`¿Eliminar TODOS los ${resultados.length} movimientos huérfanos?\n\nEsta acción no se puede deshacer.`)) return;
        setEliminando('all');
        try {
            const batch = firestore().batch();
            resultados.forEach(m => {
                batch.delete(firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(m.id));
            });
            await batch.commit();
            setResultados([]);
        } catch (error) {
            console.error("Error eliminando:", error);
            alert("Error: " + error.message);
        } finally {
            setEliminando(null);
        }
    };

    const formatFecha = (timestamp) => {
        if (timestamp?.seconds) return moment(timestamp.seconds * 1000).format('DD/MM/YYYY HH:mm');
        if (timestamp instanceof Date) return moment(timestamp).format('DD/MM/YYYY HH:mm');
        return '-';
    };

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                    Search
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Buscar movimientos por lote
                </p>
            </div>

            <div className="flex items-center gap-2 mb-6 flex-wrap">
                <div className="relative flex-1 max-w-md">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Ingresa el número de lote..."
                        className="input w-full pl-12 bg-white border-2 border-gray-200 focus:border-red-500 text-gray-800 font-semibold rounded-xl"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
                    />
                </div>
                <button
                    onClick={buscar}
                    disabled={loading}
                    className="btn btn-sm btn-error text-white gap-1 font-black uppercase"
                >
                    <FaSearch /> {loading ? "..." : "Buscar"}
                </button>
                {isAdminMaster && (
                    <button
                        onClick={buscarHuerfanos}
                        disabled={loadingHuerfanos}
                        className="btn btn-sm btn-warning text-white gap-1 font-black uppercase"
                    >
                        <FaGhost /> {loadingHuerfanos ? "Escaneando..." : "Huérfanos"}
                    </button>
                )}
            </div>

            {buscado && (
                <div className="overflow-x-auto">
                    {resultados.length === 0 ? (
                        <div className="text-center py-10 text-gray-300 font-bold">
                            {modo === 'huerfanos'
                                ? 'No se encontraron movimientos huérfanos'
                                : 'No se encontraron movimientos para ese lote'}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400 font-bold uppercase">
                                    {resultados.length} movimiento{resultados.length !== 1 ? 's' : ''}
                                    {modo === 'huerfanos' ? ' huérfanos (sin vehículo)' : ''}
                                </p>
                                {modo === 'huerfanos' && isAdminMaster && resultados.length > 0 && (
                                    <button
                                        onClick={eliminarTodosHuerfanos}
                                        disabled={eliminando === 'all'}
                                        className="btn btn-xs btn-error text-white gap-1 font-black uppercase"
                                    >
                                        <FaTrashAlt /> {eliminando === 'all' ? 'Eliminando...' : 'Eliminar Todos'}
                                    </button>
                                )}
                            </div>
                            <table className="table table-sm w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase">
                                        <th className="py-3">Fecha</th>
                                        <th>Tipo</th>
                                        <th>Lote</th>
                                        <th>Cliente</th>
                                        <th>Vehículo</th>
                                        <th>Usuario</th>
                                        <th className="text-right">Efectivo</th>
                                        <th className="text-right">CC</th>
                                        <th className="text-right">Total</th>
                                        {isAdminMaster && <th className="text-center">Acción</th>}
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {resultados.map((m) => (
                                        <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="text-gray-400 text-[11px]">{formatFecha(m.timestamp)}</td>
                                            <td>
                                                <span className={`badge badge-sm font-black uppercase text-[8px] text-white ${
                                                    m.tipo === 'Anticipo' ? 'badge-success' :
                                                    m.tipo === 'Salida' ? 'badge-info' :
                                                    m.tipo === 'Entrada' ? 'badge-warning' :
                                                    m.tipo === 'Abono' ? 'badge-primary' :
                                                    'badge-ghost text-gray-600'
                                                }`}>
                                                    {m.tipo}
                                                </span>
                                            </td>
                                            <td className="font-mono font-bold text-blue-600">{m.binNip}</td>
                                            <td className="font-bold text-gray-800">{m.cliente || '-'}</td>
                                            <td className="text-gray-600">{m.marca} {m.modelo}</td>
                                            <td className="text-gray-500 font-semibold">{m.usuario || '-'}</td>
                                            <td className="text-right font-bold text-green-700">
                                                ${(parseFloat(m.cajaRecibo || m.anticipoPago || 0) - parseFloat(m.cajaCambio || 0)).toFixed(2)}
                                            </td>
                                            <td className="text-right font-bold text-blue-600">
                                                ${(parseFloat(m.cajaCC) || 0).toFixed(2)}
                                            </td>
                                            <td className="text-right font-black text-gray-800">
                                                ${(parseFloat(m.totalPago || m.anticipoPago || 0)).toFixed(2)}
                                            </td>
                                            {isAdminMaster && (
                                                <td className="text-center">
                                                    <button
                                                        onClick={() => eliminarMovimiento(m)}
                                                        disabled={eliminando === m.id}
                                                        className="btn btn-xs btn-outline btn-error font-black"
                                                        title="Eliminar movimiento"
                                                    >
                                                        {eliminando === m.id ? '...' : <FaTrashAlt />}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchMovimientos;
