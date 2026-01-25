import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import { FaSearch, FaChevronLeft, FaChevronRight, FaGlobeAmericas, FaCopy, FaCheck } from "react-icons/fa";

const TablaEmpresas = () => {
    const [lista, setLista] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [loading, setLoading] = useState(true);
    const [copiadoId, setCopiadoId] = useState(null); // Para el éxito del copiado
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

    // Filtro que incluye ahora al representante
    const filtrados = lista.filter(e => {
        const b = busqueda.toLowerCase();
        return (
            e.nombreEmpresa?.toLowerCase().includes(b) ||
            e.taxId?.includes(b) ||
            e.representante?.toLowerCase().includes(b) ||
            e.ciudadEmpresa?.toLowerCase().includes(b)
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
            {/* CABECERA CON BUSCADOR Y PAGINACIÓN */}
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por Empresa, Tax ID o Representante..."
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
                        <th className="py-4">Empresa / Representante</th>
                        <th>Tax ID / MC#</th>
                        <th className="text-center">Contacto</th>
                        <th>Ubicación</th>
                    </tr>
                </thead>
                <tbody className="text-black text-[12px]">
                    {paginados.map((e) => (
                        <tr key={e.id} className="hover:bg-blue-50 border-b border-gray-100 transition-colors">
                            {/* NIVEL 1: NOMBRE Y REPRESENTANTE */}
                            <td className="py-3">
                                <div className="font-bold text-blue-900 uppercase text-[13px] leading-tight flex items-center">
                                    <span className="text-gray-400 text-[10px] mr-2 italic">#{e.folio}</span>
                                    {e.nombreEmpresa}
                                </div>
                                <div className="text-[11px] text-gray-500 italic mt-0.5 font-medium">
                                    {e.representante ? `Rep: ${e.representante}` : 'Sin representante'}
                                </div>
                            </td>

                            {/* NIVEL 2: DATOS FISCALES USA */}
                            <td>
                                <div className="font-mono text-blue-800 font-bold text-[12px]">{e.taxId}</div>
                                <div className="font-mono text-blue-800 font-bold text-[12px]">MC: {e.mcNumber || 'N/A'}</div>
                            </td>

                            {/* NIVEL 3: TELÉFONO CON FEEDBACK */}
                            <td className="text-center">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-gray-700">{e.telefonoEmpresa}</span>
                                        <button
                                            onClick={() => copiarTel(e.telefonoEmpresa, e.id)}
                                            className={`btn btn-ghost btn-xs p-0 h-auto min-h-0 ${copiadoId === e.id ? 'text-green-600' : 'text-blue-700'}`}
                                        >
                                            {copiadoId === e.id ? <FaCheck size={12} /> : <FaCopy size={12} />}
                                        </button>
                                    </div>
                                    {copiadoId === e.id && (
                                        <span className="text-[9px] text-green-600 font-black uppercase animate-pulse">¡Éxito!</span>
                                    )}
                                </div>
                            </td>

                            {/* UBICACIÓN */}
                            <td className="italic text-gray-500 text-[11px] font-medium">
                                {e.ciudadEmpresa}, {e.estadoEmpresa}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* FOOTER DE TABLA */}
            <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-200">
                <span className="text-[11px] text-gray-400 font-bold italic uppercase">Registros totales: {filtrados.length}</span>
                <span className="text-[10px] text-blue-900 font-black uppercase tracking-widest opacity-60">Sistema de Control de Carrier - USA</span>
            </div>
        </div>
    );
};

export default TablaEmpresas;