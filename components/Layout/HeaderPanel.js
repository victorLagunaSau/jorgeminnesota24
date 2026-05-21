import React, { useState, useRef, useEffect } from "react";
import { FaBars, FaSignOutAlt, FaUserCircle, FaChevronDown, FaChartBar, FaUsers, FaCheckCircle, FaUserTie, FaEye, FaTimesCircle } from "react-icons/fa";
import { firestore } from "../../firebase/firebaseIni";
import { COLLECTIONS, USER_TYPES } from "../../constants";
import { useAuthContext } from "../../context/auth";

const HeaderPanel = ({ user, onLogout, onToggleSidebar, onSelectModule, selectedModule }) => {
    const { isImpersonating, startImpersonating, stopImpersonating, realUser } = useAuthContext();
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [showVerComo, setShowVerComo] = useState(false);
    const [adminUsers, setAdminUsers] = useState([]);
    const menuRef = useRef(null);
    const isAdminMaster = isImpersonating ? realUser?.adminMaster === true : user?.adminMaster === true;

    // Cargar usuarios admin cuando se abre "Ver como"
    useEffect(() => {
        if (!showVerComo) return;
        const unsub = firestore()
            .collection(COLLECTIONS.USERS)
            .where("tipo", "==", USER_TYPES.ADMIN)
            .onSnapshot(snap => {
                const currentId = isImpersonating ? realUser?.id : user?.id;
                const data = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(u => u.id !== currentId)
                    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
                setAdminUsers(data);
            });
        return () => unsub();
    }, [showVerComo]);

    // Animación de entrada/salida
    useEffect(() => {
        if (menuOpen) {
            requestAnimationFrame(() => setMenuVisible(true));
        } else {
            setMenuVisible(false);
        }
    }, [menuOpen]);

    // Cerrar menú al hacer click fuera o scroll
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuVisible(false);
                setTimeout(() => setMenuOpen(false), 200);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const adminModules = [
        { key: "estadoFinanciero", label: "Estado Financiero", icon: FaChartBar },
        { key: "empleados", label: "Empleados", icon: FaUserTie },
        { key: "historialAutorizaciones", label: "Autorizaciones", icon: FaCheckCircle },
        { key: "users", label: "Usuarios", icon: FaUsers },
    ];

    const handleSelect = (mod) => {
        onSelectModule(mod);
        setMenuVisible(false);
        setTimeout(() => setMenuOpen(false), 200);
    };

    const handleLogout = () => {
        setMenuVisible(false);
        setTimeout(() => {
            setMenuOpen(false);
            onLogout();
        }, 200);
    };

    return (
        <>
        {isImpersonating && (
            <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center py-1.5 text-[12px] font-black uppercase tracking-wide flex items-center justify-center gap-3">
                <FaEye size={12} />
                Viendo como: {user?.nombre || user?.email}
                <button
                    onClick={stopImpersonating}
                    className="bg-white text-amber-600 px-3 py-0.5 rounded-full text-[11px] font-black uppercase hover:bg-amber-50 transition-colors flex items-center gap-1"
                >
                    <FaTimesCircle size={10} /> Salir
                </button>
            </div>
        )}
        <header className={`fixed left-0 right-0 z-50 bg-white shadow-md lg:left-64 ${isImpersonating ? 'top-8' : 'top-0'}`}>
            <div className="flex justify-between items-center h-16 px-4 lg:px-6">
                {/* Botón hamburguesa (solo móvil) */}
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <FaBars className="text-gray-600" size={20} />
                </button>

                {/* Logo en móvil */}
                <div className="lg:hidden flex items-center">
                    <img src="/assets/Logo.png" className="w-auto h-8" alt="Logo" />
                </div>

                {/* Título en desktop */}
                <div className="hidden lg:block">
                    <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        Panel de Administración
                    </h1>
                </div>

                {/* Info usuario */}
                <div className="flex items-center">
                    {isAdminMaster ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => menuOpen ? (setMenuVisible(false), setTimeout(() => setMenuOpen(false), 200)) : setMenuOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                            >
                                <FaUserCircle className="text-red-600" size={24} />
                                <span className="hidden sm:block text-sm font-bold text-gray-800">{user?.nombre || 'Admin'}</span>
                                <FaChevronDown size={10} className={`text-gray-400 transition-transform duration-200 ${menuVisible ? 'rotate-180' : ''}`} />
                            </button>

                            {menuOpen && (
                                <div
                                    className="absolute right-0 top-full w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                                    style={{
                                        transition: 'opacity 200ms ease, transform 200ms ease',
                                        opacity: menuVisible ? 1 : 0,
                                        transform: menuVisible ? 'translateY(4px) scale(1)' : 'translateY(-4px) scale(0.97)',
                                        transformOrigin: 'top right',
                                    }}
                                >
                                    <div className="p-1.5">
                                        {/* Ver como */}
                                        <button
                                            onClick={() => setShowVerComo(!showVerComo)}
                                            className={`w-full px-3 py-2.5 text-left text-[13px] font-semibold flex items-center gap-2.5 rounded-lg transition-colors ${
                                                showVerComo ? "bg-amber-50 text-amber-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            }`}
                                        >
                                            <FaEye size={14} className={showVerComo ? "text-amber-500" : "text-gray-400"} />
                                            Ver como...
                                            <FaChevronDown size={10} className={`ml-auto transition-transform duration-200 ${showVerComo ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showVerComo && (
                                            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg mx-1 mb-1">
                                                {adminUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => {
                                                            startImpersonating(u.id);
                                                            setShowVerComo(false);
                                                            setMenuVisible(false);
                                                            setTimeout(() => setMenuOpen(false), 200);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-[12px] font-semibold text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition-colors flex items-center gap-2"
                                                    >
                                                        <FaUserCircle size={14} className="text-gray-400 flex-shrink-0" />
                                                        <div>
                                                            <p className="leading-tight">{u.nombre || "Sin nombre"}</p>
                                                            <p className="text-[9px] text-gray-400 font-medium">{u.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="border-b border-gray-100 my-1"></div>
                                        {adminModules.map(({ key, label, icon: Icon }) => (
                                            <button
                                                key={key}
                                                onClick={() => handleSelect(key)}
                                                className={`w-full px-3 py-2.5 text-left text-[13px] font-semibold flex items-center gap-2.5 rounded-lg transition-colors ${
                                                    selectedModule === key
                                                        ? "bg-red-50 text-red-700"
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                }`}
                                            >
                                                <Icon size={14} className={selectedModule === key ? "text-red-500" : "text-gray-400"} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-100 p-1.5">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-3 py-2.5 text-left text-[13px] font-semibold flex items-center gap-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <FaSignOutAlt size={14} />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-right">
                                <p className="text-xs text-gray-500 leading-none">Bienvenido</p>
                                <p className="text-sm font-bold text-gray-800 leading-tight">{user?.nombre || 'Admin'}</p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-semibold"
                            >
                                <FaSignOutAlt size={14} />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
        </>
    );
};

export default HeaderPanel;
