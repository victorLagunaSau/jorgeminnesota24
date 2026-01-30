import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import {
    FaSearch, FaChevronLeft, FaChevronRight, FaGlobeAmericas,
    FaCopy, FaCheck, FaFilePdf, FaFileImage, FaMapMarkerAlt
} from "react-icons/fa";

const TablaEmpresas = () => {
    const [lista, setLista] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [loading, setLoading] = useState(true);
    const [copiadoId, setCopiadoId] = useState(null);
    const xPagina = 10;

    useEffect(() => {
        const unsubscribe = firestore()
            .collection("empresas")
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
            e.representante?.toLowerCase().includes(b) ||
            e.ciudadEmpresa?.toLowerCase().includes(b) ||
            e.zipCode?.includes(b)
        );
    });

    const totalPags = Math.ceil(filtrados.length / xPagina);
    const paginados = filtrados.slice((pagina - 1) * xPagina, pagina * xPagina);

    const copiarTel = (tel, id) => {
        navigator.clipboard.writeText(tel);
        setCopiadoId(id);
        setTimeout(() => setCopiadoId(null), 2000);
    };

    if (loading) return <div className="text-center p-10"><span className="loading loading-spinner text-info"></span></div>;

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 mt-6 overflow-hidden">
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por Empresa, Tax ID, Rep o Zip Code..."
                        className="input input-bordered input-sm w-full pl-10 bg-white text-black text-[11px] border-gray-300 focus:border-blue-700"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase italic">
                        <FaGlobeAmericas className="text-blue-700" /> USA Carriers Database
                    </div>
                    <div className="flex items-center gap-1 border-l pl-3 border-gray-300">
                        <button className="btn btn-xs btn-outline border-gray-300" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><FaChevronLeft /></button>
                        <span className="text-[11px] font-bold text-black px-2">Pág {pagina} / {totalPags || 1}</span>
                        <button className="btn btn-xs btn-outline border-gray-300" disabled={pagina === totalPags || totalPags === 0} onClick={() => setPagina(p => p + 1)}><FaChevronRight /></button>
                    </div>
                </div>
            </div>

            <table className="table w-full">
                <thead>
                    <tr className="text-gray-600 text-[11px] uppercase italic bg-white border-b border-gray-200">
                        <th className="py-4">Empresa / Clasificación</th>
                        <th>Tax ID / MC#</th>
                        <th>Dirección Completa</th>
                        <th className="text-center">W-9 DOC</th>
                    </tr>
                </thead>
                <tbody className="text-black text-[12px]">
                    {paginados.map((e) => (
                        <tr key={e.id} className="hover:bg-blue-50 border-b border-gray-100 transition-colors">
                            <td className="py-3">
                                <div className="font-bold text-blue-900 uppercase text-[13px] leading-tight flex items-center">
                                    <span className="text-gray-400 text-[10px] mr-2 italic">#{e.folio}</span>
                                    {e.nombreEmpresa}
                                </div>
                                <div className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded mt-1 inline-block font-black uppercase">
                                    {e.taxClassification || 'Individual'}
                                </div>
                            </td>

                            <td>
                                <div className="font-mono text-blue-800 font-bold text-[12px]">{e.taxId}</div>
                                <div className="font-mono text-gray-500 text-[11px]">MC: {e.mcNumber || 'N/A'}</div>
                            </td>

                            <td>
                                <div className="flex items-start gap-1">
                                    <FaMapMarkerAlt className="text-red-500 mt-1" size={10} />
                                    <div>
                                        <div className="font-bold uppercase text-[11px]">{e.direccion || 'S/N'}</div>
                                        <div className="text-gray-500 text-[11px] italic">
                                            {e.ciudadEmpresa}, {e.estadoEmpresa} {e.zipCode}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <td className="text-center">
                                {e.urlDocW9 ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <a
                                            href={e.urlDocW9}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-circle btn-ghost btn-xs text-blue-600 hover:bg-blue-100"
                                        >
                                            {e.urlDocW9.includes('.pdf') ? <FaFilePdf size={18} className="text-red-600"/> : <FaFileImage size={18}/>}
                                        </a>
                                        <span className="text-[8px] font-black uppercase text-gray-400">Ver Archivo</span>
                                    </div>
                                ) : (
                                    <span className="text-[9px] text-gray-300 italic font-bold uppercase">No adjunto</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-200">
                <span className="text-[11px] text-gray-400 font-bold italic uppercase">Registros totales: {filtrados.length}</span>
                <span className="text-[10px] text-blue-900 font-black uppercase tracking-widest opacity-60">Carrier Compliance - W-9 Database</span>
            </div>
        </div>
    );
};

export default TablaEmpresas;