import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import firebase from "firebase/app";
import { useAuthContext } from "../context/auth";
import { auth, firestore } from "../firebase/firebaseIni";
import { COLLECTIONS, PHONE_CONFIG, FIELD_LIMITS } from "../constants";
import {
    FaUser, FaLock, FaSignOutAlt, FaCar, FaTruck, FaMapMarkerAlt, FaPhone,
    FaSearch, FaCalendarAlt, FaWarehouse, FaPlus, FaUserCircle, FaArrowLeft,
    FaEnvelope, FaIdCard, FaGlobe, FaCity, FaCheckCircle, FaLockOpen,
    FaUserPlus, FaEye, FaEyeSlash
} from "react-icons/fa";

const ClientsPage = () => {
    const { user, loading, isCliente, signIn, signOut } = useAuthContext();
    const [vehiculos, setVehiculos] = useState([]);
    const [loadingVehiculos, setLoadingVehiculos] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    const [vista, setVista] = useState("vehiculos"); // "vehiculos" | "perfil"

    // Login state
    const [modoAuth, setModoAuth] = useState("login"); // "login" | "registro"
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [mostrarPass, setMostrarPass] = useState(false);

    // Registro state
    const [regNombre, setRegNombre] = useState("");
    const [regTelefono, setRegTelefono] = useState("");
    const [regConfirmPass, setRegConfirmPass] = useState("");

    // Perfil state — inicializar con datosCliente del auth hook (snapshot estático)
    const [clienteData, setClienteData] = useState(user?.datosCliente || {});
    const [formPerfil, setFormPerfil] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [mensajePerfil, setMensajePerfil] = useState("");

    // Helper: extraer campos editables del perfil desde un doc de cliente
    const extractPerfilFields = (data) => ({
        telefonoCliente: data.telefonoCliente || "",
        emailCliente: data.emailCliente || data.emailAcceso || "",
        ciudadCliente: data.ciudadCliente || "",
        estadoCliente: data.estadoCliente || "",
        paisCliente: data.paisCliente || "",
        rfcCliente: data.rfcCliente || "",
        direccionCliente: data.direccionCliente || "",
    });

    // Sincronizar datosCliente del auth hook como estado inicial
    useEffect(() => {
        if (user?.datosCliente && !clienteData.id) {
            setClienteData(user.datosCliente);
            setFormPerfil(extractPerfilFields(user.datosCliente));
        }
    }, [user?.datosCliente]);

    // Suscripción en tiempo real al documento del cliente
    // user.datosCliente.id es el ID real del doc en la colección clientes
    // (puede diferir del UID de auth en clientes creados desde admin)
    useEffect(() => {
        if (!user?.datosCliente?.id) return;

        const unsubscribe = firestore()
            .collection(COLLECTIONS.CLIENTES)
            .doc(user.datosCliente.id)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = { id: doc.id, ...doc.data() };
                    setClienteData(data);
                    setFormPerfil(extractPerfilFields(data));
                }
            });

        return () => unsubscribe();
    }, [user?.datosCliente?.id]);

    // Cargar vehículos del cliente
    useEffect(() => {
        if (!clienteData.cliente) {
            setLoadingVehiculos(false);
            return;
        }

        const unsubscribe = firestore()
            .collection(COLLECTIONS.VEHICULOS)
            .where("cliente", "==", clienteData.cliente)
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lista.sort((a, b) => {
                    const fechaA = a.registro?.timestamp?.toDate?.() || new Date(0);
                    const fechaB = b.registro?.timestamp?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setVehiculos(lista);
                setLoadingVehiculos(false);
            }, (err) => {
                console.error("Error cargando vehículos:", err);
                setLoadingVehiculos(false);
            });

        return () => unsubscribe();
    }, [clienteData.cliente]);

    // === Auth handlers ===
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoadingAuth(true);
        try {
            await signIn(email, pass);
        } catch (err) {
            setError("Credenciales incorrectas.");
        } finally {
            setLoadingAuth(false);
        }
    };

    const handleRegistro = async (e) => {
        e.preventDefault();
        setError("");

        if (!regNombre.trim()) {
            setError("El nombre es obligatorio.");
            return;
        }
        if (pass.length < FIELD_LIMITS.MIN_PASSWORD) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (pass !== regConfirmPass) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setLoadingAuth(true);
        try {
            // Obtener siguiente folio
            const conRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");
            const docCon = await conRef.get();
            const nuevoFolio = (docCon.data().clientes || 0) + 1;

            // Crear usuario en Auth
            const result = await auth().createUserWithEmailAndPassword(email.toLowerCase(), pass);
            const uid = result.user.uid;

            // Crear documento en users
            await firestore().collection(COLLECTIONS.USERS).doc(uid).set({
                email: email.toLowerCase(),
                username: regNombre.trim(),
                telefono: regTelefono,
                tipo: "cliente",
                activo: true,
                createdAt: new Date()
            });

            // Crear documento en clientes con el mismo UID
            await firestore().collection(COLLECTIONS.CLIENTES).doc(uid).set({
                cliente: regNombre.trim().toUpperCase(),
                telefonoCliente: regTelefono,
                emailCliente: email.toLowerCase(),
                emailAcceso: email.toLowerCase(),
                passwordAcceso: pass,
                ciudadCliente: "",
                estadoCliente: "",
                paisCliente: PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
                rfcCliente: "",
                direccionCliente: "",
                apodoCliente: "",
                folio: nuevoFolio,
                registro: {
                    usuario: "Auto-registro",
                    idUsuario: uid,
                    timestamp: new Date()
                }
            });

            // Actualizar consecutivo
            await conRef.update({ clientes: nuevoFolio });

        } catch (err) {
            console.error("Error en registro:", err);
            if (err.code === "auth/email-already-in-use") {
                setError("Este email ya está registrado. Intenta iniciar sesión.");
            } else {
                setError("Error al crear cuenta: " + err.message);
            }
        } finally {
            setLoadingAuth(false);
        }
    };

    // === Perfil handlers ===
    const infoConfirmada = clienteData.infoConfirmada === true;

    const handlePerfilChange = (campo, valor) => {
        setFormPerfil(prev => ({ ...prev, [campo]: valor }));
    };

    const handleGuardarPerfil = async () => {
        setGuardando(true);
        setMensajePerfil("");
        try {
            const clienteId = clienteData.id;
            if (!clienteId) throw new Error("No se encontró el ID del cliente");

            await firestore()
                .collection(COLLECTIONS.CLIENTES)
                .doc(clienteId)
                .update({
                    ...formPerfil,
                    infoConfirmada: true,
                    updatedAt: new Date(),
                });

            setMensajePerfil("Información guardada correctamente.");
        } catch (err) {
            console.error("Error guardando perfil:", err);
            setMensajePerfil("Error al guardar. Intenta de nuevo.");
        } finally {
            setGuardando(false);
        }
    };

    // === Helpers ===
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

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // === Guards ===
    if (user && !isCliente) {
        signOut();
        return null;
    }

    if (loading) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white">
            <span className="loading loading-ring loading-lg text-blue-600"></span>
        </div>
    );

    // ============================================================
    // LOGIN / REGISTRO
    // ============================================================
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center p-6">
                <Head><title>Portal Clientes | Jorge Minnesota INC</title></Head>
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    <div className="text-center mb-6">
                        <img src="/assets/Logo.png" className="w-20 mx-auto mb-3" alt="Logo"/>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">
                            Portal de Clientes
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {modoAuth === "login" ? "Inicia sesión para ver tus vehículos" : "Crea tu cuenta para comenzar"}
                        </p>
                    </div>

                    {/* Tabs Login / Registro */}
                    <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => { setModoAuth("login"); setError(""); }}
                            className={`flex-1 py-2 text-xs font-black uppercase rounded-md transition-all ${modoAuth === "login" ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => { setModoAuth("registro"); setError(""); }}
                            className={`flex-1 py-2 text-xs font-black uppercase rounded-md transition-all ${modoAuth === "registro" ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            Crear Cuenta
                        </button>
                    </div>

                    {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

                    {modoAuth === "login" ? (
                        /* --- LOGIN --- */
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
                                    type={mostrarPass ? "text" : "password"}
                                    placeholder="Contraseña"
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                    className="input input-bordered w-full pl-12 pr-12 bg-gray-50 border-none text-black"
                                    required
                                />
                                <button type="button" onClick={() => setMostrarPass(!mostrarPass)} className="absolute right-4 top-4 text-gray-400">
                                    {mostrarPass ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={loadingAuth}
                                className="btn btn-primary w-full text-white font-black uppercase shadow-lg"
                            >
                                {loadingAuth ? <span className="loading loading-spinner loading-sm"></span> : "Entrar"}
                            </button>
                        </form>
                    ) : (
                        /* --- REGISTRO --- */
                        <form onSubmit={handleRegistro} className="space-y-3">
                            <div className="relative">
                                <FaUser className="absolute left-4 top-4 text-gray-300"/>
                                <input
                                    type="text"
                                    placeholder="Nombre completo o Razón Social"
                                    value={regNombre}
                                    onChange={(e) => setRegNombre(e.target.value)}
                                    className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <FaPhone className="absolute left-4 top-4 text-gray-300"/>
                                <input
                                    type="tel"
                                    placeholder="Teléfono (opcional)"
                                    value={regTelefono}
                                    onChange={(e) => setRegTelefono(e.target.value)}
                                    className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                />
                            </div>
                            <div className="relative">
                                <FaEnvelope className="absolute left-4 top-4 text-gray-300"/>
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
                                    type={mostrarPass ? "text" : "password"}
                                    placeholder="Contraseña (mín. 6 caracteres)"
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                    className="input input-bordered w-full pl-12 pr-12 bg-gray-50 border-none text-black"
                                    required
                                />
                                <button type="button" onClick={() => setMostrarPass(!mostrarPass)} className="absolute right-4 top-4 text-gray-400">
                                    {mostrarPass ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <div className="relative">
                                <FaLock className="absolute left-4 top-4 text-gray-300"/>
                                <input
                                    type={mostrarPass ? "text" : "password"}
                                    placeholder="Confirmar contraseña"
                                    value={regConfirmPass}
                                    onChange={(e) => setRegConfirmPass(e.target.value)}
                                    className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loadingAuth}
                                className="btn btn-primary w-full text-white font-black uppercase shadow-lg"
                            >
                                {loadingAuth ? <span className="loading loading-spinner loading-sm"></span> : (
                                    <span className="flex items-center gap-2"><FaUserPlus/> Crear Cuenta</span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // ============================================================
    // PORTAL (usuario autenticado)
    // ============================================================
    const vehiculosFiltrados = vehiculos.filter(v =>
        v.binNip?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.marca?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-10 font-sans text-black">
            <Head><title>Portal | Jorge Minnesota INC</title></Head>

            {/* Header */}
            <header className="bg-white p-4 flex justify-between items-center border-b-2 border-gray-100 sticky top-0 z-[60] shadow-sm">
                <div className="flex items-center gap-4">
                    {vista === "perfil" ? (
                        <button onClick={() => setVista("vehiculos")} className="text-blue-600 p-2">
                            <FaArrowLeft className="text-lg"/>
                        </button>
                    ) : (
                        <img src="/assets/Logo.png" className="w-12 h-auto" alt="Logo"/>
                    )}
                    <div>
                        <h1 className="text-lg font-black uppercase italic text-black leading-none tracking-tighter">
                            {vista === "perfil" ? "Mi Perfil" : "Portal de Clientes"}
                        </h1>
                        <p className="text-[10px] text-gray-500">Jorge Minnesota Logistic LLC</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {vista === "vehiculos" && (
                        <>
                            <button
                                onClick={() => setVista("perfil")}
                                className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50"
                            >
                                <FaUserCircle className="text-base md:text-sm"/>
                                <span className="hidden md:inline">Mi Perfil</span>
                            </button>
                            <Link href="/solicitar">
                                <a className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase border border-green-600 px-3 py-1 rounded-lg hover:bg-green-50">
                                    <FaPlus className="text-base md:text-sm"/>
                                    <span className="hidden md:inline">Solicitar Vehículo</span>
                                </a>
                            </Link>
                        </>
                    )}
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50"
                    >
                        <FaSignOutAlt className="text-base md:text-sm"/>
                        <span className="hidden md:inline">Salir</span>
                    </button>
                </div>
            </header>

            {vista === "perfil" ? (
                /* ============ VISTA PERFIL ============ */
                <main className="max-w-2xl mx-auto px-4 py-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Cabecera perfil */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                                    <FaUser className="text-2xl text-white"/>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">
                                        {clienteData.cliente || user.username}
                                    </h2>
                                    {clienteData.folio && (
                                        <p className="text-blue-200 text-xs font-bold">Cliente #{clienteData.folio}</p>
                                    )}
                                    {(clienteData.emailAcceso || user.email) && (
                                        <p className="text-blue-200 text-xs mt-1 flex items-center gap-1">
                                            <FaEnvelope className="text-[10px]"/> {clienteData.emailAcceso || user.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Estado de la info */}
                        <div className={`px-6 py-3 flex items-center gap-2 text-xs font-bold ${infoConfirmada ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                            {infoConfirmada ? (
                                <>
                                    <FaCheckCircle/>
                                    <span>Información confirmada. Para cambios, contacta a la oficina.</span>
                                </>
                            ) : (
                                <>
                                    <FaLockOpen/>
                                    <span>Completa tu información. Una vez guardada, no podrás modificarla.</span>
                                </>
                            )}
                        </div>

                        {/* Formulario */}
                        <div className="p-6 space-y-4">
                            {/* Nombre - siempre readonly */}
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Nombre / Razón Social</label>
                                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                                    <FaUser className="text-gray-400 text-sm"/>
                                    <span className="text-sm font-medium text-gray-700">{clienteData.cliente || "-"}</span>
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Email</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-4 top-3.5 text-gray-400 text-sm"/>
                                    <input
                                        type="email"
                                        value={formPerfil.emailCliente || ""}
                                        onChange={(e) => handlePerfilChange("emailCliente", e.target.value)}
                                        disabled={infoConfirmada}
                                        placeholder="correo@ejemplo.com"
                                        className={`input input-bordered w-full pl-12 text-sm ${infoConfirmada ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                                    />
                                </div>
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Teléfono</label>
                                <div className="relative">
                                    <FaPhone className="absolute left-4 top-3.5 text-gray-400 text-sm"/>
                                    <input
                                        type="tel"
                                        value={formPerfil.telefonoCliente || ""}
                                        onChange={(e) => handlePerfilChange("telefonoCliente", e.target.value)}
                                        disabled={infoConfirmada}
                                        placeholder="(123) 456-7890"
                                        className={`input input-bordered w-full pl-12 text-sm ${infoConfirmada ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                                    />
                                </div>
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Dirección</label>
                                <div className="relative">
                                    <FaMapMarkerAlt className="absolute left-4 top-3.5 text-gray-400 text-sm"/>
                                    <input
                                        type="text"
                                        value={formPerfil.direccionCliente || ""}
                                        onChange={(e) => handlePerfilChange("direccionCliente", e.target.value)}
                                        disabled={infoConfirmada}
                                        placeholder="Calle, Número, Colonia..."
                                        className={`input input-bordered w-full pl-12 text-sm ${infoConfirmada ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                                    />
                                </div>
                            </div>

                            {/* Ciudad y Estado */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Ciudad</label>
                                    <div className="relative">
                                        <FaCity className="absolute left-4 top-3.5 text-gray-400 text-sm"/>
                                        <input
                                            type="text"
                                            value={formPerfil.ciudadCliente || ""}
                                            onChange={(e) => handlePerfilChange("ciudadCliente", e.target.value)}
                                            disabled={infoConfirmada}
                                            placeholder="Ciudad"
                                            className={`input input-bordered w-full pl-12 text-sm ${infoConfirmada ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Estado</label>
                                    <input
                                        type="text"
                                        value={formPerfil.estadoCliente || ""}
                                        onChange={(e) => handlePerfilChange("estadoCliente", e.target.value)}
                                        disabled={infoConfirmada}
                                        placeholder="Ej: TX"
                                        className={`input input-bordered w-full text-sm ${infoConfirmada ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                                    />
                                </div>
                            </div>

                            {/* País */}
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">País</label>
                                <div className="relative">
                                    <FaGlobe className="absolute left-4 top-3.5 text-gray-400 text-sm"/>
                                    <input
                                        type="text"
                                        value={formPerfil.paisCliente || ""}
                                        onChange={(e) => handlePerfilChange("paisCliente", e.target.value)}
                                        disabled={infoConfirmada}
                                        placeholder="País"
                                        className={`input input-bordered w-full pl-12 text-sm ${infoConfirmada ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                                    />
                                </div>
                            </div>

                            {/* RFC */}
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">RFC / Tax ID</label>
                                <div className="relative">
                                    <FaIdCard className="absolute left-4 top-3.5 text-gray-400 text-sm"/>
                                    <input
                                        type="text"
                                        value={formPerfil.rfcCliente || ""}
                                        onChange={(e) => handlePerfilChange("rfcCliente", e.target.value.toUpperCase())}
                                        disabled={infoConfirmada}
                                        placeholder="RFC o Tax ID"
                                        className={`input input-bordered w-full pl-12 text-sm ${infoConfirmada ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                                    />
                                </div>
                            </div>

                            {/* Mensaje */}
                            {mensajePerfil && (
                                <p className={`text-center text-sm font-bold ${mensajePerfil.includes("Error") ? 'text-red-500' : 'text-green-600'}`}>
                                    {mensajePerfil}
                                </p>
                            )}

                            {/* Botón guardar */}
                            {!infoConfirmada && (
                                <button
                                    onClick={handleGuardarPerfil}
                                    disabled={guardando}
                                    className="btn btn-primary w-full text-white font-black uppercase shadow-lg mt-2"
                                >
                                    {guardando ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        "Guardar Información"
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            ) : (
                /* ============ VISTA VEHÍCULOS ============ */
                <>
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
                </>
            )}

            {/* Footer */}
            <footer className="mt-10 text-center text-[10px] text-gray-400 uppercase">
                Portal de Clientes - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default ClientsPage;
