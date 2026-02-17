import React, { useState, useEffect } from "react";
import Head from "next/head";
import { firestore, auth } from "../firebase/firebaseIni";
import FormViaje from "../components/Viajes/FormViaje";
import TablaViajes from "../components/Viajes/TablaViajes";
import { FaTruck, FaPlus, FaListUl, FaSignOutAlt, FaLock, FaUser } from "react-icons/fa";

const CarriersPage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("tabla"); // 'tabla' o 'nuevo'

    // Estados para Login
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
                    // Si no es empresa, cerramos sesión por seguridad
                    auth().signOut();
                    setError("Acceso denegado: Solo para Carriers registrados.");
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
            setError("Credenciales incorrectas o usuario no registrado.");
        }
    };

    if (loading) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white-500">
            <span className="loading loading-ring loading-lg text-red-600"></span>
            <p className="text-[10px] font-black uppercase mt-4 animate-pulse">Cargando Portal...</p>
        </div>
    );

    // VISTA DE LOGIN (Si no hay usuario)
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-300 flex flex-col justify-center p-6 font-sans">
                <div className="max-w-md mx-auto w-full bg-white-500 rounded-3xl shadow-xl p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <img src="/assets/Logoprint.png" className="w-24 mx-auto mb-4" alt="Logo" />
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">Carrier Portal</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logística Jorge Minnesota</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <FaUser className="absolute left-4 top-4 text-gray-300" />
                            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-200 text-black border-none focus:ring-2 focus:ring-red-600" required />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-4 text-gray-300" />
                            <input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-200 text-black border-none focus:ring-2 focus:ring-red-600" required />
                        </div>
                        {error && <p className="text-[10px] font-bold text-red-600 uppercase text-center">{error}</p>}
                        <button type="submit" className="btn btn-error w-full text-white-500 font-black uppercase tracking-widest shadow-lg shadow-red-200">
                            Entrar al Sistema
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // VISTA DEL PORTAL (Usuario logueado)
    return (
        <div className="min-h-screen bg-gray-100 pb-24 font-sans text-black">
            <Head><title>Portal de Viajes | Jorge Minnesota</title></Head>

            {/* HEADER MÓVIL */}
            <div className="bg-white-500 p-4 shadow-sm flex justify-between items-center sticky top-0 z-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg text-white-500"><FaTruck size={18}/></div>
                    <div>
                        <h1 className="font-black text-sm text-gray-800 uppercase italic leading-none">Mi Portal</h1>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 truncate max-w-[150px]">{user.username}</p>
                    </div>
                </div>
                <button onClick={() => auth().signOut()} className="btn btn-ghost btn-xs text-gray-400 font-bold uppercase underline">
                    Salir
                </button>
            </div>

            {/* CONTENIDO DINÁMICO */}
            <main className="p-3 md:p-6">
                {view === "nuevo" ? (
                    <FormViaje
                        user={user}
                        isCarrierMode={true}
                        onSuccess={() => setView("tabla")}
                    />
                ) : (
                    <TablaViajes
                        user={user}
                        isCarrierMode={true}
                    />
                )}
            </main>

            {/* TAB BAR INFERIOR (ESTILO APP) */}
            <nav className="fixed bottom-0 left-0 w-full bg-white-500 border-t border-gray-200 flex justify-around items-center p-3 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => setView("tabla")}
                    className={`flex flex-col items-center transition-colors ${view === 'tabla' ? 'text-red-600' : 'text-gray-300'}`}
                >
                    <FaListUl size={22} />
                    <span className="text-[9px] font-black uppercase mt-1">Mis Viajes</span>
                </button>

                <button
                    onClick={() => setView("nuevo")}
                    className="relative"
                >
                    <div className={`flex flex-col items-center p-4 rounded-full -mt-12 shadow-xl border-4 border-gray-100 transition-all ${view === 'nuevo' ? 'bg-red-400 text-white-500 scale-110' : 'bg-red-600 text-white-500'}`}>
                        <FaPlus size={24} />
                    </div>
                    <span className={`text-[9px] font-black uppercase mt-1 block text-center ${view === 'nuevo' ? 'text-red-600' : 'text-gray-300'}`}>
                        Nuevo
                    </span>
                </button>

                <div className="w-22 flex flex-col items-center text-gray-300 grayscale opacity-50 cursor-not-allowed">
                    <FaSignOutAlt size={22} />
                    <span className="text-[9px] font-black uppercase mt-1">Soporte</span>
                </div>
            </nav>
        </div>
    );
};

export default CarriersPage;