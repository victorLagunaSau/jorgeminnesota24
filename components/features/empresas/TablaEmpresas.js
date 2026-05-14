import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import {
    FaFilePdf, FaFileImage, FaMapMarkerAlt, FaEdit, FaUserCircle, FaTrashAlt,
    FaGlobeAmericas, FaTimes, FaCheck
} from "react-icons/fa";
import { COLLECTIONS } from "../../../constants";
import SearchBar from "../../ui/SearchBar";
import Pagination from "../../ui/Pagination";
import EmptyState from "../../ui/EmptyState";
import LoadingSpinner from "../../ui/LoadingSpinner";

const US_STATES_MAP = {
    'TX': 'Texas', 'CA': 'California', 'FL': 'Florida', 'AZ': 'Arizona',
    'NV': 'Nevada', 'GA': 'Georgia', 'NC': 'North Carolina', 'SC': 'South Carolina',
    'TN': 'Tennessee', 'AL': 'Alabama', 'LA': 'Louisiana', 'MS': 'Mississippi',
    'OK': 'Oklahoma', 'AR': 'Arkansas', 'NM': 'New Mexico', 'CO': 'Colorado',
    'IL': 'Illinois', 'OH': 'Ohio', 'PA': 'Pennsylvania', 'NY': 'New York',
    'NJ': 'New Jersey', 'MI': 'Michigan', 'IN': 'Indiana', 'WI': 'Wisconsin',
    'MN': 'Minnesota', 'IA': 'Iowa', 'MO': 'Missouri', 'KS': 'Kansas',
    'NE': 'Nebraska', 'SD': 'South Dakota', 'ND': 'North Dakota', 'MT': 'Montana',
    'WY': 'Wyoming', 'UT': 'Utah', 'ID': 'Idaho', 'WA': 'Washington',
    'OR': 'Oregon', 'VA': 'Virginia', 'WV': 'West Virginia', 'KY': 'Kentucky',
    'MD': 'Maryland', 'DE': 'Delaware', 'CT': 'Connecticut', 'RI': 'Rhode Island',
    'MA': 'Massachusetts', 'VT': 'Vermont', 'NH': 'New Hampshire', 'ME': 'Maine',
    'HI': 'Hawaii', 'AK': 'Alaska'
};

