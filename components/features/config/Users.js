import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { useAuthContext } from "../../../context/auth";
import {
    FaUserShield, FaUserCog, FaCrown, FaSearch, FaCheck, FaTimes,
    FaCashRegister, FaTruck, FaChartBar, FaUsers, FaCog, FaExclamationTriangle,
    FaSave, FaLock, FaTrashAlt, FaKey, FaCopy, FaClock, FaTrash
} from "react-icons/fa";

const Users = () => {
    const { user } = useAuthContext();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [alertMessage, setAlertMessage] = useState({ msg: '', tipo: '' });

    // Estados para tokens
    const [tokenGenerado, setTokenGenerado] = useState(null);
    const [tokensActivos, setTokensActivos] = useState([]);
    const [generandoToken, setGenerandoToken] = useState(false);

    // Verificar si el usuario actual es Admin Master
    const isAdminMaster = user?.adminMaster === true;

    // Cargar usuarios admin
    useEffect(() => {
        if (!isAdminMaster) {
            setLoading(false);
            return;
        }

        const unsub = firestore()
            .collection("users")
            .where("tipo", "==", "admin")
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Ordenar: Admin Master primero, luego por nombre
                data.sort((a, b) => {
                    if (a.adminMaster && !b.adminMaster) return -1;
                    if (!a.adminMaster && b.adminMaster) return 1;
                    return (a.nombre || a.email || "").localeCompare(b.nombre || b.email || "");
                });
                setUsuarios(data);
                setLoading(false);
            });

        return () => unsub();
    }, [isAdminMaster]);

    // Cargar tokens activos
    useEffect(() => {
        if (!isAdminMaster) return;

        const unsub = firestore()
            .collection("tokensChofer")
            .orderBy("fechaCreacion", "desc")
            .onSnapshot(snap => {
                const ahora = new Date();
                const data = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(t => {
                        // Filtrar tokens que no han expirado
                        const expira = t.fechaExpiracion?.toDate?.() || new Date(t.fechaExpiracion);
                        return expira > ahora;
                    });
                setTokensActivos(data);
            });

        return () => unsub();
    }, [isAdminMaster]);

    // Generar nuevo token
    const generarToken = async () => {
        setGenerandoToken(true);
        try {
            // Generar código de 6 caracteres alfanuméricos
            const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let codigo = '';
            for (let i = 0; i < 6; i++) {
                codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
            }

            const ahora = new Date();
            const expiracion = new Date(ahora.getTime() + 30 * 60 * 1000); // 30 minutos

            await firestore().collection("tokensChofer").doc(codigo).set({
                codigo,
                fechaCreacion: ahora,
                fechaExpiracion: expiracion,
                creadoPor: {
                    id: user?.id,
                    nombre: user?.nombre || user?.email
                },
                usado: false
            });

            setTokenGenerado(codigo);
            setAlertMessage({ msg: `Token ${codigo} generado. Expira en 30 minutos.`, tipo: 'success' });
            setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 5000);
        } catch (error) {
            console.error(error);
            setAlertMessage({ msg: "Error al generar token: " + error.message, tipo: 'error' });
        } finally {
            setGenerandoToken(false);
        }
    };

    // Eliminar token
    const eliminarToken = async (tokenId) => {
        try {
            await firestore().collection("tokensChofer").doc(tokenId).delete();
            setAlertMessage({ msg: "Token eliminado", tipo: 'success' });
            setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 2000);
        } catch (error) {
            console.error(error);
        }
    };

    // Copiar token al portapapeles
    const copiarToken = (codigo) => {
        navigator.clipboard.writeText(codigo);
        setAlertMessage({ msg: `Token ${codigo} copiado al portapapeles`, tipo: 'success' });
        setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 2000);
    };

    // Calcular tiempo restante
    const tiempoRestante = (fechaExpiracion) => {
        const ahora = new Date();
        const expira = fechaExpiracion?.toDate?.() || new Date(fechaExpiracion);
        const diff = expira - ahora;
        const minutos = Math.floor(diff / 60000);
        const segundos = Math.floor((diff % 60000) / 1000);
        return `${minutos}:${segundos.toString().padStart(2, '0')}`;
    };

    // Actualizar permiso de un usuario
    const actualizarPermiso = async (userId, campo, valor) => {
        // No permitir modificar al Admin Master
        const usuarioTarget = usuarios.find(u => u.id === userId);
        if (usuarioTarget?.adminMaster) {
            setAlertMessage({ msg: "No puedes modificar los permisos del Admin Master", tipo: 'error' });
            setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 3000);
            return;
        }

        setGuardando(userId);
        try {
            await firestore().collection("users").doc(userId).update({
                [campo]: valor
            });
            setAlertMessage({ msg: "Permiso actualizado correctamente", tipo: 'success' });
            setTimeout(() => setAlertMessage({ msg: '', tipo: '' }), 2000);
        } catch (error) {
            console.error(error);
            setAlertMessage({ msg: "Error al actualizar: " + error.message, tipo: 'error' });
        } finally {
            setGuardando(null);
        }
    };

    // Filtrar usuarios
    const usuariosFiltrados = usuarios.filter(u =>
        (u.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(busqueda.toLowerCase())
    );

    // Si no es Admin Master, mostrar mensaje de acceso denegado
    if (!isAdminMaster) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="bg-red-100 p-8 rounded-2xl border-2 border-red-200">
                    <FaLock className="text-6xl text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-red-600 uppercase mb-2">Acceso Restringido</h2>
                    <p className="text-gray-600 font-medium">
                        Solo el <span className="font-black text-red-600">Admin Master</span> puede acceder a esta sección.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <span className="loading loading-spinner loading-lg text-red-600"></span>
            </div>
        );
    }

    return (
        <div className="font-sans text-black">
            {/* HEADER */}
            <div className="bg-white rounded-xl shadow-lg border-l-8 border-red-600 p-6 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                            <FaUserShield className="text-red-600" /> Gestión de Usuarios
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Administra los permisos de los usuarios administradores
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-2 rounded-lg shadow-lg">
                        <div className="flex items-center gap-2 text-white">
                            <FaCrown />
                            <span className="font-black text-sm uppercase">Admin Master</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE TOKENS */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <FaKey className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-800 uppercase text-sm">Token de Chofer Temporal</h3>
                            <p className="text-[10px] text-gray-500">
                                Genera un token para registrar viajes con choferes nuevos (expira en 30 min)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={generarToken}
                        disabled={generandoToken}
                        className="btn btn-sm bg-blue-600 hover:bg-blue-700 border-none text-white font-black uppercase gap-2"
                    >
                        {generandoToken ? (
                            <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                            <FaKey />
                        )}
                        Generar Token
                    </button>
                </div>

                {/* Token recién generado */}
                {tokenGenerado && (
                    <div className="mt-4 bg-white rounded-lg p-4 border-2 border-blue-300 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Token Generado:</p>
                            <p className="text-3xl font-black text-blue-600 tracking-widest font-mono">{tokenGenerado}</p>
                        </div>
                        <button
                            onClick={() => copiarToken(tokenGenerado)}
                            className="btn btn-sm btn-ghost text-blue-600 gap-2"
                        >
                            <FaCopy /> Copiar
                        </button>
                    </div>
                )}

                {/* Tokens activos */}
                {tokensActivos.length > 0 && (
                    <div className="mt-4">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Tokens Activos ({tokensActivos.length}):</p>
                        <div className="flex flex-wrap gap-2">
                            {tokensActivos.map(t => (
                                <div key={t.id} className="bg-white rounded-lg px-3 py-2 border border-gray-200 flex items-center gap-3">
                                    <span className="font-mono font-black text-blue-700">{t.codigo}</span>
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <FaClock size={10} /> {tiempoRestante(t.fechaExpiracion)}
                                    </span>
                                    <button
                                        onClick={() => copiarToken(t.codigo)}
                                        className="text-blue-500 hover:text-blue-700"
                                        title="Copiar"
                                    >
                                        <FaCopy size={12} />
                                    </button>
                                    <button
                                        onClick={() => eliminarToken(t.id)}
                                        className="text-red-400 hover:text-red-600"
                                        title="Eliminar"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ALERTA */}
            {alertMessage.msg && (
                <div className={`alert ${alertMessage.tipo === 'success' ? 'alert-success' : 'alert-error'} mb-4 font-bold text-white`}>
                    {alertMessage.tipo === 'success' ? <FaCheck /> : <FaExclamationTriangle />}
                    <span>{alertMessage.msg}</span>
                </div>
            )}

            {/* LEYENDA DE PERMISOS */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <h4 className="text-[11px] font-black uppercase text-gray-500 mb-3">Permisos Disponibles</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <FaCrown className="text-yellow-600" />
                        </div>
                        <div>
                            <p className="font-black text-gray-800">Admin Master</p>
                            <p className="text-[9px] text-gray-400">Control total del sistema</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <FaCashRegister className="text-green-600" />
                        </div>
                        <div>
                            <p className="font-black text-gray-800">Caja</p>
                            <p className="text-[9px] text-gray-400">Cobros, cortes, entradas/salidas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FaTruck className="text-blue-600" />
                        </div>
                        <div>
                            <p className="font-black text-gray-800">Viajes</p>
                            <p className="text-[9px] text-gray-400">Control y gestión de viajes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FaChartBar className="text-purple-600" />
                        </div>
                        <div>
                            <p className="font-black text-gray-800">Reportes</p>
                            <p className="text-[9px] text-gray-400">Ver reportes y estadísticas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <FaTrashAlt className="text-red-600" />
                        </div>
                        <div>
                            <p className="font-black text-gray-800">Eliminar Viajes</p>
                            <p className="text-[9px] text-gray-400">Borrar viajes del historial</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BUSCADOR */}
            <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
                <div className="relative">
                    <FaSearch className="absolute left-4 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="input input-bordered w-full pl-12 bg-gray-50 font-medium"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* TABLA DE USUARIOS */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <table className="table w-full">
                    <thead>
                        <tr className="bg-gray-100 text-[10px] uppercase text-gray-500 font-black">
                            <th className="py-4">Usuario</th>
                            <th className="text-center py-4">
                                <div className="flex flex-col items-center">
                                    <FaCrown className="text-yellow-500 mb-1" />
                                    <span>Master</span>
                                </div>
                            </th>
                            <th className="text-center py-4">
                                <div className="flex flex-col items-center">
                                    <FaCashRegister className="text-green-600 mb-1" />
                                    <span>Caja</span>
                                </div>
                            </th>
                            <th className="text-center py-4">
                                <div className="flex flex-col items-center">
                                    <FaTruck className="text-blue-600 mb-1" />
                                    <span>Viajes</span>
                                </div>
                            </th>
                            <th className="text-center py-4">
                                <div className="flex flex-col items-center">
                                    <FaChartBar className="text-purple-600 mb-1" />
                                    <span>Reportes</span>
                                </div>
                            </th>
                            <th className="text-center py-4">
                                <div className="flex flex-col items-center">
                                    <FaUsers className="text-orange-600 mb-1" />
                                    <span>Clientes</span>
                                </div>
                            </th>
                            <th className="text-center py-4">
                                <div className="flex flex-col items-center">
                                    <FaCog className="text-gray-600 mb-1" />
                                    <span>Config</span>
                                </div>
                            </th>
                            <th className="text-center py-4 bg-red-50">
                                <div className="flex flex-col items-center">
                                    <FaTrashAlt className="text-red-600 mb-1" />
                                    <span>Borrar Viajes</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuariosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center py-10 text-gray-400 font-bold uppercase">
                                    No se encontraron usuarios
                                </td>
                            </tr>
                        ) : (
                            usuariosFiltrados.map((u) => (
                                <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${u.adminMaster ? 'bg-yellow-50' : ''}`}>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.adminMaster ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gray-200'}`}>
                                                {u.adminMaster ? (
                                                    <FaCrown className="text-white" />
                                                ) : (
                                                    <FaUserCog className="text-gray-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-800 uppercase text-sm">
                                                    {u.nombre || "Sin nombre"}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {u.email}
                                                </p>
                                                {u.adminMaster && (
                                                    <span className="text-[9px] font-black text-yellow-600 uppercase">
                                                        Admin Master
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Admin Master - Solo lectura */}
                                    <td className="text-center">
                                        {u.adminMaster ? (
                                            <div className="flex justify-center">
                                                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                                                    <FaCheck className="text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center">
                                                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <FaTimes className="text-gray-400" />
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Caja */}
                                    <td className="text-center">
                                        <button
                                            onClick={() => actualizarPermiso(u.id, 'caja', !u.caja)}
                                            disabled={guardando === u.id || u.adminMaster}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                                u.adminMaster || u.caja
                                                    ? 'bg-green-500 hover:bg-green-600'
                                                    : 'bg-gray-200 hover:bg-gray-300'
                                            } ${u.adminMaster ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {guardando === u.id ? (
                                                <span className="loading loading-spinner loading-xs text-white"></span>
                                            ) : u.adminMaster || u.caja ? (
                                                <FaCheck className="text-white" />
                                            ) : (
                                                <FaTimes className="text-gray-400" />
                                            )}
                                        </button>
                                    </td>

                                    {/* Viajes */}
                                    <td className="text-center">
                                        <button
                                            onClick={() => actualizarPermiso(u.id, 'viajes', !u.viajes)}
                                            disabled={guardando === u.id || u.adminMaster}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                                u.adminMaster || u.viajes
                                                    ? 'bg-blue-500 hover:bg-blue-600'
                                                    : 'bg-gray-200 hover:bg-gray-300'
                                            } ${u.adminMaster ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {guardando === u.id ? (
                                                <span className="loading loading-spinner loading-xs text-white"></span>
                                            ) : u.adminMaster || u.viajes ? (
                                                <FaCheck className="text-white" />
                                            ) : (
                                                <FaTimes className="text-gray-400" />
                                            )}
                                        </button>
                                    </td>

                                    {/* Reportes */}
                                    <td className="text-center">
                                        <button
                                            onClick={() => actualizarPermiso(u.id, 'reportes', !u.reportes)}
                                            disabled={guardando === u.id || u.adminMaster}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                                u.adminMaster || u.reportes
                                                    ? 'bg-purple-500 hover:bg-purple-600'
                                                    : 'bg-gray-200 hover:bg-gray-300'
                                            } ${u.adminMaster ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {guardando === u.id ? (
                                                <span className="loading loading-spinner loading-xs text-white"></span>
                                            ) : u.adminMaster || u.reportes ? (
                                                <FaCheck className="text-white" />
                                            ) : (
                                                <FaTimes className="text-gray-400" />
                                            )}
                                        </button>
                                    </td>

                                    {/* Clientes */}
                                    <td className="text-center">
                                        <button
                                            onClick={() => actualizarPermiso(u.id, 'clientes', !u.clientes)}
                                            disabled={guardando === u.id || u.adminMaster}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                                u.adminMaster || u.clientes
                                                    ? 'bg-orange-500 hover:bg-orange-600'
                                                    : 'bg-gray-200 hover:bg-gray-300'
                                            } ${u.adminMaster ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {guardando === u.id ? (
                                                <span className="loading loading-spinner loading-xs text-white"></span>
                                            ) : u.adminMaster || u.clientes ? (
                                                <FaCheck className="text-white" />
                                            ) : (
                                                <FaTimes className="text-gray-400" />
                                            )}
                                        </button>
                                    </td>

                                    {/* Config */}
                                    <td className="text-center">
                                        <button
                                            onClick={() => actualizarPermiso(u.id, 'config', !u.config)}
                                            disabled={guardando === u.id || u.adminMaster}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                                u.adminMaster || u.config
                                                    ? 'bg-gray-600 hover:bg-gray-700'
                                                    : 'bg-gray-200 hover:bg-gray-300'
                                            } ${u.adminMaster ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {guardando === u.id ? (
                                                <span className="loading loading-spinner loading-xs text-white"></span>
                                            ) : u.adminMaster || u.config ? (
                                                <FaCheck className="text-white" />
                                            ) : (
                                                <FaTimes className="text-gray-400" />
                                            )}
                                        </button>
                                    </td>

                                    {/* Eliminar Viajes */}
                                    <td className="text-center bg-red-50/50">
                                        <button
                                            onClick={() => actualizarPermiso(u.id, 'eliminarViajes', !u.eliminarViajes)}
                                            disabled={guardando === u.id || u.adminMaster}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                                u.adminMaster || u.eliminarViajes
                                                    ? 'bg-red-500 hover:bg-red-600'
                                                    : 'bg-gray-200 hover:bg-gray-300'
                                            } ${u.adminMaster ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            {guardando === u.id ? (
                                                <span className="loading loading-spinner loading-xs text-white"></span>
                                            ) : u.adminMaster || u.eliminarViajes ? (
                                                <FaCheck className="text-white" />
                                            ) : (
                                                <FaTimes className="text-gray-400" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* FOOTER INFO */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-[10px] text-gray-400 font-bold uppercase text-center">
                    Total de Administradores: {usuarios.length} | Haz clic en los iconos para activar/desactivar permisos
                </p>
            </div>
        </div>
    );
};

export default Users;
