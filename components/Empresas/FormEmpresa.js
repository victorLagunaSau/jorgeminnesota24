import React, {useState} from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {firestore} from "../../firebase/firebaseIni";

const FormEmpresa = ({user, onSuccess}) => {
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState({mostrar: false, mensaje: "", tipo: ""});

    const [datos, setDatos] = useState({
        nombreEmpresa: "",
        taxId: "", // EIN: 00-0000000
        mcNumber: "",
        ciudadEmpresa: "",
        estadoEmpresa: "",
        paisEmpresa: "United States", // Campo fijo interno
        representante: "", // No obligatorio
        telefonoEmpresa: "" // Obligatorio
    });

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({mostrar: true, mensaje, tipo});
        setTimeout(() => setAlerta({mostrar: false, mensaje: "", tipo: ""}), 3000);
    };

    // Máscara automática para EIN (XX-XXXXXXX)
    const handleTaxIdChange = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Solo números
        if (value.length > 2) {
            value = value.substring(0, 2) + "-" + value.substring(2, 9);
        }
        setDatos({...datos, taxId: value});
    };

    const ejecutarGuardado = async () => {
        // Validación estricta: representante es el único opcional
        if (!datos.nombreEmpresa || !datos.taxId || !datos.telefonoEmpresa || !datos.ciudadEmpresa) {
            mostrarAviso("Faltan campos obligatorios", "error");
            return;
        }

        setLoading(true);
        try {
            const conRef = firestore().collection("config").doc("consecutivos");
            const docCon = await conRef.get();
            const nuevoFolio = (docCon.data().empresas || 0) + 1;

            const empresaFinal = {
                folio: nuevoFolio,
                nombreEmpresa: datos.nombreEmpresa.toUpperCase(),
                taxId: datos.taxId,
                mcNumber: datos.mcNumber,
                ciudadEmpresa: datos.ciudadEmpresa,
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
            setDatos({
                nombreEmpresa: "",
                taxId: "",
                mcNumber: "",
                ciudadEmpresa: "",
                estadoEmpresa: "",
                paisEmpresa: "United States",
                representante: "",
                telefonoEmpresa: ""
            });
            if (onSuccess) onSuccess();
        } catch (e) {
            mostrarAviso("Error de red", "error");
        } finally {
            setLoading(false);
        }
    };

    const valido = datos.nombreEmpresa.trim() !== "" && datos.taxId.length >= 10 && datos.telefonoEmpresa.length > 5;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative font-sans">
            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50 flex justify-center">
                    <div
                        className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-white font-bold py-2 px-6`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            {/* NIVEL 1: DATOS FISCALES (USA) */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-3">
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-red-600 uppercase italic">Company Name (INC/LLC):
                        *</label>
                    <input type="text" value={datos.nombreEmpresa}
                           onChange={(e) => setDatos({...datos, nombreEmpresa: e.target.value})}
                           className="input input-bordered w-full input-sm bg-white text-black focus:border-blue-700 uppercase"/>
                </div>
                <div className="w-44 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Tax ID (EIN):
                        *</label>
                    <input type="text" placeholder="00-0000000" value={datos.taxId} onChange={handleTaxIdChange}
                           maxLength={10}
                           className="input input-bordered w-full input-sm bg-white text-black font-mono"/>
                </div>
                <div className="w-36 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">MC Number: *</label>
                    <input
                        type="text"
                        value={datos.mcNumber}
                        // Solo permite números y limita a máximo 7 caracteres
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            if (val.length <= 7) {
                                setDatos({...datos, mcNumber: val});
                            }
                        }}
                        maxLength={7}
                        className="input input-bordered w-full input-sm bg-white text-black font-mono"
                        placeholder="7 dígitos"
                    />
                </div>
            </div>

            {/* NIVEL 2: CONTACTO Y REPRESENTACIÓN */}
            <div className="flex flex-row flex-nowrap gap-2 items-end w-full border-t border-gray-100 pt-3">
                <div className="w-64 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Representante:</label>
                    <input type="text" value={datos.representante}
                           onChange={(e) => setDatos({...datos, representante: e.target.value})}
                           className="input input-bordered w-full input-sm bg-white text-black" placeholder="Opcional"/>
                </div>
                <div className="w-64 p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">Teléfono
                        Contacto: *</label>
                    <PhoneInput onlyCountries={['us', 'mx']} country={'us'} value={datos.telefonoEmpresa}
                                onChange={(val) => setDatos({...datos, telefonoEmpresa: val})}
                                inputStyle={{paddingLeft: '45px', width: '100%', height: '32px'}}
                                inputProps={{className: 'input input-bordered w-full text-black input-sm bg-white'}}/>
                </div>
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic">City / State:
                        *</label>
                    <div className="flex gap-1">
                        <input type="text" placeholder="City" value={datos.ciudadEmpresa}
                               onChange={(e) => setDatos({...datos, ciudadEmpresa: e.target.value})}
                               className="input input-bordered w-full input-sm bg-white text-black"/>
                        <input
                            type="text"
                            placeholder="TX"
                            maxLength={2}
                            value={datos.estadoEmpresa}
                            onChange={(e) => {
                                // Sustituye cualquier caracter que NO sea letra (a-z, A-Z) por nada
                                const val = e.target.value.replace(/[^a-zA-Z]/g, "");
                                setDatos({...datos, estadoEmpresa: val});
                            }}
                            className="input input-bordered w-20 input-sm bg-white text-black uppercase text-center font-bold"
                        />
                    </div>
                </div>
                <div className="p-1">
                    <label htmlFor={valido && !loading ? "modal-confirm-empresa" : ""}
                           className={`btn btn-sm px-8 ${valido ? 'btn-info' : 'btn-disabled opacity-50'}`}>
                        {loading ? "..." : "+ Guardar"}
                    </label>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            <input type="checkbox" id="modal-confirm-empresa" className="modal-toggle"/>
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-info">
                    <h3 className="font-bold text-lg text-black uppercase">Confirmar Registro Empresa</h3>
                    <div className="py-4 text-[13px] text-gray-600 space-y-1">
                        <p>Empresa: <span className="font-bold text-black">{datos.nombreEmpresa}</span></p>
                        <p>EIN: <span className="font-mono font-bold text-blue-700">{datos.taxId}</span></p>
                        <p>MC#: <span className="font-bold">{datos.mcNumber}</span></p>
                    </div>
                    <div className="modal-action">
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-outline">Cancelar</label>
                        <label htmlFor="modal-confirm-empresa" className="btn btn-sm btn-info text-white"
                               onClick={ejecutarGuardado}>Confirmar USA Carrier</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormEmpresa;