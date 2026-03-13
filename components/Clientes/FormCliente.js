import React, { useState, useEffect } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { firestore } from "../../firebase/firebaseIni";

const FormCliente = ({ user, onSuccess, clienteAEditar }) => {
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });

    const [datos, setDatos] = useState({
        cliente: "",
        telefonoCliente: "",
        apodoCliente: "",
        ciudadCliente: "",
        estadoCliente: "",
        paisCliente: "United States",
        rfcCliente: "",
        emailCliente: ""
    });

    useEffect(() => {
        if (clienteAEditar) {
            setDatos({ ...clienteAEditar });
        } else {
            setDatos({
                cliente: "", telefonoCliente: "", apodoCliente: "",
                ciudadCliente: "", estadoCliente: "", paisCliente: "United States",
                rfcCliente: "", emailCliente: ""
            });
        }
    }, [clienteAEditar]);

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
            if (clienteAEditar) {
                // LÓGICA DE ACTUALIZACIÓN
                await firestore().collection("clientes").doc(clienteAEditar.id).update({
                    ...datos,
                    editado: {
                        usuario: user?.nombre || "Admin",
                        fecha: new Date()
                    }
                });
                mostrarAviso("Cliente actualizado correctamente", "success");
            } else {
                // LÓGICA DE REGISTRO NUEVO
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

                await firestore().collection("clientes").add(clienteFinal);
                await conRef.update({ clientes: nuevoFolio });
                mostrarAviso(`Cliente #${nuevoFolio} guardado`, "success");
            }

            if (onSuccess) onSuccess();

        } catch (error) {
            console.error("Error:", error);
            mostrarAviso("Error al procesar", "error");
        } finally {
            setLoading(false);
        }
    };

    const formularioValido = datos.cliente.trim() !== "" && datos.telefonoCliente.length > 5;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50 flex justify-center">
                    <div className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-white font-bold py-2 px-6`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-4">
                <div className="flex-grow p-1">
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

            <div className="flex flex-row items-end gap-4 w-full border-t border-gray-50 pt-2">
                <div className="w-64 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Referencia (Apodo):</label>
                    <input
                        type="text" name="apodoCliente" value={datos.apodoCliente} onChange={handleChange}
                        className="input input-bordered w-full input-sm focus:border-red-500 bg-white text-black uppercase"
                    />
                </div>

                <div className="flex-grow flex justify-end p-1">
                    <button
                        onClick={() => { if(formularioValido) document.getElementById('modal-confirmar-cliente').checked = true; }}
                        disabled={!formularioValido || loading}
                        className={`btn btn-sm px-10 shadow-sm ${clienteAEditar ? 'btn-warning' : 'btn-info'} text-white font-bold`}
                    >
                        {loading ? "Procesando..." : (clienteAEditar ? "Guardar Cambios" : "+ Guardar Cliente")}
                    </button>
                </div>
            </div>

            <input type="checkbox" id="modal-confirmar-cliente" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-info">
                    <h3 className="font-bold text-lg text-black uppercase">{clienteAEditar ? 'Confirmar Edición' : 'Confirmar Registro'}</h3>
                    <p className="py-4 text-gray-600 font-medium">¿Deseas guardar los cambios para <span className="font-bold text-black">{datos.cliente}</span>?</p>
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