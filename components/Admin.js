import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { auth, firestore } from "../firebase/firebaseIni";
import EstadosPrecios from "./EstadosPrecios/EstadosPrecios";
import HeaderPanel from "./Layout/HeaderPanel";
import Sidebar from "./Layout/Sidebar";
import Viajes from "./Viajes/Viajes";
import SalidaVehiculo from "./SalidaVehiculo/SalidaVehiculo";
import CorteDia from "./Reports/CorteDia"
import ReporteCobros from "./Reports/ReporteCobros";
import Vehiculos from "./Vehiculos/Vehiculos";
import Users from "./Users/Users";
import Reports from "./Reports/Reports";


const Admin = () => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);

    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged((user) => {
            if (user) {
                dataUser(user.uid);
            } else {
                router.push("/"); // Redirigir al inicio si el usuario no está autenticado
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
                        router.push("/"); // Redirigir a una página de acceso denegado
                        console.error("No cuentas con acceso para esta herramienta, contacta con soporte");
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
            case 'salidaVehiculo':
                return <SalidaVehiculo user={user} />;
            case 'corteDia':
                return <CorteDia user={user} />;
            case 'reporteCobros':
                return <ReporteCobros user={user} />;
            case 'viajes':
                return <Viajes user={user} />;
            case 'vehiculos':
                return <Vehiculos user={user} />;
            case 'estadosPrecios':
                return <EstadosPrecios />;
            case 'reports':
                return <Reports />;
            case 'users':
                return <Users />;
            default:
                return <div className="text-center mt-20">Bienvenido al Panel de Administración</div>;
        }
    };

    return (
        <div className="flex">
            <Sidebar onSelectModule={setSelectedModule} selectedModule={selectedModule} />
            <HeaderPanel user={user} onLogout={handleLogout} />

            <main className="ml-64 mt-20 p-8 flex-grow"> {/* Adjusted margin-top */}
                {user && user.tipo === "admin" ? (
                    <div className="flex flex-col w-full">
                        <motion.div className="justify-center">
                            <h3 className="justify-center font-medium text-black-500">
                                Administrador <strong>General</strong>.
                            </h3>
                        </motion.div>
                        <div>
                            {renderModule()}
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
};

export default Admin;
