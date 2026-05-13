import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import firebase from "firebase/app";
import { useAuthContext } from "../context/auth";
import { auth, firestore } from "../firebase/firebaseIni";
import { COLLECTIONS, PHONE_CONFIG, FIELD_LIMITS } from "../constants";
import imageCompression from "browser-image-compression";
import {
    FaUser, FaLock, FaSignOutAlt, FaCar, FaTruck, FaMapMarkerAlt, FaPhone,
    FaSearch, FaCalendarAlt, FaWarehouse, FaPlus, FaUserCircle, FaArrowLeft,
    FaEnvelope, FaIdCard, FaGlobe, FaCity, FaCheckCircle, FaLockOpen,
    FaUserPlus, FaEye, FaEyeSlash, FaCamera, FaClock
} from "react-icons/fa";

const ClientsPage = () => {
    const { user, loading, isCliente, signIn, signOut } = useAuthContext();
    const [vehiculos, setVehiculos] = useState([]);
    const [solicitudes, setSolicitudes] = useState([]);
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
            // Obtener siguiente folio
            const conRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");
            const docCon = await conRef.get();
            const nuevoFolio = (docCon.data().clientes || 0) + 1;

            // Intentar crear usuario en Auth, o reutilizar si ya existe (fue borrado de Firestore)
            let uid;
            try {
                const result = await auth().createUserWithEmailAndPassword(email.toLowerCase(), pass);
                uid = result.user.uid;
            } catch (authErr) {
                if (authErr.code === "auth/email-already-in-use") {
                    // El email existe en Auth pero pudo haber sido borrado de Firestore
                    // Intentar sign in con la contraseña proporcionada
                    try {
                        const loginResult = await auth().signInWithEmailAndPassword(email.toLowerCase(), pass);
                        uid = loginResult.user.uid;
                        // Actualizar contraseña si es diferente
                        await loginResult.user.updatePassword(pass);
                    } catch (loginErr) {
                        setError("Este email ya está registrado con otra contraseña. Intenta iniciar sesión o usa otro email.");
                        setLoadingAuth(false);
                        return;
                    }
                } else {
                    throw authErr;
                }
            }

            // Convertir foto de licencia a base64 (se guarda directo en Firestore)
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

            // Crear documento en users
            await firestore().collection(COLLECTIONS.USERS).doc(uid).set({
                email: email.toLowerCase(),
                username: regNombre.trim(),
                telefono: regPrefijo + " " + regTelefono.trim(),
                tipo: "cliente",
                activo: true,
                createdAt: new Date()
            });

            // Crear documento en clientes con el mismo UID
            await firestore().collection(COLLECTIONS.CLIENTES).doc(uid).set({
                cliente: regNombre.trim().toUpperCase(),
                telefonoCliente: regPrefijo + " " + regTelefono.trim(),
                emailCliente: email.toLowerCase(),
                emailAcceso: email.toLowerCase(),
                passwordAcceso: pass,
                ciudadCliente: regCiudad.trim(),
                estadoCliente: regEstado.trim().toUpperCase(),
                paisCliente: PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
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

            // Actualizar consecutivo
            await conRef.update({ clientes: nuevoFolio });

            // Mostrar pantalla de revisión directamente
            setRegistroExitoso(true);

        } catch (err) {
            console.error("Error en registro:", err);
            setError("Error al crear cuenta: " + err.message);
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
            pendiente: { className: "bg-amber-100 text-amber-800", label: "En Progreso" },
            asignado: { className: "bg-indigo-100 text-indigo-800", label: "Asignado" },
            en_proceso: { className: "bg-blue-100 text-blue-800", label: "En Camino" },
        };
        return config[estado] || config.pendiente;
    };

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
    // Registro exitoso — mostrar directo sin esperar reload
    if (registroExitoso) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center items-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Cuenta en Revisión | Jorge Minnesota INC</title></Head>
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <FaClock className="text-3xl text-amber-600"/>
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

    if (user && !isCliente) {
        signOut();
        return null;
    }

    if (loading || loadingAuth) return (
        <div className="h-screen flex flex-col justify-center items-center bg-white">
            <span className="loading loading-ring loading-lg text-blue-600"></span>
        </div>
    );

    // ============================================================
    // LOGIN / REGISTRO
    // ============================================================
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center p-6 safe-area-top safe-area-bottom">
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
                                <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300">
                                    <FaCamera className="text-gray-400 text-lg flex-shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-600">
                                            {regLicenciaFile ? regLicenciaFile.name : "Foto de tu Licencia"}
                                        </p>
                                        <p className="text-[10px] text-gray-400">Toma una foto o sube una imagen</p>
                                    </div>
                                    {regLicenciaPreview && (
                                        <img src={regLicenciaPreview} alt="Licencia" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200"/>
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
                                className="btn btn-primary w-full text-white font-black uppercase shadow-lg"
                            >
                                {loadingAuth ? <span className="loading loading-spinner loading-sm"></span> : (
                                    <span className="flex items-center gap-2"><FaUserPlus/> Crear Cuenta</span>
                                )}
                            </button>
                        </form>
                    )}
                    <div className="mt-6 text-center">
                        <Link href="/driver">
                            <a className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium">
                                ← Soy Chofer
                            </a>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // CUENTA EN REVISIÓN (no aprobado)
    // ============================================================
    if (clienteData.aprobado === false || user?.datosCliente?.aprobado === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center items-center p-6 safe-area-top safe-area-bottom">
                <Head><title>Cuenta en Revisión | Jorge Minnesota INC</title></Head>
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <FaClock className="text-3xl text-amber-600"/>
                    </div>
                    <h2 className="text-xl font-black uppercase text-gray-800 mb-2">Cuenta en Revisión</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Tu cuenta está siendo revisada por nuestro equipo. Te notificaremos cuando sea aprobada.
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
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
    const vehiculosFiltrados = vehiculos.filter(v =>
        v.binNip?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.marca?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-10 safe-area-bottom font-sans text-black">
            <Head><title>Portal | Jorge Minnesota INC</title></Head>

            {/* Pull-to-refresh indicator */}
            {refreshing && (
                <div className="ptr-spinner">
                    <div className="ptr-icon"></div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white p-4 safe-area-top flex justify-between items-center border-b-2 border-gray-100 sticky top-0 z-[60] shadow-sm">
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
                /* ============ VISTA PERFIL (READ-ONLY) ============ */
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

                        <div className="px-6 py-3 flex items-center gap-2 text-xs font-bold bg-blue-50 text-blue-700">
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
                            ].map((campo, i) => (
                                <div key={i}>
                                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">{campo.label}</label>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                                        {campo.icon}
                                        <span className="text-sm font-medium text-gray-700">{campo.value || "-"}</span>
                                    </div>
                                </div>
                            ))}

                            {/* Foto de licencia */}
                            {(clienteData.licenciaBase64 || clienteData.licenciaUrl) && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Licencia</label>
                                    <img src={clienteData.licenciaBase64 || clienteData.licenciaUrl} alt="Licencia" className="w-full max-w-xs rounded-lg border border-gray-200 shadow-sm"/>
                                </div>
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

                    {/* Solicitudes activas */}
                    {solicitudes.length > 0 && (
                        <div className="max-w-6xl mx-auto px-4 mb-4">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FaTruck className="text-amber-600" />
                                        <span className="text-sm font-black text-amber-800 uppercase">Mis Solicitudes</span>
                                        <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{solicitudes.length}</span>
                                    </div>
                                    <Link href="/solicitar">
                                        <a className="text-[10px] font-bold text-amber-700 underline">Ver todas</a>
                                    </Link>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {solicitudes.map(sol => {
                                        const badge = getSolicitudBadge(sol.estado);
                                        return (
                                            <div key={sol.id} className="px-4 py-3 flex items-center gap-3">
                                                {sol.imageUrl ? (
                                                    <img src={sol.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <FaCar className="text-gray-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 uppercase truncate">
                                                        {sol.year} {sol.make} {sol.model}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">
                                                        Lote: {sol.lotNumber} • {sol.source}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <FaMapMarkerAlt className="text-[8px]" /> {sol.location || 'N/A'}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${badge.className}`}>
                                                    {badge.label}
                                                </span>
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
                            solicitudes.length === 0 && (
                                <div className="text-center py-20">
                                    <FaCar className="text-6xl text-gray-300 mx-auto mb-4"/>
                                    <p className="text-gray-500">
                                        {busqueda ? "No se encontraron vehículos con esa búsqueda" : "No tienes vehículos registrados"}
                                    </p>
                                </div>
                            )
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
