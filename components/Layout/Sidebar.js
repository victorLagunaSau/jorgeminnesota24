import React, { useState } from "react";
import { FaCashRegister, FaFileInvoice, FaCar, FaUsers, FaCog, FaDollarSign } from "react-icons/fa"; // Importamos algunos iconos de React Icons

const Sidebar = ({ onSelectModule, selectedModule }) => {
    // Estado para manejar la apertura de los submenús
    const [openSubMenu, setOpenSubMenu] = useState({ caja: false, reportes: false, vehiculos: false });

    const toggleSubMenu = (menu) => {
        setOpenSubMenu((prevState) => ({
            ...prevState,
            // Si ya está abierto, lo cerramos; si no, cerramos todos los demás y abrimos el seleccionado
            [menu]: !prevState[menu],
            caja: menu === 'caja' ? !prevState.caja : false,
            reportes: menu === 'reportes' ? !prevState.reportes : false,
            vehiculos: menu === 'vehiculos' ? !prevState.vehiculos : false,
        }));
    };

    const getButtonClass = (module) =>
        `w-full px-4 py-2 bg-white text-black text-left hover:bg-red-200 flex items-center ${
            selectedModule === module ? "bg-red-100" : ""
        }`;

    return (
        <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-lg mt-16">
            <nav className="mt-20">
                <ul className="w-56 rounded-box text-xl text-black-500">

                    {/* Submenú Caja */}
                    <li>
                        <button
                            className="w-full px-4 py-2 bg-white text-black text-left hover:bg-red-200 flex items-center"
                            onClick={() => toggleSubMenu('caja')}
                        >
                            <FaCashRegister className="mr-3" /> Caja
                        </button>
                        {openSubMenu.caja && (
                            <ul className="pl-4">
                                <li>
                                    <button
                                        className={getButtonClass('salidaVehiculo')}
                                        onClick={() => onSelectModule('salidaVehiculo')}
                                    >
                                        Cobro de Vehículo
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={getButtonClass('salidaCaja')}
                                        onClick={() => onSelectModule('salidaCaja')}
                                    >
                                        Salida Caja
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={getButtonClass('entradaCaja')}
                                        onClick={() => onSelectModule('entradaCaja')}
                                    >
                                        Entrada Caja
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={getButtonClass('corteDia')}
                                        onClick={() => onSelectModule('corteDia')}
                                    >
                                        Corte del día
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={getButtonClass('corteTotal')}
                                        onClick={() => onSelectModule('corteTotal')}
                                    >
                                        Corte Total
                                    </button>
                                </li>
                            </ul>
                        )}
                    </li>
                    <li>
                        <button
                             className={getButtonClass('cobranza')}
                            onClick={() => onSelectModule('cobranza')}
                        >
                            <FaDollarSign className="mr-3" /> Cobranza
                        </button>
                    </li>

                    {/* Submenú Reportes */}
                    <li>
                        <button
                            className="w-full px-4 py-2 bg-white text-black text-left hover:bg-red-200 flex items-center"
                            onClick={() => toggleSubMenu('reportes')}
                        >
                            <FaFileInvoice className="mr-3" /> Reportes
                        </button>
                        {openSubMenu.reportes && (
                            <ul className="pl-4">
                                <li>
                                    <button
                                        className={getButtonClass('reporteCobros')}
                                        onClick={() => onSelectModule('reporteCobros')}
                                    >
                                        Reporte Ingresos
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={getButtonClass('reports')}
                                        onClick={() => onSelectModule('reports')}
                                    >
                                        Movimientos
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className={getButtonClass('reportsPendientesPago')}
                                        onClick={() => onSelectModule('reportsPendientesPago')}
                                    >
                                        Pendientes de pago
                                    </button>
                                </li>
                            </ul>
                        )}
                    </li>

                    {/* Submenú Vehículos */}
                    <li>
                        <button
                            className={getButtonClass('viajes')}
                            onClick={() => onSelectModule('viajes')}
                        >
                            <FaCar className="mr-3" />Viajes
                        </button>
                    </li>
                    <li>
                        <button
                            className={getButtonClass('vehiculos')}
                            onClick={() => onSelectModule('vehiculos')}
                        >
                            <FaCar className="mr-3" /> Vehículos
                        </button>
                    </li>
                    <li>
                        <button
                            className={getButtonClass('estadosPrecios')}
                            onClick={() => onSelectModule('estadosPrecios')}
                        >
                            <FaCog className="mr-3" /> Estados y Precios
                        </button>
                    </li>
                    <li>
                        <button
                            className={getButtonClass('users')}
                            onClick={() => onSelectModule('users')}
                        >
                            <FaUsers className="mr-3" /> Usuarios
                        </button>
                    </li>

                    {/* Botón de Cobranza */}


                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
