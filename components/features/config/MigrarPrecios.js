import React, { useState } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";

const MigrarPrecios = ({ user }) => {
    const [resultado, setResultado] = useState(null);
    const [ejecutando, setEjecutando] = useState(false);
    const [preview, setPreview] = useState(null);
    const [stats, setStats] = useState(null);

    const cargarDatos = async () => {
        // 1. Cargar precios de la matriz (precioPagina)
        const provincesSnap = await firestore().collection(COLLECTIONS.PROVINCE).get();
        const preciosMap = {};
        provincesSnap.docs.forEach((doc) => {
            const data = doc.data();
            const estado = data.state;
            if (data.regions) {
                data.regions.forEach((r) => {
                    const key = `${estado}|${r.city}`;
                    preciosMap[key] = parseFloat(r.precioPagina || r.price || 0);
                });
            }
        });

        // 2. Cargar vehículos que NO están entregados
        const vehiculosSnap = await firestore()
            .collection(COLLECTIONS.VEHICULOS)
            .where("estatus", "!=", "EN")
            .get();

        // 3. Cargar viajes pendientes (en trayecto)
        const viajesSnap = await firestore()
            .collection(COLLECTIONS.VIAJES_PENDIENTES)
            .get();

        return { preciosMap, vehiculosSnap, viajesSnap };
    };

    const handlePreview = async () => {
        setEjecutando(true);
        setResultado(null);
        setStats(null);
        try {
            const { preciosMap, vehiculosSnap, viajesSnap } = await cargarDatos();

            const fechaCorte = new Date(2026, 3, 13, 0, 0, 0); // 13 abril 2026
            let totalRevisados = 0;
            let sinCoincidencia = [];
            let anterioresAlCorte = 0;
            const cambios = [];

            // --- Vehículos (colección vehiculos) ---
            vehiculosSnap.docs.forEach((doc) => {
                const v = doc.data();
                totalRevisados++;

                let fechaRegistro = null;
                if (v.registro?.timestamp?.seconds) {
                    fechaRegistro = new Date(v.registro.timestamp.seconds * 1000);
                }
                if (fechaRegistro && fechaRegistro < fechaCorte) {
                    anterioresAlCorte++;
                    return;
                }

                const key = `${v.estado}|${v.ciudad}`;
                const precioCorrecto = preciosMap[key];

                if (precioCorrecto === undefined) {
                    sinCoincidencia.push({ lote: doc.id, estado: v.estado, ciudad: v.ciudad });
                    return;
                }

                const precioActual = parseFloat(v.price || 0);
                if (precioActual !== precioCorrecto) {
                    cambios.push({
                        origen: "vehiculos",
                        docId: doc.id,
                        lote: v.binNip || doc.id,
                        marca: v.marca || "",
                        modelo: v.modelo || "",
                        estado: v.estado,
                        ciudad: v.ciudad,
                        estatus: v.estatus,
                        cliente: v.cliente || "",
                        fecha: fechaRegistro ? fechaRegistro.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : "Sin fecha",
                        _ts: fechaRegistro ? fechaRegistro.getTime() : 0,
                        precioAnterior: precioActual,
                        precioNuevo: precioCorrecto,
                        diferencia: precioCorrecto - precioActual,
                    });
                }
            });

            // --- Viajes pendientes (en trayecto) ---
            let totalViajesRevisados = 0;
            viajesSnap.docs.forEach((doc) => {
                const viaje = doc.data();
                if (!viaje.vehiculos || viaje.vehiculos.length === 0) return;
                totalViajesRevisados++;

                let fechaViaje = null;
                if (viaje.fechaCreacion?.seconds) {
                    fechaViaje = new Date(viaje.fechaCreacion.seconds * 1000);
                } else if (viaje.timestamp?.seconds) {
                    fechaViaje = new Date(viaje.timestamp.seconds * 1000);
                }

                viaje.vehiculos.forEach((v) => {
                    totalRevisados++;
                    const key = `${v.estado}|${v.ciudad}`;
                    const precioCorrecto = preciosMap[key];

                    if (precioCorrecto === undefined) {
                        sinCoincidencia.push({ lote: v.lote || "S/N", estado: v.estado, ciudad: v.ciudad });
                        return;
                    }

                    const precioActual = parseFloat(v.precioVenta || 0);
                    if (precioActual !== precioCorrecto) {
                        cambios.push({
                            origen: "viajes",
                            docId: doc.id,
                            lote: v.lote || "S/N",
                            marca: v.marca || "",
                            modelo: v.modelo || "",
                            estado: v.estado,
                            ciudad: v.ciudad,
                            estatus: "EN VIAJE",
                            cliente: v.clienteNombre || v.clienteAlt || "",
                            fecha: fechaViaje ? fechaViaje.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : "Sin fecha",
                            _ts: fechaViaje ? fechaViaje.getTime() : 0,
                            precioAnterior: precioActual,
                            precioNuevo: precioCorrecto,
                            diferencia: precioCorrecto - precioActual,
                        });
                    }
                });
            });

            cambios.sort((a, b) => {
                if (a.fecha === "Sin fecha") return 1;
                if (b.fecha === "Sin fecha") return -1;
                return a._ts - b._ts;
            });

            setStats({
                totalRevisados,
                anterioresAlCorte,
                sinCoincidencia,
                porCorregir: cambios.length,
                yaCorrectos: totalRevisados - cambios.length - sinCoincidencia.length - anterioresAlCorte,
            });
            setPreview(cambios);
        } catch (e) {
            setResultado({ error: true, msg: "Error: " + e.message });
        }
        setEjecutando(false);
    };

    const handleMigrar = async () => {
        if (!preview || preview.length === 0) return;
        setEjecutando(true);
        try {
            let totalVehiculos = 0;
            let totalViajes = 0;

            // 1. Corregir colección vehiculos
            const cambiosVehiculos = preview.filter(c => c.origen === "vehiculos");
            for (const cambio of cambiosVehiculos) {
                await firestore()
                    .collection(COLLECTIONS.VEHICULOS)
                    .doc(cambio.docId)
                    .update({ price: String(cambio.precioNuevo) });
                totalVehiculos++;
            }

            // 2. Corregir viajes pendientes (agrupar por viaje)
            const cambiosViajes = preview.filter(c => c.origen === "viajes");
            const viajesACorregir = {};
            cambiosViajes.forEach(c => {
                if (!viajesACorregir[c.docId]) viajesACorregir[c.docId] = [];
                viajesACorregir[c.docId].push(c);
            });

            const { preciosMap } = await cargarDatos();
            for (const viajeId of Object.keys(viajesACorregir)) {
                const viajeDoc = await firestore().collection(COLLECTIONS.VIAJES_PENDIENTES).doc(viajeId).get();
                if (!viajeDoc.exists) continue;
                const viaje = viajeDoc.data();

                const vehiculosActualizados = viaje.vehiculos.map((v) => {
                    const key = `${v.estado}|${v.ciudad}`;
                    const precioCorrecto = preciosMap[key];
                    if (precioCorrecto !== undefined && parseFloat(v.precioVenta || 0) !== precioCorrecto) {
                        totalViajes++;
                        return { ...v, precioVenta: precioCorrecto };
                    }
                    return v;
                });

                await firestore()
                    .collection(COLLECTIONS.VIAJES_PENDIENTES)
                    .doc(viajeId)
                    .update({ vehiculos: vehiculosActualizados });
            }

            setResultado({
                error: false,
                msg: `Listo: ${totalVehiculos} en vehiculos + ${totalViajes} en viajes pendientes corregidos.`,
            });
            setPreview(null);
            setStats(null);
        } catch (e) {
            setResultado({ error: true, msg: "Error: " + e.message });
        }
        setEjecutando(false);
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg border">
            <h2 className="text-2xl font-black text-gray-800 mb-2">
                Corregir Precios al Cliente
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                Revisa todos los vehículos no entregados (registrados después del 13 de abril) y corrige
                el <strong>price</strong> usando el precio de <strong>Página (precioPagina)</strong> de la matriz.
            </p>

            <div className="flex gap-3 mb-4">
                <button
                    onClick={handlePreview}
                    disabled={ejecutando}
                    className="btn btn-sm btn-info text-white font-bold uppercase"
                >
                    {ejecutando ? "Cargando..." : "Ver cambios antes de aplicar"}
                </button>

                {preview && preview.length > 0 && (
                    <button
                        onClick={handleMigrar}
                        disabled={ejecutando}
                        className="btn btn-sm btn-error text-white font-bold uppercase"
                    >
                        {ejecutando ? "Aplicando..." : `Aplicar ${preview.length} cambios`}
                    </button>
                )}
            </div>

            {resultado && (
                <div className={`alert ${resultado.error ? "alert-error" : "alert-success"} mb-4`}>
                    {resultado.msg}
                </div>
            )}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded border text-center">
                        <div className="text-2xl font-black text-blue-700">{stats.totalRevisados}</div>
                        <div className="text-[10px] uppercase font-bold text-blue-500">Vehículos revisados</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border text-center">
                        <div className="text-2xl font-black text-gray-700">{stats.anterioresAlCorte}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-500">Anteriores al 13 abr</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded border text-center">
                        <div className="text-2xl font-black text-orange-700">{stats.porCorregir}</div>
                        <div className="text-[10px] uppercase font-bold text-orange-500">Por corregir</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded border text-center">
                        <div className="text-2xl font-black text-green-700">{stats.yaCorrectos}</div>
                        <div className="text-[10px] uppercase font-bold text-green-500">Ya correctos</div>
                    </div>
                </div>
            )}

            {stats?.sinCoincidencia?.length > 0 && (
                <div className="alert alert-warning mb-4 text-xs">
                    <strong>{stats.sinCoincidencia.length} vehículos sin precio en la matriz:</strong>
                    {" "}{stats.sinCoincidencia.map(s => `${s.lote} (${s.estado}/${s.ciudad})`).join(", ")}
                </div>
            )}

            {preview && preview.length === 0 && (
                <div className="alert alert-success">
                    Todos los precios ya están correctos. No hay cambios necesarios.
                </div>
            )}

            {preview && preview.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto border rounded">
                    <table className="table table-compact w-full text-xs">
                        <thead>
                            <tr className="bg-gray-100">
                                <th>Fecha</th>
                                <th>Lote</th>
                                <th>Vehículo</th>
                                <th>Cliente</th>
                                <th>Estado</th>
                                <th>Ciudad</th>
                                <th>Estatus</th>
                                <th>Origen</th>
                                <th className="text-right text-red-600">Precio Actual</th>
                                <th className="text-right text-green-600">Precio Correcto</th>
                                <th className="text-right">Diferencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map((c, i) => (
                                <tr key={i} className="hover:bg-yellow-50">
                                    <td className="text-[10px] text-gray-500">{c.fecha}</td>
                                    <td className="font-bold">{c.lote}</td>
                                    <td>{c.marca} {c.modelo}</td>
                                    <td className="text-[10px]">{c.cliente}</td>
                                    <td>{c.estado}</td>
                                    <td>{c.ciudad}</td>
                                    <td className="font-bold">{c.estatus}</td>
                                    <td><span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${c.origen === "viajes" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{c.origen === "viajes" ? "Viaje" : "Vehiculo"}</span></td>
                                    <td className="text-right text-red-600 font-mono">${c.precioAnterior}</td>
                                    <td className="text-right text-green-600 font-mono">${c.precioNuevo}</td>
                                    <td className={`text-right font-mono font-bold ${c.diferencia > 0 ? "text-green-700" : "text-red-700"}`}>
                                        {c.diferencia > 0 ? "+" : ""}${c.diferencia}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MigrarPrecios;
