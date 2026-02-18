import React, { useState, useEffect } from "react";
import Head from "next/head";
import { firestore, auth } from "../firebase/firebaseIni";
import FormViaje from "../components/Viajes/FormViaje";
import TablaViajes from "../components/Viajes/TablaViajes";
import { FaPlus, FaListUl, FaUser, FaLock, FaSignOutAlt } from "react-icons/fa";

const CarriersPage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("tabla");

    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const unsub = auth().onAuthStateChanged(async (userAuth) => {
            if (userAuth) {
                const doc = await firestore().collection("users").doc(userAuth.uid).get();
                if (doc.exists && doc.data().tipo === "empresa") {
                    setUser({ id: doc.id, ...doc.data() });
                } else {
                    auth().signOut();
                    setError("Acceso denegado.");
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await auth().signInWithEmailAndPassword(email, pass);
        } catch (err) {
            setError("Credenciales incorrectas.");
        }
    };

    if (loading) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white">
            <span className="loading loading-ring loading-lg text-red-600"></span>
        </div>
    );

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center p-6">
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <img src="/assets/Logo.png" className="w-24 mx-auto mb-4" alt="Logo" />
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">Jorge Minnesota INC</h1>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <FaUser className="absolute left-4 top-4 text-gray-300" />
                            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-50 border-none" required />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-4 text-gray-300" />
                            <input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-50 border-none" required />
                        </div>
                        <button type="submit" className="btn btn-error w-full text-white font-black uppercase shadow-lg">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-black">
            <Head><title>Portal | Jorge Minnesota INC</title></Head>

            {/* HEADER SUPERIOR RE-DISEÑADO */}
            <header className="bg-white p-4 flex justify-between items-center border-b-2 border-gray-100 sticky top-0 z-[60]">
                <div className="flex items-center gap-4">
                    <img src="/assets/Logo.png" className="w-16 h-auto" alt="Logo" />
                    <h1 className="text-lg font-black uppercase italic text-black leading-none tracking-tighter">
                        Jorge Minnesota INC
                    </h1>
                </div>
                <button onClick={() => auth().signOut()} className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase border border-red-600 px-3 py-1 rounded-lg">
                    <FaSignOutAlt /> Salir
                </button>
            </header>

            {/* MODULO INFERIOR CON NOMBRE DE USUARIO Y BOTÓN DINÁMICO */}
            <section className="bg-white px-6 py-4 flex justify-between items-center border-b shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                        VICTOR LAGUNA INC
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                        {user.username}
                    </p>
                </div>

                {/* BOTÓN SUPERIOR PEQUEÑO: SOLO MUESTRA LA SECCIÓN DONDE NO ESTÁS */}
                <button
                    onClick={() => setView(view === 'tabla' ? 'nuevo' : 'tabla')}
                    className="btn btn-xs h-8 bg-gray-800 text-white border-none rounded-md px-4 font-black uppercase text-[9px]"
                >
                    {view === 'tabla' ? <><FaPlus className="mr-1"/> Nuevo</> : <><FaListUl className="mr-1"/> Lista</>}
                </button>
            </section>

            {/* CONTENIDO PRINCIPAL */}
            <main className="p-4">
                {view === "nuevo" ? (
                    <FormViaje user={user} isCarrierMode={true} onSuccess={() => setView("tabla")} />
                ) : (
                    <TablaViajes user={user} isCarrierMode={true} />
                )}
            </main>

            {/* NAVEGACIÓN INFERIOR: CUADRADA, DE LADO A LADO */}
            <nav className="fixed bottom-0 left-0 w-full flex h-20 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                <button
                    onClick={() => setView("tabla")}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors border-r border-gray-100 ${view === 'tabla' ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}
                >
                    <FaListUl size={22} />
                    <span className="text-[10px] font-black uppercase">Mis Viajes</span>
                </button>

                <button
                    onClick={() => setView("nuevo")}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${view === 'nuevo' ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}
                >
                    <FaPlus size={22} />
                    <span className="text-[10px] font-black uppercase">Nuevo Viaje</span>
                </button>
            </nav>
        </div>
    );
};

export default CarriersPage;