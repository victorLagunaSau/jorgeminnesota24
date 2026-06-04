import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import firebase from "firebase/app";
import { useAuthContext } from "../context/auth";
import { auth, firestore } from "../firebase/firebaseIni";
import { COLLECTIONS, PHONE_CONFIG, FIELD_LIMITS } from "../constants";

// Misma clave que usa /driver para la sesión del chofer
const DRIVER_SESSION_KEY = "driver_session";
import imageCompression from "browser-image-compression";
import {
    FaUser, FaLock, FaSignOutAlt, FaCar, FaTruck, FaMapMarkerAlt, FaPhone,
    FaSearch, FaCalendarAlt, FaWarehouse, FaPlus, FaUserCircle, FaArrowLeft,
    FaEnvelope, FaIdCard, FaGlobe, FaCity, FaCheckCircle, FaLockOpen,
    FaUserPlus, FaEye, FaEyeSlash, FaCamera, FaClock, FaTimes, FaBarcode, FaKey
} from "react-icons/fa";

const ClientPage = () => {
    const { user, loading, isCliente, signIn, signOut } = useAuthContext();
    const router = useRouter();
    const [vehiculos, setVehiculos] = useState([]);
    const [solicitudes, setSolicitudes] = useState([]);
    const [loadingVehiculos, setLoadingVehiculos] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    const [vista, setVista] = useState("vehiculos"); // "vehiculos" | "perfil"
    const [vehiculoDetalle, setVehiculoDetalle] = useState(null);
    const [solicitudDetalle, setSolicitudDetalle] = useState(null);

    // Login state
    const [modoAuth, setModoAuth] = useState("login"); // "login" | "registro"
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [mostrarPass, setMostrarPass] = useState(false);
    const [registroExitoso, setRegistroExitoso] = useState(false);

    // Registro state
    const [regNombre, setRegNombre] = useState("");
    const [regTelefono, setRegTelefono] = useState("");
    const [regPrefijo, setRegPrefijo] = useState("+1");
    const [regDireccion, setRegDireccion] = useState("");
    const [regCiudad, setRegCiudad] = useState("");
    const [regEstado, setRegEstado] = useState("");
    const [regConfirmPass, setRegConfirmPass] = useState("");
    const [regLicenciaFile, setRegLicenciaFile] = useState(null);
    const [regLicenciaPreview, setRegLicenciaPreview] = useState(null);

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

    // Marcar body como app Capacitor para estilos móviles (font-size 16px en inputs)
    useEffect(() => {
        if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
            document.body.classList.add("capacitor-app");
        }
    }, []);

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

    // Push notifications — registrar token FCM en Capacitor
    useEffect(() => {
        if (!user?.id) return;
        // window.Capacitor solo existe dentro del WebView nativo
        if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform?.()) return;

        const registerPush = async () => {
            try {
                const PushNotifications = window.Capacitor.Plugins.PushNotifications;
                if (!PushNotifications) return;

                // Solicitar permiso
                const permStatus = await PushNotifications.requestPermissions();
                if (permStatus.receive !== "granted") return;

                // Registrar para recibir push
                await PushNotifications.register();

                // Guardar token en Firestore
                PushNotifications.addListener("registration", async (token) => {
                    try {
                        await firestore()
                            .collection(COLLECTIONS.TOKENS_CLIENTE)
                            .doc(user.id)
                            .set({
                                token: token.value,
                                platform: window.Capacitor.getPlatform(),
                                clienteId: user.datosCliente?.id || user.id,
                                clienteNombre: user.datosCliente?.cliente || user.username || "",
                                updatedAt: new Date()
                            }, { merge: true });
                    } catch (err) {
                        console.error("Error guardando token push:", err);
                    }
                });

                // Manejar notificación recibida con app abierta
                PushNotifications.addListener("pushNotificationReceived", (notification) => {
                    console.log("Push recibida:", notification);
                });

                // Manejar tap en notificación
                PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
                    console.log("Push tap:", notification);
                });

            } catch (e) {
                // En web o si falla, simplemente ignorar
            }
        };

        registerPush();
    }, [user?.id]);

    // Pull-to-refresh
    const [refreshing, setRefreshing] = useState(false);
    const pullStartY = useRef(0);
    const isPulling = useRef(false);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        // Firestore onSnapshot ya mantiene datos frescos, solo forzar un re-render visual
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform?.()) return;

        const onTouchStart = (e) => {
            if (window.scrollY === 0) {
                pullStartY.current = e.touches[0].clientY;
                isPulling.current = true;
            }
        };
        const onTouchMove = (e) => {
            if (!isPulling.current) return;
            const diff = e.touches[0].clientY - pullStartY.current;
            if (diff > 80 && window.scrollY === 0) {
                isPulling.current = false;
                handleRefresh();
            }
        };
        const onTouchEnd = () => { isPulling.current = false; };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: true });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
        };
    }, [handleRefresh]);

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

    // Cargar solicitudes del cliente
    useEffect(() => {
        const clienteId = user?.datosCliente?.id || user?.id;
        if (!clienteId) return;

        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .where("clienteId", "==", clienteId)
            .onSnapshot((snap) => {
                const lista = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(s => s.estado !== "completado")
                    .sort((a, b) => {
                        const fa = a.fechaSolicitud?.toDate?.() || new Date(0);
                        const fb = b.fechaSolicitud?.toDate?.() || new Date(0);
                        return fb - fa;
                    });
                setSolicitudes(lista);
            });

        return () => unsubscribe();
    }, [user?.datosCliente?.id, user?.id]);

    // === Auth handlers ===
    // Login unificado: si el input parece email → cliente (Firebase Auth);
    // si es numérico → folio de chofer (consulta a colección choferes).
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        const id = email.trim();
        if (!id || !pass) { setError("Ingresa tus credenciales."); return; }

        const esEmail = id.includes("@");
        const esFolio = /^\d+$/.test(id);

        if (!esEmail && !esFolio) {
            setError("Ingresa un email válido o un folio numérico.");
            return;
        }

        setLoadingAuth(true);
        try {
            if (esEmail) {
                await signIn(id.toLowerCase(), pass);
            } else {
                // Login como chofer por folio + clave
                const snap = await firestore()
                    .collection(COLLECTIONS.CHOFERES)
                    .where("folio", "==", parseInt(id, 10))
                    .get();

                if (snap.empty) {
                    setError("Folio no encontrado.");
                    setLoadingAuth(false);
                    return;
                }
                const doc = snap.docs[0];
                const data = doc.data();
                if (!data.clave) {
                    setError("Sin clave asignada. Contacta al administrador.");
                    setLoadingAuth(false);
                    return;
                }
                if (data.clave !== pass) {
                    setError("Contraseña incorrecta.");
                    setLoadingAuth(false);
                    return;
                }

                const choferData = { id: doc.id, ...data };
                localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(choferData));
                router.push("/driver");
            }
        } catch (err) {
            console.error("Error login:", err);
            setError(esEmail ? "Credenciales incorrectas." : "Error de conexión. Intenta de nuevo.");
        } finally {
            setLoadingAuth(false);
        }
    };

    const handleRegistro = async (e) => {
        e.preventDefault();
        setError("");

        if (!regNombre.trim() || !regTelefono.trim() || !regDireccion.trim() || !regCiudad.trim() || !regEstado.trim()) {
            setError("Todos los campos son obligatorios.");
            return;
        }
        if (!regLicenciaFile) {
            setError("La foto de tu licencia es obligatoria.");
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
            // Procesar licencia primero (antes de tocar Auth)
            let licenciaBase64 = "";
            try {
                let archivoFinal = regLicenciaFile;
                try {
                    archivoFinal = await imageCompression(regLicenciaFile, { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true, fileType: "image/webp" });
                } catch (_) {}
                licenciaBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(archivoFinal);
                });
            } catch (err) {
                console.error("Error procesando licencia:", err);
            }

            // Obtener siguiente folio
            const conRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");
            const docCon = await conRef.get();
            const nuevoFolio = (docCon.data().clientes || 0) + 1;

            // Crear usuario en Auth
            const result = await auth().createUserWithEmailAndPassword(email.toLowerCase(), pass);
            const uid = result.user.uid;

            // Escribir todos los docs en Firestore
            await firestore().collection(COLLECTIONS.USERS).doc(uid).set({
                email: email.toLowerCase(),
                username: regNombre.trim(),
                telefono: regPrefijo + " " + regTelefono.trim(),
                tipo: "cliente",
                activo: true,
                createdAt: new Date()
            });

            await firestore().collection(COLLECTIONS.CLIENTES).doc(uid).set({
                cliente: regNombre.trim().toUpperCase(),
                telefonoCliente: regPrefijo + " " + regTelefono.trim(),
                emailCliente: email.toLowerCase(),
                emailAcceso: email.toLowerCase(),
                passwordAcceso: pass,
                ciudadCliente: regCiudad.trim(),
                estadoCliente: regEstado.trim().toUpperCase(),
                paisCliente: regPrefijo === "+52" ? "México" : "United States",
                rfcCliente: "",
                direccionCliente: regDireccion.trim(),
                apodoCliente: "",
                licenciaBase64,
                aprobado: false,
                folio: nuevoFolio,
                registro: {
                    usuario: "Auto-registro",
                    idUsuario: uid,
                    timestamp: new Date()
                }
            });

            await conRef.update({ clientes: nuevoFolio });

            // Mostrar pantalla de revisión directamente
            setRegistroExitoso(true);

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
    const getSolicitudBadge = (estado) => {
        const config = {
            pendiente: { className: "bg-sky-100 text-sky-800", label: "En Progreso" },
            asignado: { className: "bg-indigo-100 text-indigo-800", label: "Asignado" },
            en_proceso: { className: "bg-blue-100 text-blue-800", label: "En Camino" },
        };
        return config[estado] || config.pendiente;
    };

    const getStatusColor = (status) => {
        const colors = {
            'PR': 'bg-slate-200 text-slate-700',
            'IN': 'bg-sky-200 text-sky-800',
            'TR': 'bg-blue-200 text-blue-800',
            'EB': 'bg-indigo-200 text-indigo-800',
            'DS': 'bg-cyan-200 text-cyan-800',
            'EN': 'bg-emerald-200 text-emerald-800',
        };
        return colors[status] || 'bg-slate-200 text-slate-700';
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
    // Registro exitoso — mostrar directo sin esperar reload
    if (registroExitoso) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center items-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Cuenta en Revisión | Jorge Minnesota INC</title></Head>
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-blue-100 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaClock className="text-3xl text-indigo-600"/>
                    </div>
                    <h2 className="text-xl font-black uppercase text-gray-800 mb-2">Cuenta en Revisión</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Tu cuenta fue creada exitosamente. Nuestro equipo la revisará y te notificará cuando sea aprobada.
                    </p>
                    <button
                        onClick={() => {
                            setRegistroExitoso(false);
                            setRegNombre(""); setRegTelefono(""); setRegPrefijo("+1");
                            setRegDireccion(""); setRegCiudad(""); setRegEstado("");
                            setRegLicenciaFile(null); setRegLicenciaPreview(null);
                            setRegConfirmPass(""); setEmail(""); setPass("");
                            setModoAuth("login");
                            signOut();
                        }}
                        className="btn btn-outline btn-sm text-gray-500 font-bold uppercase"
                    >
                        <FaSignOutAlt className="mr-1"/> Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    if (loading || loadingAuth) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white">
            <span className="loading loading-ring loading-lg text-blue-600"></span>
        </div>
    );

    if (user && (!isCliente || !user.datosCliente)) {
        if (!error) setError("Esta cuenta no existe o fue eliminada. Crea una nueva cuenta.");
        signOut();
        return null;
    }

    // ============================================================
    // LOGIN / REGISTRO
    // ============================================================
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Portal Clientes | Jorge Minnesota INC</title></Head>
                <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-2xl p-8 border border-blue-100">
                    <div className="text-center mb-6">
                        <img src="/assets/Logo.png" className="w-20 mx-auto mb-3" alt="Logo"/>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">
                            Portal de Clientes
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {modoAuth === "login" ? "Inicia sesión" : "Crea tu cuenta para comenzar"}
                        </p>
                    </div>

                    {/* Tabs Login / Registro */}
                    <div className="flex mb-6 bg-blue-50 rounded-lg p-1">
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
                        /* --- LOGIN (cliente: email / chofer: folio) --- */
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="relative">
                                <FaUser className="absolute left-4 top-4 text-gray-300"/>
                                <input
                                    type="text"
                                    inputMode="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    placeholder="Email o Folio"
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
                                className="btn w-full text-white font-black uppercase shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                            <div className="flex gap-2 w-full overflow-hidden">
                                <select
                                    value={regPrefijo}
                                    onChange={(e) => setRegPrefijo(e.target.value)}
                                    className="select select-bordered bg-gray-50 border-none text-black font-bold flex-shrink-0"
                                    style={{fontSize: '16px', width: '90px', minWidth: '90px', paddingRight: '8px'}}
                                >
                                    <option value="+1">🇺🇸+1</option>
                                    <option value="+52">🇲🇽+52</option>
                                </select>
                                <input
                                    type="tel"
                                    placeholder="Teléfono"
                                    value={regTelefono}
                                    onChange={(e) => setRegTelefono(e.target.value)}
                                    className="input input-bordered bg-gray-50 border-none text-black min-w-0 flex-1"
                                    required
                                    style={{fontSize: '16px'}}
                                />
                            </div>
                            <div className="relative">
                                <FaMapMarkerAlt className="absolute left-4 top-4 text-gray-300"/>
                                <input
                                    type="text"
                                    placeholder="Dirección"
                                    value={regDireccion}
                                    onChange={(e) => setRegDireccion(e.target.value)}
                                    className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                    required
                                    style={{fontSize: '16px'}}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <FaCity className="absolute left-4 top-4 text-gray-300"/>
                                    <input
                                        type="text"
                                        placeholder="Ciudad"
                                        value={regCiudad}
                                        onChange={(e) => setRegCiudad(e.target.value)}
                                        className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                        required
                                        style={{fontSize: '16px'}}
                                    />
                                </div>
                                <div className="relative">
                                    <FaMapMarkerAlt className="absolute left-4 top-4 text-gray-300"/>
                                    <input
                                        type="text"
                                        placeholder="Estado (ej: TX)"
                                        value={regEstado}
                                        onChange={(e) => setRegEstado(e.target.value)}
                                        className="input input-bordered w-full pl-12 bg-gray-50 border-none text-black"
                                        required
                                    />
                                </div>
                            </div>
                            {/* Foto de licencia */}
                            <div>
                                <label className="flex items-center gap-3 px-4 py-3 bg-blue-50/40 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors border-2 border-dashed border-blue-200">
                                    <FaCamera className="text-gray-400 text-lg flex-shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-600">
                                            {regLicenciaFile ? regLicenciaFile.name : "Foto de tu Licencia"}
                                        </p>
                                        <p className="text-[10px] text-gray-400">Toma una foto o sube una imagen</p>
                                    </div>
                                    {regLicenciaPreview && (
                                        <img src={regLicenciaPreview} alt="Licencia" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-blue-100"/>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setRegLicenciaFile(file);
                                                setRegLicenciaPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </label>
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
                                className="btn w-full text-white font-black uppercase shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            >
                                {loadingAuth ? <span className="loading loading-spinner loading-sm"></span> : (
                                    <span className="flex items-center gap-2"><FaUserPlus/> Crear Cuenta</span>
                                )}
                            </button>
                        </form>
                    )}
                    <p className="mt-6 text-center text-[11px] text-gray-400">
                        Clientes: usa tu email · Choferes: usa tu folio
                    </p>
                </div>
            </div>
        );
    }

    // ============================================================
    // CUENTA EN REVISIÓN (no aprobado)
    // ============================================================
    if (clienteData.aprobado === false || user?.datosCliente?.aprobado === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center items-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Cuenta en Revisión | Jorge Minnesota INC</title></Head>
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-blue-100 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaClock className="text-3xl text-indigo-600"/>
                    </div>
                    <h2 className="text-xl font-black uppercase text-gray-800 mb-2">Cuenta en Revisión</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Tu cuenta está siendo revisada por nuestro equipo. Te notificaremos cuando sea aprobada.
                    </p>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-left space-y-2 mb-6">
                        <p className="text-xs text-gray-600"><span className="font-bold">Nombre:</span> {clienteData.cliente}</p>
                        <p className="text-xs text-gray-600"><span className="font-bold">Email:</span> {clienteData.emailAcceso || user.email}</p>
                        <p className="text-xs text-gray-600"><span className="font-bold">Teléfono:</span> {clienteData.telefonoCliente}</p>
                        <p className="text-xs text-gray-600"><span className="font-bold">Ubicación:</span> {clienteData.ciudadCliente}, {clienteData.estadoCliente}</p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="btn btn-outline btn-sm text-gray-500 font-bold uppercase"
                    >
                        <FaSignOutAlt className="mr-1"/> Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    // ============================================================
    // PORTAL (usuario autenticado y aprobado)
    // ============================================================
    const q = busqueda.trim().toLowerCase();
    const matchVehiculo = (v) =>
        !q ||
        (v.binNip || "").toString().trim().toLowerCase().includes(q) ||
        (v.lote || "").toString().trim().toLowerCase().includes(q) ||
        (v.marca || "").toLowerCase().includes(q) ||
        (v.modelo || "").toLowerCase().includes(q);

    const vehiculosFiltrados = vehiculos.filter(v => v.estatus !== "EN" && matchVehiculo(v));

    const solicitudesFiltradas = solicitudes.filter(s =>
        !q ||
        (s.lotNumber || "").toString().trim().toLowerCase().includes(q) ||
        (s.make || "").toLowerCase().includes(q) ||
        (s.model || "").toLowerCase().includes(q)
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-10 safe-area-bottom font-sans text-black">
            <Head><title>Portal | Jorge Minnesota INC</title></Head>

            {/* Pull-to-refresh indicator */}
            {refreshing && (
                <div className="ptr-spinner">
                    <div className="ptr-icon"></div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md p-4 safe-area-top flex justify-between items-center border-b border-blue-100 sticky top-0 z-[60] shadow-sm">
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
                                <a className="flex items-center gap-2 text-[10px] font-black text-white uppercase px-3 py-1.5 rounded-lg shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all">
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
                /* ============ VISTA PERFIL (READ-ONLY) ============ */
                <main className="max-w-2xl mx-auto px-4 py-6">
                    <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
                        {/* Cabecera perfil */}
                        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-6 text-white overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
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

                        <div className="px-6 py-3 flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-b border-blue-100">
                            <FaCheckCircle/>
                            <span>Para cambios en tu información, contacta a la oficina.</span>
                        </div>

                        {/* Info read-only */}
                        <div className="p-6 space-y-3">
                            {[
                                { icon: <FaUser className="text-gray-400 text-sm"/>, label: "Nombre", value: clienteData.cliente },
                                { icon: <FaEnvelope className="text-gray-400 text-sm"/>, label: "Email", value: clienteData.emailAcceso || clienteData.emailCliente || user.email },
                                { icon: <FaPhone className="text-gray-400 text-sm"/>, label: "Teléfono", value: clienteData.telefonoCliente },
                                { icon: <FaMapMarkerAlt className="text-gray-400 text-sm"/>, label: "Dirección", value: clienteData.direccionCliente },
                                { icon: <FaCity className="text-gray-400 text-sm"/>, label: "Ciudad", value: [clienteData.ciudadCliente, clienteData.estadoCliente].filter(Boolean).join(", ") },
                                { icon: <FaGlobe className="text-gray-400 text-sm"/>, label: "País", value: clienteData.paisCliente },
                            ].map((campo, i) => (
                                <div key={i}>
                                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">{campo.label}</label>
                                    <div className="flex items-center gap-3 bg-blue-50/50 rounded-xl px-4 py-3 border border-blue-100">
                                        {campo.icon}
                                        <span className="text-sm font-medium text-gray-700">{campo.value || "-"}</span>
                                    </div>
                                </div>
                            ))}

                            {/* Foto de licencia */}
                            {(clienteData.licenciaBase64 || clienteData.licenciaUrl) && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Licencia</label>
                                    <img src={clienteData.licenciaBase64 || clienteData.licenciaUrl} alt="Licencia" className="w-full max-w-xs rounded-lg border border-blue-100 shadow-sm"/>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            ) : (
                /* ============ VISTA VEHÍCULOS ============ */
                <>
                    {/* User Info */}
                    <section className="bg-white/70 backdrop-blur-sm px-6 py-4 border-b border-blue-100 shadow-sm">
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
                                            <FaMapMarkerAlt className="text-indigo-500"/> {clienteData.ciudadCliente}, {clienteData.estadoCliente}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 px-4 py-2 rounded-xl shadow-sm">
                                <span className="text-[10px] text-blue-600 font-bold uppercase">Total Vehículos</span>
                                <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent tabular-nums">{vehiculos.length}</p>
                            </div>
                        </div>
                    </section>

                    {/* Search */}
                    <div className="max-w-6xl mx-auto px-4 py-4">
                        <div className="relative">
                            <FaSearch className="absolute left-4 top-3.5 text-blue-400"/>
                            <input
                                type="text"
                                placeholder="Buscar por lote, marca o modelo..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="input input-bordered w-full pl-12 bg-white border-blue-100 focus:border-blue-400 text-black shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Solicitudes activas */}
                    {solicitudesFiltradas.length > 0 && (
                        <div className="max-w-6xl mx-auto px-4 mb-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                                    <div className="flex items-center gap-2">
                                        <FaTruck className="text-blue-600" />
                                        <span className="text-sm font-black text-blue-800 uppercase">Mis Solicitudes</span>
                                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{solicitudesFiltradas.length}</span>
                                    </div>
                                </div>
                                <div className="divide-y divide-blue-50">
                                    {solicitudesFiltradas.map(sol => {
                                        const badge = getSolicitudBadge(sol.estado);
                                        return (
                                            <div key={sol.id} onClick={() => setSolicitudDetalle(sol)} className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-blue-50/60 transition-colors">
                                                {sol.imageUrl ? (
                                                    <img src={sol.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <FaCar className="text-gray-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-bold text-gray-500 uppercase truncate leading-tight">
                                                        {sol.year} {sol.make}
                                                    </p>
                                                    <p className="text-sm font-black text-gray-900 uppercase truncate leading-tight">
                                                        {sol.model}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 mt-1">
                                                        Lote: {sol.lotNumber} • {sol.source}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <FaMapMarkerAlt className="text-[8px]" /> {sol.location || 'N/A'}
                                                    </p>
                                                    <div className="mt-2">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge.className}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vehicles List */}
                    <main className="max-w-6xl mx-auto px-4">
                        {loadingVehiculos ? (
                            <div className="flex justify-center py-20">
                                <span className="loading loading-spinner loading-lg text-blue-600"></span>
                            </div>
                        ) : vehiculosFiltrados.length === 0 ? (
                            solicitudesFiltradas.length === 0 && (
                                <div className="text-center py-20">
                                    <FaCar className="text-6xl text-gray-300 mx-auto mb-4"/>
                                    <p className="text-gray-500">
                                        {busqueda ? "No se encontraron coincidencias con esa búsqueda" : "No tienes vehículos registrados"}
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                                {/* Header de la tabla */}
                                <div className="hidden md:grid md:grid-cols-12 gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 text-[10px] font-black text-blue-700 uppercase">
                                    <div className="col-span-3">Vehículo</div>
                                    <div className="col-span-2">Origen</div>
                                    <div className="col-span-2">Almacén</div>
                                    <div className="col-span-2 text-center">Fecha Llegada</div>
                                    <div className="col-span-3 text-center">Estado</div>
                                </div>

                                {/* Lista de vehículos */}
                                <div className="divide-y divide-blue-50">
                                    {vehiculosFiltrados.map((v, index) => (
                                        <div
                                            key={v.id}
                                            onClick={() => setVehiculoDetalle(v)}
                                            className={`p-4 hover:bg-blue-50/70 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}`}
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

            {/* Modal Detalle Vehículo */}
            {vehiculoDetalle && (() => {
                const statusOrder = ['PR', 'IN', 'TR', 'EB', 'DS', 'EN'];
                const currentIndex = statusOrder.indexOf(vehiculoDetalle.estatus);

                // Estado de cuenta del cliente — usa los campos de precio al CLIENTE
                // (price/storage/sobrePeso/gastosExtra), nunca los costos internos del chofer.
                const toNum = (x) => { const n = parseFloat(x); return isNaN(n) ? 0 : n; };
                const v = vehiculoDetalle;
                const totalCuenta = toNum(v.price) + toNum(v.storage) + toNum(v.sobrePeso) + toNum(v.gastosExtra);
                let estadoCuenta, saldoCuenta;
                if (v.estadoPago === 'pagado') {
                    estadoCuenta = 'pagado'; saldoCuenta = 0;
                } else if (v.estadoPago === 'fiado') {
                    estadoCuenta = 'fiado'; saldoCuenta = toNum(v.saldoFiado);
                } else {
                    estadoCuenta = 'pendiente'; saldoCuenta = totalCuenta;
                }
                const cuentaBadge = {
                    pagado:    { label: 'Pagado',    className: 'bg-emerald-100 text-emerald-700' },
                    fiado:     { label: 'Con saldo', className: 'bg-amber-100 text-amber-700' },
                    pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-600' },
                }[estadoCuenta];
                const fmtMoney = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

                const InfoCard = ({ icon, label, value, mono }) => (
                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 hover:bg-blue-50/70 transition-colors">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-blue-500 text-xs">{icon}</span>
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wide">{label}</span>
                        </div>
                        <p className={`text-sm text-gray-800 ${mono ? 'font-mono font-bold' : 'font-semibold'} break-words`}>
                            {value || '-'}
                        </p>
                    </div>
                );
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up" onClick={() => setVehiculoDetalle(null)}>
                        <div className="bg-white rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto shadow-2xl safe-area-bottom" onClick={(e) => e.stopPropagation()}>
                            {/* Hero header */}
                            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 sm:rounded-t-3xl px-6 pb-8 overflow-hidden" style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}>
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="absolute -bottom-16 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="relative flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">Vehículo</p>
                                        <p className="text-blue-100 text-sm sm:text-base font-bold uppercase mt-0.5 leading-tight tracking-wide truncate">
                                            {vehiculoDetalle.marca}
                                        </p>
                                        <h3 className="text-white text-2xl sm:text-3xl font-black uppercase leading-tight tracking-tight truncate">
                                            {vehiculoDetalle.modelo}
                                        </h3>
                                        <div className="inline-flex items-center gap-1.5 mt-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-lg">
                                            <FaBarcode className="text-blue-200 text-xs"/>
                                            <span className="text-white font-mono font-bold text-sm">{vehiculoDetalle.binNip}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setVehiculoDetalle(null)}
                                        className="p-2 bg-white/15 hover:bg-white/30 rounded-full text-white transition-all flex-shrink-0"
                                        aria-label="Cerrar"
                                    >
                                        <FaTimes size={14}/>
                                    </button>
                                </div>

                                <div className="relative flex flex-wrap items-center gap-2 mt-4">
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${getStatusColor(vehiculoDetalle.estatus)}`}>
                                        {getStatusLabel(vehiculoDetalle.estatus)}
                                    </span>
                                    {vehiculoDetalle.estatus === 'TR' && (
                                        <span className="flex items-center gap-1.5 bg-blue-400/30 backdrop-blur-sm px-2.5 py-1 rounded-full text-blue-100 text-[10px] font-bold">
                                            <FaTruck className="animate-pulse"/> En tránsito
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Pipeline de estatus */}
                            <div className="px-5 sm:px-6 py-5 border-b border-blue-100 bg-gradient-to-b from-blue-50/40 to-white">
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-4">Seguimiento</p>
                                <div className="relative">
                                    {/* Línea de fondo */}
                                    <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-blue-100 rounded-full"></div>
                                    {/* Línea de progreso */}
                                    <div
                                        className="absolute top-3.5 left-3 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: currentIndex > 0 ? `calc((100% - 1.5rem) * ${currentIndex / (statusOrder.length - 1)})` : '0%' }}
                                    ></div>

                                    <div className="relative flex items-start justify-between">
                                        {statusOrder.map((step, i) => {
                                            const isActive = i <= currentIndex;
                                            const isCurrent = step === vehiculoDetalle.estatus;
                                            const isPast = isActive && !isCurrent;
                                            return (
                                                <div key={step} className="flex flex-col items-center gap-1.5 flex-1 max-w-[60px]">
                                                    <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all ${
                                                        isCurrent
                                                            ? "bg-blue-600 text-white border-blue-300 ring-4 ring-blue-100 scale-110 shadow-md"
                                                            : isPast
                                                                ? "bg-emerald-500 text-white border-emerald-300"
                                                                : "bg-white text-gray-400 border-blue-100"
                                                    }`}>
                                                        {isPast ? <FaCheckCircle className="text-[11px]"/> : step}
                                                    </div>
                                                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase text-center leading-tight ${
                                                        isCurrent ? "text-blue-700" : isPast ? "text-emerald-700" : "text-gray-400"
                                                    }`}>
                                                        {getStatusLabel(step)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Secciones de información */}
                            <div className="p-5 sm:p-6 space-y-5">
                                {/* Vehículo */}
                                <section>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="h-5 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Información del Vehículo</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <InfoCard icon={<FaBarcode/>} label="Lote" value={vehiculoDetalle.binNip} mono/>
                                        <InfoCard icon={<FaCar/>} label="Marca / Modelo" value={`${vehiculoDetalle.marca || ''} ${vehiculoDetalle.modelo || ''}`.trim()}/>
                                    </div>
                                </section>

                                {/* Logística */}
                                <section>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="h-5 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Logística</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <InfoCard icon={<FaMapMarkerAlt/>} label="Origen" value={[vehiculoDetalle.ciudad, vehiculoDetalle.estado].filter(Boolean).join(', ')}/>
                                        <InfoCard icon={<FaWarehouse/>} label="Almacén" value={vehiculoDetalle.almacen}/>
                                        <InfoCard icon={<FaCalendarAlt/>} label="Fecha de Registro" value={formatDate(vehiculoDetalle.registro?.timestamp)}/>
                                        <InfoCard icon={<FaTruck/>} label="Estatus Actual" value={getStatusLabel(vehiculoDetalle.estatus)}/>
                                    </div>
                                </section>

                                {/* Estado de cuenta */}
                                {totalCuenta > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="h-5 w-1 bg-gradient-to-b from-emerald-500 to-blue-600 rounded-full"></div>
                                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Estado de Cuenta</h4>
                                            <span className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${cuentaBadge.className}`}>
                                                {cuentaBadge.label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3">
                                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-wide block mb-1">Total</span>
                                                <p className="text-lg font-black text-gray-800 tabular-nums">{fmtMoney(totalCuenta)}</p>
                                            </div>
                                            <div className={`rounded-xl p-3 border ${saldoCuenta > 0 ? 'bg-amber-50/60 border-amber-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
                                                <span className={`text-[10px] font-black uppercase tracking-wide block mb-1 ${saldoCuenta > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Saldo</span>
                                                <p className={`text-lg font-black tabular-nums ${saldoCuenta > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{fmtMoney(saldoCuenta)}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                                            Para dudas sobre tu pago, contacta a la oficina.
                                        </p>
                                    </section>
                                )}

                                {/* Detalles adicionales */}
                                {(vehiculoDetalle.cliente || vehiculoDetalle.referencia) && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="h-5 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Detalles</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {vehiculoDetalle.cliente && (
                                                <InfoCard icon={<FaUser/>} label="Cliente" value={vehiculoDetalle.cliente}/>
                                            )}
                                            {vehiculoDetalle.referencia && (
                                                <InfoCard icon={<FaIdCard/>} label="Referencia" value={vehiculoDetalle.referencia}/>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {/* Footer action */}
                                <div className="pt-2">
                                    <button
                                        onClick={() => setVehiculoDetalle(null)}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black uppercase text-xs tracking-wide shadow-md transition-all"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal Detalle Solicitud */}
            {solicitudDetalle && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex sm:items-center justify-center p-0 sm:p-4 animate-fade-in-up" onClick={() => setSolicitudDetalle(null)}>
                    <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto shadow-2xl safe-area-bottom" onClick={(e) => e.stopPropagation()}>
                        {/* Imagen vertical alargada */}
                        <div className="relative">
                            {solicitudDetalle.imageUrl ? (
                                <div className="w-full bg-gradient-to-br from-slate-900 to-slate-800 sm:rounded-t-2xl flex items-center justify-center" style={{ minHeight: '420px' }}>
                                    <img
                                        src={solicitudDetalle.imageUrl}
                                        alt=""
                                        className="w-full h-auto max-h-[72vh] object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-96 bg-gradient-to-br from-blue-600 to-indigo-800 sm:rounded-t-2xl flex items-center justify-center">
                                    <FaCar className="text-6xl text-white/60"/>
                                </div>
                            )}
                            <button onClick={() => setSolicitudDetalle(null)} className="absolute right-3 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all z-10" style={{ top: 'max(env(safe-area-inset-top), 0.75rem)' }}>
                                <FaTimes size={14}/>
                            </button>
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold px-2.5 py-1 rounded shadow">{solicitudDetalle.source}</span>
                                {(() => {
                                    const badge = getSolicitudBadge(solicitudDetalle.estado);
                                    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge.className}`}>{badge.label}</span>;
                                })()}
                            </div>
                        </div>

                        <div className="p-5 sm:p-6">
                            <p className="text-base font-bold text-gray-500 uppercase tracking-wide leading-tight">
                                {solicitudDetalle.year} {solicitudDetalle.make}
                            </p>
                            <h4 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                                {solicitudDetalle.model}
                            </h4>

                            <div className="mt-5 space-y-3.5 text-base text-gray-700">
                                <div className="flex items-center gap-3">
                                    <FaBarcode className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Lote</span>
                                    <span className="font-mono font-bold text-gray-900">{solicitudDetalle.lotNumber}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FaIdCard className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Título</span>
                                    <span className={`font-bold ${solicitudDetalle.titulo === 'SI' ? 'text-emerald-600' : 'text-gray-700'}`}>
                                        {solicitudDetalle.titulo === 'SI' ? 'Sí, el transportista lo recoge' : 'Título No Solicitado'}
                                    </span>
                                </div>
                                {solicitudDetalle.vin && (
                                    <div className="flex items-center gap-3">
                                        <FaKey className="text-blue-500 text-sm flex-shrink-0"/>
                                        <span className="text-gray-500 text-sm font-medium w-24">VIN</span>
                                        <span className="font-mono text-gray-900 text-sm">{solicitudDetalle.vin}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <FaMapMarkerAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Ubicación</span>
                                    <span className="text-gray-900 font-medium">{solicitudDetalle.location || '-'}</span>
                                </div>
                                {solicitudDetalle.auctionDate && (
                                    <div className="flex items-center gap-3">
                                        <FaCalendarAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                        <span className="text-gray-500 text-sm font-medium w-24">Comprado</span>
                                        <span className="text-gray-900 font-medium">{solicitudDetalle.auctionDate}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <FaCalendarAlt className="text-blue-500 text-sm flex-shrink-0"/>
                                    <span className="text-gray-500 text-sm font-medium w-24">Solicitado</span>
                                    <span className="text-gray-900 font-medium">
                                        {solicitudDetalle.fechaSolicitud?.toDate?.().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="mt-10 text-center text-[10px] text-gray-400 uppercase">
                Portal de Clientes - Jorge Minnesota Logistic LLC
            </footer>
        </div>
    );
};

export default ClientPage;
