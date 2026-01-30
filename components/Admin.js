import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { auth, firestore } from "../firebase/firebaseIni";

// Layout
import HeaderPanel from "./Layout/HeaderPanel";
import Sidebar from "./Layout/Sidebar";

// Módulos Existentes
import EstadosPrecios from "./EstadosPrecios/EstadosPrecios";
import Viajes from "./Viajes/Viajes";
import SalidaVehiculo from "./SalidaVehiculo/SalidaVehiculo";

// --- SE COMENTAN LOS IMPORTS QUE NO ENCUENTRA VERCEL ---
// import EliminaVehiculos from "./EliminaVehiculos/EliminaVehiculos";
// import EliminarMovimientosERC from "./EliminaERC/EliminarMovimientosERC";
// import ReporteVehiculos from "./Reports/ReporteVehiculos";

import SalidaCaja from "./SalidaCaja/SalidaCaja";
import EntradaCaja from "./EntradaCaja/EntradaCaja";
import CorteDia from "./CorteDia/CorteDia";
import CorteTotal from "./CorteGeneral/CorteTotal";
import ReporteCobros from "./Reports/ReporteCobros";
import Vehiculos from "./Vehiculos/Vehiculos";
import Users from "./Users/Users";
import Reports from "./Reports/Reports";
import ReportPendientesPago from "./Reports/ReportPendientesPago";
import Cobranza from "./Cobranza/Cobranza";
import Clientes from "./Clientes/Clientes";
import Empresas from "./Empresas/Empresas";
import Choferes from "./Choferes/Choferes";

const Admin = () => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);

    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged((user) => {
            if (user) {
                dataUser(user.uid);
            } else {
                router.push("/");
            }
        });

        return () => unsubscribe();
    }, []);

    const dataUser = (userId) => {
        firestore()
            .collection("users")
            .doc(userId)
            .get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (!userData.tipo || !userData.tipo.includes("admin")) {
                        router.push("/");
                        console.error("Acceso denegado");
                    } else {
                        setUser(userData);
                    }
                }
            })
            .catch((error) => {
                console.error("Error getting user data:", error);
            });
    };

    const handleLogout = () => {
        auth().signOut().then(() => {
            router.push("/");
        });
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
            // --- SE COMENTA EL RENDERING DE LOS MODULOS INEXISTENTES ---

            // case 'eliminaVehiculos':
            //     return <EliminaVehiculos user={user} />;
            // case 'eliminarMovimientosERC':
            //     return <EliminarMovimientosERC user={user} />;
            // case 'reporteVehiculos':
            //     return <ReporteVehiculos user={user} />;

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
            case 'users':
                return <Users />;
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
        <div className="flex bg-gray-50 min-h-screen text-black">
            <Sidebar onSelectModule={setSelectedModule} selectedModule={selectedModule} />
            <HeaderPanel user={user} onLogout={handleLogout} />

            <main className="ml-64 mt-20 p-8 flex-grow">
                {user && user.tipo === "admin" ? (
                    <div className="flex flex-col w-full">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="mb-6"
                        >
                            <h3 className="font-medium text-gray-600 uppercase text-xs tracking-widest">
                                Panel <strong className="text-black font-black italic">Administrador</strong>
                            </h3>
                        </motion.div>

                        <div className="w-full">
                            {renderModule()}
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-full">
                        <div className="loading loading-spinner loading-lg text-red-600"></div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Admin;