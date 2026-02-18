import React, { useState, useEffect } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { firestore } from "../../firebase/firebaseIni";

const FormChofer = ({ user, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [empresas, setEmpresas] = useState([]);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });

    const [datos, setDatos] = useState({
        nombreChofer: "",
        apodoChofer: "",
        telefonoChofer: "",
        paisChofer: "United States",
        licencia: "",
        empresaId: "",
        empresaNombre: "",
        empresaLiderId: "",
        empresaLiderNombre: ""
    });

    useEffect(() => {
        const unsub = firestore().collection("empresas").orderBy("nombreEmpresa", "asc")
            .onSnapshot(snap => {
                setEmpresas(snap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombreEmpresa })));
            });
        return () => unsub();
    }, []);

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({ mostrar: true, mensaje, tipo });
        setTimeout(() => setAlerta({ mostrar: false, mensaje: "", tipo: "" }), 3000);
    };

    const handlePhoneChange = (val, country) => {
        setDatos({
            ...datos,
            telefonoChofer: val.startsWith('+') ? val : '+' + val,
            paisChofer: country.name || "United States"
        });
    };

    const handleLicenciaChange = (e) => {
        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (val.length <= 13) setDatos({ ...datos, licencia: val });
    };

    const ejecutarGuardado = async () => {
        if (!datos.nombreChofer || !datos.empresaId || !datos.telefonoChofer) {
            mostrarAviso("Completa los campos obligatorios (*)", "error");
            return;
        }

        setLoading(true);
        try {
            const conRef = firestore().collection("config").doc("consecutivos");
            const docCon = await conRef.get();
            const nuevoFolio = (docCon.data().choferes || 0) + 1;

            const choferFinal = {
                folio: nuevoFolio,
                nombreChofer: datos.nombreChofer.toUpperCase(),
                apodoChofer: datos.apodoChofer.toUpperCase(),
                telefonoChofer: datos.telefonoChofer,
                paisChofer: datos.paisChofer,
                licencia: datos.licencia || "N/A",
                // Datos Fiscales (Dueño del Chofer)
                empresaId: datos.empresaId,
                empresaNombre: datos.empresaNombre,
                // Datos de Operación (Quien asigna viajes)
                empresaLiderId: datos.empresaLiderId || "",
                empresaLiderNombre: datos.empresaLiderNombre || "SIN LIDER",
                registro: {
                    usuario: user?.nombre || "Admin",
                    idUsuario: user?.id || "N/A",
                    timestamp: new Date()
                }
            };

            await firestore().collection("choferes").add(choferFinal);
            await conRef.update({ choferes: nuevoFolio });

            mostrarAviso(`Chofer #${nuevoFolio} guardado`, "success");
            setDatos({
                nombreChofer: "", apodoChofer: "", telefonoChofer: "",
                paisChofer: "United States", licencia: "",
                empresaId: "", empresaNombre: "",
                empresaLiderId: "", empresaLiderNombre: ""
            });
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            mostrarAviso("Error de conexión", "error");
        }
        finally { setLoading(false); }
    };

    const listo = datos.nombreChofer && datos.empresaId && datos.telefonoChofer.length > 5;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative mb-6 font-sans">
            {alerta.mostrar && (
                <div className="absolute top-[-50px] left-0 w-full z-50 flex justify-center">
                    <div className={`alert ${alerta.tipo === 'success' ? 'alert-success' : 'alert-error'} py-2 px-6 text-white font-bold shadow-lg uppercase text-[11px]`}>
                        <span>{alerta.mensaje}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-row flex-nowrap gap-2 items-end w-full mb-3">
                <div className="flex-grow p-1">
                    <label className="block text-[10px] font-bold text-red-600 uppercase italic">Nombre Completo: *</label>
                    <input type="text" value={datos.nombreChofer} onChange={(e)=>setDatos({...datos, nombreChofer: e.target.value})}
                        className="input input-bordered w-full input-sm bg-white text-black focus:border-red-600 uppercase font-bold" />
                </div>

                <div className="w-60 p-1">
                    <label className="block text-[10px] font-bold text-red-600 uppercase italic">Empresa Fiscal (W-9): *</label>
                    <select className="select select-bordered select-sm w-full bg-white text-black border-red-200 font-bold"
                        value={datos.empresaId}
                        onChange={(e) => {
                            const idx = e.target.selectedIndex;
                            setDatos({...datos, empresaId: e.target.value, empresaNombre: e.target.options[idx].text});
                        }}>
                        <option value="">Seleccionar Empresa...</option>
                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                    </select>
                </div>

                <div className="w-60 p-1">
                    <label className="block text-[10px] font-bold text-blue-700 uppercase italic">Empresa Líder (Despacho):</label>
                    <select className="select select-bordered select-sm w-full bg-white text-black border-blue-200 font-bold"
                        value={datos.empresaLiderId}
                        onChange={(e) => {
                            const idx = e.target.selectedIndex;
                            setDatos({...datos, empresaLiderId: e.target.value, empresaLiderNombre: e.target.options[idx].text});
                        }}>
                        <option value="">Independiente / Ninguna</option>
                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex flex-row flex-nowrap gap-2 items-end w-full border-t border-gray-100 pt-2">
                <div className="w-56 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Teléfono (USA/MX): *</label>
                    <PhoneInput onlyCountries={['us', 'mx']} country={'us'} value={datos.telefonoChofer} onChange={handlePhoneChange}
                        inputStyle={{ paddingLeft: '45px', width: '100%', height: '32px' }}
                        inputProps={{ className: 'input input-bordered w-full text-black input-sm bg-white font-bold' }} />
                </div>
                <div className="w-56 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Apodo / Handle:</label>
                    <input type="text" value={datos.apodoChofer} onChange={(e)=>setDatos({...datos, apodoChofer: e.target.value})}
                        className="input input-bordered w-full input-sm bg-white text-black uppercase" />
                </div>
                <div className="w-56 p-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase italic">Licencia (Máx 13):</label>
                    <input type="text" value={datos.licencia} onChange={handleLicenciaChange} maxLength={13}
                        className="input input-bordered w-full input-sm bg-white text-black font-mono" placeholder="Alfanumérico" />
                </div>
                <div className="flex-grow flex justify-end p-1">
                    <label htmlFor={listo ? "modal-confirm-chofer" : ""}
                        className={`btn btn-sm px-10 ${listo ? 'btn-error text-white font-bold' : 'btn-disabled opacity-40'}`}>
                        {loading ? "Registrando..." : "+ Guardar Chofer"}
                    </label>
                </div>
            </div>

            {/* MODAL CONFIRMACIÓN */}
            <input type="checkbox" id="modal-confirm-chofer" className="modal-toggle" />
            <div className="modal">
                <div className="modal-box bg-white border-t-4 border-red-600">
                    <h3 className="font-bold text-lg text-black uppercase">Confirmar Alta de Chofer</h3>
                    <div className="py-4 text-[13px] text-gray-700 space-y-1">
                        <p>Nombre: <span className="font-bold text-black">{datos.nombreChofer}</span></p>
                        <p>Empresa Fiscal: <span className="font-bold text-red-600">{datos.empresaNombre}</span></p>
                        <p>Líder Asignado: <span className="font-bold text-blue-700">{datos.empresaLiderNombre || 'Ninguno'}</span></p>
                    </div>
                    <div className="modal-action">
                        <label htmlFor="modal-confirm-chofer" className="btn btn-sm btn-outline">Cancelar</label>
                        <label htmlFor="modal-confirm-chofer" className="btn btn-sm btn-error text-white" onClick={ejecutarGuardado}>Confirmar Registro</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormChofer;