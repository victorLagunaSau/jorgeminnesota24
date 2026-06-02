import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import firebase from "firebase/app";
import { firestore } from "../../../firebase/firebaseIni";
import { useAdminData } from "../../../context/adminData";
import { COLLECTIONS } from "../../../constants";
import { FaTimes, FaSearch, FaExclamationTriangle, FaArrowRight, FaInfoCircle } from "react-icons/fa";
import Alert from "../../ui/Alert";

const SelectorCliente = ({ label, color, seleccionado, onSelect, clientes, excluirId }) => {
    const [q, setQ] = useState("");
    const [abierto, setAbierto] = useState(false);

    const filtrados = useMemo(() => {
        const b = q.toLowerCase();
        return clientes
            .filter((c) => c.id !== excluirId)
            .filter((c) => c.cliente?.toLowerCase().includes(b) || c.telefonoCliente?.includes(b))
            .slice(0, 8);
    }, [q, clientes, excluirId]);

    return (
        <div className="flex-1">
            <label className={`block text-[11px] font-black uppercase mb-1 ${color}`}>{label}</label>
            {seleccionado ? (
                <div className="flex items-center justify-between border-2 rounded-xl px-3 py-2 bg-gray-50">
                    <div>
                        <div className="font-black text-gray-800 uppercase text-sm">
                            {seleccionado.cliente}
                            {seleccionado.activo === false && <span className="ml-2 text-[9px] font-bold text-amber-600 normal-case">(ya inactivo)</span>}
                        </div>
                        <div className="text-[11px] text-gray-400">#{seleccionado.folio} · {seleccionado.telefonoCliente || "sin tel."}</div>
                    </div>
                    <button onClick={() => { onSelect(null); setQ(""); }} className="btn btn-xs btn-circle bg-gray-200 border-none">
                        <FaTimes />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
                        onFocus={() => setAbierto(true)}
                        placeholder="Buscar cliente..."
                        className="input input-bordered w-full pl-9 text-base"
                    />
                    {abierto && q && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                            {filtrados.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-400">Sin resultados</div>
                            ) : filtrados.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => { onSelect(c); setAbierto(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-50"
                                >
                                    <div className="font-bold text-gray-800 uppercase text-sm">
                                        {c.cliente}
                                        {c.activo === false && <span className="ml-2 text-[9px] font-bold text-amber-600 normal-case">(ya inactivo)</span>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">#{c.folio} · {c.telefonoCliente || "sin tel."}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Reasigna el valor de un campo (nombre de cliente) en todos los docs de una colección,
// procesando en lotes de 400 para respetar el límite de batch de Firestore.
const reasignarCampo = async (coleccion, campo, valorViejo, valorNuevo) => {
    if (!valorViejo) return 0;
    const snap = await firestore().collection(coleccion).where(campo, "==", valorViejo).get();
    if (snap.empty) return 0;

    const docs = snap.docs;
    let procesados = 0;
    for (let i = 0; i < docs.length; i += 400) {
        const batch = firestore().batch();
        docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { [campo]: valorNuevo }));
        await batch.commit();
        procesados += Math.min(400, docs.length - i);
    }
    return procesados;
};

// En viajes el nombre del cliente está DENTRO del array `vehiculos` (clienteNombre / clienteAlt / cliente),
// no a nivel documento. Hay que leer cada viaje, reescribir el array y volver a guardar.
// También cubre un posible clienteNombre/cliente a nivel documento (viajes legacy).
const CLAVES_CLIENTE = ["clienteNombre", "clienteAlt", "cliente"];
const reasignarEnViajes = async (coleccion, valorViejo, valorNuevo) => {
    if (!valorViejo) return 0;
    const snap = await firestore().collection(coleccion).get();
    const aActualizar = [];

    snap.docs.forEach((d) => {
        const data = d.data();
        const update = {};
        let cambio = false;

        if (Array.isArray(data.vehiculos)) {
            let arrCambio = false;
            const nuevoArr = data.vehiculos.map((v) => {
                const v2 = { ...v };
                CLAVES_CLIENTE.forEach((k) => {
                    if (v2[k] === valorViejo) { v2[k] = valorNuevo; arrCambio = true; }
                });
                return v2;
            });
            if (arrCambio) { update.vehiculos = nuevoArr; cambio = true; }
        }

        // Campos de nivel documento (por si algún viaje los tiene)
        CLAVES_CLIENTE.forEach((k) => {
            if (data[k] === valorViejo) { update[k] = valorNuevo; cambio = true; }
        });

        if (cambio) aActualizar.push({ ref: d.ref, update });
    });

    let procesados = 0;
    for (let i = 0; i < aActualizar.length; i += 400) {
        const batch = firestore().batch();
        aActualizar.slice(i, i + 400).forEach(({ ref, update }) => batch.update(ref, update));
        await batch.commit();
        procesados += Math.min(400, aActualizar.length - i);
    }
    return procesados;
};

const FusionarClientes = ({ onClose }) => {
    const { clientes } = useAdminData();
    const [principal, setPrincipal] = useState(null);   // cliente correcto (se queda)
    const [duplicado, setDuplicado] = useState(null);   // cliente mal escrito (se inactiva)
    const [fusionando, setFusionando] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [alerta, setAlerta] = useState({ mostrar: false, mensaje: "", tipo: "" });

    // Solo clientes activos (no fusionados previamente)
    const clientesActivos = useMemo(
        () => clientes.filter((c) => c.activo !== false),
        [clientes]
    );

    const aviso = (mensaje, tipo = "info") => {
        setAlerta({ mostrar: true, mensaje, tipo });
        setTimeout(() => setAlerta({ mostrar: false, mensaje: "", tipo: "" }), 6000);
    };

    const fusionar = async () => {
        if (!principal || !duplicado) return;
        if (principal.id === duplicado.id) {
            aviso("El cliente correcto y el duplicado no pueden ser el mismo.", "error");
            return;
        }
        setFusionando(true);
        try {
            const viejo = duplicado.cliente;
            const nuevo = principal.cliente;

            // 1. Reasignar el nombre en todas las colecciones que lo denormalizan
            //    - vehiculos / solicitudes / tokens: campo a nivel documento
            //    - viajes: nombre dentro del array `vehiculos`
            const veh = await reasignarCampo(COLLECTIONS.VEHICULOS, "cliente", viejo, nuevo);
            const vp = await reasignarEnViajes(COLLECTIONS.VIAJES_PENDIENTES, viejo, nuevo);
            const vg = await reasignarEnViajes(COLLECTIONS.VIAJES_PAGADOS, viejo, nuevo);
            const sol = await reasignarCampo(COLLECTIONS.SOLICITUDES_VEHICULOS, "clienteNombre", viejo, nuevo);
            const tok = await reasignarCampo(COLLECTIONS.TOKENS_CLIENTE, "clienteNombre", viejo, nuevo);

            // 2. Marcar el duplicado como inactivo (reversible, deja rastro)
            await firestore().collection(COLLECTIONS.CLIENTES).doc(duplicado.id).update({
                activo: false,
                fusionadoEn: principal.id,
                fusionadoNombre: principal.cliente,
                fusionadoFecha: firebase.firestore.FieldValue.serverTimestamp(),
            });

            aviso(
                `Listo. "${viejo}" se fusionó en "${nuevo}". Reasignados: ${veh} vehículos, ${vp + vg} viajes, ${sol} solicitudes, ${tok} tokens.`,
                "success"
            );
            setDuplicado(null);
            setPrincipal(null);
            setConfirmando(false);
        } catch (e) {
            aviso("Error al fusionar: " + e.message, "error");
        } finally {
            setFusionando(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-20">
                    <h3 className="text-xl font-black text-gray-800 uppercase">Fusionar Clientes Duplicados</h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle bg-gray-100 hover:bg-gray-200 border-none">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-5 min-h-[460px]">
                    <Alert mostrar={alerta.mostrar} mensaje={alerta.mensaje} tipo={alerta.tipo} />

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 mb-4">
                        <FaInfoCircle className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800">
                            Esto reescribe el nombre del cliente <b>DUPLICADO</b> en todos sus vehículos, viajes y solicitudes
                            para que apunten al cliente <b>CORRECTO</b>, y deja el duplicado inactivo (oculto, pero conservado).
                            Toda la deuda e historial quedan en una sola cuenta.
                        </p>
                    </div>

                    <p className="text-sm text-gray-500 mb-3">
                        Elige el cliente <b className="text-green-600">CORRECTO</b> (el que se queda) y el{" "}
                        <b className="text-red-600">DUPLICADO</b> (el que se inactiva tras mover sus datos).
                    </p>

                    <div className="flex flex-col md:flex-row items-stretch gap-3">
                        <SelectorCliente
                            label="✓ Correcto (se queda)" color="text-green-600"
                            seleccionado={principal}
                            onSelect={(c) => { setPrincipal(c); setConfirmando(false); }}
                            clientes={clientesActivos} excluirId={duplicado?.id}
                        />
                        <div className="flex items-center justify-center text-gray-300 pt-5">
                            <FaArrowRight />
                        </div>
                        <SelectorCliente
                            label="✕ Duplicado (se inactiva)" color="text-red-600"
                            seleccionado={duplicado}
                            onSelect={(c) => { setDuplicado(c); setConfirmando(false); }}
                            clientes={clientes} excluirId={principal?.id}
                        />
                    </div>

                    {principal && duplicado && (
                        <div className="mt-4">
                            {!confirmando ? (
                                <button
                                    onClick={() => setConfirmando(true)}
                                    className="btn bg-gray-800 hover:bg-gray-900 text-white border-none font-black uppercase w-full gap-2"
                                >
                                    Revisar fusión
                                </button>
                            ) : (
                                <div className="border-2 border-red-200 rounded-xl p-4 bg-red-50/50">
                                    <div className="flex gap-2 items-start mb-3">
                                        <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-sm text-gray-700">
                                            Vas a mover todos los vehículos y viajes de{" "}
                                            <b className="text-red-600 uppercase">{duplicado.cliente}</b> (#{duplicado.folio}) hacia{" "}
                                            <b className="text-green-700 uppercase">{principal.cliente}</b> (#{principal.folio}).{" "}
                                            <b>{duplicado.cliente}</b> quedará inactivo. ¿Continuar?
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={fusionar}
                                            disabled={fusionando}
                                            className="btn bg-red-600 hover:bg-red-700 text-white border-none font-black uppercase flex-1 disabled:opacity-50 gap-2"
                                        >
                                            {fusionando ? <span className="loading loading-spinner loading-sm"></span> : "Sí, fusionar"}
                                        </button>
                                        <button
                                            onClick={() => setConfirmando(false)}
                                            disabled={fusionando}
                                            className="btn bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold uppercase"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default FusionarClientes;
