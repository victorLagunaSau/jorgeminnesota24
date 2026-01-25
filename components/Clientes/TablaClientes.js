import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import { FaCopy, FaCheck, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa"; // FaCheck para el éxito

const TablaClientes = () => {
    const [clientes, setClientes] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [loading, setLoading] = useState(true);
    const [copiadoId, setCopiadoId] = useState(null); // Estado para rastrear qué número se copió
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

    // Función de copiado con feedback visual
    const copiarTelefono = (tel, id) => {
        navigator.clipboard.writeText(tel);
        setCopiadoId(id);
        setTimeout(() => setCopiadoId(null), 2000); // El mensaje desaparece en 2 segundos
    };

    const formatUbicacion = (c) => {
        const partes = [];
        if (c.ciudadCliente) partes.push(`Ciudad: ${c.ciudadCliente}`);
        if (c.estadoCliente) partes.push(`Estado: ${c.estadoCliente}`);
        if (c.paisCliente) partes.push(`País: ${c.paisCliente}`);
        return partes.join(", ");
    };

    if (loading) return <div className="text-center p-10"><span className="loading loading-spinner text-info"></span></div>;

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 mt-6 overflow-hidden">
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100 font-sans">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text" placeholder="Buscar por nombre, apodo, tel o ubicación..."
                        className="input input-bordered input-md w-full pl-10 bg-white text-black-500 text-[13px] border-gray-300 focus:border-blue-700"
                        value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-xs btn-outline border-gray-300 text-black-500" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><FaChevronLeft /></button>
                    <span className="text-[11px] font-bold text-black-500 uppercase">Página {pagina} de {totalPags || 1}</span>
                    <button className="btn btn-xs btn-outline border-gray-300 text-black-500" disabled={pagina === totalPags || totalPags === 0} onClick={() => setPagina(p => p + 1)}><FaChevronRight /></button>
                </div>
            </div>

            <table className="table w-full border-collapse">
                <thead>
                    <tr className="text-gray-600 text-[11px] uppercase italic bg-white border-b border-gray-200">
                        <th className="py-4">Cliente / Referencia</th>
                        <th className="text-center">Teléfono</th>
                        <th>Ubicación</th>
                    </tr>
                </thead>
                <tbody className="text-black-500">
                    {paginados.map((c) => (
                        <tr key={c.id} className="hover:bg-blue-100/50 border-b border-gray-100 transition-colors">
                            <td className="py-3">
                                <div className="font-bold text-[13px] uppercase text-blue-900 leading-none mb-1">{c.cliente}</div>
                                <div className="text-[11px] text-gray-500 font-medium italic">
                                    {c.apodoCliente || ''}
                                </div>
                            </td>
                            <td className="text-center">
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-mono font-semibold tracking-tight">{c.telefonoCliente}</span>
                                        <button
                                            onClick={() => copiarTelefono(c.telefonoCliente, c.id)}
                                            className={`btn btn-ghost btn-xs ${copiadoId === c.id ? 'text-green-600' : 'text-blue-700'} hover:bg-blue-700 hover:text-white`}
                                        >
                                            {copiadoId === c.id ? <FaCheck size={12} /> : <FaCopy size={12} />}
                                        </button>
                                    </div>
                                    {/* Texto sutil de confirmación */}
                                    {copiadoId === c.id && (
                                        <span className="text-[9px] text-green-600 font-bold uppercase animate-pulse">¡Copiado!</span>
                                    )}
                                </div>
                            </td>
                            <td className="text-[11px] font-medium text-gray-600">
                                {formatUbicacion(c)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="p-3 bg-gray-100 flex justify-between items-center">
                <span className="text-[11px] text-gray-500 font-bold italic">Registros: {filtrados.length}</span>
                <div className="join shadow-sm">
                    <button className="join-item btn btn-xs bg-white text-black-500 border-gray-300" onClick={() => setPagina(1)}>Inicio</button>
                    <button className="join-item btn btn-xs bg-white text-black-500 border-gray-300" onClick={() => setPagina(totalPags)}>Final</button>
                </div>
            </div>
        </div>
    );
};

export default TablaClientes;