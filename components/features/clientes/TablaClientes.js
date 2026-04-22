import React, { useState, useMemo } from "react";
import { useAdminData } from "../../../context/adminData";
import { FaCopy, FaCheck, FaPencilAlt } from "react-icons/fa";
import SearchBar from "../../ui/SearchBar";
import Pagination from "../../ui/Pagination";
import EmptyState from "../../ui/EmptyState";
import LoadingSpinner from "../../ui/LoadingSpinner";

const TablaClientes = ({ onEditar }) => {
    // Usar datos del contexto compartido
    const { clientes: clientesRaw, loading } = useAdminData();
    // Ordenar por folio desc localmente
    const clientes = useMemo(() =>
        [...clientesRaw].sort((a, b) => (b.folio || 0) - (a.folio || 0)),
        [clientesRaw]
    );

    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [copiadoId, setCopiadoId] = useState(null);
    const xPagina = 10;

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

    if (loading) return <LoadingSpinner texto="Cargando clientes..." />;

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 mt-6 overflow-hidden">
            {/* Buscador igual al anterior */}
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100 font-sans">
                <SearchBar
                    value={busqueda}
                    onChange={(val) => {setBusqueda(val); setPagina(1);}}
                    placeholder="Buscar cliente..."
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
            {paginados.length === 0 && <EmptyState mensaje="No se encontraron clientes" />}
        </div>
    );
};

export default TablaClientes;