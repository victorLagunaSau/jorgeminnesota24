import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import { FaCopy, FaCheck, FaSearch, FaChevronLeft, FaChevronRight, FaPencilAlt } from "react-icons/fa";

const TablaClientes = ({ onEditar }) => {
    const [clientes, setClientes] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [loading, setLoading] = useState(true);
    const [copiadoId, setCopiadoId] = useState(null);
    const xPagina = 10;

    useEffect(() => {
        const unsubscribe = firestore()
            .collection("clientes")
            .orderBy("folio", "desc")
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setClientes(lista);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const filtrados = clientes.filter(c => {
        const b = busqueda.toLowerCase();
        const ubi = `${c.ciudadCliente} ${c.estadoCliente} ${c.paisCliente}`.toLowerCase();
        return c.cliente?.toLowerCase().includes(b) || c.telefonoCliente?.includes(b) ||
               c.apodoCliente?.toLowerCase().includes(b) || ubi.includes(b);
    });

    const paginados = filtrados.slice((pagina - 1) * xPagina, pagina * xPagina);
    const totalPags = Math.ceil(filtrados.length / xPagina);

    const copiarTelefono = (tel, id) => {
        navigator.clipboard.writeText(tel);
        setCopiadoId(id);
        setTimeout(() => setCopiadoId(null), 2000);
    };

    if (loading) return <div className="text-center p-10"><span className="loading loading-spinner text-info"></span></div>;

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 mt-6 overflow-hidden">
            {/* Buscador igual al anterior */}
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100 font-sans">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar cliente..."
                        className="input input-bordered input-md w-full pl-10 bg-white text-black text-[13px]"
                        value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-xs btn-outline" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><FaChevronLeft /></button>
                    <span className="text-[11px] font-bold text-black uppercase">Pág {pagina} / {totalPags || 1}</span>
                    <button className="btn btn-xs btn-outline" disabled={pagina === totalPags} onClick={() => setPagina(p => p + 1)}><FaChevronRight /></button>
                </div>
            </div>

            <table className="table w-full">
                <thead>
                    <tr className="text-gray-600 text-[11px] uppercase italic bg-white border-b border-gray-200">
                        <th className="py-4">Cliente / Apodo</th>
                        <th className="text-center">Teléfono</th>
                        <th>Ubicación</th>
                        <th className="text-center">Acción</th>
                    </tr>
                </thead>
                <tbody className="text-black">
                    {paginados.map((c) => (
                        <tr key={c.id} className="hover:bg-blue-50 border-b border-gray-100 transition-colors">
                            <td className="py-3">
                                <div className="font-bold text-[13px] uppercase text-blue-900">{c.cliente}</div>
                                <div className="text-[10px] text-gray-400 italic">#{c.folio} {c.apodoCliente}</div>
                            </td>
                            <td className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-[12px] font-mono font-bold">{c.telefonoCliente}</span>
                                    <button onClick={() => copiarTelefono(c.telefonoCliente, c.id)} className={`btn btn-ghost btn-xs ${copiadoId === c.id ? 'text-green-600' : 'text-blue-700'}`}>
                                        {copiadoId === c.id ? <FaCheck /> : <FaCopy />}
                                    </button>
                                </div>
                            </td>
                            <td className="text-[11px] uppercase font-medium text-gray-500">
                                {c.ciudadCliente}, {c.estadoCliente} ({c.paisCliente})
                            </td>
                            <td className="text-center">
                                <button
                                    onClick={() => onEditar(c)}
                                    className="btn btn-ghost btn-xs text-orange-500 hover:bg-orange-100"
                                >
                                    <FaPencilAlt size={14} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TablaClientes;