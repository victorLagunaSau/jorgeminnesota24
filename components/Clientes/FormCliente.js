import React, { useState } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { firestore } from "../../firebase/firebaseIni";

const FormCliente = ({ user, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });

    const [datos, setDatos] = useState({
        cliente: "",
        telefonoCliente: "",
        apodoCliente: "",
        ciudadCliente: "",
        estadoCliente: "",
        paisCliente: "us", // Valor inicial por defecto (Brownsville)
        rfcCliente: null,
        emailCliente: null
    });

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({ mostrar: true, mensaje, tipo });
        setTimeout(() => setAlerta({ mostrar: false, mensaje: "", tipo: "" }), 3000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatos({ ...datos, [name]: value });
    };

    const ejecutarGuardado = async () => {
        setLoading(true);
        try {
            const conRef = firestore().collection("config").doc("consecutivos");
            const docCon = await conRef.get();
            const nuevoFolio = (docCon.data().clientes || 0) + 1;

            const clienteFinal = {
                folio: nuevoFolio,
                cliente: datos.cliente,
                telefonoCliente: datos.telefonoCliente,
                apodoCliente: datos.apodoCliente || null,
                ciudadCliente: datos.ciudadCliente || null,
                estadoCliente: datos.estadoCliente || null,
                paisCliente: datos.paisCliente, // Se guarda automáticamente
                rfcCliente: datos.rfcCliente,
                emailCliente: datos.emailCliente,
                registro: {
                    usuario: user?.nombre || "Admin",
                    idUsuario: user?.id || user?.uid || "N/A",
                    timestamp: new Date()
                }
            };

            await firestore().collection("clientes").add(clienteFinal);
            await conRef.update({ clientes: nuevoFolio });

            mostrarAviso(`¡Éxito! Cliente guardado con folio #${nuevoFolio}`, "success");

            setDatos({
                cliente: "", telefonoCliente: "", apodoCliente: "",
                ciudadCliente: "", estadoCliente: "", paisCliente: "us",
                rfcCliente: null, emailCliente: null
            });

            if (onSuccess) onSuccess();

        } catch (error) {
            console.error("Error:", error);
            mostrarAviso("Error al guardar", "error");
        } finally {
            setLoading(false);
        }
    };

    const formularioValido = datos.cliente.trim() !== "" && datos.telefonoCliente.length > 5;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">

            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50">
                    <div className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-white font-bold py-2 flex justify-center`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-4">
                <div className="flex-grow p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Nombre / Razón Social:</label>
                    <input
                        type="text" name="cliente" value={datos.cliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm bg-white text-black focus:border-red-500"
                    />
                </div>

                <div className="w-64 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Teléfono Cliente:</label>
                    <PhoneInput
                        onlyCountries={['us', 'mx']}
                        country={'us'}
                        value={datos.telefonoCliente}
                        // Aquí capturamos el país automáticamente del objeto 'country'
                        onChange={(val, country) => {
                            setDatos({
                                ...datos,
                                telefonoCliente: val.startsWith('+') ? val : '+' + val,
                                paisCliente: country.name // Guarda 'United States' o 'Mexico'
                            });
                        }}
                        inputStyle={{ paddingLeft: '48px', width: '100%' }}
                        inputProps={{
                            name: 'phone',
                            className: 'input input-bordered w-full text-black-500 input-sm bg-white'
                        }}
                    />
                </div>

                <div className="w-48 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Ciudad Cliente:</label>
                    <input
                        type="text" name="ciudadCliente" value={datos.ciudadCliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black"
                    />
                </div>

                <div className="w-20 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Edo:</label>
                    <input
                        type="text" name="estadoCliente" value={datos.estadoCliente} onChange={handleChange}
                        maxLength={4} className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase text-center"
                    />
                </div>
            </div>

            <div className="flex flex-row items-end gap-4 w-full border-t border-gray-50 pt-2">
                <div className="w-64 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Referencia (Apodo):</label>
                    <input
                        type="text" name="apodoCliente" value={datos.apodoCliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black"
                    />
                </div>

                <div className="p-1">
                    <label
                        htmlFor={formularioValido && !loading ? "modal-confirmar-cliente" : ""}
                        className={`btn btn-sm px-8 shadow-sm ${formularioValido && !loading ? 'btn-info' : 'btn-disabled opacity-50'}`}
                        onClick={() => { if(!formularioValido) mostrarAviso("Completa nombre y teléfono", "error") }}
                    >
                        {loading ? "Procesando..." : "+ Guardar Cliente"}
                    </label>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            <input type="checkbox" id="modal-confirmar-cliente" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-info">
                    <h3 className="font-bold text-lg text-black uppercase">Confirmar Registro</h3>
                    <p className="py-4 text-gray-600 font-medium">¿Deseas registrar a <span className="font-bold text-black border-b-2 border-info">{datos.cliente}</span> de <span className="text-info">{datos.paisCliente}</span>?</p>
                    <div className="modal-action">
                        <label htmlFor="modal-confirmar-cliente" className="btn btn-sm btn-outline">Cerrar</label>
                        <label
                            htmlFor="modal-confirmar-cliente"
                            className="btn btn-sm btn-info text-white"
                            onClick={ejecutarGuardado}
                        >
                            Sí, Guardar Cliente
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormCliente;