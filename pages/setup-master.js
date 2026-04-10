import React, { useState, useEffect } from "react";
import { firestore } from "../firebase/firebaseIni";
import { FaCrown, FaCheck, FaSpinner, FaExclamationTriangle } from "react-icons/fa";

const SetupMaster = () => {
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [message, setMessage] = useState("");
    const [userFound, setUserFound] = useState(null);

    const EMAIL_MASTER = "jorgeminnesota19@gmail.com";

    const configurarAdminMaster = async () => {
        setStatus("loading");
        setMessage("Buscando usuario...");

        try {
            // Buscar usuario por email
            const usersSnap = await firestore()
                .collection("users")
                .where("email", "==", EMAIL_MASTER)
                .limit(1)
                .get();

            if (usersSnap.empty) {
                setStatus("error");
                setMessage(`No se encontró ningún usuario con el email: ${EMAIL_MASTER}`);
                return;
            }

            const userDoc = usersSnap.docs[0];
            const userId = userDoc.id;
            const userData = userDoc.data();

            setUserFound({ id: userId, ...userData });
            setMessage("Usuario encontrado. Configurando permisos...");

            // Actualizar usuario con permisos de Admin Master
            await firestore().collection("users").doc(userId).update({
                adminMaster: true,
                tipo: "admin",
                admin: true,
                caja: true,
                viajes: true,
                reportes: true,
                clientes: true,
                config: true,
                eliminarViajes: true,
                nombre: userData.nombre || "Jorge Minnesota",
                updatedAt: new Date(),
                setupMasterDate: new Date()
            });

            setStatus("success");
            setMessage("¡Usuario configurado como Admin Master exitosamente!");

        } catch (error) {
            console.error(error);
            setStatus("error");
            setMessage("Error: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <FaCrown className="text-white text-4xl" />
                </div>

                <h1 className="text-2xl font-black uppercase text-gray-800 mb-2">
                    Configurar Admin Master
                </h1>
                <p className="text-gray-500 text-sm mb-6">
                    Email: <span className="font-bold text-gray-700">{EMAIL_MASTER}</span>
                </p>

                {status === "idle" && (
                    <button
                        onClick={configurarAdminMaster}
                        className="btn btn-lg bg-gradient-to-r from-yellow-400 to-yellow-500 border-none text-white font-black uppercase gap-2 shadow-lg hover:from-yellow-500 hover:to-yellow-600 w-full"
                    >
                        <FaCrown /> Activar Admin Master
                    </button>
                )}

                {status === "loading" && (
                    <div className="py-8">
                        <FaSpinner className="text-4xl text-yellow-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">{message}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="py-6">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheck className="text-white text-3xl" />
                        </div>
                        <p className="text-green-600 font-bold text-lg mb-4">{message}</p>

                        {userFound && (
                            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Usuario Configurado:</p>
                                <p className="font-black text-gray-800">{userFound.nombre || userFound.email}</p>
                                <p className="text-xs text-gray-500">{userFound.email}</p>
                                <p className="text-[10px] text-gray-400 mt-2">ID: {userFound.id}</p>
                            </div>
                        )}

                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                            <p className="text-sm font-bold text-yellow-800">
                                Ahora tienes acceso completo al sistema.
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                                Cierra sesión y vuelve a entrar para ver los cambios.
                            </p>
                        </div>

                        <a
                            href="/admin"
                            className="btn btn-success text-white font-black uppercase w-full"
                        >
                            Ir al Panel Admin
                        </a>
                    </div>
                )}

                {status === "error" && (
                    <div className="py-6">
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaExclamationTriangle className="text-white text-3xl" />
                        </div>
                        <p className="text-red-600 font-bold mb-4">{message}</p>
                        <button
                            onClick={() => setStatus("idle")}
                            className="btn btn-outline btn-error font-bold"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                )}

                <p className="text-[10px] text-gray-400 mt-6 uppercase">
                    Esta página es de uso único. Elimínala después de configurar.
                </p>
            </div>
        </div>
    );
};

export default SetupMaster;
