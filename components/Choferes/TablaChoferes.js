import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import {
    FaSearch, FaChevronLeft, FaChevronRight, FaCopy,
    FaCheck, FaIdCard, FaEdit, FaTimes, FaSave, FaFilter, FaExclamationTriangle
} from "react-icons/fa";

const TablaChoferes = () => {
    const [lista, setLista] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtroEmpresa, setFiltroEmpresa] = useState(""); // Nuevo filtro por empresa
    const [pagina, setPagina] = useState(1);
    const [copiadoId, setCopiadoId] = useState(null);

    // Estados para la edición
    const [editandoId, setEditandoId] = useState(null);
    const [nuevaEmpresa, setNuevaEmpresa] = useState({ id: "", nombre: "" });
    const [nuevoLider, setNuevoLider] = useState({ id: "", nombre: "" });
    const [loadingEdit, setLoadingEdit] = useState(false);

    const xPagina = 10;

    useEffect(() => {
        const unsubChoferes = firestore().collection("choferes").orderBy("folio", "desc")
            .onSnapshot(snap => setLista(snap.docs.map(doc => ({id: doc.id, ...doc.data()}))));

        const unsubEmpresas = firestore().collection("empresas").orderBy("nombreEmpresa", "asc")
            .onSnapshot(snap => setEmpresas(snap.docs.map(doc => ({id: doc.id, nombre: doc.data().nombreEmpresa}))));

        return () => { unsubChoferes(); unsubEmpresas(); };
    }, []);

    const guardarCambioEmpresa = async (choferId) => {
        if (!nuevaEmpresa.id) return;
        setLoadingEdit(true);
        try {
            await firestore().collection("choferes").doc(choferId).update({
                empresaId: nuevaEmpresa.id,
                empresaNombre: nuevaEmpresa.nombre,
                // Al reparar, usualmente queremos que el líder sea el mismo dueño fiscal
                empresaLiderId: nuevoLider.id || nuevaEmpresa.id,
                empresaLiderNombre: nuevoLider.nombre || nuevaEmpresa.nombre
            });
            setEditandoId(null);
        } catch (error) {
            console.error("Error al actualizar empresa:", error);
        } finally {
            setLoadingEdit(false);
        }
    };

    // LÓGICA DE FILTRADO HÍBRIDO (Texto + Select de Empresa)
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

            {/* Cabecera con filtros */}
            <div className="p-4 bg-gray-50 border-b flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder="Buscar por nombre o apodo..."
                        className="input input-bordered input-sm w-full pl-10 bg-white text-black font-bold uppercase text-[11px]"
                        onChange={(e) => {setBusqueda(e.target.value); setPagina(1);}} />
                </div>

                <div className="flex items-center gap-2">
                    <FaFilter className="text-gray-400" />
                    <select
                        className="select select-bordered select-sm bg-white text-black font-black uppercase text-[10px] w-56"
                        value={filtroEmpresa}
                        onChange={(e) => {setFiltroEmpresa(e.target.value); setPagina(1);}}
                    >
                        <option value="">Todas las Empresas</option>
                        {empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                    <button className="btn btn-xs btn-outline" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><FaChevronLeft /></button>
                    <span className="text-[10px] font-black uppercase text-gray-500">Pág {pagina} / {totalPags || 1}</span>
                    <button className="btn btn-xs btn-outline" disabled={pagina === totalPags || totalPags === 0} onClick={() => setPagina(p => p + 1)}><FaChevronRight /></button>
                </div>
            </div>

            <table className="table w-full border-collapse">
                <thead>
                    <tr className="text-gray-400 text-[9px] uppercase font-black bg-white border-b">
                        <th className="py-4">Info Conductor</th>
                        <th>Empresa Fiscal / Vínculo</th>
                        <th className="text-center">Contacto</th>
                        <th>Estatus Datos</th>
                    </tr>
                </thead>
                <tbody className="text-black text-[11px]">
                    {paginados.map(c => {
                        // Verificamos si el ID de la empresa del chofer existe en nuestra lista actual
                        const empresaExiste = empresas.some(e => e.id === c.empresaId);

                        return (
                            <tr key={c.id} className={`hover:bg-blue-50 transition-colors border-b ${!empresaExiste ? 'bg-red-50' : ''}`}>
                                <td>
                                    <div className="font-black text-gray-800 uppercase text-[12px] leading-tight">
                                        <span className="text-red-600 mr-1 italic text-[9px]">#{c.folio}</span> {c.nombreChofer}
                                    </div>
                                    <div className="text-[10px] text-blue-600 font-black italic mt-0.5">
                                        @{c.apodoChofer || 'SIN_APODO'}
                                    </div>
                                </td>

                                <td>
                                    {editandoId === c.id ? (
                                        <div className="flex flex-col gap-1 p-1">
                                            <label className="text-[8px] font-bold uppercase text-gray-400">Dueño Fiscal (W-9):</label>
                                            <select
                                                className="select select-bordered select-xs bg-white text-black font-black uppercase"
                                                onChange={(e) => {
                                                    const idx = e.target.selectedIndex;
                                                    setNuevaEmpresa({ id: e.target.value, nombre: e.target.options[idx].text });
                                                }}
                                                defaultValue={c.empresaId}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                                            </select>

                                            <div className="flex items-center gap-1 mt-1">
                                                <button onClick={() => guardarCambioEmpresa(c.id)} className="btn btn-xs btn-success text-white flex-1"><FaSave /></button>
                                                <button onClick={() => setEditandoId(null)} className="btn btn-xs btn-error text-white flex-1"><FaTimes /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="group flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-black uppercase tracking-tight text-[11px] ${!empresaExiste ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                                                    {c.empresaNombre}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditandoId(c.id);
                                                        setNuevaEmpresa({ id: c.empresaId, nombre: c.empresaNombre });
                                                    }}
                                                    className="btn btn-ghost btn-xs text-blue-600 group-hover:opacity-100 opacity-0 transition-opacity"
                                                >
                                                    <FaEdit />
                                                </button>
                                            </div>
                                            {!empresaExiste && (
                                                <div className="flex items-center gap-1 text-[8px] text-red-500 font-black uppercase italic">
                                                    <FaExclamationTriangle /> ID Desvinculado / Empresa no existe
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>

                                <td className="text-center">
                                    <div className="flex items-center justify-center gap-2 font-mono font-bold">
                                        <span>+{c.telefonoChofer}</span>
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
                                        <span className="text-[9px] font-black text-gray-400 italic">
                                            {c.paisChofer || 'USA'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-black uppercase italic">Resultados: {filtrados.length} conductores</span>
                <span className="text-[9px] text-blue-600 font-black uppercase tracking-widest italic animate-pulse">
                    Mantenimiento de Red Carrier Activo
                </span>
            </div>
        </div>
    );
};

export default TablaChoferes;