import React, { useState, useEffect } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { firestore } from "../../../firebase/firebaseIni";
import { PHONE_CONFIG, COLLECTIONS, ALERT_TYPES, FIELD_LIMITS } from "../../../constants";
import Alert from "../../ui/Alert";

const FormChofer = ({ user, choferAEditar, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [empresas, setEmpresas] = useState([]);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });

    const datosVacios = {
        nombreChofer: "",
        apodoChofer: "",
        telefonoChofer: "",
        paisChofer: PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
        licencia: "",
        clave: "",
        empresaId: "",
        empresaNombre: "",
        empresaLiderId: "",
        empresaLiderNombre: ""
    };

    const [datos, setDatos] = useState(datosVacios);

    useEffect(() => {
        const unsub = firestore().collection(COLLECTIONS.EMPRESAS).orderBy("nombreEmpresa", "asc")
            .onSnapshot(snap => {
                setEmpresas(snap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombreEmpresa })));
            });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (choferAEditar) {
            setDatos({
                nombreChofer: choferAEditar.nombreChofer || "",
                apodoChofer: choferAEditar.apodoChofer || "",
                telefonoChofer: choferAEditar.telefonoChofer || "",
                paisChofer: choferAEditar.paisChofer || PHONE_CONFIG.DEFAULT_COUNTRY_NAME,
                licencia: choferAEditar.licencia || "",
                clave: choferAEditar.clave || "",
                empresaId: choferAEditar.empresaId || "",
                empresaNombre: choferAEditar.empresaNombre || "",
                empresaLiderId: choferAEditar.empresaLiderId || "",
                empresaLiderNombre: choferAEditar.empresaLiderNombre || ""
            });
        } else {
            setDatos(datosVacios);
        }
    }, [choferAEditar]);

    const mostrarAviso = (mensaje, tipo = "info") => {
        setAlerta({ mostrar: true, mensaje, tipo });
        setTimeout(() => setAlerta({ mostrar: false, mensaje: "", tipo: "" }), 3000);
    };

    const handlePhoneChange = (val, country) => {
        setDatos({
            ...datos,
            telefonoChofer: val.startsWith('+') ? val : '+' + val,
            paisChofer: country.name || PHONE_CONFIG.DEFAULT_COUNTRY_NAME
        });
    };

    const handleLicenciaChange = (e) => {
        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (val.length <= FIELD_LIMITS.LICENSE) setDatos({ ...datos, licencia: val });
    };

    const ejecutarGuardado = async () => {
        if (!datos.nombreChofer || !datos.empresaId || !datos.telefonoChofer) {
            mostrarAviso("Completa los campos obligatorios (*)", "error");
            return;
        }

        setLoading(true);
        try {
            if (choferAEditar) {
                const updateChofer = {
                    nombreChofer: datos.nombreChofer.toUpperCase(),
                    apodoChofer: datos.apodoChofer.toUpperCase(),
                    telefonoChofer: datos.telefonoChofer,
                    paisChofer: datos.paisChofer,
                    licencia: datos.licencia || "N/A",
                    clave: datos.clave,
                    empresaId: datos.empresaId,
                    empresaNombre: datos.empresaNombre,
                    empresaLiderId: datos.empresaLiderId || "",
                    empresaLiderNombre: datos.empresaLiderNombre || "SIN LIDER",
                };
                if (choferAEditar.esNuevo) updateChofer.esNuevo = false;
                await firestore().collection(COLLECTIONS.CHOFERES).doc(choferAEditar.id).update(updateChofer);

                // Propagar cambios a viajes pendientes y pagados
                const nombreAnterior = (choferAEditar.nombreChofer || "").toUpperCase();
                const nuevoChoferViaje = {
                    id: choferAEditar.id,
                    nombre: datos.nombreChofer.toUpperCase(),
                    empresa: datos.empresaNombre,
                    empresaLiderId: datos.empresaLiderId || "",
                    empresaLiderNombre: datos.empresaLiderNombre || "SIN LIDER",
                };

                // Función para verificar si un viaje pertenece a este chofer (por ID o por nombre anterior)
                const esDelChofer = (d) => {
                    const chofer = d.data().chofer;
                    if (!chofer) return false;
                    if (chofer.id === choferAEditar.id) return true;
                    if (nombreAnterior && chofer.nombre?.toUpperCase() === nombreAnterior) return true;
                    return false;
                };

                let viajesActualizados = 0;
                try {
                    const pendSnap = await firestore().collection(COLLECTIONS.VIAJES_PENDIENTES).get();
                    const pendDocs = pendSnap.docs.filter(esDelChofer);
                    if (pendDocs.length > 0) {
                        const b = firestore().batch();
                        pendDocs.forEach(d => { b.update(d.ref, { chofer: nuevoChoferViaje, empresaLiderId: datos.empresaLiderId || "" }); });
                        await b.commit();
                        viajesActualizados += pendDocs.length;
                    }
                } catch (e) { console.error("Error propagando a pendientes:", e); }

                try {
                    const pagSnap = await firestore().collection("viajesPagados").get();
                    const pagDocs = pagSnap.docs.filter(esDelChofer);
                    for (let i = 0; i < pagDocs.length; i += 400) {
                        const chunk = pagDocs.slice(i, i + 400);
                        const b = firestore().batch();
                        chunk.forEach(d => { b.update(d.ref, { chofer: nuevoChoferViaje, empresaLiderId: datos.empresaLiderId || "", empresaLiquidada: datos.empresaNombre }); });
                        await b.commit();
                    }
                    viajesActualizados += pagDocs.length;
                } catch (e) { console.error("Error propagando a pagados:", e); }

                mostrarAviso(`Chofer #${choferAEditar.folio} actualizado. ${viajesActualizados} viaje(s) sincronizados.`, "success");
            } else {
                const conRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");
                const docCon = await conRef.get();
                const nuevoFolio = (docCon.data().choferes || 0) + 1;

                const choferFinal = {
                    folio: nuevoFolio,
                    nombreChofer: datos.nombreChofer.toUpperCase(),
                    apodoChofer: datos.apodoChofer.toUpperCase(),
                    telefonoChofer: datos.telefonoChofer,
                    paisChofer: datos.paisChofer,
                    licencia: datos.licencia || "N/A",
                    clave: datos.clave,
                    empresaId: datos.empresaId,
                    empresaNombre: datos.empresaNombre,
                    empresaLiderId: datos.empresaLiderId || "",
                    empresaLiderNombre: datos.empresaLiderNombre || "SIN LIDER",
                    registro: {
                        usuario: user?.nombre || "Admin",
                        idUsuario: user?.id || "N/A",
                        timestamp: new Date()
                    }
                };

                await firestore().collection(COLLECTIONS.CHOFERES).add(choferFinal);
                await conRef.update({ choferes: nuevoFolio });
                mostrarAviso(`Chofer #${nuevoFolio} guardado`, "success");
            }

            setDatos(datosVacios);
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            mostrarAviso("Error de conexión", "error");
        } finally {
            setLoading(false);
        }
    };

    const esEdicion = !!choferAEditar;
    const listo = datos.nombreChofer && datos.empresaId && datos.telefonoChofer.length > 5;
    const modalId = esEdicion ? "modal-confirm-chofer-edit" : "modal-confirm-chofer";

    return (
        <div className={`p-4 rounded-lg shadow-sm border relative mb-6 font-sans ${esEdicion ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
            <Alert mostrar={alerta.mostrar} mensaje={alerta.mensaje} tipo={alerta.tipo === 'success' ? 'success' : 'error'} />

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
                    <PhoneInput onlyCountries={PHONE_CONFIG.COUNTRIES} country={PHONE_CONFIG.DEFAULT_COUNTRY} value={datos.telefonoChofer} onChange={handlePhoneChange}
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
                    <input type="text" value={datos.licencia} onChange={handleLicenciaChange} maxLength={FIELD_LIMITS.LICENSE}
                        className="input input-bordered w-full input-sm bg-white text-black font-mono" placeholder="Alfanumérico" />
                </div>
                <div className="w-40 p-1">
                    <label className="block text-[10px] font-bold text-green-700 uppercase italic">Clave Acceso:</label>
                    <input type="text" value={datos.clave} onChange={(e) => setDatos({...datos, clave: e.target.value.replace(/[^a-zA-Z0-9]/g, "")})} maxLength={6}
                        className="input input-bordered w-full input-sm bg-white text-black font-mono text-center tracking-widest" placeholder="Ej: 1234" />
                </div>
                <div className="flex-grow flex justify-end p-1">
                    <label htmlFor={listo && !loading ? modalId : ""}
                        className={`btn btn-sm px-10 ${listo && !loading ? (esEdicion ? 'btn-info text-white font-bold' : 'btn-error text-white font-bold') : 'btn-disabled opacity-40'}`}
                        disabled={loading}>
                        {loading ? "Guardando..." : (esEdicion ? "Guardar Cambios" : "+ Guardar Chofer")}
                    </label>
                </div>
            </div>

            {/* MODAL CONFIRMACIÓN */}
            <input type="checkbox" id={modalId} className="modal-toggle" />
            <div className="modal">
                <div className={`modal-box bg-white border-t-4 ${esEdicion ? 'border-blue-600' : 'border-red-600'}`}>
                    <h3 className="font-bold text-lg text-black uppercase">
                        {esEdicion ? 'Confirmar Cambios en Chofer' : 'Confirmar Alta de Chofer'}
                    </h3>
                    <div className="py-4 text-[13px] text-gray-700 space-y-1">
                        <p>Nombre: <span className="font-bold text-black">{datos.nombreChofer}</span></p>
                        <p>Apodo: <span className="font-bold text-black">{datos.apodoChofer || '—'}</span></p>
                        <p>Teléfono: <span className="font-bold text-black">{datos.telefonoChofer}</span></p>
                        <p>Licencia: <span className="font-bold text-black">{datos.licencia || 'N/A'}</span></p>
                        <p>Clave Acceso: <span className="font-bold text-green-700">{datos.clave || 'Sin asignar'}</span></p>
                        <p>Empresa Fiscal: <span className="font-bold text-red-600">{datos.empresaNombre}</span></p>
                        <p>Líder Asignado: <span className="font-bold text-blue-700">{datos.empresaLiderNombre || 'Ninguno'}</span></p>
                    </div>
                    <div className="modal-action">
                        <label htmlFor={modalId} className="btn btn-sm btn-outline">Cancelar</label>
                        <label htmlFor={modalId}
                            className={`btn btn-sm text-white ${esEdicion ? 'btn-info' : 'btn-error'}`}
                            onClick={ejecutarGuardado}>
                            {esEdicion ? 'Confirmar Cambios' : 'Confirmar Registro'}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormChofer;