const TablaEmpresas = ({ onEditar, isAdminMaster }) => {
    const [lista, setLista] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [loading, setLoading] = useState(true);
    const [estadosAbierto, setEstadosAbierto] = useState(null);
    const [guardandoEstados, setGuardandoEstados] = useState(null);
    const [busquedaEstado, setBusquedaEstado] = useState("");
    const xPagina = 10;

    useEffect(() => {
        const unsubscribe = firestore()
            .collection(COLLECTIONS.EMPRESAS)
            .orderBy("folio", "desc")
            .onSnapshot((snap) => {
                const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLista(docs);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const eliminarEmpresa = async (empresa) => {
        if (!confirm(`¿Eliminar la empresa ${empresa.nombreEmpresa}? Esta acción no se puede deshacer.`)) return;
        try {
            await firestore().collection(COLLECTIONS.EMPRESAS).doc(empresa.id).delete();
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error al eliminar empresa.");
        }
    };

    const toggleEstado = async (empresaId, estadoCode) => {
        const empresa = lista.find(e => e.id === empresaId);
        if (!empresa) return;
        const actuales = empresa.estadosAutorizados || [];
        const nuevos = actuales.includes(estadoCode)
            ? actuales.filter(s => s !== estadoCode)
            : [...actuales, estadoCode].sort();

        setGuardandoEstados(empresaId);
        try {
            await firestore().collection(COLLECTIONS.EMPRESAS).doc(empresaId).update({ estadosAutorizados: nuevos });
        } catch (err) {
            console.error("Error guardando estados:", err);
        }
        setGuardandoEstados(null);
    };

    const filtrados = lista.filter(e => {
        const b = busqueda.toLowerCase();
        return (
            e.nombreEmpresa?.toLowerCase().includes(b) ||
            e.taxId?.includes(b) ||
            e.emailAcceso?.toLowerCase().includes(b) || // Ahora también busca por email
            e.zipCode?.includes(b)
        );
    });

    const totalPags = Math.ceil(filtrados.length / xPagina);
    const paginados = filtrados.slice((pagina - 1) * xPagina, pagina * xPagina);

    if (loading) return <LoadingSpinner texto="Cargando empresas..." />;

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 mt-6 overflow-hidden">
            {/* CABECERA DE BÚSQUEDA */}
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100">
                <SearchBar
                    value={busqueda}
                    onChange={(val) => { setBusqueda(val); setPagina(1); }}
                    placeholder="Buscar por Empresa, EIN, Email..."
                />
                <Pagination
                    pagina={pagina}
                    totalPags={totalPags}
                    onAnterior={() => setPagina(p => p - 1)}
                    onSiguiente={() => setPagina(p => p + 1)}
                    esPrimera={pagina === 1}
                    esUltima={pagina === totalPags || totalPags === 0}
                    totalItems={filtrados.length}
                />
            </div>

            <table className="table w-full">
                <thead>
                    <tr className="text-gray-600 text-[11px] uppercase italic bg-white border-b border-gray-200">
                        <th className="py-4">Empresa / Acceso</th>
                        <th>Tax ID / MC#</th>
                        <th>Ubicación</th>
                        <th>Estados Autorizados</th>
                        <th className="text-center">W-9</th>
                        {onEditar && <th className="text-center">Acciones</th>}
                    </tr>
                </thead>
                <tbody className="text-black text-[12px]">
                    {paginados.length === 0 && (
                        <tr>
                            <td colSpan={onEditar ? 6 : 5}>
                                <EmptyState mensaje="No se encontraron empresas" />
                            </td>
                        </tr>
                    )}
                    {paginados.map((e) => {
                        const estados = e.estadosAutorizados || [];
                        const isOpen = estadosAbierto === e.id;
                        return (
                        <tr key={e.id} className="hover:bg-blue-50 border-b border-gray-100 transition-colors">
                            <td className="py-3">
                                <div className="font-bold text-blue-900 uppercase text-[13px] leading-tight">
                                    <span className="text-gray-400 text-[10px] mr-2 italic">#{e.folio}</span>
                                    {e.nombreEmpresa}
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-gray-500 font-medium text-[10px]">
                                    <FaUserCircle className="text-blue-400" />
                                    {e.emailAcceso || 'Sin email configurado'}
                                </div>
                            </td>

                            <td>
                                <div className="font-mono text-blue-800 font-bold text-[12px]">{e.taxId}</div>
                                <div className="font-mono text-gray-500 text-[11px]">MC: {e.mcNumber || 'N/A'}</div>
                            </td>

                            <td>
                                <div className="flex items-start gap-1">
                                    <FaMapMarkerAlt className="text-red-500 mt-1" size={10} />
                                    <div className="text-[11px] italic">
                                        {e.ciudadEmpresa}, {e.estadoEmpresa} {e.zipCode}
                                    </div>
                                </div>
                            </td>

                            <td>
                                <div
                                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => { setBusquedaEstado(""); setEstadosAbierto(e.id); }}
                                >
                                    <FaGlobeAmericas className="text-blue-500 text-xs" />
                                    {estados.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {estados.slice(0, 5).map(s => (
                                                <span key={s} className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                    {s}
                                                </span>
                                            ))}
                                            {estados.length > 5 && (
                                                <span className="text-[9px] text-gray-400 font-bold">+{estados.length - 5}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-400 italic">Sin estados</span>
                                    )}
                                </div>
                            </td>

                            <td className="text-center">
                                {e.urlDocW9 ? (
                                    <a href={e.urlDocW9} target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-block hover:scale-110 transition-transform">
                                        {e.urlDocW9.includes('.pdf') ? <FaFilePdf size={18} className="text-red-600"/> : <FaFileImage size={18}/>}
                                    </a>
                                ) : <span className="text-[9px] text-gray-300 uppercase">N/A</span>}
                            </td>

                            {onEditar && (
                                <td className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => onEditar(e)}
                                            className="btn btn-xs btn-outline btn-info font-black uppercase text-[9px] gap-1"
                                        >
                                            <FaEdit /> Editar
                                        </button>
                                        {isAdminMaster && (
                                            <button
                                                onClick={() => eliminarEmpresa(e)}
                                                className="btn btn-xs btn-outline btn-error font-black uppercase text-[9px]"
                                                title="Eliminar empresa"
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-200">
                <span className="text-[11px] text-gray-400 font-bold italic uppercase">Registros: {filtrados.length}</span>
            </div>

            {/* Modal de Estados Autorizados */}
            {estadosAbierto && (() => {
                const empresa = lista.find(emp => emp.id === estadosAbierto);
                if (!empresa) return null;
                const estados = empresa.estadosAutorizados || [];
                return (
                    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setEstadosAbierto(null)}>
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                        <FaGlobeAmericas className="text-blue-500" />
                                        Estados Autorizados
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {empresa.nombreEmpresa}
                                        <span className="ml-2 text-blue-600 font-bold">{estados.length} seleccionados</span>
                                        {guardandoEstados === empresa.id && <span className="loading loading-spinner loading-xs text-blue-500 ml-2"></span>}
                                    </p>
                                </div>
                                <button onClick={() => setEstadosAbierto(null)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Search + Grid de estados */}
                            <div className="px-6 pt-4 pb-2">
                                <input
                                    type="text"
                                    placeholder="Buscar estado..."
                                    value={busquedaEstado}
                                    onChange={(e) => setBusquedaEstado(e.target.value)}
                                    className="input input-bordered input-sm w-full bg-gray-50 text-black"
                                    autoFocus
                                />
                            </div>
                            <div className="px-6 pb-6 overflow-y-auto max-h-[55vh]">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(US_STATES_MAP)
                                        .filter(([code, name]) => {
                                            if (!busquedaEstado) return true;
                                            const b = busquedaEstado.toLowerCase();
                                            return code.toLowerCase().includes(b) || name.toLowerCase().includes(b);
                                        })
                                        .sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => {
                                        const activo = estados.includes(code);
                                        return (
                                            <button
                                                key={code}
                                                onClick={() => toggleEstado(empresa.id, code)}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                                                    activo
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                                                }`}
                                            >
                                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    activo ? "bg-white/20" : "bg-white border border-gray-300"
                                                }`}>
                                                    {activo && <FaCheck className="text-xs" />}
                                                </span>
                                                <span className={`text-sm font-bold ${activo ? "text-white" : "text-gray-800"}`}>{name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TablaEmpresas;