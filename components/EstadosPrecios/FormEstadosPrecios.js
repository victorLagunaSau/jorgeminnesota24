import React, { useState } from "react";
import { firestore } from "../../firebase/firebaseIni";
import { FaMapMarkerAlt, FaSave } from "react-icons/fa";

const FormEstadosPrecios = ({ user, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [nombreEstado, setNombreEstado] = useState("");
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({ mostrar: true, mensaje, tipo });
        setTimeout(() => setAlerta({ mostrar: false, mensaje: "", tipo: "" }), 3000);
    };

    const ejecutarGuardado = async () => {
        if (!nombreEstado.trim()) {
            mostrarAviso("El nombre del estado es obligatorio", "error");
            return;
        }

        setLoading(true);
        try {
            // Estructura limpia para producción
            const nuevoEstado = {
                state: nombreEstado.toUpperCase(),
                regions: [], // Iniciamos el array vacío para no romper la edición
                registro: {
                    usuario: user?.nombre || "Admin",
                    idUsuario: user?.id || "N/A",
                    timestamp: new Date()
                }
            };

            await firestore().collection("province").add(nuevoEstado);

            mostrarAviso(`${nombreEstado.toUpperCase()} registrado. Configura los precios en la tabla.`, "success");
            setNombreEstado("");
            if (onSuccess) onSuccess();
        } catch (e) {
            mostrarAviso("Error al conectar con la base de datos", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative font-sans">
            {/* ALERTAS DINÁMICAS */}
            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50 flex justify-center">
                    <div className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-white font-bold py-2 px-6 uppercase text-[11px]`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-row flex-nowrap gap-4 items-end w-full">
                {/* CAMPO ÚNICO DE REGISTRO */}
                <div className="flex-grow p-1">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase italic mb-1">
                        <FaMapMarkerAlt className="inline mr-1 text-blue-800" />
                        Nombre del Nuevo Estado (USA/MX):
                    </label>
                    <input
                        type="text"
                        placeholder="Ej: TEXAS, NUEVO LEON, NORTH CAROLINA..."
                        value={nombreEstado}
                        onChange={(e) => setNombreEstado(e.target.value)}
                        className="input input-bordered w-full input-sm bg-white text-black focus:border-blue-800 uppercase font-black tracking-widest"
                    />
                </div>

                {/* BOTÓN DE ACCIÓN RÁPIDA */}
                <div className="p-1">
                    <button
                        onClick={ejecutarGuardado}
                        disabled={loading || !nombreEstado.trim()}
                        className={`btn btn-sm px-8 ${loading || !nombreEstado.trim() ? 'btn-disabled opacity-50' : 'btn-info text-white'}`}
                    >
                        {loading ? <span className="loading loading-spinner loading-xs"></span> : <FaSave />}
                        REGISTRAR Y CONFIGURAR
                    </button>
                </div>
            </div>

            <div className="mt-2 ml-1">
                <p className="text-[10px] text-gray-400 italic">
                    * Al registrar, el estado aparecerá en la tabla inferior para que definas ciudades, precios de venta y costos.
                </p>
            </div>
        </div>
    );
};

export default FormEstadosPrecios;