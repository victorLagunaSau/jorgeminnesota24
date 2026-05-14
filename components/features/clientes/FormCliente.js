import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import { FaUserLock, FaEye, FaEyeSlash, FaTrash, FaIdCard } from "react-icons/fa";
import { PHONE_CONFIG, COLLECTIONS, FIELD_LIMITS } from "../../../constants";
import Alert from "../../ui/Alert";

const FormCliente = ({ user, onSuccess, clienteAEditar, onDelete }) => {
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const [datos, setDatos] = useState({
        cliente: "",
        telefonoCliente: "",
        apodoCliente: "",
        direccionCliente: "",
        ciudadCliente: "",
        estadoCliente: "",
        paisCliente: PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
        rfcCliente: "",
        emailCliente: "",
        emailAcceso: "",
        passwordAcceso: ""
    });
    const [imagenAmpliada, setImagenAmpliada] = useState(null);

    useEffect(() => {
        if (clienteAEditar) {
            setDatos({ ...clienteAEditar, passwordAcceso: clienteAEditar.passwordAcceso || "" });
        } else {
            setDatos({
                cliente: "", telefonoCliente: "", apodoCliente: "", direccionCliente: "",
                ciudadCliente: "", estadoCliente: "", paisCliente: PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
                rfcCliente: "", emailCliente: "",
                emailAcceso: "", passwordAcceso: ""
            });
        }
    }, [clienteAEditar]);

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({ mostrar: true, mensaje, tipo });
        setTimeout(() => setAlerta({ mostrar: false, mensaje: "", tipo: "" }), 4000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatos({ ...datos, [name]: value });
    };

    const ejecutarGuardado = async () => {
        // Validar campos de acceso solo si se proporcionan
        const tieneCredenciales = datos.emailAcceso && datos.passwordAcceso;
        const credencialesParciales = (datos.emailAcceso && !datos.passwordAcceso) || (!datos.emailAcceso && datos.passwordAcceso);

        if (credencialesParciales) {
            mostrarAviso("Debes llenar tanto email como contraseña para crear acceso", "error");
            return;
        }

        if (tieneCredenciales && datos.passwordAcceso.length < FIELD_LIMITS.MIN_PASSWORD) {
            mostrarAviso("La contraseña debe tener al menos 6 caracteres", "error");
            return;
        }

        setLoading(true);

        // Solo crear app secundaria si hay credenciales
        let secondaryApp = null;
        if (tieneCredenciales) {
            try {
                secondaryApp = firebase.initializeApp(firebase.app().options, "SecondaryClient" + Date.now());
            } catch (e) {
                secondaryApp = firebase.app("SecondaryClient");
            }
        }

        try {
            let clienteId = clienteAEditar?.id;

            if (clienteAEditar) {
                // === ACTUALIZACIÓN DE CLIENTE EXISTENTE ===
                const emailActual = clienteAEditar.emailAcceso;
                const passwordActual = clienteAEditar.passwordAcceso;
                const yaTeníaCredenciales = emailActual && passwordActual;

                if (tieneCredenciales) {
                    if (yaTeníaCredenciales) {
                        // Actualizar credenciales existentes
                        try {
                            const userCredential = await secondaryApp.auth().signInWithEmailAndPassword(emailActual, passwordActual);
                            const currentUser = userCredential.user;

                            if (datos.emailAcceso.toLowerCase() !== emailActual.toLowerCase()) {
                                await currentUser.updateEmail(datos.emailAcceso.toLowerCase());
                            }
                            if (datos.passwordAcceso !== passwordActual) {
                                await currentUser.updatePassword(datos.passwordAcceso);
                            }
                            await secondaryApp.auth().signOut();

                            // Actualizar users (el doc puede estar con authUid o con clienteId)
                            const userDocId = clienteAEditar.authUid || clienteId;
                            const userDoc = await firestore().collection(COLLECTIONS.USERS).doc(userDocId).get();
                            if (userDoc.exists) {
                                await firestore().collection(COLLECTIONS.USERS).doc(userDocId).update({
                                    email: datos.emailAcceso.toLowerCase(),
                                    username: datos.cliente,
                                    telefono: datos.telefonoCliente
                                });
                            }
                        } catch (authError) {
                            console.error("Error actualizando Auth:", authError);
                            mostrarAviso("Error al actualizar credenciales: " + authError.message, "error");
                            setLoading(false);
                            return;
                        }
                    } else {
                        // CREAR NUEVAS CREDENCIALES para cliente existente
                        try {
                            const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(
                                datos.emailAcceso.toLowerCase(),
                                datos.passwordAcceso
                            );
                            const nuevoUid = userCredential.user.uid;
                            await secondaryApp.auth().signOut();

                            // Crear documento en users con el nuevo UID
                            await firestore().collection(COLLECTIONS.USERS).doc(nuevoUid).set({
                                email: datos.emailAcceso.toLowerCase(),
                                username: datos.cliente,
                                telefono: datos.telefonoCliente,
                                tipo: "cliente",
                                clienteIdOriginal: clienteId, // Referencia al cliente original
                                activo: true,
                                createdAt: new Date()
                            });

                            // Actualizar el cliente con referencia al UID de auth
                            datos.authUid = nuevoUid;

                        } catch (authError) {
                            console.error("Error creando Auth:", authError);
                            if (authError.code === 'auth/email-already-in-use') {
                                mostrarAviso("Este email ya está registrado en el sistema", "error");
                            } else {
                                mostrarAviso("Error al crear acceso: " + authError.message, "error");
                            }
                            setLoading(false);
                            return;
                        }
                    }
                }

                // Actualizar cliente en Firestore
                await firestore().collection(COLLECTIONS.CLIENTES).doc(clienteId).update({
                    ...datos,
                    editado: {
                        usuario: user?.nombre || "Admin",
                        fecha: new Date()
                    }
                });

                mostrarAviso(tieneCredenciales && !yaTeníaCredenciales
                    ? "Cliente actualizado y acceso al portal creado"
                    : "Cliente actualizado correctamente", "success");

            } else {
                // === REGISTRO NUEVO ===
                const conRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");
                const docCon = await conRef.get();
                const nuevoFolio = (docCon.data().clientes || 0) + 1;

                const clienteFinal = {
                    ...datos,
                    folio: nuevoFolio,
                    registro: {
                        usuario: user?.nombre || "Admin",
                        idUsuario: user?.id || user?.uid || "N/A",
                        timestamp: new Date()
                    }
                };

                if (tieneCredenciales) {
                    // Crear con credenciales
                    const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(
                        datos.emailAcceso.toLowerCase(),
                        datos.passwordAcceso
                    );
                    clienteId = userCredential.user.uid;
                    await secondaryApp.auth().signOut();

                    await firestore().collection(COLLECTIONS.CLIENTES).doc(clienteId).set(clienteFinal);

                    await firestore().collection(COLLECTIONS.USERS).doc(clienteId).set({
                        email: datos.emailAcceso.toLowerCase(),
                        username: datos.cliente,
                        telefono: datos.telefonoCliente,
                        tipo: "cliente",
                        activo: true,
                        createdAt: new Date()
                    });

                    mostrarAviso(`Cliente #${nuevoFolio} creado con acceso al portal`, "success");
                } else {
                    // Crear sin credenciales (como antes)
                    await firestore().collection(COLLECTIONS.CLIENTES).add(clienteFinal);
                    mostrarAviso(`Cliente #${nuevoFolio} guardado (sin acceso al portal)`, "success");
                }

                await conRef.update({ clientes: nuevoFolio });
            }

            if (onSuccess) onSuccess();

        } catch (error) {
            console.error("Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                mostrarAviso("Este email ya está registrado", "error");
            } else {
                mostrarAviso("Error: " + error.message, "error");
            }
        } finally {
            setLoading(false);
            if (secondaryApp) {
                try {
                    await secondaryApp.delete();
                } catch (e) {}
            }
        }
    };

    const ejecutarEliminacion = async () => {
        if (!clienteAEditar?.id) return;
        setEliminando(true);
        let secondaryApp = null;
        try {
            // Eliminar Auth user via secondary app si tiene credenciales
            const emailAuth = clienteAEditar.emailAcceso || clienteAEditar.emailCliente;
            const passAuth = clienteAEditar.passwordAcceso;
            if (emailAuth && passAuth) {
                try {
                    const config = firebase.app().options;
                    secondaryApp = firebase.apps.find(a => a.name === "deleteApp") || firebase.initializeApp(config, "deleteApp");
                    const cred = await secondaryApp.auth().signInWithEmailAndPassword(emailAuth, passAuth);
                    await cred.user.delete();
                } catch (authErr) {
                    console.warn("No se pudo eliminar Auth user:", authErr.message);
                }
            }
            // Eliminar doc de users
            const uidToDelete = clienteAEditar.authUid || clienteAEditar.id;
            const userDoc = await firestore().collection(COLLECTIONS.USERS).doc(uidToDelete).get();
            if (userDoc.exists) {
                await firestore().collection(COLLECTIONS.USERS).doc(uidToDelete).delete();
            }
            await firestore().collection(COLLECTIONS.CLIENTES).doc(clienteAEditar.id).delete();
            setMostrarConfirmEliminar(false);
            if (onDelete) onDelete();
            else if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error al eliminar cliente:", error);
            mostrarAviso("Error al eliminar: " + error.message, "error");
            setEliminando(false);
        } finally {
            if (secondaryApp) {
                try { await secondaryApp.delete(); } catch (_) {}
            }
        }
    };

    // Formulario válido: nombre obligatorio, teléfono y credenciales opcionales
    const credencialesValidas = (!datos.emailAcceso && !datos.passwordAcceso) ||
                                (datos.emailAcceso?.includes("@") && datos.passwordAcceso?.length >= 6);
    const formularioValido = datos.cliente.trim() !== "" &&
                            credencialesValidas;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
            <Alert mostrar={alerta.mostrar} mensaje={alerta.mensaje} tipo={alerta.tipo === 'success' ? 'success' : 'error'} />

            {/* Datos del cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic mb-1">Nombre / Razón Social *</label>
                    <input
                        type="text" name="cliente" value={datos.cliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm bg-white text-black focus:border-red-500 uppercase"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic mb-1">Teléfono</label>
                    <input
                        type="text" name="telefonoCliente" value={datos.telefonoCliente} onChange={handleChange}
                        placeholder="+1 555 123 4567"
                        className="input input-bordered w-full text-black input-sm bg-white"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic mb-1">Dirección</label>
                    <input
                        type="text" name="direccionCliente" value={datos.direccionCliente || ""} onChange={handleChange}
                        className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic mb-1">Ciudad</label>
                    <input
                        type="text" name="ciudadCliente" value={datos.ciudadCliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase italic mb-1">Estado</label>
                        <input
                            type="text" name="estadoCliente" value={datos.estadoCliente} onChange={handleChange}
                            maxLength={4} className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase italic mb-1">Referencia</label>
                        <input
                            type="text" name="apodoCliente" value={datos.apodoCliente} onChange={handleChange}
                            className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase"
                        />
                    </div>
                </div>
            </div>

            {/* Foto de Licencia */}
            {clienteAEditar && (clienteAEditar.licenciaBase64 || clienteAEditar.licenciaUrl) && (
                <div className="border-t border-gray-100 pt-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <FaIdCard className="text-gray-400"/>
                        <span className="text-[10px] font-black text-gray-600 uppercase">Licencia</span>
                    </div>
                    <img
                        src={clienteAEditar.licenciaBase64 || clienteAEditar.licenciaUrl}
                        alt="Licencia"
                        className="max-w-[280px] rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setImagenAmpliada(clienteAEditar.licenciaBase64 || clienteAEditar.licenciaUrl)}
                    />
                </div>
            )}

            {/* Fila 3: Credenciales de Acceso (Opcional) */}
            <div className={`p-4 rounded-lg border mb-4 ${datos.emailAcceso || datos.passwordAcceso ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FaUserLock className={datos.emailAcceso ? "text-blue-600" : "text-gray-400"} />
                        <span className={`text-[11px] font-black uppercase ${datos.emailAcceso ? 'text-blue-800' : 'text-gray-600'}`}>
                            Credenciales de Acceso al Portal
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Opcional</span>
                </div>
                <div className="flex flex-row flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Email de Acceso:</label>
                        <input
                            type="email"
                            name="emailAcceso"
                            value={datos.emailAcceso}
                            onChange={handleChange}
                            placeholder="correo@ejemplo.com"
                            className="input input-bordered w-full input-sm bg-white text-black focus:border-blue-500 lowercase"
                        />
                    </div>
                    <div className="w-64 relative">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Contraseña:</label>
                        <input
                            type={mostrarPassword ? "text" : "password"}
                            name="passwordAcceso"
                            value={datos.passwordAcceso}
                            onChange={handleChange}
                            placeholder="Mínimo 6 caracteres"
                            className="input input-bordered w-full input-sm bg-white text-black focus:border-blue-500 pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setMostrarPassword(!mostrarPassword)}
                            className="absolute right-3 top-6 text-gray-500 hover:text-blue-600"
                        >
                            {mostrarPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                </div>
                <p className="text-[9px] text-gray-500 mt-2 italic">
                    {clienteAEditar?.emailAcceso
                        ? "Este cliente ya tiene acceso al portal. Puedes modificar sus credenciales."
                        : "Si agregas email y contraseña, el cliente podrá acceder a /portal para ver sus vehículos."
                    }
                </p>
            </div>

            {/* Botones Guardar / Eliminar */}
            <div className={`flex ${clienteAEditar ? 'justify-between' : 'justify-end'} items-center`}>
                {clienteAEditar && (
                    <button
                        onClick={() => setMostrarConfirmEliminar(true)}
                        className="btn btn-sm btn-outline border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 font-bold gap-2"
                    >
                        <FaTrash size={12}/> Eliminar Cliente
                    </button>
                )}
                <button
                    onClick={() => { if(formularioValido) document.getElementById('modal-confirmar-cliente').checked = true; }}
                    disabled={!formularioValido || loading}
                    className={`btn btn-sm px-10 shadow-sm ${clienteAEditar ? 'btn-warning' : 'btn-info'} text-white font-bold`}
                >
                    {loading ? "Procesando..." : (clienteAEditar ? "Guardar Cambios" : "+ Guardar Cliente")}
                </button>
            </div>

            {/* Modal de Confirmación de Guardado */}
            <input type="checkbox" id="modal-confirmar-cliente" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-info">
                    <h3 className="font-bold text-lg text-black uppercase">{clienteAEditar ? 'Confirmar Edición' : 'Confirmar Registro'}</h3>
                    <p className="py-4 text-gray-600 font-medium">
                        ¿Deseas guardar los cambios para <span className="font-bold text-black">{datos.cliente}</span>?
                    </p>
                    {datos.emailAcceso && datos.passwordAcceso && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            {clienteAEditar?.emailAcceso
                                ? `Se actualizarán las credenciales de acceso`
                                : `Se creará acceso al portal con: ${datos.emailAcceso}`
                            }
                        </p>
                    )}
                    {!datos.emailAcceso && !clienteAEditar?.emailAcceso && (
                        <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                            Sin acceso al portal (puedes agregarlo después)
                        </p>
                    )}
                    <div className="modal-action">
                        <label htmlFor="modal-confirmar-cliente" className="btn btn-sm btn-outline">Cancelar</label>
                        <label htmlFor="modal-confirmar-cliente" className="btn btn-sm btn-info text-white" onClick={ejecutarGuardado}>Confirmar</label>
                    </div>
                </div>
            </div>

            {/* Modal imagen ampliada */}
            {imagenAmpliada && (
                <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4" onClick={() => setImagenAmpliada(null)}>
                    <img src={imagenAmpliada} alt="Licencia" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"/>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {mostrarConfirmEliminar && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-xl max-w-xs w-full shadow-xl p-6 text-center">
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                            Confirmar Eliminación
                        </h3>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setMostrarConfirmEliminar(false)}
                                disabled={eliminando}
                                className="flex-1 btn btn-sm btn-outline border-gray-300 text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600 font-black uppercase"
                            >
                                No
                            </button>
                            <button
                                onClick={ejecutarEliminacion}
                                disabled={eliminando}
                                className="flex-1 btn btn-sm btn-outline border-gray-300 text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600 font-black uppercase"
                            >
                                {eliminando ? <span className="loading loading-spinner loading-sm"></span> : "Sí"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormCliente;
