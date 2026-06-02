import React, { useState, useEffect, useMemo } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import { useAdminData } from "../../../context/adminData";
import { COLLECTIONS } from "../../../constants";
import {
    FaUser, FaPhone, FaMapMarkerAlt, FaEnvelope, FaIdCard,
    FaCheckCircle, FaTimes, FaChevronDown, FaChevronUp, FaClock, FaLink, FaExclamationTriangle
} from "react-icons/fa";

// Normaliza nombre para comparar (MAYÚSCULAS, sin espacios extra)
const normNombre = (s) => (s || "").toString().trim().toUpperCase().replace(/\s+/g, " ");
// Últimos 10 dígitos del teléfono (ignora prefijo país y espacios)
const tel10 = (s) => (s || "").toString().replace(/\D/g, "").slice(-10);

const ClientesNuevos = ({ user }) => {
    // Catálogo completo de clientes (en tiempo real) para detectar coincidencias
    const { clientes: catalogoClientes } = useAdminData();

    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandido, setExpandido] = useState(null);
    const [aprobando, setAprobando] = useState(null);
    const [vinculando, setVinculando] = useState(null);
    const [imagenAmpliada, setImagenAmpliada] = useState(null);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection(COLLECTIONS.CLIENTES)
            .where("aprobado", "==", false)
            .onSnapshot((snap) => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lista.sort((a, b) => {
                    const fa = a.registro?.timestamp?.toDate?.() || new Date(0);
                    const fb = b.registro?.timestamp?.toDate?.() || new Date(0);
                    return fb - fa;
                });
                setClientes(lista);
                setLoading(false);
            }, () => setLoading(false));

        return () => unsubscribe();
    }, []);

    const aprobarCliente = async (clienteId) => {
        setAprobando(clienteId);
        try {
            await firestore()
                .collection(COLLECTIONS.CLIENTES)
                .doc(clienteId)
                .update({
                    aprobado: true,
                    aprobadoPor: user?.nombre || user?.email || "Admin",
                    fechaAprobado: new Date()
                });
        } catch (err) {
            console.error("Error aprobando cliente:", err);
            alert("Error al aprobar el cliente");
        }
        setAprobando(null);
    };

    const rechazarCliente = async (clienteId) => {
        if (!confirm("Rechazar este cliente? Se eliminará su cuenta.")) return;
        setAprobando(clienteId);
        let secondaryApp = null;
        try {
            // Obtener datos del cliente para borrar Auth
            const clienteDoc = await firestore().collection(COLLECTIONS.CLIENTES).doc(clienteId).get();
            const data = clienteDoc.data();
            if (data?.emailAcceso && data?.passwordAcceso) {
                try {
                    const config = firebase.app().options;
                    secondaryApp = firebase.apps.find(a => a.name === "deleteApp") || firebase.initializeApp(config, "deleteApp");
                    const cred = await secondaryApp.auth().signInWithEmailAndPassword(data.emailAcceso, data.passwordAcceso);
                    await cred.user.delete();
                } catch (authErr) {
                    console.warn("No se pudo eliminar Auth user:", authErr.message);
                }
            }
            await firestore().collection(COLLECTIONS.CLIENTES).doc(clienteId).delete();
            await firestore().collection(COLLECTIONS.USERS).doc(clienteId).delete();
        } catch (err) {
            console.error("Error rechazando cliente:", err);
        } finally {
            if (secondaryApp) {
                try { await secondaryApp.delete(); } catch (_) {}
            }
        }
        setAprobando(null);
    };

    // Clientes YA establecidos (no los registros pendientes, no fusionados/inactivos)
    const clientesEstablecidos = useMemo(
        () => catalogoClientes.filter(c => c.activo !== false && c.aprobado !== false),
        [catalogoClientes]
    );

    // Para cada registro pendiente, busca posibles cuentas existentes (teléfono o nombre)
    const coincidenciasPorId = useMemo(() => {
        const mapa = {};
        clientes.forEach(reg => {
            const t = tel10(reg.telefonoCliente);
            const n = normNombre(reg.cliente);
            const matches = clientesEstablecidos
                .filter(c => c.id !== reg.id)
                .map(c => {
                    const matchTel = t && tel10(c.telefonoCliente) === t;
                    const cn = normNombre(c.cliente);
                    const matchNomExacto = n && cn === n;
                    const matchNomParcial = n.length >= 5 && cn.length >= 5 && (cn.includes(n) || n.includes(cn));
                    if (!matchTel && !matchNomExacto && !matchNomParcial) return null;
                    return { ...c, _matchTel: matchTel, _matchNom: matchNomExacto || matchNomParcial };
                })
                .filter(Boolean)
                // Teléfono primero, luego coincidencias de nombre
                .sort((a, b) => (b._matchTel - a._matchTel))
                .slice(0, 5);
            if (matches.length) mapa[reg.id] = matches;
        });
        return mapa;
    }, [clientes, clientesEstablecidos]);

    // Vincula un registro nuevo a una cuenta de cliente existente:
    // - users/{uid}.clienteIdOriginal -> doc viejo (login resuelve por este fallback)
    // - copia credenciales nuevas + rellena huecos en el doc viejo (SIN tocar el nombre canónico)
    // - borra el doc temporal del registro (sale solo de la cola pendiente)
    const vincularCliente = async (registro, existente) => {
        if (!confirm(
            `Vincular el registro de "${registro.cliente}" con la cuenta existente "${existente.cliente}" (#${existente.folio}).\n\n` +
            `El cliente entrará y verá el historial y deuda de "${existente.cliente}". El registro nuevo se descartará. ¿Continuar?`
        )) return;

        setVinculando(registro.id);
        try {
            // 1. Apuntar el usuario Auth recién creado al doc del cliente existente
            await firestore().collection(COLLECTIONS.USERS).doc(registro.id).set({
                clienteIdOriginal: existente.id,
                tipo: "cliente",
                activo: true,
            }, { merge: true });

            // 2. Dar acceso al portal al doc existente + rellenar solo campos vacíos
            //    (NO se toca `cliente` para no romper el enlace por nombre de los vehículos)
            const patch = {
                authUid: registro.id,
                emailAcceso: registro.emailAcceso || existente.emailAcceso || "",
                passwordAcceso: registro.passwordAcceso || existente.passwordAcceso || "",
                aprobado: true,
                vinculadoDesde: registro.id,
                vinculadoFecha: firebase.firestore.FieldValue.serverTimestamp(),
            };
            ["telefonoCliente", "emailCliente", "direccionCliente", "ciudadCliente",
             "estadoCliente", "paisCliente", "licenciaBase64", "licenciaUrl"].forEach(k => {
                if (!existente[k] && registro[k]) patch[k] = registro[k];
            });
            await firestore().collection(COLLECTIONS.CLIENTES).doc(existente.id).update(patch);

            // 3. Borrar el doc temporal del registro (login caerá al clienteIdOriginal)
            await firestore().collection(COLLECTIONS.CLIENTES).doc(registro.id).delete();
        } catch (err) {
            console.error("Error vinculando cliente:", err);
            alert("Error al vincular: " + err.message);
        }
        setVinculando(null);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <FaClock className="text-amber-500"/> Clientes Nuevos
                    {clientes.length > 0 && (
                        <span className="bg-amber-500 text-white text-sm px-2.5 py-0.5 rounded-full">{clientes.length}</span>
                    )}
                </h2>
            </div>

            {clientes.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <FaCheckCircle className="text-4xl text-green-400 mx-auto mb-4"/>
                    <p className="text-gray-500 text-sm">No hay solicitudes de clientes pendientes</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {clientes.map(cliente => {
                        const isExpanded = expandido === cliente.id;
                        return (
                            <div key={cliente.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Header */}
                                <div
                                    className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandido(isExpanded ? null : cliente.id)}
                                >
                                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <FaUser className="text-amber-600"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-gray-800 uppercase truncate">{cliente.cliente}</p>
                                        <p className="text-[11px] text-gray-500">
                                            {cliente.ciudadCliente}, {cliente.estadoCliente} &middot; {formatDate(cliente.registro?.timestamp)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {coincidenciasPorId[cliente.id] && (
                                            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase flex items-center gap-1">
                                                <FaExclamationTriangle size={9}/> Posible duplicado
                                            </span>
                                        )}
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Pendiente</span>
                                        {isExpanded ? <FaChevronUp className="text-gray-400"/> : <FaChevronDown className="text-gray-400"/>}
                                    </div>
                                </div>

                                {/* Detalle expandido */}
                                {isExpanded && (
                                    <div className="border-t border-gray-200">
                                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Datos */}
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-black text-gray-500 uppercase">Datos del Cliente</h3>
                                                {[
                                                    { icon: <FaUser/>, label: "Nombre", value: cliente.cliente },
                                                    { icon: <FaEnvelope/>, label: "Email", value: cliente.emailAcceso || cliente.emailCliente },
                                                    { icon: <FaPhone/>, label: "Teléfono", value: cliente.telefonoCliente },
                                                    { icon: <FaMapMarkerAlt/>, label: "Dirección", value: cliente.direccionCliente },
                                                    { icon: <FaMapMarkerAlt/>, label: "Ciudad", value: `${cliente.ciudadCliente || "-"}, ${cliente.estadoCliente || "-"}` },
                                                    { icon: <FaIdCard/>, label: "País", value: cliente.paisCliente },
                                                ].map((campo, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-sm">
                                                        <span className="text-gray-400 w-5 text-center flex-shrink-0">{campo.icon}</span>
                                                        <span className="text-gray-500 text-xs w-20 flex-shrink-0">{campo.label}</span>
                                                        <span className="font-medium text-gray-800">{campo.value || "-"}</span>
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span className="text-gray-400 w-5 text-center flex-shrink-0"><FaClock/></span>
                                                    <span className="text-gray-500 text-xs w-20 flex-shrink-0">Registro</span>
                                                    <span className="font-medium text-gray-800">{formatDate(cliente.registro?.timestamp)}</span>
                                                </div>
                                            </div>

                                            {/* Foto de licencia */}
                                            <div>
                                                <h3 className="text-xs font-black text-gray-500 uppercase mb-3">Licencia</h3>
                                                {(cliente.licenciaBase64 || cliente.licenciaUrl) ? (
                                                    <img
                                                        src={cliente.licenciaBase64 || cliente.licenciaUrl}
                                                        alt="Licencia"
                                                        className="w-full max-w-sm rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => setImagenAmpliada(cliente.licenciaBase64 || cliente.licenciaUrl)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                                                        <p className="text-gray-400 text-sm">Sin foto de licencia</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Posibles coincidencias con clientes ya existentes */}
                                        {coincidenciasPorId[cliente.id] && (
                                            <div className="px-5 pb-2 pt-4 border-t border-gray-200 bg-orange-50/40">
                                                <p className="text-[11px] font-black text-orange-700 uppercase flex items-center gap-1.5 mb-1">
                                                    <FaExclamationTriangle size={11}/> Posible cliente ya existente
                                                </p>
                                                <p className="text-[11px] text-gray-500 mb-3">
                                                    Si es la misma persona, <b>vincula</b> para que entre a su cuenta y vea su historial/deuda real.
                                                    El registro nuevo se descarta y no se duplica.
                                                </p>
                                                <div className="space-y-2">
                                                    {coincidenciasPorId[cliente.id].map(match => (
                                                        <div key={match.id} className="flex items-center justify-between bg-white border border-orange-200 rounded-lg px-3 py-2 gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-gray-800 uppercase truncate">
                                                                    {match.cliente} <span className="text-gray-400 font-normal">#{match.folio}</span>
                                                                </p>
                                                                <p className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2">
                                                                    <span>{match.telefonoCliente || "sin tel."}</span>
                                                                    {match._matchTel && <span className="text-green-600 font-bold">· mismo teléfono</span>}
                                                                    {match._matchNom && <span className="text-blue-600 font-bold">· nombre similar</span>}
                                                                    {match.authUid && <span className="text-amber-600 font-bold">· ya tiene acceso</span>}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => vincularCliente(cliente, match)}
                                                                disabled={vinculando === cliente.id}
                                                                className="btn btn-sm bg-orange-600 text-white hover:bg-orange-700 border-none font-bold uppercase text-xs gap-1 flex-shrink-0"
                                                            >
                                                                {vinculando === cliente.id
                                                                    ? <span className="loading loading-spinner loading-xs"></span>
                                                                    : <><FaLink size={10}/> Vincular</>}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Botones de acción */}
                                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3 justify-end">
                                            <button
                                                onClick={() => rechazarCliente(cliente.id)}
                                                disabled={aprobando === cliente.id || vinculando === cliente.id}
                                                className="btn btn-sm btn-outline border-red-400 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold uppercase text-xs gap-1"
                                            >
                                                <FaTimes size={10}/> Rechazar
                                            </button>
                                            <button
                                                onClick={() => aprobarCliente(cliente.id)}
                                                disabled={aprobando === cliente.id || vinculando === cliente.id}
                                                className="btn btn-sm bg-green-600 text-white hover:bg-green-700 border-none font-bold uppercase text-xs gap-1"
                                            >
                                                {aprobando === cliente.id ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    <><FaCheckCircle size={10}/> {coincidenciasPorId[cliente.id] ? "Aprobar como nuevo" : "Aprobar"}</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal imagen ampliada */}
            {imagenAmpliada && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setImagenAmpliada(null)}>
                    <img src={imagenAmpliada} alt="Licencia" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"/>
                </div>
            )}
        </div>
    );
};

export default ClientesNuevos;
