import React, {useState, useEffect, useMemo} from "react";
import Head from "next/head";
import { useAuthContext } from "../context/auth";
import { AdminDataProvider } from "../context/adminData";
import FormViaje from "../components/features/viajes/FormViaje";
import TablaViajes from "../components/features/viajes/TablaViajes";
import HistorialViajesCarrier from "../components/features/viajes/HistorialViajesCarrier";
import SolicitudesCarrier from "../components/features/solicitudes/SolicitudesCarrier";
import { firestore } from "../firebase/firebaseIni";
import {FaPlus, FaListUl, FaHistory, FaUser, FaLock, FaSignOutAlt, FaTruck, FaMap, FaExclamationTriangle} from "react-icons/fa";

const CarriersPage = () => {
    const { user, loading, isEmpresa, signIn, signOut } = useAuthContext();
    const [view, setView] = useState("tabla");
    const [usarBorrador, setUsarBorrador] = useState(false);

    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");
    const [borradores, setBorradores] = useState([]);
    const [editandoDraftId, setEditandoDraftId] = useState(null);
    const [solicitudesPrecargadas, setSolicitudesPrecargadas] = useState(null);
    const [solicitudesUrgentes, setSolicitudesUrgentes] = useState(0);
    const [totalPendientes, setTotalPendientes] = useState(0);

    useEffect(() => {
        try {
            const all = JSON.parse(localStorage.getItem("formViaje_borradores") || "[]");
            setBorradores(all.filter(d => d.vehiculos && d.vehiculos.length > 0));
        } catch (_) { setBorradores([]); }
    }, [view]);

    // Listener para contar solicitudes pendientes y urgentes (>3 días)
    useEffect(() => {
        if (!user) return;
        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .onSnapshot((snap) => {
                const pendientes = snap.docs
                    .map(doc => doc.data())
                    .filter(s => s.estado !== "completado" && s.estado !== "asignado" && s.estado !== "en_proceso");
                setTotalPendientes(pendientes.length);
                const tresDias = 3 * 24 * 60 * 60 * 1000;
                const urgentes = pendientes.filter(s => {
                    const fecha = s.fechaSolicitud?.toDate?.() || new Date(0);
                    return (Date.now() - fecha.getTime()) > tresDias;
                });
                setSolicitudesUrgentes(urgentes.length);
            });
        return () => unsubscribe();
    }, [user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await signIn(email, pass);
        } catch (err) {
            setError("Credenciales incorrectas.");
        }
    };

    // Callback cuando el carrier selecciona solicitudes y quiere crear viaje
    const handleCrearViajeDesde = (solicitudes) => {
        setSolicitudesPrecargadas(solicitudes);
        setUsarBorrador(false);
        setView("nuevo");
    };

    // Si no es empresa pero está logueado, hacer logout
    if (user && !isEmpresa) {
        signOut();
        return null;
    }

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
                        <img src="/assets/Logo.png" className="w-24 mx-auto mb-4" alt="Logo"/>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">Jorge
                            Minnesota INC</h1>
                    </div>
                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <FaUser className="absolute left-4 top-4 text-gray-300"/>
                            <input type="email" placeholder="Email" value={email}
                                   onChange={(e) => setEmail(e.target.value)}
                                   className="input input-bordered w-full pl-12 bg-gray-50 border-none" required/>
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-4 text-gray-300"/>
                            <input type="password" placeholder="Contraseña" value={pass}
                                   onChange={(e) => setPass(e.target.value)}
                                   className="input input-bordered w-full pl-12 bg-gray-50 border-none" required/>
                        </div>
                        <button type="submit"
                                className="btn btn-error w-full text-white font-black uppercase shadow-lg">Entrar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <AdminDataProvider>
            <div className="min-h-screen bg-gray-50 pb-20 font-sans text-black">
                <Head><title>Portal | Jorge Minnesota INC</title></Head>

                {/* HEADER */}
                <header
                    className="bg-white p-4 flex justify-between items-center border-b-2 border-gray-100 sticky top-0 z-[60]">
                    <div className="flex items-center gap-4">
                        <img src="/assets/Logo.png" className="w-16 h-auto" alt="Logo"/>
                        <h1 className="text-lg font-black uppercase italic text-black leading-none tracking-tighter">
                            Jorge Minnesota INC
                        </h1>
                    </div>
                    <button onClick={() => signOut()}
                            className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase border border-red-600 px-3 py-1 rounded-lg">
                        <FaSignOutAlt/> Salir
                    </button>
                </header>

                {/* NOMBRE Y BOTONES */}
                <section className="bg-white px-6 py-4 flex justify-between items-center border-b shadow-sm">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                                {user.datosEmpresa?.nombreEmpresa || user.username}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                                Usuario: {user.username}
                            </p>
                        </div>
                        <a
                            href="/carrier-mapa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black uppercase transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                        >
                            <FaMap size={14}/> Mapa
                        </a>
                    </div>
                    <div className="flex gap-2">
                        {view !== 'nuevo' && (
                            <button
                                onClick={() => { setUsarBorrador(false); setSolicitudesPrecargadas(null); setView('nuevo'); }}
                                className="btn btn-xs h-8 bg-gray-800 text-white border-none rounded-md px-4 font-black uppercase text-[9px]"
                            >
                                <FaPlus className="mr-1"/> Nuevo
                            </button>
                        )}
                    </div>
                </section>

                {/* CONTENIDO */}
                <main className="p-4">
                    {view === "nuevo" ? (
                        <FormViaje
                            user={user}
                            isCarrierMode={true}
                            restaurarDraft={usarBorrador}
                            draftId={editandoDraftId}
                            solicitudesPrecargadas={solicitudesPrecargadas}
                            onSuccess={() => {
                                setUsarBorrador(false);
                                setEditandoDraftId(null);
                                setSolicitudesPrecargadas(null);
                                setView("tabla");
                            }}
                        />
                    ) : view === "historial" ? (
                        <HistorialViajesCarrier user={user} />
                    ) : view === "solicitudes" ? (
                        <SolicitudesCarrier user={user} onCrearViaje={handleCrearViajeDesde} />
                    ) : (
                        <TablaViajes
                            user={user}
                            isCarrierMode={true}
                            borradores={borradores}
                            onEditarBorrador={(draftId) => {
                                setEditandoDraftId(draftId);
                                setUsarBorrador(true);
                                setView("nuevo");
                            }}
                            onDescartarBorrador={(draftId) => {
                                try {
                                    const all = JSON.parse(localStorage.getItem("formViaje_borradores") || "[]");
                                    localStorage.setItem("formViaje_borradores", JSON.stringify(all.filter(d => d.id !== draftId)));
                                } catch(_){}
                                setBorradores(prev => prev.filter(d => d.id !== draftId));
                            }}
                        />
                    )}
                </main>

                {/* NAVEGACIÓN INFERIOR */}
                <nav className="fixed bottom-0 left-0 w-full flex h-20 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={() => { setUsarBorrador(false); setView("tabla"); }}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors border-r border-gray-100 ${view === 'tabla' ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}
                    >
                        <FaListUl size={20}/>
                        <span className="text-[10px] font-black uppercase">Mis Viajes</span>
                    </button>

                    <button
                        onClick={() => setView("solicitudes")}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors border-r border-gray-100 relative ${view === 'solicitudes' ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}
                    >
                        <div className="relative">
                            <FaTruck size={20}/>
                            {totalPendientes > 0 && view !== 'solicitudes' && (
                                <span className={`absolute -top-2 -right-3 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-black text-white px-1 ${
                                    solicitudesUrgentes > 0 ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                                }`}>
                                    {totalPendientes}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-black uppercase">Solicitudes</span>
                    </button>

                    <button
                        onClick={() => setView("historial")}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors border-r border-gray-100 ${view === 'historial' ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}
                    >
                        <FaHistory size={20}/>
                        <span className="text-[10px] font-black uppercase">Historial</span>
                    </button>

                    <button
                        onClick={() => { setUsarBorrador(false); setSolicitudesPrecargadas(null); setView("nuevo"); }}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${view === 'nuevo' ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}
                    >
                        <FaPlus size={20}/>
                        <span className="text-[10px] font-black uppercase">Nuevo</span>
                    </button>
                </nav>
            </div>
        </AdminDataProvider>
    );
};

export default CarriersPage;
