import React, {useState} from "react";
import {FaCashRegister, FaFileInvoice, FaCar, FaUsers, FaCog, FaDollarSign, FaUserFriends, FaTruckMoving} from "react-icons/fa";

const Sidebar = ({onSelectModule, selectedModule}) => {
    // Agregamos 'viajesMenu' al estado para controlar el nuevo desplegable
    const [openSubMenu, setOpenSubMenu] = useState({
        caja: false,
        reportes: false,
        vehiculos: false,
        viajesMenu: false // Control para el nuevo submenú
    });

    const toggleSubMenu = (menu) => {
        setOpenSubMenu((prevState) => ({
            // Primero cerramos todos
            caja: false,
            reportes: false,
            vehiculos: false,
            viajesMenu: false,
            // Luego activamos el que se clickeó si estaba cerrado
            [menu]: !prevState[menu],
        }));
    };

    const getButtonClass = (module) =>
        `w-full px-4 py-2 bg-white-100 text-black text-[12px] font-bold text-left hover:bg-red-200 flex items-center ${
            selectedModule === module ? "bg-red-100 border-r-4 border-red-600" : ""
        }`;

    return (
        <aside className="fixed top-0 left-0 h-full w-64 shadow-lg mt-16 overflow-y-auto">
            <nav className="mt-10 mb-20">
                <ul className="w-56 mx-auto rounded-box text-black-500">

                    {/* Submenú Caja */}
                    <li>
                        <button
                            className="w-full px-4 py-2 text-black text-[14px] font-bold text-left hover:bg-red-200 flex items-center border-b border-gray-100"
                            onClick={() => toggleSubMenu('caja')}
                        >
                            <FaCashRegister className="mr-3 text-red-600"/> Caja
                        </button>
                        {openSubMenu.caja && (
                            <ul className="border-l-2 border-red-600">
                                <li><button className={getButtonClass('salidaVehiculo')} onClick={() => onSelectModule('salidaVehiculo')}>Cobro de Vehículo</button></li>
                                <li><button className={getButtonClass('salidaCaja')} onClick={() => onSelectModule('salidaCaja')}>Salida Caja</button></li>
                                <li><button className={getButtonClass('entradaCaja')} onClick={() => onSelectModule('entradaCaja')}>Entrada Caja</button></li>
                                <li><button className={getButtonClass('corteDia')} onClick={() => onSelectModule('corteDia')}>Corte del día</button></li>
                                <li><button className={getButtonClass('corteTotal')} onClick={() => onSelectModule('corteTotal')}>Corte Total</button></li>
                            </ul>
                        )}
                    </li>

                    <li>
                        <button className={getButtonClass('cobranza')} onClick={() => onSelectModule('cobranza')}>
                            <FaDollarSign className="mr-3 text-red-600"/> Cobranza
                        </button>
                    </li>

                    {/* Submenú Reportes */}
                    <li>
                        <button
                            className="w-full px-4 py-2 text-black text-[14px] font-bold text-left hover:bg-red-200 flex items-center border-b border-gray-100"
                            onClick={() => toggleSubMenu('reportes')}
                        >
                            <FaFileInvoice className="mr-3 text-red-600"/> Reportes
                        </button>
                        {openSubMenu.reportes && (
                            <ul className="border-l-2 border-red-600">
                                <li><button className={getButtonClass('reporteCobros')} onClick={() => onSelectModule('reporteCobros')}>Reporte Ingresos</button></li>
                                <li><button className={getButtonClass('reports')} onClick={() => onSelectModule('reports')}>Movimientos</button></li>
                                <li><button className={getButtonClass('reportsPendientesPago')} onClick={() => onSelectModule('reportsPendientesPago')}>Pendientes de pago</button></li>
                            </ul>
                        )}
                    </li>

                    {/* Clientes (Individual) */}
                    <li>
                        <button className={getButtonClass('clientes')} onClick={() => onSelectModule('clientes')}>
                            <FaUserFriends className="mr-3 text-red-600"/> Clientes
                        </button>
                    </li>

                    {/* NUEVO Submenú Viajes y Empresas */}
                    <li>
                        <button
                            className="w-full px-4 py-2 text-black text-[14px] font-bold text-left hover:bg-red-200 flex items-center border-b border-gray-100"
                            onClick={() => toggleSubMenu('viajesMenu')}
                        >
                            <FaTruckMoving className="mr-3 text-red-600"/> Gestión de Viajes
                        </button>
                        {openSubMenu.viajesMenu && (
                            <ul className="border-l-2 border-red-600">
                                <li>
                                    <button className={getButtonClass('viajes')} onClick={() => onSelectModule('viajes')}>
                                        Control de Viajes
                                    </button>
                                </li>
                                <li>
                                    <button className={getButtonClass('choferes')} onClick={() => onSelectModule('choferes')}>
                                        Choferes
                                    </button>
                                </li>
                                <li>
                                    <button className={getButtonClass('empresas')} onClick={() => onSelectModule('empresas')}>
                                        Empresas Transportistas
                                    </button>
                                </li>
                            </ul>
                        )}
                    </li>

                    {/* Vehículos e Inventario */}
                    <li>
                        <button className={getButtonClass('vehiculos')} onClick={() => onSelectModule('vehiculos')}>
                            <FaCar className="mr-3 text-red-600"/> Vehículos
                        </button>
                    </li>

                    <li>
                        <button className={getButtonClass('estadosPrecios')} onClick={() => onSelectModule('estadosPrecios')}>
                            <FaCog className="mr-3 text-red-600"/> Estados y Precios
                        </button>
                    </li>

                    <li>
                        <button className={getButtonClass('users')} onClick={() => onSelectModule('users')}>
                            <FaUsers className="mr-3 text-red-600"/> Usuarios
                        </button>
                    </li>

                    <div className="mt-4 border-t border-gray-700 pt-2">
                        {/*<li><button className={getButtonClass('eliminaVehiculos')} onClick={() => onSelectModule('eliminaVehiculos')}>Elimina de Vehículos</button></li>*/}
                        {/*<li><button className={getButtonClass('eliminarMovimientosERC')} onClick={() => onSelectModule('eliminarMovimientosERC')}>Elimina de ERC</button></li>*/}
                        {/*<li><button className={getButtonClass('reporteVehiculos')} onClick={() => onSelectModule('reporteVehiculos')}>Reporte Vehículos</button></li>*/}
                    </div>

                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;