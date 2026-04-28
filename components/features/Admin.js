import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { useAuthContext } from "../../context/auth";
import { AdminDataProvider } from "../../context/adminData";

// Layout
import HeaderPanel from "../Layout/HeaderPanel";
import Sidebar from "../Layout/Sidebar";

// Módulos - Config
import EstadosPrecios from "./config/EstadosPrecios";
import Users from "./config/Users";
import EliminarMovimientosERC from "./config/EliminarMovimientosERC";

// Módulos - Viajes
import Viajes from "./viajes/Viajes";
import ViajesAnteriores from "./viajes/ViajesAnteriores";
import ReporteViajesPagados from "./viajes/ReporteViajesPagados";

// Módulos - Vehículos
import Vehiculos from "./vehiculos/Vehiculos";
import EliminaVehiculos from "./vehiculos/EliminaVehiculos";
import RegistroMasivoVehiculos from "./vehiculos/RegistroMasivoVehiculos";

// Módulos - Caja
import SalidaVehiculo from "./caja/SalidaVehiculo";
import PagoAdelantado from "./caja/PagoAdelantado";
import SalidaCaja from "./caja/SalidaCaja";
import EntradaCaja from "./caja/EntradaCaja";
import CorteDia from "./caja/CorteDia";
import CorteTotal from "./caja/CorteTotal";

// Módulos - Reportes
import ReporteVehiculos from "./reportes/ReporteVehiculos";
import ReporteCobros from "./reportes/ReporteCobros";
import Reports from "./reportes/Reports";
import ReportPendientesPago from "./reportes/ReportPendientesPago";

// Módulos - Análisis
import EstadoFinanciero from "./analisis/EstadoFinanciero";
import HistorialAnticipos from "./analisis/HistorialAnticipos";
import HistorialAutorizaciones from "./analisis/HistorialAutorizaciones";
import Gastos from "./analisis/Gastos";

// Módulos - Otros
import Cobranza from "./cobranza/Cobranza";
import Clientes from "./clientes/Clientes";
import Empresas from "./empresas/Empresas";
import Choferes from "./choferes/Choferes";
import SolicitudesVehiculos from "./solicitudes/SolicitudesVehiculos";

const Admin = () => {
    const router = useRouter();
    const { user, loading, isAdmin, signOut } = useAuthContext();
    const [selectedModule, setSelectedModule] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Redirigir si no está autenticado o no es admin
    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, loading, isAdmin, router]);

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    const renderModule = () => {
        switch (selectedModule) {
            case 'choferes':
                return <Choferes user={user} />;
            case 'empresas':
                return <Empresas user={user} />;
            case 'clientes':
                return <Clientes user={user} />;
            case 'salidaVehiculo':
                return <SalidaVehiculo user={user} />;
            case 'pagoAdelantado':
                return <PagoAdelantado user={user} />;
            case 'eliminaVehiculos':
                return <EliminaVehiculos user={user} />;
            case 'eliminarMovimientosERC':
                return <EliminarMovimientosERC user={user} />;
            case 'reporteVehiculos':
                return <ReporteVehiculos user={user} />;
            case 'salidaCaja':
                return <SalidaCaja user={user} />;
            case 'entradaCaja':
                return <EntradaCaja user={user} />;
            case 'corteDia':
                return <CorteDia user={user} />;
            case 'corteTotal':
                return <CorteTotal user={user} />;
            case 'reporteCobros':
                return <ReporteCobros user={user} />;
            case 'viajes':
                return <Viajes user={user} />;

            // CASO AGREGADO PARA LA HERRAMIENTA DE REGULARIZACIÓN
            case 'viajesAnteriores':
                return <ViajesAnteriores user={user} />;
            case 'reporteViajesPago':
                return <ReporteViajesPagados user={user} />;

            case 'vehiculos':
                return <Vehiculos user={user} />;
            case 'estadosPrecios':
                return <EstadosPrecios user={user}/>;
            case 'reports':
                return <Reports user={user} />;
            case 'reportsPendientesPago':
                return <ReportPendientesPago user={user} />;
            case 'cobranza':
                return <Cobranza user={user} />;
            case 'estadoFinanciero':
                return <EstadoFinanciero />;
            case 'historialAnticipos':
                return <HistorialAnticipos />;
            case 'historialAutorizaciones':
                return <HistorialAutorizaciones />;
            case 'gastos':
                return <Gastos />;
            case 'users':
                return <Users />;
            case 'registroMasivoVehiculos':
                return <RegistroMasivoVehiculos user={user}/>;
            case 'solicitudesVehiculos':
                return <SolicitudesVehiculos user={user}/>;
            default:
                return (
                    <div className="text-center mt-20">
                        <h2 className="text-2xl font-light text-gray-400 italic">
                            Bienvenido al Panel de Administración
                        </h2>
                    </div>
                );
        }
    };

    return (
        <AdminDataProvider>
            <div className="bg-gray-50 min-h-screen text-black">
                <Sidebar
                    onSelectModule={setSelectedModule}
                    selectedModule={selectedModule}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                <HeaderPanel
                    user={user}
                    onLogout={handleLogout}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                />

                <main className="lg:ml-64 mt-16 p-4 lg:p-8 min-h-screen">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="loading loading-spinner loading-lg text-red-600"></div>
                        </div>
                    ) : isAdmin ? (
                        <div className="flex flex-col w-full">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="mb-4 lg:mb-6"
                            >
                                <h3 className="font-medium text-gray-600 uppercase text-xs tracking-widest">
                                    Panel <strong className="text-black font-black italic">Administrador</strong>
                                </h3>
                            </motion.div>

                            <div className="w-full">
                                {renderModule()}
                            </div>
                        </div>
                    ) : null}
                </main>
            </div>
        </AdminDataProvider>
    );
};

export default Admin;