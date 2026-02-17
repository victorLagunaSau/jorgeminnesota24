import React, { useState, useEffect } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { firestore, storage, auth } from "../../firebase/firebaseIni"; // Asegúrate que firebaseIni exporte firebase (el sdk base)
import firebase from "firebase/app";
import { FaCloudUploadAlt, FaUserLock } from "react-icons/fa";

const FormEmpresa = ({ user, onSuccess, empresaAEditar }) => {
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });
    const [archivo, setArchivo] = useState(null);

    const [datos, setDatos] = useState({
        nombreEmpresa: "",
        taxId: "",
        mcNumber: "",
        direccion: "",
        zipCode: "",
        taxClassification: "Individual",
        ciudadEmpresa: "",
        estadoEmpresa: "",
        paisEmpresa: "United States",
        representante: "",
        telefonoEmpresa: "",
        // Nuevos campos para acceso
        emailAcceso: "",
        passwordAcceso: ""
    });

// Este efecto se encarga de llenar O limpiar el formulario
useEffect(() => {
    if (empresaAEditar) {
        // Si hay una empresa para editar, llenamos los campos
        setDatos({ ...empresaAEditar });
    } else {
        // Si empresaAEditar es null (al cancelar o guardar), limpiamos todo
        setDatos({
            nombreEmpresa: "",
            taxId: "",
            mcNumber: "",
            direccion: "",
            zipCode: "",
            taxClassification: "Individual",
            ciudadEmpresa: "",
            estadoEmpresa: "",
            paisEmpresa: "United States",
            representante: "",
            telefonoEmpresa: "",
            emailAcceso: "",
            passwordAcceso: ""
        });
        setArchivo(null); // También limpiamos el archivo seleccionado
    }
}, [empresaAEditar]); // Se ejecuta cada vez que empresaAEditar cambia

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({ mostrar: true, mensaje, tipo });
        setTimeout(() => setAlerta({ mostrar: false, mensaje: "", tipo: "" }), 3000);
    };

    const handleTaxIdChange = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 2) value = value.substring(0, 2) + "-" + value.substring(2, 9);
        setDatos({ ...datos, taxId: value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                mostrarAviso("El archivo es muy pesado (máx 5MB)", "error");
                return;
            }
            setArchivo(file);
        }
    };

    const ejecutarGuardado = async () => {
        if (!datos.nombreEmpresa || !datos.taxId || !datos.telefonoEmpresa || !datos.emailAcceso || !datos.passwordAcceso) {
            mostrarAviso("Faltan campos (Nombre, EIN, Teléfono, Email y Password)", "error");
            return;
        }

        setLoading(true);
        try {
            let urlW9 = datos.urlDocW9 || "";
            if (archivo) {
                const storageRef = storage().ref(`empresas/W9_${datos.taxId || Date.now()}`);
                await storageRef.put(archivo);
                urlW9 = await storageRef.getDownloadURL();
            }

            let empresaId = datos.id; // Tomamos el ID actual (sea de Firestore o nuevo)

            // --- LÓGICA DE USUARIO EN AUTH ---
            // Si NO tiene ID (es nueva) o si tiene un ID de Firestore pero NO está en Auth
            // Para simplificar: si no tenemos un registro previo de que el usuario ya existe en Auth, intentamos crearlo.

            // Creamos instancia secundaria para no cerrar tu sesión
            const secondaryApp = firebase.initializeApp(firebase.app().options, "Secondary");

            try {
                // Intentamos crear el usuario
                const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(datos.emailAcceso, datos.passwordAcceso);

                // Si la creación es exitosa, obtenemos el nuevo UID de Auth
                const nuevoUidAuth = userCredential.user.uid;

                // IMPORTANTE: Si la empresa ya existía en Firestore con un ID viejo (como "XtCDOA..."),
                // pero ahora le creamos cuenta en Auth, lo mejor es migrarla al nuevo UID de Auth para que coincidan.
                empresaId = nuevoUidAuth;

            } catch (authError) {
                // Si el error es que el email ya existe, simplemente ignoramos y seguimos (ya tiene cuenta)
                if (authError.code === 'auth/email-already-in-loop' || authError.code === 'auth/email-already-in-use') {
                    console.log("El usuario ya existe en Auth, procediendo a actualizar datos en Firestore.");
                } else {
                    // Si es otro error (password débil, etc), lanzamos el error
                    throw authError;
                }
            } finally {
                await secondaryApp.auth().signOut();
                await secondaryApp.delete();
            }
            // ---------------------------------

            const usuarioData = {
                admin: false,
                contactoDos: datos.contactoDos || "",
                email: datos.emailAcceso.toLowerCase(),
                id: empresaId,
                nombre: datos.representante || datos.nombreEmpresa,
                photoURL: null,
                telefono: datos.telefonoEmpresa,
                telefonoDos: datos.telefonoDos || "",
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                tipo: "empresa",
                username: datos.nombreEmpresa.toUpperCase(),
                passwordPlana: datos.passwordAcceso
            };

            const empresaFinal = {
                ...datos,
                id: empresaId,
                nombreEmpresa: datos.nombreEmpresa.toUpperCase(),
                direccion: datos.direccion.toUpperCase(),
                urlDocW9: urlW9,
                registro: empresaAEditar ? datos.registro : {
                    usuario: user?.nombre || "Admin",
                    idUsuario: user?.id || "N/A",
                    timestamp: new Date()
                }
            };

            const batch = firestore().batch();
            const userRef = firestore().collection("users").doc(empresaId);
            const empresaRef = firestore().collection("empresas").doc(empresaId);

            // Si el ID cambió (porque creamos un usuario Auth para una empresa vieja),
            // borramos el documento viejo de la colección empresas para no dejar duplicados.
            if (empresaAEditar && empresaAEditar.id !== empresaId) {
                batch.delete(firestore().collection("empresas").doc(empresaAEditar.id));
                batch.delete(firestore().collection("users").doc(empresaAEditar.id));
            }

            batch.set(userRef, usuarioData, { merge: true });
            batch.set(empresaRef, empresaFinal, { merge: true });

            if (!empresaAEditar) {
                const conRef = firestore().collection("config").doc("consecutivos");
                const docCon = await conRef.get();
                const nuevoFolio = (docCon.data().empresas || 0) + 1;
                batch.update(conRef, { empresas: nuevoFolio });
                batch.set(empresaRef, { folio: nuevoFolio }, { merge: true });
            }

            await batch.commit();
            mostrarAviso("Datos y Acceso sincronizados", "success");
            if (onSuccess) onSuccess();

        } catch (e) {
            console.error(e);
            mostrarAviso("Error: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

// Agregamos el signo "?" o verificamos que exista antes del .includes
const valido = datos.nombreEmpresa?.trim() !== "" &&
               (datos.taxId?.length >= 10) &&
               (datos.emailAcceso?.includes("@") || false);

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative font-sans">
            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50 flex justify-center">
                    <div className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-white font-bold py-2 px-6`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            {/* SECCIÓN 1: DATOS FISCALES */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-3">
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-red-600 uppercase italic">Company Name (W-9 Line 1): *</label>
                    <input type="text" value={datos.nombreEmpresa}
                           onChange={(e) => setDatos({ ...datos, nombreEmpresa: e.target.value })}
                           className="input input-bordered w-full input-sm bg-white text-black focus:border-blue-700 uppercase" />
                </div>
                <div className="w-36 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Tax ID (EIN): *</label>
                    <input type="text" placeholder="00-0000000" value={datos.taxId} onChange={handleTaxIdChange} maxLength={10}
                           disabled={empresaAEditar}
                           className="input input-bordered w-full input-sm bg-white text-black font-mono disabled:bg-gray-100" />
                </div>
            </div>

            {/* SECCIÓN 2: DIRECCIÓN Y CONTACTO */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-3 border-t border-gray-100 pt-3">
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Address:</label>
                    <input type="text" value={datos.direccion} onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
                           className="input input-bordered w-full input-sm bg-white text-black uppercase" />
                </div>
                <div className="w-24 p-1">
                    <label className="block text-[11px] font-bold text-red-600 uppercase italic">Zip Code: *</label>
                    <input type="text" maxLength={5} value={datos.zipCode} onChange={(e) => setDatos({ ...datos, zipCode: e.target.value.replace(/\D/g, "") })}
                           className="input input-bordered w-full input-sm bg-white text-black text-center" />
                </div>
                <div className="w-56 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Phone: *</label>
                    <PhoneInput onlyCountries={['us', 'mx']} country={'us'} value={datos.telefonoEmpresa}
                                onChange={(val) => setDatos({ ...datos, telefonoEmpresa: val })}
                                inputStyle={{ width: '100%', height: '32px' }}
                                inputProps={{ className: 'input input-bordered w-full text-black input-sm bg-white' }} />
                </div>
            </div>

            {/* SECCIÓN 3: ACCESO Y USUARIO (NUEVO) */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full border-t border-gray-100 pt-3 bg-blue-50/50 p-2 rounded-lg mb-3">
                <div className="w-8 flex items-center justify-center text-blue-700">
                    <FaUserLock size={20} />
                </div>
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-blue-700 uppercase italic">Email de Acceso: *</label>
                    <input type="email" value={datos.emailAcceso}
                           onChange={(e) => setDatos({ ...datos, emailAcceso: e.target.value })}
                           className="input input-bordered w-full input-sm bg-white text-black" placeholder="ejemplo@correo.com" />
                </div>
                <div className="w-48 p-1">
                    <label className="block text-[11px] font-bold text-blue-700 uppercase italic">Contraseña (Plana): *</label>
                    <input type="text" value={datos.passwordAcceso}
                           onChange={(e) => setDatos({ ...datos, passwordAcceso: e.target.value })}
                           className="input input-bordered w-full input-sm bg-white text-black font-mono" placeholder="Min 6 caract." />
                </div>
            </div>

            {/* BOTONES Y ARCHIVO */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full">
                <div className="flex-grow p-1">
                    <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg h-8 cursor-pointer transition-colors ${archivo ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 hover:border-blue-500 text-gray-400'}`}>
                        <FaCloudUploadAlt />
                        <span className="text-[10px] font-black uppercase">
                            {archivo ? archivo.name.substring(0, 15) + '...' : 'W-9 (JPG/PNG/PDF)'}
                        </span>
                        <input type="file" accept="image/png, image/jpeg, application/pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>

                <div className="p-1">
                    <label htmlFor={valido && !loading ? "modal-confirm-empresa" : ""}
                           className={`btn btn-sm px-8 ${valido ? (empresaAEditar ? 'btn-warning' : 'btn-info') : 'btn-disabled opacity-50'}`}>
                        {loading ? <span className="loading loading-spinner loading-xs"></span> : (empresaAEditar ? "Actualizar Empresa" : "+ Guardar Carrier")}
                    </label>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            <input type="checkbox" id="modal-confirm-empresa" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-info text-black">
                    <h3 className="font-bold text-lg uppercase italic">{empresaAEditar ? '¿Actualizar Datos?' : 'Confirmar Registro'}</h3>
                    <p className="py-4 text-[13px] text-gray-600">
                        Se {empresaAEditar ? 'actualizarán' : 'crearán'} los datos de <span className="font-bold text-blue-800">{datos.nombreEmpresa}</span>.
                        Acceso con: <span className="font-bold">{datos.emailAcceso}</span>
                    </p>
                    <div className="modal-action">
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-outline">Revisar</label>
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-info text-white" onClick={ejecutarGuardado}>Confirmar</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormEmpresa;