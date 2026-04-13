import React, { useState } from "react";
import { FaCashRegister, FaFileInvoice, FaCar, FaUsers, FaCog, FaDollarSign, FaUserFriends, FaTruckMoving, FaTimes, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useAuthContext } from "../../context/auth";

const Sidebar = ({ onSelectModule, selectedModule, isOpen, onClose }) => {
    const { user } = useAuthContext();
    const isAdminMaster = user?.adminMaster === true;
    const [openSubMenu, setOpenSubMenu] = useState({
        caja: false,
        reportes: false,
        vehiculos: false,
        viajesMenu: false
    });

    const toggleSubMenu = (menu) => {
        setOpenSubMenu((prevState) => ({
            caja: false,
            reportes: false,
            vehiculos: false,
            viajesMenu: false,
            [menu]: !prevState[menu],
        }));
    };

    const handleSelectModule = (module) => {
        onSelectModule(module);
        // Cerrar sidebar en móvil después de seleccionar
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    const getButtonClass = (module) =>
        `w-full px-4 py-3 text-gray-700 text-[13px] font-semibold text-left hover:bg-red-50 hover:text-red-600 flex items-center transition-colors ${
            selectedModule === module ? "bg-red-100 text-red-700 border-r-4 border-red-600" : ""
        }`;

    const getMenuButtonClass = (isOpen) =>
        `w-full px-4 py-3 text-gray-800 text-[14px] font-bold text-left hover:bg-gray-100 flex items-center justify-between transition-colors ${
            isOpen ? "bg-gray-50" : ""
        }`;

    return (
        <>
            {/* Overlay para móvil */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 h-full bg-white shadow-xl z-50
                    w-72 lg:w-64
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                    overflow-y-auto
                `}
            >
                {/* Header del Sidebar */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/assets/Logo.png" className="w-auto h-8" alt="Logo" />
                        <span className="font-black text-gray-800 text-sm uppercase tracking-tight">Admin</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FaTimes className="text-gray-500" />
                    </button>
                </div>

                {/* Navegación */}
                <nav className="py-4">
                    <ul className="space-y-1">

                        {/* Submenú Caja */}
                        <li>
                            <button
                                className={getMenuButtonClass(openSubMenu.caja)}
                                onClick={() => toggleSubMenu('caja')}
                            >
                                <span className="flex items-center">
                                    <FaCashRegister className="mr-3 text-red-600" size={18} />
                                    Caja
                                </span>
                                {openSubMenu.caja ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openSubMenu.caja ? 'max-h-96' : 'max-h-0'}`}>
                                <ul className="bg-gray-50 border-l-4 border-red-500 ml-4">
                                    <li><button className={getButtonClass('salidaVehiculo')} onClick={() => handleSelectModule('salidaVehiculo')}>Cobro de Vehículo</button></li>
                                    <li><button className={getButtonClass('pagoAdelantado')} onClick={() => handleSelectModule('pagoAdelantado')}>Pago Adelantado</button></li>
                                    <li><button className={getButtonClass('salidaCaja')} onClick={() => handleSelectModule('salidaCaja')}>Salida Caja</button></li>
                                    <li><button className={getButtonClass('entradaCaja')} onClick={() => handleSelectModule('entradaCaja')}>Entrada Caja</button></li>
                                </ul>
                            </div>
                        </li>

                        {/* Cobranza */}
                        <li>
                            <button className={getButtonClass('cobranza')} onClick={() => handleSelectModule('cobranza')}>
                                <FaDollarSign className="mr-3 text-red-600" size={18} /> Cobranza
                            </button>
                        </li>

                        {/* Submenú Reportes */}
                        <li>
                            <button
                                className={getMenuButtonClass(openSubMenu.reportes)}
                                onClick={() => toggleSubMenu('reportes')}
                            >
                                <span className="flex items-center">
                                    <FaFileInvoice className="mr-3 text-red-600" size={18} />
                                    Reportes
                                </span>
                                {openSubMenu.reportes ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openSubMenu.reportes ? 'max-h-96' : 'max-h-0'}`}>
                                <ul className="bg-gray-50 border-l-4 border-red-500 ml-4">
                                    <li><button className={getButtonClass('reporteCobros')} onClick={() => handleSelectModule('reporteCobros')}>Reporte Ingresos</button></li>
                                    <li><button className={getButtonClass('reports')} onClick={() => handleSelectModule('reports')}>Movimientos</button></li>
                                    <li><button className={getButtonClass('reportsPendientesPago')} onClick={() => handleSelectModule('reportsPendientesPago')}>Pendientes de pago</button></li>
                                    <li><button className={getButtonClass('corteDia')} onClick={() => handleSelectModule('corteDia')}>Corte del día</button></li>
                                    <li><button className={getButtonClass('corteTotal')} onClick={() => handleSelectModule('corteTotal')}>Corte Total</button></li>
                                </ul>
                            </div>
                        </li>

                        {/* Clientes */}
                        <li>
                            <button className={getButtonClass('clientes')} onClick={() => handleSelectModule('clientes')}>
                                <FaUserFriends className="mr-3 text-red-600" size={18} /> Clientes
                            </button>
                        </li>

                        {/* Control de Viajes - Separado */}
                        <li>
                            <button className={`${getButtonClass('viajes')} !font-black`} onClick={() => handleSelectModule('viajes')}>
                                <FaTruckMoving className="mr-3 text-red-600" size={18} /> Control de Viajes
                            </button>
                        </li>

                        {/* Submenú Gestión de Viajes */}
                        <li>
                            <button
                                className={`w-full px-4 py-3 text-gray-700 text-[13px] font-semibold text-left hover:bg-gray-100 flex items-center justify-between transition-colors ${openSubMenu.viajesMenu ? 'bg-gray-50' : ''}`}
                                onClick={() => toggleSubMenu('viajesMenu')}
                            >
                                <span className="flex items-center">
                                    <FaCog className="mr-3 text-red-600" size={18} />
                                    Gestión de Viajes
                                </span>
                                {openSubMenu.viajesMenu ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openSubMenu.viajesMenu ? 'max-h-96' : 'max-h-0'}`}>
                                <ul className="bg-gray-50 border-l-4 border-red-500 ml-4">
                                    <li><button className={getButtonClass('reporteViajesPago')} onClick={() => handleSelectModule('reporteViajesPago')}>Historial</button></li>
                                    <li><button className={getButtonClass('choferes')} onClick={() => handleSelectModule('choferes')}>Choferes</button></li>
                                    <li><button className={getButtonClass('empresas')} onClick={() => handleSelectModule('empresas')}>Empresas Transportistas</button></li>
                                </ul>
                            </div>
                        </li>

                        {/* Vehículos */}
                        <li>
                            <button className={getButtonClass('vehiculos')} onClick={() => handleSelectModule('vehiculos')}>
                                <FaCar className="mr-3 text-red-600" size={18} /> Vehículos
                            </button>
                        </li>

                        {/* Estados y Precios */}
                        <li>
                            <button className={getButtonClass('estadosPrecios')} onClick={() => handleSelectModule('estadosPrecios')}>
                                <FaCog className="mr-3 text-red-600" size={18} /> Estados y Precios
                            </button>
                        </li>

                        {/* Usuarios - Solo visible para Admin Master */}
                        {isAdminMaster && (
                            <li>
                                <button className={getButtonClass('users')} onClick={() => handleSelectModule('users')}>
                                    <FaUsers className="mr-3 text-red-600" size={18} /> Usuarios
                                </button>
                            </li>
                        )}

                    </ul>
                </nav>

                {/* Footer del Sidebar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                        Jorge Minnesota v2.0
                    </p>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
