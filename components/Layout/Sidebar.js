import React, { useState } from "react";

const Sidebar = ({ onSelectModule, selectedModule }) => {
    // Estado para manejar la apertura de los submenús
    const [openSubMenu, setOpenSubMenu] = useState({ caja: false, vehiculos: false });

    const toggleSubMenu = (menu) => {
        setOpenSubMenu((prevState) => ({
            ...prevState,
            [menu]: !prevState[menu],
        }));
    };

    const getButtonClass = (module) =>
        `w-full px-4 py-2 bg-white text-black text-left hover:bg-red-200 ${
            selectedModule === module ? "bg-red-100" : ""
        }`;

    return (
        <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-lg mt-16">
            <nav className="mt-20">
                <ul className="w-56 rounded-box text-xl text-black-500">

                    {/* Submenú Caja */}
                    <li>
                        <button
                            className="w-full px-4 py-2 bg-white text-black text-left hover:bg-red-200"
                            onClick={() => toggleSubMenu('caja')}
                        >
                            Caja
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
                                        className={getButtonClass('corteDia')}
                                        onClick={() => onSelectModule('corteDia')}
                                    >
                                        Corte del día
                                    </button>
                                </li>
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

                            </ul>
                        )}
                    </li>


                    {/* Submenú Vehículos */}
                    <li>
                        <button
                            className={getButtonClass('viajes')}
                            onClick={() => onSelectModule('viajes')}
                        >
                            Pago de viajes
                        </button>
                    </li>
                    <li>
                        <button
                            className={getButtonClass('vehiculos')}
                            onClick={() => onSelectModule('vehiculos')}
                        >
                            Vehículos
                        </button>
                    </li>
                    <li>
                        <button
                            className={getButtonClass('estadosPrecios')}
                            onClick={() => onSelectModule('estadosPrecios')}
                        >
                            Estados y Precios
                        </button>
                    </li>
                    <li>
                        <button
                            className={getButtonClass('users')}
                            onClick={() => onSelectModule('users')}
                        >
                            Usuarios
                        </button>
                    </li>
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
