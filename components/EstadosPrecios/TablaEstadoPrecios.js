import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import EditarEstadosPrecios from "./EditarEstadosPrecios";
import { FaSearch, FaChevronLeft, FaChevronRight, FaEdit, FaMapMarkedAlt } from "react-icons/fa";

// 1. RECIBIMOS EL USER AQUÍ
const TablaEstadosPrecios = ({ user }) => {
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRegions, setCurrentRegions] = useState(null);
    const xPagina = 8;

    useEffect(() => {
        const unsub = firestore().collection("province").orderBy("state", "asc")
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    state: doc.data().state,
                    // 2. CAPTURAMOS LOS DATOS DE AUDITORÍA PARA EL MODAL
                    ultimaEdicion: doc.data().ultimaEdicion || null,
                    registro: doc.data().registro || null,
                    regions: doc.data().regions ? Array.from(doc.data().regions.values()) : [],
                    regionslength: doc.data().regions ? doc.data().regions.length : 0
                }));
                setLista(data);
                setLoading(false);
            }, error => {
                console.error("Error en tabla:", error);
                setLoading(false);
            });
        return () => unsub();
    }, []);

    const filtrados = lista.filter(e =>
        e.state?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalPags = Math.ceil(filtrados.length / xPagina);
    const paginados = filtrados.slice((pagina - 1) * xPagina, pagina * xPagina);

    const handleModalOpen = (data) => {
        setCurrentRegions(data);
        setIsModalOpen(true);
    };

    if (loading) return <div className="text-center p-10"><span className="loading loading-spinner text-info"></span></div>;

    return (
        <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden font-sans">

            {/* MODAL DE EDICIÓN */}
            <dialog id="my_modal_1" className="modal" open={isModalOpen}>
                <div className="modal-box bg-white max-w-2xl border-t-4 border-blue-800">
                    {currentRegions && (
                        <EditarEstadosPrecios
                            currentRegions={currentRegions}
                            closeModal={() => setIsModalOpen(false)}
                            // 3. PASAMOS EL USUARIO AL MODAL PARA EL GUARDADO
                            user={user}
                        />
                    )}
                </div>
            </dialog>

            {/* ... Resto del código de la tabla igual ... */}
            <div className="p-4 flex justify-between items-center bg-gray-100 border-b">
                <div className="relative w-96">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar Estado..."
                        className="input input-bordered input-sm w-full pl-10 bg-white text-black text-[13px] focus:border-blue-800"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase">
                        <FaMapMarkedAlt className="text-blue-800" /> Cobertura y Precios
                    </div>
                    <div className="flex items-center gap-1 border-l pl-3 border-gray-300">
                        <button className="btn btn-xs btn-outline border-gray-300" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>
                            <FaChevronLeft />
                        </button>
                        <span className="text-[11px] font-bold text-black px-2">Pág {pagina} de {totalPags || 1}</span>
                        <button className="btn btn-xs btn-outline border-gray-300" disabled={pagina === totalPags || totalPags === 0} onClick={() => setPagina(p => p + 1)}>
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
            </div>

            <table className="table w-full">
                <thead>
                    <tr className="text-gray-600 text-[11px] uppercase italic bg-white border-b border-gray-200">
                        <th className="w-20 py-4">ID</th>
                        <th>Estado / Región</th>
                        <th className="text-center">Cant. Regiones</th>
                        <th className="text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="text-black text-[12px]">
                    {paginados.length > 0 ? paginados.map((data, index) => (
                        <tr key={data.id} className="hover:bg-blue-50 border-b border-gray-100 transition-colors">
                            <td className="font-mono text-gray-400 italic">
                                {((pagina - 1) * xPagina) + index + 1}
                            </td>
                            <td>
                                <p className="font-bold text-blue-900 uppercase text-[14px]">{data.state}</p>
                            </td>
                            <td className="text-center">
                                <span className="badge badge-ghost font-bold text-gray-600 uppercase text-[10px]">
                                    {data.regionslength} Destinos
                                </span>
                            </td>
                            <td className="text-center">
                                <button
                                    className="btn btn-ghost btn-xs text-blue-700 hover:bg-blue-100 gap-1 uppercase font-bold"
                                    onClick={() => handleModalOpen(data)}
                                >
                                    <FaEdit size={12} /> Configurar
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="4" className="text-center py-10 text-gray-400 italic">No se encontraron resultados</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="p-3 bg-gray-50 flex justify-between items-center border-t">
                <span className="text-[11px] text-gray-400 font-bold italic uppercase">Total en Sistema: {filtrados.length} Estados</span>
                <span className="text-[10px] text-blue-900 font-black uppercase tracking-widest opacity-60 italic">Matriz de Tarifas Logísticas</span>
            </div>
        </div>
    );
};

export default TablaEstadosPrecios;