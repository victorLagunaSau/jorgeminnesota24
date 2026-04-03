import React from "react";
import { FaBars, FaSignOutAlt } from "react-icons/fa";

const HeaderPanel = ({ user, onLogout, onToggleSidebar }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-30 bg-white shadow-md lg:left-64">
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

                {/* Info usuario y logout */}
                <div className="flex items-center gap-2 lg:gap-4">
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
            </div>
        </header>
    );
};

export default HeaderPanel;
