import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { useAdminData } from "../../../context/adminData";
import {
    FaCopy,
    FaCheck, FaIdCard, FaEdit, FaTimes, FaSave, FaFilter, FaExclamationTriangle, FaTruck, FaUserTie, FaTrashAlt
} from "react-icons/fa";
import { COLLECTIONS } from "../../../constants";
import SearchBar from "../../ui/SearchBar";
import Pagination from "../../ui/Pagination";
import EmptyState from "../../ui/EmptyState";

const TablaChoferes = ({ onEditarChofer, isAdminMaster }) => {
    // Usar datos del contexto compartido (ya no hace queries propias)
    const { choferes: lista, empresas: empresasRaw } = useAdminData();
    const empresas = empresasRaw.map(e => ({ id: e.id, nombre: e.nombreEmpresa }));

    const [busqueda, setBusqueda] = useState("");
    const [filtroEmpresa, setFiltroEmpresa] = useState("");
    const [pagina, setPagina] = useState(1);
    const [copiadoId, setCopiadoId] = useState(null);

    // Estados para la edición dual
    const [editandoId, setEditandoId] = useState(null);
    const [nuevaEmpresaFiscal, setNuevaEmpresaFiscal] = useState({ id: "", nombre: "" });
    const [nuevaEmpresaLider, setNuevaEmpresaLider] = useState({ id: "", nombre: "" });
    const [loadingEdit, setLoadingEdit] = useState(false);

    // Viajes por chofer
    const [viajesPorChofer, setViajesPorChofer] = useState({});
    const [viajesExpandido, setViajesExpandido] = useState(null);
    const [viajesDetalle, setViajesDetalle] = useState([]);
    const [loadingViajes, setLoadingViajes] = useState(false);

    useEffect(() => {
        firestore().collection("viajesPagados").get().then(snap => {
            const agrupado = {};
            snap.docs.forEach(doc => {
                const d = doc.data();
                const choferId = d.chofer?.id;
                if (choferId) {
                    if (!agrupado[choferId]) agrupado[choferId] = [];
                    agrupado[choferId].push({
                        numViaje: d.numViaje,
                        fechaPago: d.fechaPago,
                        vehiculos: (d.vehiculos || []).length,
                        total: d.resumenFinanciero?.granTotal || 0,
                    });
                }
            });
            setViajesPorChofer(agrupado);
        });
    }, []);

    const toggleViajes = (choferId) => {
        if (viajesExpandido === choferId) {
            setViajesExpandido(null);
        } else {
            setViajesExpandido(choferId);
        }
    };

    const xPagina = 10;

    const guardarCambiosDiferenciados = async (choferId) => {
        if (!nuevaEmpresaFiscal.id) {
            alert("La Empresa Fiscal es obligatoria.");
            return;
        }
        setLoadingEdit(true);
        try {
            await firestore().collection(COLLECTIONS.CHOFERES).doc(choferId).update({
                // Empresa 1: Fiscal (Dueño)
                empresaId: nuevaEmpresaFiscal.id,
                empresaNombre: nuevaEmpresaFiscal.nombre,
                // Empresa 2: Líder (Despacho) - Puede ser distinta a la Fiscal
                empresaLiderId: nuevaEmpresaLider.id || "",
                empresaLiderNombre: nuevaEmpresaLider.nombre || "SIN LIDER"
            });
            setEditandoId(null);
        } catch (error) {
            console.error("Error al actualizar vínculos:", error);
        } finally {
            setLoadingEdit(false);
        }
    };

    const eliminarChofer = async (chofer) => {
        if (!confirm(`¿Eliminar al chofer ${chofer.nombreChofer}? Esta acción no se puede deshacer.`)) return;
        try {
            await firestore().collection(COLLECTIONS.CHOFERES).doc(chofer.id).delete();
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error al eliminar chofer.");
        }
    };

    const filtrados = lista.filter(c => {
        const coincideTexto = (
            c.nombreChofer?.toLowerCase().includes(busqueda.toLowerCase()) ||
            c.apodoChofer?.toLowerCase().includes(busqueda.toLowerCase())
        );
        const coincideEmpresa = filtroEmpresa === "" || c.empresaId === filtroEmpresa;
        return coincideTexto && coincideEmpresa;
    });

    const paginados = filtrados.slice((pagina - 1) * xPagina, pagina * xPagina);
    const totalPags = Math.ceil(filtrados.length / xPagina);

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden font-sans">

            {/* Filtros */}
            <div className="p-4 bg-gray-50 border-b flex flex-wrap items-center gap-4">
                <SearchBar
                    value={busqueda}
                    onChange={(val) => {setBusqueda(val); setPagina(1);}}
                    placeholder="Buscar por nombre o apodo..."
                />

                <div className="flex items-center gap-2">
                    <FaFilter className="text-gray-400" />
                    <select
                        className="select select-bordered select-sm bg-white text-black font-black uppercase text-[10px] w-56"
                        value={filtroEmpresa}
                        onChange={(e) => {setFiltroEmpresa(e.target.value); setPagina(1);}}
                    >
                        <option value="">Todas las Empresas (Fiscal)</option>
                        {empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                        ))}
                    </select>
                </div>

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

            <table className="table w-full border-collapse">
                <thead>
                    <tr className="text-gray-400 text-[9px] uppercase font-black bg-white border-b">
                        <th className="py-4 pl-6">Conductor</th>
                        <th>Empresa Fiscal / Líder de Despacho</th>
                        <th className="text-center">Contacto</th>
                        <th>Documentación</th>
                        {onEditarChofer && <th className="text-center">Acción</th>}
                    </tr>
                </thead>
                <tbody className="text-black text-[11px]">
                    {paginados.map(c => {
                        const fiscalExiste = empresas.some(e => e.id === c.empresaId);

                        return (
                            <tr key={c.id} className={`hover:bg-blue-50/50 transition-colors border-b ${!fiscalExiste ? 'bg-red-50' : ''}`}>
                                <td className="pl-6">
                                    <div className="font-black text-gray-800 uppercase text-[12px] leading-tight">
                                        <span className="text-red-600 mr-1 italic text-[9px]">#{c.folio}</span> {c.nombreChofer}
                                    </div>
                                    <div className="text-[10px] text-blue-600 font-black italic mt-0.5 uppercase">
                                        @{c.apodoChofer || 'sin apodo'}
                                    </div>
                                    <div className="mt-0.5">
                                        {viajesPorChofer[c.id]?.length > 0 ? (
                                            <>
                                                <button onClick={() => toggleViajes(c.id)} className="text-[9px] text-gray-400 font-bold hover:text-blue-600 cursor-pointer">
                                                    {viajesPorChofer[c.id].length} viaje{viajesPorChofer[c.id].length > 1 ? 's' : ''}
                                                    {viajesExpandido === c.id ? ' ▲' : ' ▼'}
                                                </button>
                                                {viajesExpandido === c.id && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {viajesPorChofer[c.id].map((v, i) => (
                                                            <span key={i} className="text-[9px] bg-gray-100 text-gray-600 font-mono font-bold px-1.5 py-0.5 rounded">
                                                                #{v.numViaje}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-[9px] text-gray-300 font-bold">Sin viajes</span>
                                        )}
                                    </div>
                                </td>

                                <td>
                                    {editandoId === c.id ? (
                                        <div className="flex flex-col gap-2 p-2 bg-white border border-blue-300 rounded-md shadow-inner">
                                            {/* Selector Fiscal */}
                                            <div>
                                                <label className="text-[8px] font-black uppercase text-red-600 italic">1. Empresa Fiscal (W-9):</label>
                                                <select
                                                    className="select select-bordered select-xs w-full bg-white text-black font-bold uppercase"
                                                    value={nuevaEmpresaFiscal.id}
                                                    onChange={(e) => {
                                                        const idx = e.target.selectedIndex;
                                                        setNuevaEmpresaFiscal({ id: e.target.value, nombre: e.target.options[idx].text });
                                                    }}
                                                >
                                                    <option value="">Seleccionar Dueño...</option>
                                                    {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                                                </select>
                                            </div>

                                            {/* Selector Líder */}
                                            <div>
                                                <label className="text-[8px] font-black uppercase text-blue-700 italic">2. Empresa Líder (Despacho):</label>
                                                <select
                                                    className="select select-bordered select-xs w-full bg-white text-black font-bold uppercase"
                                                    value={nuevaEmpresaLider.id}
                                                    onChange={(e) => {
                                                        const idx = e.target.selectedIndex;
                                                        setNuevaEmpresaLider({ id: e.target.value, nombre: e.target.options[idx].text });
                                                    }}
                                                >
                                                    <option value="">Independiente / Ninguna</option>
                                                    {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                                                </select>
                                            </div>

                                            <div className="flex gap-1 mt-1">
                                                <button onClick={() => guardarCambiosDiferenciados(c.id)} className="btn btn-xs btn-success text-white flex-1 font-black">
                                                    {loadingEdit ? "..." : <FaSave />}
                                                </button>
                                                <button onClick={() => setEditandoId(null)} className="btn btn-xs btn-error text-white flex-1 font-black">
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="group flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col leading-none">
                                                    <div className="flex items-center gap-1">
                                                        <FaUserTie className="text-red-600 text-[10px]" />
                                                        <span className={`font-black uppercase text-[11px] ${!fiscalExiste ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                                                            {c.empresaNombre}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <FaTruck className="text-blue-600 text-[10px]" />
                                                        <span className="text-[9px] font-bold text-blue-600 uppercase italic">
                                                            {c.empresaLiderNombre || 'SIN LIDER ASIGNADO'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {onEditarChofer && (
                                                    <button
                                                        onClick={() => {
                                                            setEditandoId(c.id);
                                                            setNuevaEmpresaFiscal({ id: c.empresaId, nombre: c.empresaNombre });
                                                            setNuevaEmpresaLider({ id: c.empresaLiderId || "", nombre: c.empresaLiderNombre || "" });
                                                        }}
                                                        className="btn btn-ghost btn-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                            </div>
                                            {!fiscalExiste && (
                                                <div className="flex items-center gap-1 text-[8px] text-red-500 font-black uppercase italic">
                                                    <FaExclamationTriangle /> Error: Empresa Fiscal no encontrada
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>

                                <td className="text-center">
                                    <div className="flex items-center justify-center gap-2 font-mono font-bold">
                                        <span className="text-gray-600">+{c.telefonoChofer}</span>
                                        <button onClick={() => {navigator.clipboard.writeText(c.telefonoChofer); setCopiadoId(c.id); setTimeout(()=>setCopiadoId(null), 2000)}}
                                            className={`transition-colors ${copiadoId === c.id ? 'text-green-600' : 'text-blue-700'}`}>
                                            {copiadoId === c.id ? <FaCheck size={14} /> : <FaCopy size={14} />}
                                        </button>
                                    </div>
                                </td>

                                <td>
                                    <div className="flex flex-col gap-0.5 uppercase">
                                        <div className="flex items-center gap-1 text-gray-400 font-bold">
                                            <FaIdCard /> {c.licencia}
                                        </div>
                                        <span className="text-[9px] font-black text-gray-500 italic">
                                            {c.paisChofer || 'UNITED STATES'}
                                        </span>
                                    </div>
                                </td>

                                {onEditarChofer && (
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onEditarChofer(c)}
                                                className="btn btn-xs btn-outline btn-info font-black uppercase text-[9px] gap-1"
                                            >
                                                <FaEdit /> Editar
                                            </button>
                                            {isAdminMaster && (
                                                <button
                                                    onClick={() => eliminarChofer(c)}
                                                    className="btn btn-xs btn-outline btn-error font-black uppercase text-[9px]"
                                                    title="Eliminar chofer"
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
            {paginados.length === 0 && <EmptyState mensaje="No se encontraron choferes" />}

            <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-black uppercase italic">Base de Datos: {filtrados.length} Registros</span>
            </div>
        </div>
    );
};

export default TablaChoferes;