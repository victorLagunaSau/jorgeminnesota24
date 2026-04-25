import React, { useState } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";

const AuditoriaCobros = ({ user }) => {
    const [ejecutando, setEjecutando] = useState(false);
    const [movimientos, setMovimientos] = useState([]);
    const [stats, setStats] = useState(null);

    const getLunes = () => {
        const hoy = new Date();
        const dia = hoy.getDay();
        const diff = dia === 0 ? 6 : dia - 1;
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - diff);
        lunes.setHours(0, 0, 0, 0);
        return lunes;
    };

    const handleCargar = async () => {
        setEjecutando(true);
        try {
            // 1. Precios correctos (precioPagina)
            const provincesSnap = await firestore().collection(COLLECTIONS.PROVINCE).get();
            const preciosMap = {};
            provincesSnap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.regions) {
                    data.regions.forEach((r) => {
                        preciosMap[`${data.state}|${r.city}`] = parseFloat(r.precioPagina || r.price || 0);
                    });
                }
            });

            // 2. Todos los vehículos entregados (para obtener fecha de registro)
            const vehSnap = await firestore()
                .collection(COLLECTIONS.VEHICULOS)
                .where("estatus", "==", "EN")
                .get();

            const vehiculosMap = {};
            vehSnap.docs.forEach((doc) => {
                const v = doc.data();
                let fechaReg = null;
                if (v.registro?.timestamp?.seconds) {
                    fechaReg = new Date(v.registro.timestamp.seconds * 1000);
                }
                vehiculosMap[doc.id] = {
                    fechaRegistro: fechaReg,
                    estado: v.estado,
                    ciudad: v.ciudad,
                };
            });

            // 3. Movimientos de salida (EN)
            const movSnap = await firestore()
                .collection(COLLECTIONS.MOVIMIENTOS)
                .where("estatus", "==", "EN")
                .get();

            const lunes = getLunes();
            const fechaCorte13Abr = new Date(2026, 3, 13, 0, 0, 0);

            const resultados = [];

            movSnap.docs.forEach((doc) => {
                const d = doc.data();

                // Fecha de cobro
                let fechaCobro = null;
                if (d.timestamp?.seconds) {
                    fechaCobro = new Date(d.timestamp.seconds * 1000);
                }
                if (!fechaCobro || fechaCobro < lunes) return;

                // Solo Olivia y Cristela
                const u = (d.usuario || "").toLowerCase();
                if (!u.includes("olivia") && !u.includes("cristela")) return;

                // Fecha de registro (del vehículo)
                const lote = d.binNip || "";
                const vehInfo = vehiculosMap[lote];
                const fechaRegistro = vehInfo?.fechaRegistro || null;

                // Solo registrados después del 13 de abril
                if (!fechaRegistro || fechaRegistro < fechaCorte13Abr) return;

                // Excluir los que tienen gastoExtra
                if ((parseFloat(d.gastosExtra || 0)) > 0) return;

                // Excluir los que ya tienen precio correcto
                const keyCheck = `${d.estado || vehInfo?.estado || ""}|${d.ciudad || vehInfo?.ciudad || ""}`;
                const precioCheck = preciosMap[keyCheck];
                if (precioCheck !== undefined && parseFloat(d.price || 0) === precioCheck) return;

                // Comparar precio
                const estado = d.estado || vehInfo?.estado || "";
                const ciudad = d.ciudad || vehInfo?.ciudad || "";
                const key = `${estado}|${ciudad}`;
                const precioCorrecto = preciosMap[key];
                const precioCobrado = parseFloat(d.price || 0);
                const esCorrecta = precioCorrecto !== undefined && precioCobrado === precioCorrecto;

                resultados.push({
                    id: doc.id,
                    lote,
                    marca: d.marca || "",
                    modelo: d.modelo || "",
                    cliente: d.cliente || "",
                    estado,
                    ciudad,
                    usuario: d.usuario || "",
                    precioCobrado,
                    precioCorrecto: precioCorrecto ?? null,
                    totalPago: parseFloat(d.totalPago || 0),
                    esCorrecta,
                    diferencia: precioCorrecto !== undefined ? precioCobrado - precioCorrecto : 0,
                    fechaCobro,
                    fechaRegistro,
                    gastosExtra: parseFloat(d.gastosExtra || 0),
                    storage: parseFloat(d.storage || 0),
                    sobrePeso: parseFloat(d.sobrePeso || 0),
                    fechaCobroStr: fechaCobro.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }),
                    fechaRegistroStr: fechaRegistro.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
                });
            });

            resultados.sort((a, b) => a.fechaCobro.getTime() - b.fechaCobro.getTime());

            const correctos = resultados.filter(m => m.esCorrecta).length;
            const incorrectos = resultados.filter(m => !m.esCorrecta).length;
            const diferenciaTotal = resultados.reduce((acc, m) => acc + m.diferencia, 0);

            // Separar por cajera
            const porCajera = {};
            resultados.forEach(m => {
                const nombre = m.usuario;
                if (!porCajera[nombre]) porCajera[nombre] = [];
                porCajera[nombre].push(m);
            });

            setStats({ total: resultados.length, correctos, incorrectos, diferenciaTotal });
            setMovimientos(porCajera);
        } catch (e) {
            alert("Error: " + e.message);
        }
        setEjecutando(false);
    };

    const lunes = getLunes();
    const lunesStr = lunes.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className="max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg border">
            <h2 className="text-2xl font-black text-gray-800 mb-1">
                Auditoría de Cobros — Semana Actual
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                Vehículos cobrados por <strong>Olivia</strong> y <strong>Cristela</strong> desde
                el <strong>{lunesStr}</strong>, registrados después del 13 de abril.
                <br/>
                <span className="inline-block mt-1">
                    <span className="inline-block w-3 h-3 bg-green-100 border border-green-400 rounded mr-1"></span> Precio correcto (precioPagina)
                    <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-400 rounded mr-1 ml-3"></span> Precio anterior (incorrecto)
                </span>
            </p>

            <button
                onClick={handleCargar}
                disabled={ejecutando}
                className="btn btn-sm btn-info text-white font-bold uppercase mb-4"
            >
                {ejecutando ? "Cargando..." : "Cargar Cobros de la Semana"}
            </button>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 p-3 rounded border text-center">
                        <div className="text-2xl font-black text-gray-700">{stats.total}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-500">Total cobrados</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded border text-center">
                        <div className="text-2xl font-black text-green-700">{stats.correctos}</div>
                        <div className="text-[10px] uppercase font-bold text-green-500">Precio correcto</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border text-center">
                        <div className="text-2xl font-black text-blue-700">{stats.incorrectos}</div>
                        <div className="text-[10px] uppercase font-bold text-blue-500">Precio anterior</div>
                    </div>
                    <div className={`p-3 rounded border text-center ${stats.diferenciaTotal < 0 ? "bg-red-50" : stats.diferenciaTotal > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                        <div className={`text-2xl font-black ${stats.diferenciaTotal < 0 ? "text-red-700" : stats.diferenciaTotal > 0 ? "text-orange-700" : "text-green-700"}`}>
                            {stats.diferenciaTotal === 0 ? "$0" : (stats.diferenciaTotal < 0 ? "-" : "+") + "$" + Math.abs(stats.diferenciaTotal).toLocaleString()}
                        </div>
                        <div className={`text-[10px] uppercase font-bold ${stats.diferenciaTotal < 0 ? "text-red-500" : "text-orange-500"}`}>
                            {stats.diferenciaTotal < 0 ? "Dejado de cobrar" : stats.diferenciaTotal > 0 ? "Cobrado de más" : "Sin diferencia"}
                        </div>
                    </div>
                </div>
            )}

            {Object.keys(movimientos).length > 0 && Object.entries(movimientos).map(([cajera, lista]) => {
                const correctosCaj = lista.filter(m => m.esCorrecta).length;
                const incorrectosCaj = lista.filter(m => !m.esCorrecta).length;
                const difCaj = lista.reduce((acc, m) => acc + m.diferencia, 0);
                return (
                    <div key={cajera} className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-black text-gray-800">{cajera}</h3>
                            <div className="flex gap-3 text-[11px] font-bold">
                                <span className="text-gray-500">{lista.length} cobros</span>
                                <span className="text-green-600">{correctosCaj} correctos</span>
                                <span className="text-blue-600">{incorrectosCaj} precio anterior</span>
                                {difCaj !== 0 && (
                                    <span className={difCaj < 0 ? "text-red-600" : "text-orange-600"}>
                                        {difCaj < 0 ? "-" : "+"}${Math.abs(difCaj).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto border rounded">
                            <table className="table table-compact w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-100 sticky top-0">
                                        <th>Cobrado</th>
                                        <th>Registrado</th>
                                        <th>Lote</th>
                                        <th>Vehículo</th>
                                        <th>Cliente</th>
                                        <th>Ciudad</th>
                                        <th className="text-right">Flete Cobrado</th>
                                        <th className="text-right">Precio Correcto</th>
                                        <th className="text-right">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lista.map((m) => (
                                        <tr key={m.id} className={m.esCorrecta
                                            ? "bg-green-50 border-l-4 border-l-green-400"
                                            : "bg-blue-50 border-l-4 border-l-blue-400"
                                        }>
                                            <td className="text-[10px] font-semibold">{m.fechaCobroStr}</td>
                                            <td className="text-[10px] text-gray-400">{m.fechaRegistroStr}</td>
                                            <td className="font-bold">{m.lote}</td>
                                            <td>{m.marca} {m.modelo}</td>
                                            <td className="text-[10px]">{m.cliente}</td>
                                            <td>{m.ciudad}</td>
                                            <td className={`text-right font-mono font-bold ${m.esCorrecta ? "text-green-700" : "text-blue-700"}`}>
                                                ${m.precioCobrado.toLocaleString()}
                                            </td>
                                            <td className="text-right font-mono text-gray-600">
                                                {m.precioCorrecto !== null ? `$${m.precioCorrecto.toLocaleString()}` : "—"}
                                            </td>
                                            <td className={`text-right font-mono font-bold ${
                                                m.diferencia === 0 ? "text-green-600" :
                                                m.diferencia < 0 ? "text-red-600" : "text-orange-600"
                                            }`}>
                                                {m.diferencia === 0 ? "OK" : (m.diferencia > 0 ? "+" : "") + "$" + m.diferencia.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {stats && stats.total === 0 && (
                <div className="alert alert-info">
                    No se encontraron cobros de Olivia o Cristela esta semana con vehículos registrados después del 13 de abril.
                </div>
            )}
        </div>
    );
};

export default AuditoriaCobros;
