import React, { useState, useEffect } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import { FaUserLock, FaEye, FaEyeSlash } from "react-icons/fa";

const FormCliente = ({ user, onSuccess, clienteAEditar }) => {
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const [datos, setDatos] = useState({
        cliente: "",
        telefonoCliente: "",
        apodoCliente: "",
        ciudadCliente: "",
        estadoCliente: "",
        paisCliente: "United States",
        rfcCliente: "",
        emailCliente: "",
        // Nuevos campos para acceso
        emailAcceso: "",
        passwordAcceso: ""
    });

    useEffect(() => {
        if (clienteAEditar) {
            setDatos({ ...clienteAEditar, passwordAcceso: clienteAEditar.passwordAcceso || "" });
        } else {
            setDatos({
                cliente: "", telefonoCliente: "", apodoCliente: "",
                ciudadCliente: "", estadoCliente: "", paisCliente: "United States",
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

        if (tieneCredenciales && datos.passwordAcceso.length < 6) {
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

                            // Actualizar users
                            await firestore().collection("users").doc(clienteId).update({
                                email: datos.emailAcceso.toLowerCase(),
                                username: datos.cliente,
                                telefono: datos.telefonoCliente
                            });
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
                            await firestore().collection("users").doc(nuevoUid).set({
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
                await firestore().collection("clientes").doc(clienteId).update({
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
                const conRef = firestore().collection("config").doc("consecutivos");
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

                    await firestore().collection("clientes").doc(clienteId).set(clienteFinal);

                    await firestore().collection("users").doc(clienteId).set({
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
                    await firestore().collection("clientes").add(clienteFinal);
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

    // Formulario válido: nombre y teléfono obligatorios, credenciales opcionales pero completas si se ponen
    const credencialesValidas = (!datos.emailAcceso && !datos.passwordAcceso) ||
                                (datos.emailAcceso?.includes("@") && datos.passwordAcceso?.length >= 6);
    const formularioValido = datos.cliente.trim() !== "" &&
                            datos.telefonoCliente.length > 5 &&
                            credencialesValidas;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50 flex justify-center">
                    <div className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-white font-bold py-2 px-6`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            {/* Fila 1: Datos básicos */}
            <div className="flex flex-row flex-wrap gap-2 items-end w-full mb-4">
                <div className="flex-grow min-w-[200px] p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Nombre / Razón Social: *</label>
                    <input
                        type="text" name="cliente" value={datos.cliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm bg-white text-black focus:border-red-500 uppercase font-bold"
                    />
                </div>

                <div className="w-64 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Teléfono: *</label>
                    <PhoneInput
                        onlyCountries={['us', 'mx']}
                        country={'us'}
                        value={datos.telefonoCliente}
                        onChange={(val, country) => {
                            setDatos({
                                ...datos,
                                telefonoCliente: val.startsWith('+') ? val : '+' + val,
                                paisCliente: country.name
                            });
                        }}
                        inputStyle={{ paddingLeft: '48px', width: '100%' }}
                        inputProps={{ className: 'input input-bordered w-full text-black input-sm bg-white font-bold' }}
                    />
                </div>

                <div className="w-48 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Ciudad:</label>
                    <input
                        type="text" name="ciudadCliente" value={datos.ciudadCliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase"
                    />
                </div>

                <div className="w-20 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Edo:</label>
                    <input
                        type="text" name="estadoCliente" value={datos.estadoCliente} onChange={handleChange}
                        maxLength={4} className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase text-center font-bold"
                    />
                </div>
            </div>

            {/* Fila 2: Referencia */}
            <div className="flex flex-row items-end gap-4 w-full border-t border-gray-100 pt-3 mb-4">
                <div className="w-64 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Referencia (Apodo):</label>
                    <input
                        type="text" name="apodoCliente" value={datos.apodoCliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase"
                    />
                </div>
            </div>

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

            {/* Botón Guardar */}
            <div className="flex justify-end">
                <button
                    onClick={() => { if(formularioValido) document.getElementById('modal-confirmar-cliente').checked = true; }}
                    disabled={!formularioValido || loading}
                    className={`btn btn-sm px-10 shadow-sm ${clienteAEditar ? 'btn-warning' : 'btn-info'} text-white font-bold`}
                >
                    {loading ? "Procesando..." : (clienteAEditar ? "Guardar Cambios" : "+ Guardar Cliente")}
                </button>
            </div>

            {/* Modal de Confirmación */}
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
        </div>
    );
};

export default FormCliente;
