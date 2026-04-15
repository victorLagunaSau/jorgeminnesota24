import React, { useState } from "react";
import { auth, firestore } from "../firebase/firebaseIni";
import { FaUserPlus, FaCheck, FaSpinner, FaExclamationTriangle } from "react-icons/fa";

const EMAIL_ORIGEN = "olivia_cervantes@hotmail.com";
const EMAIL_NUEVO = "jorge@gmail.com";
const PASSWORD_NUEVO = "12121212";
const NOMBRE_NUEVO = "Jorge";

const ClonarUsuario = () => {
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");
    const [info, setInfo] = useState(null);

    const clonar = async () => {
        setStatus("loading");
        setMessage("Buscando usuario origen...");

        try {
            const origenSnap = await firestore()
                .collection("users")
                .where("email", "==", EMAIL_ORIGEN)
                .limit(1)
                .get();

            if (origenSnap.empty) {
                setStatus("error");
                setMessage(`No se encontró el usuario origen: ${EMAIL_ORIGEN}`);
                return;
            }

            const origenData = origenSnap.docs[0].data();

            setMessage("Creando cuenta nueva en Firebase Auth...");
            const cred = await auth().createUserWithEmailAndPassword(EMAIL_NUEVO, PASSWORD_NUEVO);
            const nuevoUid = cred.user.uid;

            setMessage("Copiando permisos...");
            const { email, id, createdAt, updatedAt, ...permisos } = origenData;
            const nuevoDoc = {
                ...permisos,
                email: EMAIL_NUEVO,
                nombre: NOMBRE_NUEVO,
                createdAt: new Date(),
                updatedAt: new Date(),
                clonadoDe: EMAIL_ORIGEN
            };

            await firestore().collection("users").doc(nuevoUid).set(nuevoDoc);

            setInfo({
                uid: nuevoUid,
                email: EMAIL_NUEVO,
                permisos: nuevoDoc
            });
            setStatus("success");
            setMessage("Usuario clonado exitosamente.");
        } catch (error) {
            console.error(error);
            setStatus("error");
            setMessage("Error: " + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <FaUserPlus className="text-white text-4xl" />
                </div>

                <h1 className="text-2xl font-black uppercase text-gray-800 mb-2">
                    Clonar Permisos de Usuario
                </h1>
                <p className="text-gray-500 text-xs mb-1">
                    Origen: <span className="font-bold text-gray-700">{EMAIL_ORIGEN}</span>
                </p>
                <p className="text-gray-500 text-xs mb-1">
                    Nuevo: <span className="font-bold text-gray-700">{EMAIL_NUEVO}</span>
                </p>
                <p className="text-gray-500 text-xs mb-6">
                    Password: <span className="font-mono font-bold text-gray-700">{PASSWORD_NUEVO}</span>
                </p>

                {status === "idle" && (
                    <button
                        onClick={clonar}
                        className="btn btn-lg bg-gradient-to-r from-blue-500 to-indigo-500 border-none text-white font-black uppercase gap-2 shadow-lg w-full"
                    >
                        <FaUserPlus /> Crear y Clonar
                    </button>
                )}

                {status === "loading" && (
                    <div className="py-8">
                        <FaSpinner className="text-4xl text-indigo-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">{message}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="py-6">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheck className="text-white text-3xl" />
                        </div>
                        <p className="text-green-600 font-bold text-lg mb-4">{message}</p>

                        {info && (
                            <div className="bg-gray-50 rounded-xl p-4 text-left mb-4 text-xs">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Nuevo Usuario:</p>
                                <p className="font-bold text-gray-800">{info.email}</p>
                                <p className="text-gray-500">UID: {info.uid}</p>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mt-3 mb-1">Permisos copiados:</p>
                                <pre className="bg-white p-2 rounded overflow-auto max-h-48 text-[10px]">
{JSON.stringify(info.permisos, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-xs text-yellow-800 font-semibold">
                            Cierra sesión y vuelve a entrar con las credenciales nuevas para probar qué puede ver este tipo de usuario.
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="py-6">
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaExclamationTriangle className="text-white text-3xl" />
                        </div>
                        <p className="text-red-600 font-bold mb-4">{message}</p>
                        <button onClick={() => setStatus("idle")} className="btn btn-outline btn-error font-bold">
                            Intentar de nuevo
                        </button>
                    </div>
                )}

                <p className="text-[10px] text-gray-400 mt-6 uppercase">
                    Página de uso único — elimínala después
                </p>
            </div>
        </div>
    );
};

export default ClonarUsuario;
