import React, { useState, useRef, useEffect } from "react";
import { FaBars, FaSignOutAlt, FaUserCircle, FaChevronDown, FaChartBar, FaUsers, FaCheckCircle, FaUserTie } from "react-icons/fa";

const HeaderPanel = ({ user, onLogout, onToggleSidebar, onSelectModule, selectedModule }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const menuRef = useRef(null);
    const isAdminMaster = user?.adminMaster === true;

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
        const handleScroll = () => {
            setMenuVisible(false);
            setTimeout(() => setMenuOpen(false), 200);
        };
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
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
        <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md lg:left-64">
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
    );
};

export default HeaderPanel;
