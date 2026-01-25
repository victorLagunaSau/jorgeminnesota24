import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import { FaSearch, FaChevronLeft, FaChevronRight, FaCopy, FaCheck, FaIdCard, FaEdit, FaTimes, FaSave } from "react-icons/fa";

const TablaChoferes = () => {
    const [lista, setLista] = useState([]);
    const [empresas, setEmpresas] = useState([]); // Necesitamos la lista de empresas para el cambio
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [copiadoId, setCopiadoId] = useState(null);

    // Estados para la edición
    const [editandoId, setEditandoId] = useState(null);
    const [nuevaEmpresa, setNuevaEmpresa] = useState({ id: "", nombre: "" });
    const [loadingEdit, setLoadingEdit] = useState(false);

    const xPagina = 10;

    useEffect(() => {
        // Escuchar Choferes
        const unsubChoferes = firestore().collection("choferes").orderBy("folio", "desc")
            .onSnapshot(snap => setLista(snap.docs.map(doc => ({id: doc.id, ...doc.data()}))));

        // Escuchar Empresas para el selector de edición
        const unsubEmpresas = firestore().collection("empresas").orderBy("nombreEmpresa", "asc")
            .onSnapshot(snap => setEmpresas(snap.docs.map(doc => ({id: doc.id, nombre: doc.data().nombreEmpresa}))));

        return () => { unsubChoferes(); unsubEmpresas(); };
    }, []);

    // Función para guardar el cambio de empresa
    const guardarCambioEmpresa = async (choferId) => {
        if (!nuevaEmpresa.id) return;
        setLoadingEdit(true);
        try {
            await firestore().collection("choferes").doc(choferId).update({
                empresaId: nuevaEmpresa.id,
                empresaNombre: nuevaEmpresa.nombre
            });
            setEditandoId(null);
        } catch (error) {
            console.error("Error al actualizar empresa:", error);
        } finally {
            setLoadingEdit(false);
        }
    };

    const filtrados = lista.filter(c =>
        c.nombreChofer?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.apodoChofer?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.empresaNombre?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const paginados = filtrados.slice((pagina - 1) * xPagina, pagina * xPagina);
    const totalPags = Math.ceil(filtrados.length / xPagina);

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden font-sans">
            {/* Cabecera con buscador */}
            <div className="p-4 flex justify-between items-center bg-gray-100">
                <div className="relative w-96">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder="Buscar por nombre, apodo o empresa..."
                        className="input input-bordered input-sm w-full pl-10 bg-white text-black text-[12px] focus:border-red-600 border-gray-300"
                        onChange={(e) => {setBusqueda(e.target.value); setPagina(1);}} />
                </div>
                <div className="flex items-center gap-1">
                    <button className="btn btn-xs btn-outline border-gray-300 text-black" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><FaChevronLeft /></button>
                    <span className="text-[11px] font-bold text-gray-600 uppercase">Pág {pagina} de {totalPags || 1}</span>
                    <button className="btn btn-xs btn-outline border-gray-300 text-black" disabled={pagina === totalPags || totalPags === 0} onClick={() => setPagina(p => p + 1)}><FaChevronRight /></button>
                </div>
            </div>

            <table className="table w-full">
                <thead>
                    <tr className="text-gray-500 text-[10px] uppercase italic bg-white border-b border-gray-100">
                        <th className="py-4">Chofer / Apodo</th>
                        <th>Empresa Asignada</th>
                        <th className="text-center">Teléfono</th>
                        <th>Licencia</th>
                    </tr>
                </thead>
                <tbody className="text-black text-[12px]">
                    {paginados.map(c => (
                        <tr key={c.id} className="hover:bg-red-50 border-b border-gray-50 transition-colors">
                            <td>
                                <div className="font-bold text-blue-900 uppercase text-[13px] leading-tight">
                                    <span className="text-gray-400 mr-1 italic text-[10px]">#{c.folio}</span> {c.nombreChofer}
                                </div>
                                <div className="text-[11px] text-gray-500 font-bold italic mt-0.5">
                                    {c.apodoChofer || 'Sin Apodo'}
                                </div>
                            </td>

                            {/* CELDA DE EMPRESA CON EDICIÓN EN LÍNEA */}
                            <td>
                                {editandoId === c.id ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="select select-bordered select-xs bg-white text-black font-bold border-red-400"
                                            onChange={(e) => {
                                                const idx = e.target.selectedIndex;
                                                setNuevaEmpresa({ id: e.target.value, nombre: e.target.options[idx].text });
                                            }}
                                            defaultValue={c.empresaId}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                                        </select>
                                        <button
                                            onClick={() => guardarCambioEmpresa(c.id)}
                                            className="btn btn-xs btn-success text-white"
                                            disabled={loadingEdit}
                                        >
                                            <FaSave />
                                        </button>
                                        <button
                                            onClick={() => setEditandoId(null)}
                                            className="btn btn-xs btn-ghost text-red-500"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="group flex items-center gap-2">
                                        <span className="font-black text-red-600 uppercase tracking-tight text-[11px]">
                                            {c.empresaNombre}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setEditandoId(c.id);
                                                setNuevaEmpresa({ id: c.empresaId, nombre: c.empresaNombre });
                                            }}
                                            className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-700 transition-opacity"
                                            title="Cambiar Empresa"
                                        >
                                            <FaEdit size={14} />
                                        </button>
                                    </div>
                                )}
                            </td>

                            <td className="text-center">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold">+{c.telefonoChofer}</span>
                                        <button onClick={() => {navigator.clipboard.writeText(c.telefonoChofer); setCopiadoId(c.id); setTimeout(()=>setCopiadoId(null), 2000)}}
                                            className={`btn btn-ghost btn-xs p-0 ${copiadoId === c.id ? 'text-green-600' : 'text-blue-700'}`}>
                                            {copiadoId === c.id ? <FaCheck size={12} /> : <FaCopy size={12} />}
                                        </button>
                                    </div>
                                    {copiadoId === c.id && <span className="text-[8px] text-green-600 font-black uppercase animate-pulse italic">¡Copiado!</span>}
                                </div>
                            </td>
                            <td className="text-[11px] font-bold text-gray-500">
                                <div className="flex items-center gap-1 uppercase">
                                    <FaIdCard className="text-gray-300" /> {c.licencia}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-black italic uppercase">Conductores en Red: {filtrados.length}</span>
                <span className="text-[10px] text-red-600 font-black uppercase tracking-widest opacity-60 italic">Actualización de Transportista en Línea</span>
            </div>
        </div>
    );
};

export default TablaChoferes;