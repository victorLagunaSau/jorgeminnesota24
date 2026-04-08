import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import { FaUser, FaLock, FaSignOutAlt, FaCar, FaTruck, FaMapMarkerAlt, FaPhone, FaSearch, FaCalendarAlt, FaWarehouse, FaPlus } from "react-icons/fa";

const PortalPage = () => {
    const { user, loading, isCliente, signIn, signOut } = useAuthContext();
    const [vehiculos, setVehiculos] = useState([]);
    const [loadingVehiculos, setLoadingVehiculos] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");

    // Cargar vehículos del cliente
    useEffect(() => {
        if (!user?.datosCliente) return;

        const nombreCliente = user.datosCliente.cliente;
        if (!nombreCliente) {
            setLoadingVehiculos(false);
            return;
        }

        const unsubscribe = firestore()
            .collection("vehiculos")
            .where("cliente", "==", nombreCliente)
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Ordenar por fecha de registro (más reciente primero)
                lista.sort((a, b) => {
                    const fechaA = a.registro?.timestamp?.toDate?.() || new Date(0);
                    const fechaB = b.registro?.timestamp?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setVehiculos(lista);
                setLoadingVehiculos(false);
            }, (error) => {
                console.error("Error cargando vehículos:", error);
                setLoadingVehiculos(false);
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

    // Si no es cliente pero está logueado, hacer logout
    if (user && !isCliente) {
        signOut();
        return null;
    }

    if (loading) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white">
            <span className="loading loading-ring loading-lg text-blue-600"></span>
        </div>
    );

    // Login Form
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center p-6">
                <Head><title>Portal Clientes | Jorge Minnesota INC</title></Head>
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <img src="/assets/Logo.png" className="w-24 mx-auto mb-4" alt="Logo"/>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">
                            Portal de Clientes
                        </h1>
                        <p className="text-sm text-gray-500 mt-2">Consulta el estado de tus vehículos</p>
                    </div>
                    {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <FaUser className="absolute left-4 top-4 text-gray-300"/>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                required
                            />
                        </div>
                        <div className="relative">
                            <FaLock className="absolute left-4 top-4 text-gray-300"/>
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary w-full text-white font-black uppercase shadow-lg"
                        >
                            Entrar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Portal Content
    const clienteData = user.datosCliente || {};
    const vehiculosFiltrados = vehiculos.filter(v =>
        v.binNip?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.marca?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const getStatusColor = (status) => {
        const colors = {
            'PR': 'bg-gray-200 text-gray-700',
            'IN': 'bg-yellow-200 text-yellow-800',
            'TR': 'bg-blue-200 text-blue-800',
            'EB': 'bg-purple-200 text-purple-800',
            'DS': 'bg-orange-200 text-orange-800',
            'EN': 'bg-green-200 text-green-800',
        };
        return colors[status] || 'bg-gray-200 text-gray-700';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'PR': 'Registrado',
            'IN': 'Cargando',
            'TR': 'En Viaje',
            'EB': 'En Brownsville',
            'DS': 'Descargado',
            'EN': 'Entregado',
        };
        return labels[status] || status;
    };

    // Formatear fecha
    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10 font-sans text-black">
            <Head><title>Portal | Jorge Minnesota INC</title></Head>

            {/* Header */}
            <header className="bg-white p-4 flex justify-between items-center border-b-2 border-gray-100 sticky top-0 z-[60] shadow-sm">
                <div className="flex items-center gap-4">
                    <img src="/assets/Logo.png" className="w-12 h-auto" alt="Logo"/>
                    <div>
                        <h1 className="text-lg font-black uppercase italic text-black leading-none tracking-tighter">
                            Portal de Clientes
                        </h1>
                        <p className="text-[10px] text-gray-500">Jorge Minnesota Logistic LLC</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/solicitar">
                        <a className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase border border-green-600 px-3 py-1 rounded-lg hover:bg-green-50">
                            <FaPlus/> Solicitar Vehículo
                        </a>
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50"
                    >
                        <FaSignOutAlt/> Salir
                    </button>
                </div>
            </header>

            {/* User Info */}
            <section className="bg-white px-6 py-4 border-b shadow-sm">
                <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                            {clienteData.cliente || user.username}
                        </h2>
                        <div className="flex items-center gap-4 mt-1">
                            {clienteData.telefonoCliente && (
                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <FaPhone className="text-blue-500"/> {clienteData.telefonoCliente}
                                </span>
                            )}
                            {clienteData.ciudadCliente && (
                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <FaMapMarkerAlt className="text-red-500"/> {clienteData.ciudadCliente}, {clienteData.estadoCliente}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg">
                        <span className="text-[10px] text-blue-600 font-bold uppercase">Total Vehículos</span>
                        <p className="text-3xl font-black text-blue-700">{vehiculos.length}</p>
                    </div>
                </div>
            </section>

            {/* Search */}
            <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="relative">
                    <FaSearch className="absolute left-4 top-3.5 text-gray-400"/>
                    <input
                        type="text"
                        placeholder="Buscar por BIN, marca o modelo..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="input input-bordered w-full pl-12 bg-white text-black"
                    />
                </div>
            </div>

            {/* Vehicles List */}
            <main className="max-w-6xl mx-auto px-4">
                {loadingVehiculos ? (
                    <div className="flex justify-center py-20">
                        <span className="loading loading-spinner loading-lg text-blue-600"></span>
                    </div>
                ) : vehiculosFiltrados.length === 0 ? (
                    <div className="text-center py-20">
                        <FaCar className="text-6xl text-gray-300 mx-auto mb-4"/>
                        <p className="text-gray-500">
                            {busqueda ? "No se encontraron vehículos con esa búsqueda" : "No tienes vehículos registrados"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Header de la tabla */}
                        <div className="hidden md:grid md:grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase">
                            <div className="col-span-3">Vehículo</div>
                            <div className="col-span-2">Origen</div>
                            <div className="col-span-2">Almacén</div>
                            <div className="col-span-2 text-center">Fecha Llegada</div>
                            <div className="col-span-3 text-center">Estado</div>
                        </div>

                        {/* Lista de vehículos */}
                        <div className="divide-y divide-gray-100">
                            {vehiculosFiltrados.map((v, index) => (
                                <div
                                    key={v.id}
                                    className={`p-4 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                >
                                    {/* Vista móvil */}
                                    <div className="md:hidden space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-base text-gray-800 uppercase">{v.binNip}</p>
                                                <p className="text-sm text-gray-600">{v.marca} {v.modelo}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(v.estatus)}`}>
                                                {getStatusLabel(v.estatus)}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-[11px]">
                                            <div className="flex items-center gap-1 text-gray-500">
                                                <FaMapMarkerAlt className="text-red-400"/> {v.ciudad}, {v.estado}
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-500">
                                                <FaWarehouse className="text-blue-400"/> {v.almacen || '-'}
                                            </div>
                                            <div className="flex items-center gap-1 text-blue-600 font-bold">
                                                <FaCalendarAlt /> {formatDate(v.registro?.timestamp)}
                                            </div>
                                        </div>
                                        {v.estatus === 'TR' && (
                                            <div className="bg-blue-100 rounded-lg p-2 flex items-center gap-2">
                                                <FaTruck className="text-blue-600 animate-pulse"/>
                                                <span className="text-[11px] font-bold text-blue-700">En tránsito hacia Brownsville</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Vista desktop */}
                                    <div className="hidden md:grid md:grid-cols-12 gap-2 items-center">
                                        <div className="col-span-3">
                                            <p className="font-black text-sm text-gray-800 uppercase">{v.binNip}</p>
                                            <p className="text-[11px] text-gray-500">{v.marca} {v.modelo}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[12px] font-medium text-gray-700">{v.ciudad || '-'}</p>
                                            <p className="text-[10px] text-gray-400 uppercase">{v.estado || ''}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[12px] font-medium text-gray-700">{v.almacen || '-'}</span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <div className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                                                <FaCalendarAlt className="text-blue-500 text-[10px]"/>
                                                <span className="text-[11px] font-bold text-blue-700">
                                                    {formatDate(v.registro?.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 flex justify-center items-center gap-2">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(v.estatus)}`}>
                                                {getStatusLabel(v.estatus)}
                                            </span>
                                            {v.estatus === 'TR' && (
                                                <FaTruck className="text-blue-600 animate-pulse"/>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-10 text-center text-[10px] text-gray-400 uppercase">
                Portal de Clientes - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default PortalPage;
