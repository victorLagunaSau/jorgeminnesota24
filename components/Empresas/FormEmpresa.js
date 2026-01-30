import React, {useState} from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {firestore, storage} from "../../firebase/firebaseIni";
import { FaFileImage, FaCloudUploadAlt } from "react-icons/fa";

const FormEmpresa = ({user, onSuccess}) => {
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState({mostrar: false, mensaje: "", tipo: ""});
    const [archivo, setArchivo] = useState(null);

    const [datos, setDatos] = useState({
        nombreEmpresa: "",
        taxId: "",
        mcNumber: "",
        direccion: "", // Nuevo: Línea 5 del W-9
        zipCode: "",   // Nuevo: Línea 6 del W-9
        taxClassification: "Individual", // Nuevo: Línea 3 del W-9
        ciudadEmpresa: "",
        estadoEmpresa: "",
        paisEmpresa: "United States",
        representante: "",
        telefonoEmpresa: ""
    });

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({mostrar: true, mensaje, tipo});
        setTimeout(() => setAlerta({mostrar: false, mensaje: "", tipo: ""}), 3000);
    };

    const handleTaxIdChange = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 2) {
            value = value.substring(0, 2) + "-" + value.substring(2, 9);
        }
        setDatos({...datos, taxId: value});
    };

const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Opcional: Validar que no sea demasiado pesado (ej. 5MB)
            if (file.size > 5 * 1024 * 1024) {
                mostrarAviso("El archivo es muy pesado (máx 5MB)", "error");
                return;
            }
            setArchivo(file);
        }
    };

    const ejecutarGuardado = async () => {
        if (!datos.nombreEmpresa || !datos.taxId || !datos.telefonoEmpresa || !datos.zipCode) {
            mostrarAviso("Faltan campos obligatorios (Nombre, EIN, Teléfono, CP)", "error");
            return;
        }

        setLoading(true);
        try {
            let urlW9 = "";

            // PROCESO DE SUBIDA A STORAGE (Carpeta: empresas)
            if (archivo) {
                const nombreLimpio = datos.taxId || Date.now();
                const storageRef = storage().ref(`empresas/W9_${nombreLimpio}`);
                await storageRef.put(archivo);
                urlW9 = await storageRef.getDownloadURL();
            }

            const conRef = firestore().collection("config").doc("consecutivos");
            const docCon = await conRef.get();
            const nuevoFolio = (docCon.data().empresas || 0) + 1;

            const empresaFinal = {
                folio: nuevoFolio,
                nombreEmpresa: datos.nombreEmpresa.toUpperCase(),
                taxId: datos.taxId,
                mcNumber: datos.mcNumber,
                direccion: datos.direccion.toUpperCase(),
                zipCode: datos.zipCode,
                taxClassification: datos.taxClassification,
                urlDocW9: urlW9, // URL del archivo en Storage
                ciudadEmpresa: datos.ciudadEmpresa.toUpperCase(),
                estadoEmpresa: datos.estadoEmpresa.toUpperCase(),
                paisEmpresa: "United States",
                representante: datos.representante || "N/A",
                telefonoEmpresa: datos.telefonoEmpresa,
                registro: {
                    usuario: user?.nombre || "Admin",
                    idUsuario: user?.id || "N/A",
                    timestamp: new Date()
                }
            };

            await firestore().collection("empresas").add(empresaFinal);
            await conRef.update({empresas: nuevoFolio});

            mostrarAviso(`Empresa ${nuevoFolio} guardada con éxito`, "success");

            // Reset de estados
            setArchivo(null);
            setDatos({
                nombreEmpresa: "", taxId: "", mcNumber: "", direccion: "",
                zipCode: "", taxClassification: "Individual", ciudadEmpresa: "",
                estadoEmpresa: "", paisEmpresa: "United States", representante: "", telefonoEmpresa: ""
            });
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            mostrarAviso("Error al procesar el registro", "error");
        } finally {
            setLoading(false);
        }
    };

    const valido = datos.nombreEmpresa.trim() !== "" && datos.taxId.length >= 10 && datos.zipCode.length >= 5;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative font-sans">
            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50 flex justify-center">
                    <div className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-white font-bold py-2 px-6`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            {/* NIVEL 1: DATOS FISCALES Y CLASIFICACIÓN */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-3">
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-red-600 uppercase italic">Company Name (W-9 Line 1): *</label>
                    <input type="text" value={datos.nombreEmpresa}
                           onChange={(e) => setDatos({...datos, nombreEmpresa: e.target.value})}
                           className="input input-bordered w-full input-sm bg-white text-black focus:border-blue-700 uppercase"/>
                </div>
                <div className="w-44 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Classification:</label>
                    <select value={datos.taxClassification} onChange={(e) => setDatos({...datos, taxClassification: e.target.value})}
                            className="select select-bordered select-sm w-full bg-white text-black font-bold text-[10px]">
                        <option value="Individual">Individual/Sole Prop.</option>
                        <option value="LLC">LLC</option>
                        <option value="C-Corp">C Corporation</option>
                        <option value="S-Corp">S Corporation</option>
                        <option value="Partnership">Partnership</option>
                    </select>
                </div>
                <div className="w-36 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Tax ID (EIN): *</label>
                    <input type="text" placeholder="00-0000000" value={datos.taxId} onChange={handleTaxIdChange} maxLength={10}
                           className="input input-bordered w-full input-sm bg-white text-black font-mono"/>
                </div>
            </div>

            {/* NIVEL 2: DIRECCIÓN COMPLETA (W-9 LINES 5 & 6) */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-3 border-t border-gray-100 pt-3">
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Address (Street):</label>
                    <input type="text" value={datos.direccion}
                           onChange={(e) => setDatos({...datos, direccion: e.target.value})}
                           className="input input-bordered w-full input-sm bg-white text-black uppercase"/>
                </div>
                <div className="w-40 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">City:</label>
                    <input type="text" value={datos.ciudadEmpresa}
                           onChange={(e) => setDatos({...datos, ciudadEmpresa: e.target.value})}
                           className="input input-bordered w-full input-sm bg-white text-black uppercase"/>
                </div>
                <div className="w-16 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">ST:</label>
                    <input type="text" maxLength={2} value={datos.estadoEmpresa}
                           onChange={(e) => setDatos({...datos, estadoEmpresa: e.target.value.replace(/[^a-zA-Z]/g, "")})}
                           className="input input-bordered w-full input-sm bg-white text-black uppercase text-center font-bold"/>
                </div>
                <div className="w-24 p-1">
                    <label className="block text-[11px] font-bold text-red-600 uppercase italic">Zip Code: *</label>
                    <input type="text" maxLength={5} value={datos.zipCode}
                           onChange={(e) => setDatos({...datos, zipCode: e.target.value.replace(/\D/g, "")})}
                           className="input input-bordered w-full input-sm bg-white text-black font-bold text-center"/>
                </div>
            </div>

            {/* NIVEL 3: CONTACTO Y SUBIDA DE ARCHIVO */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full border-t border-gray-100 pt-3">
                <div className="w-48 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">MC Number:</label>
                    <input type="text" value={datos.mcNumber} onChange={(e) => setDatos({...datos, mcNumber: e.target.value.replace(/\D/g, "").substring(0,7)})}
                           className="input input-bordered w-full input-sm bg-white text-black font-mono" placeholder="7 dígitos"/>
                </div>
                <div className="w-56 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Phone: *</label>
                    <PhoneInput onlyCountries={['us', 'mx']} country={'us'} value={datos.telefonoEmpresa}
                                onChange={(val) => setDatos({...datos, telefonoEmpresa: val})}
                                inputStyle={{width: '100%', height: '32px'}}
                                inputProps={{className: 'input input-bordered w-full text-black input-sm bg-white'}}/>
                </div>

                {/* BOTÓN SELECCIÓN DE W-9 */}
                <div className="flex-grow p-1">
    <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg h-8 cursor-pointer transition-colors ${archivo ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 hover:border-blue-500 text-gray-400'}`}>
        <FaCloudUploadAlt />
        <span className="text-[10px] font-black uppercase">
            {archivo ? archivo.name.substring(0,15)+'...' : 'Subir W-9 (JPG/PNG/PDF)'}
        </span>
        {/* Cambio en accept: se añade application/pdf */}
        <input
            type="file"
            accept="image/png, image/jpeg, application/pdf"
            className="hidden"
            onChange={handleFileChange}
        />
    </label>
</div>

                <div className="p-1">
                    <label htmlFor={valido && !loading ? "modal-confirm-empresa" : ""}
                           className={`btn btn-sm px-8 ${valido ? 'btn-info' : 'btn-disabled opacity-50'}`}>
                        {loading ? <span className="loading loading-spinner loading-xs"></span> : "+ Guardar Carrier"}
                    </label>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN (Se mantiene igual) */}
            <input type="checkbox" id="modal-confirm-empresa" className="modal-toggle"/>
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-info text-black">
                    <h3 className="font-bold text-lg uppercase italic tracking-tighter">Confirmar Registro Carrier</h3>
                    <p className="py-4 text-[13px] text-gray-600">¿Deseas dar de alta a <span className="font-bold text-blue-800">{datos.nombreEmpresa}</span> con el EIN <span className="font-mono font-bold">{datos.taxId}</span>?</p>
                    <div className="modal-action">
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-outline">Revisar</label>
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-info text-white" onClick={ejecutarGuardado}>Confirmar y Subir</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormEmpresa;