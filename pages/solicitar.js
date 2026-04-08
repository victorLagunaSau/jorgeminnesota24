import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import {
    FaUser, FaLock, FaSignOutAlt, FaCar, FaSearch, FaPlus, FaTrash,
    FaMapMarkerAlt, FaCalendarAlt, FaKey, FaBarcode, FaSpinner,
    FaCheckCircle, FaClock, FaArrowLeft
} from "react-icons/fa";

const SolicitarPage = () => {
    const { user, loading, isCliente, signIn, signOut } = useAuthContext();

    // Estados para búsqueda
    const [lotNumber, setLotNumber] = useState("");
    const [gatePass, setGatePass] = useState("");
    const [searching, setSearching] = useState(false);
    const [vehicleResult, setVehicleResult] = useState(null);
    const [searchError, setSearchError] = useState("");

    // Estados para lista de solicitudes
    const [solicitudes, setSolicitudes] = useState([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
    const [guardando, setGuardando] = useState(false);

    // Login form
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loginError, setLoginError] = useState("");

    // Cargar solicitudes del cliente
    useEffect(() => {
        const clienteId = user?.datosCliente?.id || user?.id;

        if (!clienteId) {
            setLoadingSolicitudes(false);
            return;
        }

        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .where("clienteId", "==", clienteId)
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lista.sort((a, b) => {
                    const fechaA = a.fechaSolicitud?.toDate?.() || new Date(0);
                    const fechaB = b.fechaSolicitud?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setSolicitudes(lista);
                setLoadingSolicitudes(false);
            }, (error) => {
                console.error("Error cargando solicitudes:", error);
                setLoadingSolicitudes(false);
            });

        return () => unsubscribe();
    }, [user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        try {
            await signIn(email, pass);
        } catch (err) {
            setLoginError("Credenciales incorrectas.");
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!lotNumber.trim() || !gatePass.trim() || gatePass.length < 4) return;

        setSearching(true);
        setSearchError("");
        setVehicleResult(null);

        try {
            const response = await fetch("/api/scrape-vehicle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lotNumber: lotNumber.trim(), gatePass: gatePass.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                setSearchError(data.error || "Error al buscar vehículo");
                return;
            }

            setVehicleResult(data.vehicle);
        } catch (error) {
            setSearchError("Error de conexión. Intenta de nuevo.");
        } finally {
            setSearching(false);
        }
    };

    const handleAgregarSolicitud = async () => {
        if (!vehicleResult) {
            alert("No hay vehículo seleccionado");
            return;
        }

        if (!user) {
            alert("Error: Debes iniciar sesión");
            return;
        }

        const clienteId = user.datosCliente?.id || user.id;

        setGuardando(true);
        try {
            await firestore().collection("solicitudesVehiculos").add({
                clienteId: clienteId,
                clienteNombre: user.datosCliente.cliente || user.username || "",
                clienteTelefono: user.datosCliente.telefonoCliente || "",
                // Datos del vehículo
                lotNumber: vehicleResult.lotNumber,
                gatePass: vehicleResult.gatePass,
                make: vehicleResult.make || "",
                model: vehicleResult.model || "",
                year: vehicleResult.year || "",
                vin: vehicleResult.vin || "",
                location: vehicleResult.location || "",
                imageUrl: vehicleResult.imageUrl || "",
                source: vehicleResult.source || "",
                auctionDate: vehicleResult.auctionDate || "",
                // Metadatos
                estado: "pendiente", // pendiente, aprobado, en_proceso, completado
                fechaSolicitud: new Date(),
                notas: ""
            });

            // Limpiar búsqueda
            setVehicleResult(null);
            setLotNumber("");
            setGatePass("");

        } catch (error) {
            console.error("Error guardando solicitud:", error);
            alert("Error al guardar la solicitud: " + error.message);
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminarSolicitud = async (id) => {
        if (!confirm("¿Estás seguro de eliminar esta solicitud?")) return;

        try {
            await firestore().collection("solicitudesVehiculos").doc(id).delete();
        } catch (error) {
            console.error("Error eliminando:", error);
        }
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            pendiente: "bg-yellow-100 text-yellow-800",
            aprobado: "bg-blue-100 text-blue-800",
            en_proceso: "bg-purple-100 text-purple-800",
            completado: "bg-green-100 text-green-800"
        };
        const labels = {
            pendiente: "Pendiente",
            aprobado: "Aprobado",
            en_proceso: "En Proceso",
            completado: "Completado"
        };
        return { className: badges[estado] || badges.pendiente, label: labels[estado] || estado };
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
                <Head><title>Solicitar Vehículos | Jorge Minnesota</title></Head>
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <img src="/assets/Logo.png" className="w-24 mx-auto mb-4" alt="Logo"/>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">
                            Solicitar Vehículos
                        </h1>
                        <p className="text-sm text-gray-500 mt-2">Inicia sesión para solicitar vehículos</p>
                    </div>
                    {loginError && <p className="text-red-500 text-center mb-4 text-sm">{loginError}</p>}
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
                        <button type="submit" className="btn btn-primary w-full text-white font-black uppercase shadow-lg">
                            Entrar
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link href="/">
                            <a className="text-sm text-blue-600 hover:underline">← Volver al inicio</a>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Main Content
    const clienteData = user.datosCliente || {};

    return (
        <div className="min-h-screen bg-gray-50 pb-10 font-sans text-black">
            <Head><title>Solicitar Vehículos | Jorge Minnesota</title></Head>

            {/* Header */}
            <header className="bg-white p-4 flex justify-between items-center border-b-2 border-gray-100 sticky top-0 z-[60] shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <a className="btn btn-ghost btn-sm">
                            <FaArrowLeft />
                        </a>
                    </Link>
                    <img src="/assets/Logo.png" className="w-10 h-auto" alt="Logo"/>
                    <div>
                        <h1 className="text-lg font-black uppercase italic text-black leading-none tracking-tighter">
                            Solicitar Vehículos
                        </h1>
                        <p className="text-[10px] text-gray-500">Busca y solicita vehículos de subasta</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/portal">
                        <a className="btn btn-ghost btn-sm text-blue-600">
                            <FaCar className="mr-1"/> Mis Vehículos
                        </a>
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase border border-red-600 px-3 py-1 rounded-lg hover:bg-red-50"
                    >
                        <FaSignOutAlt/> Salir
                    </button>
                </div>
            </header>

            {/* User Info */}
            <section className="bg-white px-6 py-3 border-b shadow-sm">
                <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FaUser className="text-blue-600"/>
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">{clienteData.cliente || user.username}</p>
                            <p className="text-[11px] text-gray-500">{user.email}</p>
                        </div>
                    </div>
                    <div className="bg-orange-50 px-4 py-2 rounded-lg">
                        <span className="text-[10px] text-orange-600 font-bold uppercase">Solicitudes</span>
                        <p className="text-2xl font-black text-orange-700">{solicitudes.length}</p>
                    </div>
                </div>
            </section>

            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="grid gap-6 lg:grid-cols-2">

                    {/* Panel de Búsqueda */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-black uppercase text-gray-800 mb-4 flex items-center gap-2">
                                <FaSearch className="text-blue-600"/> Buscar Vehículo
                            </h2>
                            <form onSubmit={handleSearch} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                                            Número de Lote *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 43874580"
                                            value={lotNumber}
                                            onChange={(e) => setLotNumber(e.target.value.replace(/\D/g, ''))}
                                            className="input input-bordered w-full bg-white text-black"
                                            disabled={searching}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                                            Gate Pass *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: A1B2"
                                            value={gatePass}
                                            onChange={(e) => setGatePass(e.target.value.toUpperCase().slice(0, 5))}
                                            className="input input-bordered w-full bg-white text-black uppercase"
                                            disabled={searching}
                                            maxLength={5}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={searching || !lotNumber.trim() || gatePass.length < 4}
                                    className="btn btn-primary w-full text-white font-bold"
                                >
                                    {searching ? (
                                        <>
                                            <FaSpinner className="animate-spin mr-2"/> Buscando en IAA y Copart...
                                        </>
                                    ) : (
                                        <>
                                            <FaSearch className="mr-2"/> Buscar Vehículo
                                        </>
                                    )}
                                </button>
                            </form>

                            {searchError && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {searchError}
                                </div>
                            )}
                        </div>

                        {/* Resultado de búsqueda */}
                        {vehicleResult && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {vehicleResult.imageUrl && (
                                    <div className="relative w-full h-48 bg-gray-100">
                                        <img
                                            src={vehicleResult.imageUrl}
                                            alt={`${vehicleResult.year} ${vehicleResult.make} ${vehicleResult.model}`}
                                            className="w-full h-full object-contain"
                                        />
                                        <span className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold">
                                            {vehicleResult.source}
                                        </span>
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="text-xl font-black text-gray-800 uppercase">
                                        {vehicleResult.year} {vehicleResult.make} {vehicleResult.model}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">Lote: {vehicleResult.lotNumber}</p>

                                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                        <div className="flex items-start gap-2">
                                            <FaBarcode className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">VIN</p>
                                                <p className="font-mono text-xs">{vehicleResult.vin || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FaMapMarkerAlt className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">Ubicación</p>
                                                <p className="text-xs">{vehicleResult.location || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FaKey className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">Gate Pass</p>
                                                <p className="font-mono text-xs">{vehicleResult.gatePass}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FaCalendarAlt className="text-gray-400 mt-1"/>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase">Subasta</p>
                                                <p className="text-xs">{vehicleResult.auctionDate || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAgregarSolicitud}
                                        disabled={guardando}
                                        className="btn btn-success w-full text-white font-bold"
                                    >
                                        {guardando ? (
                                            <><FaSpinner className="animate-spin mr-2"/> Guardando...</>
                                        ) : (
                                            <><FaPlus className="mr-2"/> Agregar a Mis Solicitudes</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel de Solicitudes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-black uppercase text-gray-800 mb-4 flex items-center gap-2">
                            <FaClock className="text-orange-600"/> Mis Solicitudes
                        </h2>

                        {loadingSolicitudes ? (
                            <div className="flex justify-center py-10">
                                <span className="loading loading-spinner loading-lg text-blue-600"></span>
                            </div>
                        ) : solicitudes.length === 0 ? (
                            <div className="text-center py-10">
                                <FaCar className="text-5xl text-gray-300 mx-auto mb-4"/>
                                <p className="text-gray-500">No tienes solicitudes aún</p>
                                <p className="text-sm text-gray-400">Busca un vehículo para comenzar</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {solicitudes.map((sol) => {
                                    const badge = getEstadoBadge(sol.estado);
                                    return (
                                        <div key={sol.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                            <div className="flex gap-3">
                                                {sol.imageUrl && (
                                                    <img
                                                        src={sol.imageUrl}
                                                        alt={`${sol.year} ${sol.make}`}
                                                        className="w-20 h-16 object-cover rounded bg-gray-100"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-800 uppercase truncate">
                                                                {sol.year} {sol.make} {sol.model}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500">
                                                                Lote: {sol.lotNumber} • {sol.source}
                                                            </p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${badge.className}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <FaMapMarkerAlt/> {sol.location || 'N/A'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <FaCalendarAlt/> {sol.fechaSolicitud?.toDate?.().toLocaleDateString('es-MX') || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {sol.estado === "pendiente" && (
                                                    <button
                                                        onClick={() => handleEliminarSolicitud(sol.id)}
                                                        className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
                                                    >
                                                        <FaTrash/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-10 text-center text-[10px] text-gray-400 uppercase">
                Solicitar Vehículos - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default SolicitarPage;
