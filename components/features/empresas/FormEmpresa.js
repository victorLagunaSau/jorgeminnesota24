import React, { useState, useEffect } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { firestore, storage } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import { FaCloudUploadAlt, FaUserLock, FaExclamationTriangle } from "react-icons/fa";
import { PHONE_CONFIG, COLLECTIONS, FIELD_LIMITS } from "../../../constants";
import Alert from "../../ui/Alert";

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
        paisEmpresa: PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
        representante: "",
        telefonoEmpresa: "",
        emailAcceso: "",
        passwordAcceso: ""
    });

    useEffect(() => {
        if (empresaAEditar) {
            setDatos({ ...empresaAEditar });
        } else {
            setDatos({
                nombreEmpresa: "",
                taxId: "",
                mcNumber: "",
                direccion: "",
                zipCode: "",
                taxClassification: "Individual",
                ciudadEmpresa: "",
                estadoEmpresa: "",
                paisEmpresa: PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
                representante: "",
                telefonoEmpresa: "",
                emailAcceso: "",
                passwordAcceso: ""
            });
            setArchivo(null);
        }
    }, [empresaAEditar]);

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
            if (file.size > FIELD_LIMITS.MAX_FILE_SIZE) {
                mostrarAviso("El archivo es muy pesado (máx 5MB)", "error");
                return;
            }
            setArchivo(file);
        }
    };

    const ejecutarGuardado = async () => {
        if (!datos.nombreEmpresa || !datos.taxId || !datos.telefonoEmpresa || !datos.emailAcceso || !datos.passwordAcceso) {
            mostrarAviso("Faltan campos obligatorios", "error");
            return;
        }

        setLoading(true);
        try {
            let urlW9 = datos.urlDocW9 || "";
            // Si hay un archivo nuevo, lo subimos usando el taxId actual como referencia
            if (archivo) {
                const storageRef = storage().ref(`empresas/W9_${datos.taxId}`);
                await storageRef.put(archivo);
                urlW9 = await storageRef.getDownloadURL();
            }

            let empresaId = datos.id;

            // Manejo de Auth (Lógica para creación y actualización de credenciales)
            const secondaryApp = firebase.initializeApp(firebase.app().options, "Secondary");
            try {
                if (!empresaAEditar) {
                    // CREAR NUEVO USUARIO
                    const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(datos.emailAcceso, datos.passwordAcceso);
                    empresaId = userCredential.user.uid;
                } else {
                    // ACTUALIZAR USUARIO EXISTENTE - SIN CAMBIAR EL ID
                    empresaId = empresaAEditar.id;

                    // Obtener credenciales actuales de Firestore
                    const empresaDoc = await firestore().collection(COLLECTIONS.EMPRESAS).doc(empresaAEditar.id).get();
                    const datosActuales = empresaDoc.data();
                    const emailActual = datosActuales.emailAcceso;
                    const passwordActual = datosActuales.passwordAcceso;

                    try {
                        // Intentar re-autenticar con credenciales actuales
                        const userCredential = await secondaryApp.auth().signInWithEmailAndPassword(emailActual, passwordActual);
                        const currentUser = userCredential.user;

                        // Actualizar email si cambió
                        if (datos.emailAcceso.toLowerCase() !== emailActual.toLowerCase()) {
                            await currentUser.updateEmail(datos.emailAcceso.toLowerCase());
                        }

                        // Actualizar contraseña si cambió
                        if (datos.passwordAcceso !== passwordActual) {
                            await currentUser.updatePassword(datos.passwordAcceso);
                        }
                    } catch (loginError) {
                        console.log("Error de autenticación:", loginError.code);

                        // Si no existe en Auth, solo actualizar Firestore (el ID se mantiene)
                        // El usuario podrá acceder cuando se sincronice manualmente en Firebase Console
                        if (loginError.code === 'auth/user-not-found') {
                            mostrarAviso("Usuario no existe en Auth. Se actualizarán solo los datos en Firestore.", "warning");
                            // Continuar para guardar en Firestore con el mismo ID
                        } else if (loginError.code === 'auth/wrong-password') {
                            mostrarAviso("La contraseña actual no coincide. Se actualizarán solo los datos en Firestore.", "warning");
                            // Continuar para guardar en Firestore con el mismo ID
                        } else {
                            throw loginError;
                        }
                    }
                }
            } catch (authError) {
                console.error("Error en Auth:", authError);
                mostrarAviso("Error: " + authError.message, "error");
                setLoading(false);
                return;
            } finally {
                await secondaryApp.auth().signOut();
                await secondaryApp.delete();
            }

            const usuarioData = {
                email: datos.emailAcceso.toLowerCase(),
                id: empresaId,
                nombre: datos.representante || datos.nombreEmpresa,
                telefono: datos.telefonoEmpresa,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                tipo: "empresa",
                username: datos.nombreEmpresa.toUpperCase(),
                passwordPlana: datos.passwordAcceso
            };

            const empresaFinal = {
                ...datos,
                id: empresaId,
                nombreEmpresa: datos.nombreEmpresa.toUpperCase(),
                taxId: datos.taxId, // Guardamos el Tax ID editado
                urlDocW9: urlW9,
                registro: empresaAEditar ? datos.registro : {
                    usuario: user?.nombre || "Admin",
                    idUsuario: user?.id || "N/A",
                    timestamp: new Date()
                }
            };

            const batch = firestore().batch();
            const userRef = firestore().collection(COLLECTIONS.USERS).doc(empresaId);
            const empresaRef = firestore().collection(COLLECTIONS.EMPRESAS).doc(empresaId);

            batch.set(userRef, usuarioData, { merge: true });
            batch.set(empresaRef, empresaFinal, { merge: true });

            if (!empresaAEditar) {
                const conRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");
                const docCon = await conRef.get();
                const nuevoFolio = (docCon.data().empresas || 0) + 1;
                batch.update(conRef, { empresas: nuevoFolio });
                batch.set(empresaRef, { folio: nuevoFolio }, { merge: true });
            }

            await batch.commit();
            mostrarAviso("Empresa actualizada correctamente", "success");
            if (onSuccess) onSuccess();

        } catch (e) {
            console.error(e);
            mostrarAviso("Error: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const valido = datos.nombreEmpresa?.trim() !== "" && datos.taxId?.length >= 10;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative font-sans">
            <Alert mostrar={alerta.mostrar} mensaje={alerta.mensaje} tipo={alerta.tipo === 'success' ? 'success' : 'error'} />

            {/* SECCIÓN 1: DATOS FISCALES */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-3">
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-red-600 uppercase italic">Company Name: *</label>
                    <input type="text" value={datos.nombreEmpresa}
                           onChange={(e) => setDatos({ ...datos, nombreEmpresa: e.target.value })}
                           className="input input-bordered w-full input-sm bg-white text-black focus:border-blue-700 uppercase" />
                </div>
                <div className="w-48 p-1">
                    <label className="block text-[11px] font-bold text-red-600 uppercase italic flex items-center gap-1">
                        Tax ID (EIN): * {empresaAEditar && <FaExclamationTriangle className="text-orange-500" title="Editando ID existente" />}
                    </label>
                    <input
                        type="text"
                        placeholder="00-0000000"
                        value={datos.taxId}
                        onChange={handleTaxIdChange}
                        maxLength={FIELD_LIMITS.TAX_ID}
                        className="input input-bordered w-full input-sm bg-white text-black font-mono border-red-200 focus:border-red-600"
                    />
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
                    <input type="text" maxLength={FIELD_LIMITS.ZIP_CODE} value={datos.zipCode} onChange={(e) => setDatos({ ...datos, zipCode: e.target.value.replace(/\D/g, "") })}
                           className="input input-bordered w-full input-sm bg-white text-black text-center" />
                </div>
                <div className="w-56 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Phone: *</label>
                    <PhoneInput onlyCountries={PHONE_CONFIG.COUNTRIES} country={PHONE_CONFIG.DEFAULT_COUNTRY} value={datos.telefonoEmpresa}
                                onChange={(val) => setDatos({ ...datos, telefonoEmpresa: val })}
                                inputStyle={{ paddingLeft: '45px', width: '100%', height: '32px' }}
                                inputProps={{ className: 'input input-bordered w-full text-black input-sm bg-white font-bold' }} />
                </div>
            </div>

            {/* SECCIÓN 3: ACCESO */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full border-t border-gray-100 pt-3 bg-blue-50/50 p-2 rounded-lg mb-3">
                <div className="w-8 flex items-center justify-center text-blue-700">
                    <FaUserLock size={20} />
                </div>
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-blue-700 uppercase italic">Email de Acceso: *</label>
                    <input type="email" value={datos.emailAcceso}
                           onChange={(e) => setDatos({ ...datos, emailAcceso: e.target.value })}
                           className="input input-bordered w-full input-sm bg-white text-black" />
                </div>
                <div className="w-48 p-1">
                    <label className="block text-[11px] font-bold text-blue-700 uppercase italic">Contraseña: *</label>
                    <input type="text" value={datos.passwordAcceso}
                           onChange={(e) => setDatos({ ...datos, passwordAcceso: e.target.value })}
                           className="input input-bordered w-full input-sm bg-white text-black font-mono" />
                </div>
            </div>

            {/* BOTONES */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full">
                <div className="flex-grow p-1">
                    <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg h-8 cursor-pointer transition-colors ${archivo ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 hover:border-blue-500 text-gray-400'}`}>
                        <FaCloudUploadAlt />
                        <span className="text-[10px] font-black uppercase">
                            {archivo ? archivo.name.substring(0, 15) + '...' : 'Actualizar W-9'}
                        </span>
                        <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>

                <div className="p-1">
                    <button
                        onClick={() => { if(valido) document.getElementById('modal-confirm-empresa').checked = true; }}
                        disabled={!valido || loading}
                        className={`btn btn-sm px-8 ${empresaAEditar ? 'btn-warning' : 'btn-info'} text-white font-bold`}
                    >
                        {loading ? "Procesando..." : (empresaAEditar ? "Guardar Cambios" : "+ Registrar")}
                    </button>
                </div>
            </div>

            {/* MODAL */}
            <input type="checkbox" id="modal-confirm-empresa" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-info">
                    <h3 className="font-bold text-lg uppercase text-black">Confirmar Modificación</h3>
                    <p className="py-4 text-[13px] text-gray-600">
                        ¿Estás seguro de actualizar los datos de <span className="font-bold">{datos.nombreEmpresa}</span>?
                        {empresaAEditar && <span className="block mt-2 text-red-600 font-bold">El Tax ID será actualizado en el sistema.</span>}
                    </p>
                    <div className="modal-action">
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-outline">Cancelar</label>
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-info text-white" onClick={ejecutarGuardado}>Confirmar</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormEmpresa;