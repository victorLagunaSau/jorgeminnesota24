import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import {
    FaFilePdf, FaFileImage, FaMapMarkerAlt, FaPencilAlt, FaUserCircle
} from "react-icons/fa";
import { COLLECTIONS } from "../../../constants";
import SearchBar from "../../ui/SearchBar";
import Pagination from "../../ui/Pagination";
import EmptyState from "../../ui/EmptyState";
import LoadingSpinner from "../../ui/LoadingSpinner";

const TablaEmpresas = ({ onEditar }) => { // Recibimos la función onEditar por props
    const [lista, setLista] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [loading, setLoading] = useState(true);
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
                        <th className="text-center">W-9</th>
                        {onEditar && <th className="text-center">Acciones</th>}
                    </tr>
                </thead>
                <tbody className="text-black text-[12px]">
                    {paginados.length === 0 && (
                        <tr>
                            <td colSpan={onEditar ? 5 : 4}>
                                <EmptyState mensaje="No se encontraron empresas" />
                            </td>
                        </tr>
                    )}
                    {paginados.map((e) => (
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

                            <td className="text-center">
                                {e.urlDocW9 ? (
                                    <a href={e.urlDocW9} target="_blank" rel="noopener noreferrer" className="text-blue-600 inline-block hover:scale-110 transition-transform">
                                        {e.urlDocW9.includes('.pdf') ? <FaFilePdf size={18} className="text-red-600"/> : <FaFileImage size={18}/>}
                                    </a>
                                ) : <span className="text-[9px] text-gray-300 uppercase">N/A</span>}
                            </td>

                            {onEditar && (
                                <td className="text-center">
                                    <button
                                        onClick={() => onEditar(e)}
                                        className="btn btn-circle btn-ghost btn-xs text-orange-600 hover:bg-orange-100"
                                        title="Editar datos y acceso"
                                    >
                                        <FaPencilAlt size={14} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-200">
                <span className="text-[11px] text-gray-400 font-bold italic uppercase">Registros: {filtrados.length}</span>
            </div>
        </div>
    );
};

export default TablaEmpresas;