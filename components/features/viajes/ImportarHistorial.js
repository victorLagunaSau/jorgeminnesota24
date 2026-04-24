import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import * as XLSX from "xlsx";
import moment from "moment";
import {
    FaFileExcel, FaCheck, FaTimes, FaChevronDown, FaChevronRight,
    FaUpload, FaExclamationTriangle, FaSync, FaSearch, FaStickyNote
} from "react-icons/fa";

const ImportarHistorial = ({ user }) => {
    // Data
    const [viajes, setViajes] = useState([]);
    const [choferes, setChoferes] = useState([]);
    const [vehiculosFirebase, setVehiculosFirebase] = useState({});
    const [totalVehiculosFirebase, setTotalVehiculosFirebase] = useState(0);
    const [cargandoFirebase, setCargandoFirebase] = useState(false);

    // UI
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [paginaActual, setPaginaActual] = useState(1);
    const [expandidos, setExpandidos] = useState({});
    const [busquedaChofer, setBusquedaChofer] = useState({});
    const [dropdownViaje, setDropdownViaje] = useState(null);
    const [importando, setImportando] = useState({});
    const [importados, setImportados] = useState({});
    const [notaActiva, setNotaActiva] = useState(null);
    const [exportandoListos, setExportandoListos] = useState(false);
    const POR_PAGINA = 25;

    // Cargar choferes de Firebase (real-time)
    useEffect(() => {
        const unsub = firestore().collection("choferes").onSnapshot(snap => {
            setChoferes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    // Obtener conteo total de vehiculos en Firebase
    useEffect(() => {
        firestore().collection("vehiculos").get().then(snap => {
            setTotalVehiculosFirebase(snap.size);
        }).catch(() => {});
    }, []);

    // Parsear extras como "150+65"
    const parsearExtras = (val) => {
        if (!val || val === "" || val === "-") return 0;
        if (typeof val === "number") return val;
        const str = String(val).trim();
        if (/^[\d\s+\-.]+$/.test(str)) {
            try {
                return str.split(/([+-])/).reduce((acc, part, i, arr) => {
                    const t = part.trim();
                    if (t === "+" || t === "-" || t === "") return acc;
                    const num = parseFloat(t) || 0;
                    if (i > 0 && arr[i - 1]?.trim() === "-") return acc - num;
                    return acc + num;
                }, 0);
            } catch { return 0; }
        }
        return parseFloat(str) || 0;
    };

    // Cache key para localStorage
    const CACHE_KEY = "importarHistorial_vehiculosCache";
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

    const guardarCache = (datos) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: datos }));
        } catch (e) { console.warn("Cache lleno, limpiando...", e); }
    };

    const leerCache = () => {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
            return data;
        } catch { return null; }
    };

    // Cargar lotes — primero intenta cache, si no hay consulta Firebase
    const cargarVehiculosDeFirebase = async (lotes, forzar = false) => {
        const lotesUnicos = [...new Set(lotes.filter(l => l && l !== "-"))];

        // Intentar cache
        if (!forzar) {
            const cache = leerCache();
            if (cache) {
                const cacheados = {};
                let faltantes = [];
                lotesUnicos.forEach(l => {
                    if (cache[l] !== undefined) cacheados[l] = cache[l];
                    else faltantes.push(l);
                });

                if (faltantes.length === 0) {
                    setVehiculosFirebase(cacheados);
                    return cacheados;
                }

                if (faltantes.length < lotesUnicos.length) {
                    setCargandoFirebase(true);
                    const nuevos = await consultarFirebase(faltantes);
                    const combinado = { ...cacheados, ...nuevos };
                    setVehiculosFirebase(combinado);
                    guardarCache({ ...cache, ...nuevos });
                    setCargandoFirebase(false);
                    return combinado;
                }
            }
        }

        setCargandoFirebase(true);
        const resultado = await consultarFirebase(lotesUnicos);
        setVehiculosFirebase(resultado);
        guardarCache(resultado);
        setCargandoFirebase(false);
        return resultado;
    };

    // Consulta real a Firebase en batches de 10
    const consultarFirebase = async (lotesUnicos) => {
        const resultado = {};
        for (let i = 0; i < lotesUnicos.length; i += 10) {
            const batch = lotesUnicos.slice(i, i + 10);
            try {
                const snap = await firestore().collection("vehiculos")
                    .where(firebase.firestore.FieldPath.documentId(), "in", batch)
                    .get();
                snap.docs.forEach(doc => {
                    const d = doc.data();
                    resultado[doc.id] = {
                        marca: d.marca || "",
                        modelo: d.modelo || "",
                        ciudad: d.ciudad || "",
                        estado: d.estado || "",
                        cliente: d.cliente || d.clienteNombre || "",
                        clienteId: d.clienteId || "",
                        telefonoCliente: d.telefonoCliente || "",
                        precio: parseFloat(d.price) || parseFloat(d.pago) || 0,
                        storage: parseFloat(d.storage) || 0,
                        sobrePeso: parseFloat(d.sobrePeso) || 0,
                        gastosExtra: parseFloat(d.gastosExtra) || 0,
                        totalPago: parseFloat(d.totalPago) || 0,
                        estatus: d.estatus || "",
                        titulo: d.titulo || "",
                        folioVenta: d.folioVenta || "",
                        numViaje: d.numViaje || "",
                        folioPago: d.folioPago || "",
                        fechaRegistro: d.registro?.timestamp || null,
                        almacen: d.almacen || "",
                    };
                });
            } catch (e) {
                console.error("Error batch", i, e);
            }
        }
        return resultado;
    };

    // Leer Excel y agrupar por numViaje
    const cargarExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const ws = wb.Sheets["OLIITA"];
            if (!ws) { alert("No se encontro la hoja OLIITA"); return; }

            const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            const datos = raw.filter(row => row.slice(0, 14).some(c => c !== "" && c !== null && c !== undefined));

            const viajesTemp = [];
            let actual = null;
            const todosLotes = [];

            datos.forEach((row) => {
                const numViaje = row[1];
                const esInicio = numViaje !== "" && numViaje !== "-" && numViaje !== null && numViaje !== undefined;

                if (esInicio) {
                    if (actual) viajesTemp.push(actual);
                    actual = {
                        numViaje: String(numViaje),
                        refFolio: String(row[2] || ""),
                        duenoOriginal: String(row[3] || "").trim().toUpperCase(),
                        choferAsignado: null,
                        choferIdFirebase: null,
                        empresaChofer: "",
                        vehiculos: []
                    };
                }
                if (!actual) {
                    actual = { numViaje: "PRE", refFolio: "", duenoOriginal: "", choferAsignado: null, choferIdFirebase: null, empresaChofer: "", vehiculos: [] };
                }

                const lote = String(row[4] || "").trim();
                todosLotes.push(lote);

                actual.vehiculos.push({
                    lote,
                    vehiculoExcel: String(row[5] || "").trim().toUpperCase(),
                    ciudadExcel: String(row[6] || "").trim().toUpperCase(),
                    fletero: String(row[7] || "").trim().toUpperCase(),
                    tituloExcel: String(row[8] || "").trim().toUpperCase(),
                    pagoChofer: parseFloat(row[9]) || 0,
                    storageExcel: parsearExtras(row[10]),
                    cobroClienteExcel: parseFloat(row[11]) || 0,
                    notas: String(row[12] || "").trim(),
                    folioSalida: String(row[13] || "").trim(),
                });
            });
            if (actual) viajesTemp.push(actual);

            // Heredar dueno
            viajesTemp.forEach(v => {
                v.vehiculos.forEach(vh => {
                    if (!vh.clienteExcel) vh.clienteExcel = v.duenoOriginal;
                });
            });

            setViajes(viajesTemp);
            setPaginaActual(1);

            await cargarVehiculosDeFirebase(todosLotes);
        };
        reader.readAsBinaryString(file);
    };

    // Helpers
    const getFirebase = (lote) => vehiculosFirebase[lote] || null;
    const loteExiste = (lote) => !!vehiculosFirebase[lote];

    const formatFecha = (timestamp) => {
        if (!timestamp) return "\u2014";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return moment(date).format("DD/MMM/YY");
    };

    // Asignar/quitar chofer
    const asignarChofer = (numViaje, chofer) => {
        setViajes(prev => prev.map(v =>
            v.numViaje === numViaje
                ? { ...v, choferAsignado: chofer.nombreChofer, choferIdFirebase: chofer.id, empresaChofer: chofer.empresaNombre || "" }
                : v
        ));
        setBusquedaChofer({});
        setDropdownViaje(null);
    };

    const quitarChofer = (numViaje) => {
        setViajes(prev => prev.map(v =>
            v.numViaje === numViaje
                ? { ...v, choferAsignado: null, choferIdFirebase: null, empresaChofer: "" }
                : v
        ));
    };

    // Importar un viaje a Firebase viajesPagados
    const importarViaje = async (viaje) => {
        if (!viaje.choferAsignado) { alert("Asigna un chofer primero."); return; }
        setImportando(prev => ({ ...prev, [viaje.numViaje]: true }));

        try {
            const docId = `H-${viaje.numViaje}`;
            const existe = await firestore().collection("viajesPagados").doc(docId).get();
            if (existe.exists) {
                if (!window.confirm(`El viaje ${docId} ya existe. Sobrescribir?`)) {
                    setImportando(prev => ({ ...prev, [viaje.numViaje]: false }));
                    return;
                }
            }

            const vehParaFirebase = viaje.vehiculos.map(vh => {
                const fb = getFirebase(vh.lote);
                return {
                    lote: vh.lote,
                    marca: fb?.marca || "",
                    modelo: fb?.modelo || "",
                    ciudad: fb?.ciudad || vh.ciudadExcel,
                    estado: fb?.estado || "",
                    almacen: fb?.almacen || "",
                    titulo: fb?.titulo || (vh.tituloExcel === "T" ? "SI" : "NO"),
                    clienteNombre: fb?.cliente || "",
                    clienteId: fb?.clienteId || "",
                    clienteTelefono: fb?.telefonoCliente || "",
                    flete: vh.pagoChofer,
                    storage: vh.storageExcel,
                    sPeso: 0,
                    gExtra: 0,
                    cobroCliente: fb?.precio || vh.cobroClienteExcel,
                    fletero: vh.fletero,
                    notas: vh.notas,
                    existeEnSistema: !!fb,
                    estatusEnSistema: fb?.estatus || "",
                };
            });

            const totalFletes = vehParaFirebase.reduce((a, v) => a + v.flete, 0);
            const totalStorage = vehParaFirebase.reduce((a, v) => a + v.storage, 0);
            const totalCobro = vehParaFirebase.reduce((a, v) => a + v.cobroCliente, 0);

            await firestore().collection("viajesPagados").doc(docId).set({
                numViaje: docId,
                folioPago: docId,
                estatus: "PAGADO",
                metodo: "IMPORTACION_HISTORIAL",
                importadoDesde: "JML.xlsx",
                fechaImportacion: firebase.firestore.Timestamp.now(),
                fechaCreacion: firebase.firestore.Timestamp.now(),
                fechaPago: firebase.firestore.Timestamp.now(),
                chofer: {
                    id: viaje.choferIdFirebase,
                    nombre: viaje.choferAsignado,
                    empresa: viaje.empresaChofer,
                },
                clienteViaje: viaje.duenoOriginal,
                refFolio: viaje.refFolio,
                numViajeExcel: viaje.numViaje,
                duenoOriginalExcel: viaje.duenoOriginal,
                empresaLiquidada: viaje.empresaChofer,
                vehiculos: vehParaFirebase,
                resumenFinanciero: {
                    totalFletes,
                    totalStorage,
                    totalCobro,
                    ganancia: totalCobro - totalFletes - totalStorage,
                    totalVehiculos: vehParaFirebase.length,
                },
                creadoPor: { id: user?.id || "sistema", nombre: user?.nombre || "Sistema" },
            });

            setImportados(prev => ({ ...prev, [viaje.numViaje]: true }));
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setImportando(prev => ({ ...prev, [viaje.numViaje]: false }));
        }
    };

    // Exportar todos los viajes listos (con chofer asignado, no importados aun)
    const exportarListos = async () => {
        const listos = viajes.filter(v => v.choferAsignado && !importados[v.numViaje]);
        if (listos.length === 0) { alert("No hay viajes listos para importar."); return; }
        if (!window.confirm(`Importar ${listos.length} viajes con chofer asignado?`)) return;

        setExportandoListos(true);
        let exitosos = 0;
        let errores = 0;

        for (const viaje of listos) {
            try {
                await importarViaje(viaje);
                exitosos++;
            } catch {
                errores++;
            }
        }

        setExportandoListos(false);
        alert(`Importacion completada: ${exitosos} exitosos, ${errores} errores.`);
    };

    // Filtros
    const viajesFiltrados = viajes.filter(v => {
        if (filtroEstado === "pendientes" && v.choferAsignado) return false;
        if (filtroEstado === "asignados" && !v.choferAsignado) return false;
        if (filtroEstado === "importados" && !importados[v.numViaje]) return false;
        if (filtroEstado === "sincruzar") {
            const tieneNoEncontrado = v.vehiculos.some(vh => !loteExiste(vh.lote));
            if (!tieneNoEncontrado) return false;
        }
        if (busqueda) {
            const b = busqueda.toUpperCase();
            return v.duenoOriginal.includes(b) || v.numViaje.includes(b) ||
                (v.choferAsignado || "").includes(b) ||
                v.vehiculos.some(vh => vh.lote.includes(b) || vh.fletero.includes(b));
        }
        return true;
    });

    const totalPaginas = Math.ceil(viajesFiltrados.length / POR_PAGINA);
    const viajesPagina = viajesFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
    const asignados = viajes.filter(v => v.choferAsignado).length;
    const totalImportados = Object.keys(importados).length;
    const totalLotes = viajes.reduce((acc, v) => acc + v.vehiculos.length, 0);
    const lotesCruzados = viajes.reduce((acc, v) => acc + v.vehiculos.filter(vh => loteExiste(vh.lote)).length, 0);
    const lotesNoEncontrados = totalLotes - lotesCruzados;
    const porcentajeCruzados = totalLotes > 0 ? Math.round((lotesCruzados / totalLotes) * 100) : 0;

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-black">

            {/* STATUS BAR + TOOLBAR */}
            <div className="sticky top-0 z-50 p-4 bg-white border-b-2 border-gray-200 shadow-sm">
                {/* STATUS BAR */}
                {viajes.length > 0 && !cargandoFirebase && (
                    <div className="bg-green-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-md mb-3 flex items-center gap-1">
                        <span>{totalVehiculosFirebase.toLocaleString()} vehiculos</span>
                        <span className="opacity-50">|</span>
                        <span>{viajes.length.toLocaleString()} viajes</span>
                        <span className="opacity-50">|</span>
                        <span>{totalLotes.toLocaleString()} lotes</span>
                        <span className="opacity-50">|</span>
                        <span>{lotesCruzados.toLocaleString()} cruzados ({porcentajeCruzados}%)</span>
                    </div>
                )}

                {/* TOOLBAR */}
                <div className="flex gap-2 items-center flex-wrap">
                    <label className="btn btn-sm btn-error text-white font-black uppercase gap-2 cursor-pointer">
                        <FaFileExcel /> {viajes.length > 0 ? "Cambiar Excel" : "Cargar JML.xlsx"}
                        <input type="file" accept=".xlsx,.xls" onChange={cargarExcel} className="hidden" />
                    </label>
                    {cargandoFirebase && (
                        <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                            <FaSync className="animate-spin" size={10} /> Cruzando con Firebase...
                        </span>
                    )}
                    {viajes.length > 0 && !cargandoFirebase && (
                        <button
                            className="btn btn-sm btn-outline btn-info font-bold uppercase gap-1 text-[10px]"
                            onClick={() => {
                                const lotes = viajes.flatMap(v => v.vehiculos.map(vh => vh.lote));
                                cargarVehiculosDeFirebase(lotes, true);
                            }}
                        >
                            <FaSync size={10} /> Refrescar Firebase
                        </button>
                    )}
                    {viajes.length > 0 && (
                        <>
                            <div className="relative">
                                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                                <input
                                    type="text"
                                    placeholder="Buscar viaje, lote, dueno, chofer..."
                                    className="input input-sm input-bordered w-60 font-bold uppercase pl-7 text-[11px]"
                                    value={busqueda}
                                    onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                                />
                            </div>
                            <select
                                className="select select-sm select-bordered font-bold text-[12px]"
                                value={filtroEstado}
                                onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
                            >
                                <option value="todos">Todos ({viajes.length})</option>
                                <option value="pendientes">Sin Chofer ({viajes.length - asignados})</option>
                                <option value="asignados">Con Chofer ({asignados})</option>
                                <option value="sincruzar">Lotes no cruzados</option>
                                <option value="importados">Importados ({totalImportados})</option>
                            </select>
                            {asignados > 0 && (
                                <button
                                    className="btn btn-sm btn-success text-white font-black uppercase gap-1 text-[10px]"
                                    onClick={exportarListos}
                                    disabled={exportandoListos}
                                >
                                    {exportandoListos ? (
                                        <><FaSync className="animate-spin" size={10} /> Importando...</>
                                    ) : (
                                        <><FaUpload size={10} /> Exportar Listos ({viajes.filter(v => v.choferAsignado && !importados[v.numViaje]).length})</>
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* CONTENIDO */}
            {viajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                    <FaFileExcel size={60} className="mb-4 opacity-30" />
                    <p className="text-lg font-bold uppercase">Carga el archivo JML.xlsx</p>
                    <p className="text-[11px] mt-1">Se buscara la hoja &quot;OLIITA&quot; y se cruzara con la base de datos</p>
                </div>
            ) : (
                <div className="p-2 overflow-x-auto">
                    <table className="w-full border-collapse text-[11px]" style={{ minWidth: "1450px" }}>
                        <thead>
                            <tr className="text-white text-[9px] uppercase font-black sticky top-[155px] z-40" style={{ backgroundColor: "#1f2937" }}>
                                <th className="border border-gray-600 px-1 py-2 w-6"></th>
                                <th className="border border-gray-600 px-2 py-2 text-center">N&deg;</th>
                                <th className="border border-gray-600 px-2 py-2">Fecha Reg.</th>
                                <th className="border border-gray-600 px-2 py-2" style={{ minWidth: "170px", backgroundColor: "#1e40af" }}>Chofer (Sistema)</th>
                                <th className="border border-gray-600 px-2 py-2">Lote</th>
                                <th className="border border-gray-600 px-2 py-2">Marca / Modelo</th>
                                <th className="border border-gray-600 px-2 py-2">Ciudad / Estado</th>
                                <th className="border border-gray-600 px-2 py-2">Cliente</th>
                                <th className="border border-gray-600 px-2 py-2 text-right" style={{ backgroundColor: "#991b1b" }}>Pago Chofer</th>
                                <th className="border border-gray-600 px-2 py-2 text-right" style={{ backgroundColor: "#991b1b" }}>Storage</th>
                                <th className="border border-gray-600 px-2 py-2 text-right" style={{ backgroundColor: "#166534" }}>Precio Sist.</th>
                                <th className="border border-gray-600 px-2 py-2 text-center">Titulo</th>
                                <th className="border border-gray-600 px-2 py-2 text-right" style={{ backgroundColor: "#3730a3" }}>Total Viaje</th>
                                <th className="border border-gray-600 px-2 py-2 text-center w-10">Notas</th>
                                <th className="border border-gray-600 px-2 py-2 text-center w-20">Accion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {viajesPagina.map((viaje) => {
                                const estaExpandido = expandidos[viaje.numViaje];
                                const estaImportado = importados[viaje.numViaje];
                                const estaImportando = importando[viaje.numViaje];
                                const vehiculosVisibles = estaExpandido ? viaje.vehiculos : viaje.vehiculos.slice(0, 1);
                                const totalPagoChofer = viaje.vehiculos.reduce((a, v) => a + v.pagoChofer, 0);
                                const totalStorageExcel = viaje.vehiculos.reduce((a, v) => a + v.storageExcel, 0);
                                const totalPrecioSistema = viaje.vehiculos.reduce((a, v) => {
                                    const fb = getFirebase(v.lote);
                                    return a + (fb?.precio || v.cobroClienteExcel || 0);
                                }, 0);
                                const ganancia = totalPrecioSistema - totalPagoChofer - totalStorageExcel;

                                return vehiculosVisibles.map((v, idx) => {
                                    const fb = getFirebase(v.lote);
                                    const noExiste = !fb;
                                    const bgFila = estaImportado ? "bg-green-50" : noExiste ? "bg-yellow-50" : viaje.choferAsignado ? "bg-blue-50/30" : "bg-white";
                                    const notaKey = `${viaje.numViaje}-${idx}`;
                                    const separador = estaExpandido && idx === viaje.vehiculos.length - 1 ? " border-b-2 border-gray-400" : "";

                                    return (
                                        <tr key={`${viaje.numViaje}-${idx}`} className={`${bgFila} hover:bg-yellow-50 border-b border-gray-200${separador}`}>

                                            {/* EXPAND */}
                                            {idx === 0 && (
                                                <td rowSpan={vehiculosVisibles.length} className="border border-gray-200 px-1 py-1 text-center cursor-pointer align-top" onClick={() => setExpandidos(p => ({ ...p, [viaje.numViaje]: !p[viaje.numViaje] }))}>
                                                    <div className="flex flex-col items-center">
                                                        {estaExpandido ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                                                        {viaje.vehiculos.length > 1 && (
                                                            <span className="bg-gray-200 text-gray-600 rounded-full text-[8px] font-black w-4 h-4 flex items-center justify-center mt-0.5">
                                                                {viaje.vehiculos.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            {/* N VIAJE */}
                                            <td className="border border-gray-200 px-2 py-1 text-center font-black whitespace-nowrap">
                                                {idx === 0 && <span className="text-blue-700 text-[12px]">#{viaje.numViaje}</span>}
                                            </td>

                                            {/* FECHA REGISTRO (Firebase) */}
                                            <td className="border border-gray-200 px-2 py-1 text-[10px] text-gray-500 font-bold whitespace-nowrap">
                                                {fb?.fechaRegistro ? formatFecha(fb.fechaRegistro) : <span className="text-gray-300">&mdash;</span>}
                                            </td>

                                            {/* CHOFER SISTEMA */}
                                            {idx === 0 && (
                                                <td rowSpan={vehiculosVisibles.length} className="border border-gray-200 px-2 py-1 bg-blue-50 align-top" style={{ minWidth: "170px" }}>
                                                    {viaje.choferAsignado ? (
                                                        <div className="flex items-center gap-1">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[11px] font-black text-blue-800 uppercase truncate">{viaje.choferAsignado}</div>
                                                                <div className="text-[8px] text-gray-400 italic truncate">{viaje.empresaChofer}</div>
                                                                <div className="text-[8px] text-orange-500 italic mt-0.5">Ref: {viaje.duenoOriginal || "\u2014"}</div>
                                                            </div>
                                                            <button onClick={() => quitarChofer(viaje.numViaje)} className="text-red-400 hover:text-red-600 flex-shrink-0"><FaTimes size={10} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <div className="text-[8px] text-orange-500 italic font-bold mb-1">Excel: {viaje.duenoOriginal || "\u2014"}</div>
                                                            <input
                                                                type="text"
                                                                placeholder="Buscar chofer..."
                                                                className="input input-xs w-full font-bold uppercase text-[11px] bg-white"
                                                                value={busquedaChofer[viaje.numViaje] || ""}
                                                                onChange={(e) => { setBusquedaChofer({ ...busquedaChofer, [viaje.numViaje]: e.target.value }); setDropdownViaje(viaje.numViaje); }}
                                                                onFocus={() => setDropdownViaje(viaje.numViaje)}
                                                            />
                                                            {dropdownViaje === viaje.numViaje && (
                                                                <div className="absolute z-[200] w-72 bg-white border-2 border-black shadow-2xl rounded-md max-h-48 overflow-y-auto mt-1 left-0">
                                                                    {choferes
                                                                        .filter(c => {
                                                                            const t = (busquedaChofer[viaje.numViaje] || "").toUpperCase();
                                                                            return !t || c.nombreChofer?.toUpperCase().includes(t) || c.empresaNombre?.toUpperCase().includes(t);
                                                                        })
                                                                        .slice(0, 15)
                                                                        .map(c => (
                                                                            <div key={c.id} className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[11px] font-bold uppercase border-b last:border-none flex justify-between" onClick={() => asignarChofer(viaje.numViaje, c)}>
                                                                                <span>{c.nombreChofer}</span>
                                                                                <span className="text-[8px] opacity-60">{c.empresaNombre}</span>
                                                                            </div>
                                                                        ))
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            )}

                                            {/* LOTE */}
                                            <td className="border border-gray-200 px-2 py-1 font-mono font-black whitespace-nowrap">
                                                {noExiste ? (
                                                    <div>
                                                        <span className="text-yellow-600">{v.lote}</span>
                                                        <div className="text-[8px] text-red-500 font-bold flex items-center gap-0.5"><FaExclamationTriangle size={8} /> NO EN SISTEMA</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-blue-700">{v.lote}</span>
                                                )}
                                            </td>

                                            {/* MARCA/MODELO */}
                                            <td className="border border-gray-200 px-2 py-1 uppercase text-gray-700">
                                                {fb ? (
                                                    <div>
                                                        <span className="font-bold">{fb.marca}</span> <span className="text-gray-500">{fb.modelo}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-yellow-600 italic text-[10px]">{v.vehiculoExcel}</span>
                                                )}
                                            </td>

                                            {/* CIUDAD/ESTADO */}
                                            <td className="border border-gray-200 px-2 py-1">
                                                {fb ? (
                                                    <div>
                                                        <span className="font-bold text-red-700 uppercase">{fb.ciudad}</span>
                                                        <div className="text-[9px] text-gray-400">{fb.estado}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-yellow-600 italic text-[10px] uppercase">{v.ciudadExcel}</span>
                                                )}
                                            </td>

                                            {/* CLIENTE */}
                                            <td className="border border-gray-200 px-2 py-1 text-[10px] uppercase font-bold text-gray-600">
                                                {fb?.cliente || <span className="text-gray-300">&mdash;</span>}
                                            </td>

                                            {/* PAGO CHOFER */}
                                            <td className="border border-gray-200 px-2 py-1 text-right font-mono font-black text-red-700 bg-red-50">
                                                {v.pagoChofer > 0 ? `$${v.pagoChofer.toLocaleString()}` : <span className="text-gray-300">&mdash;</span>}
                                            </td>

                                            {/* STORAGE */}
                                            <td className="border border-gray-200 px-2 py-1 text-right font-mono text-red-600 bg-red-50">
                                                {v.storageExcel > 0 ? `$${v.storageExcel}` : <span className="text-gray-300">&mdash;</span>}
                                            </td>

                                            {/* PRECIO SISTEMA */}
                                            <td className="border border-gray-200 px-2 py-1 text-right font-mono font-bold text-green-700 bg-green-50">
                                                {fb?.precio > 0 ? (
                                                    `$${fb.precio.toLocaleString()}`
                                                ) : v.cobroClienteExcel > 0 ? (
                                                    <span className="text-yellow-600">${v.cobroClienteExcel.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-gray-300">&mdash;</span>
                                                )}
                                            </td>

                                            {/* TITULO - TEXT ONLY, NO EMOJIS */}
                                            <td className="border border-gray-200 px-2 py-1 text-center text-[10px] font-bold">
                                                {(() => {
                                                    const tituloFb = fb?.titulo || "";
                                                    const tituloVal = tituloFb === "SI" || tituloFb === "TITULO" ? "SI" : tituloFb === "NO" ? "NO" : (v.tituloExcel === "T" ? "SI" : "NO");
                                                    return (
                                                        <span className={tituloVal === "SI" ? "text-green-700 font-black" : "text-red-600 font-black"}>
                                                            {tituloVal}
                                                        </span>
                                                    );
                                                })()}
                                            </td>

                                            {/* TOTAL VIAJE */}
                                            {idx === 0 && (
                                                <td rowSpan={vehiculosVisibles.length} className="border border-gray-200 px-2 py-1 text-right font-mono bg-indigo-50 align-middle">
                                                    <div className="text-[10px] font-black text-red-700">Ch: ${totalPagoChofer.toLocaleString()}</div>
                                                    <div className="text-[10px] font-black text-green-700">Cl: ${totalPrecioSistema.toLocaleString()}</div>
                                                    <div className={`text-[11px] font-black mt-1 pt-1 border-t ${ganancia >= 0 ? "text-blue-700" : "text-red-600"}`}>
                                                        {ganancia >= 0 ? "+" : ""}${ganancia.toLocaleString()}
                                                    </div>
                                                </td>
                                            )}

                                            {/* NOTAS */}
                                            <td className="border border-gray-200 px-1 py-1 text-center">
                                                {v.notas ? (
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setNotaActiva(notaActiva === notaKey ? null : notaKey)}
                                                            className="text-amber-500 hover:text-amber-700 transition-colors"
                                                            title={v.notas}
                                                        >
                                                            <FaStickyNote size={12} />
                                                        </button>
                                                        {notaActiva === notaKey && (
                                                            <div className="absolute z-[300] right-0 mt-1 w-56 bg-white border-2 border-amber-400 shadow-xl rounded-md p-2 text-left">
                                                                <div className="text-[8px] font-black text-amber-600 uppercase mb-1">Nota - Lote {v.lote}</div>
                                                                <div className="text-[10px] text-gray-700 whitespace-pre-wrap break-words">{v.notas}</div>
                                                                <button onClick={() => setNotaActiva(null)} className="text-[8px] text-gray-400 hover:text-red-500 mt-1 font-bold uppercase">Cerrar</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-200">&mdash;</span>
                                                )}
                                            </td>

                                            {/* ACCION */}
                                            {idx === 0 && (
                                                <td rowSpan={vehiculosVisibles.length} className="border border-gray-200 px-1 py-1 text-center align-middle">
                                                    {estaImportado ? (
                                                        <span className="text-green-600 font-black text-[9px] uppercase flex items-center justify-center gap-1"><FaCheck /> OK</span>
                                                    ) : estaImportando ? (
                                                        <span className="loading loading-spinner loading-xs text-blue-600"></span>
                                                    ) : (
                                                        <button
                                                            onClick={() => importarViaje(viaje)}
                                                            disabled={!viaje.choferAsignado}
                                                            className={`btn btn-xs font-black uppercase gap-1 ${viaje.choferAsignado ? "btn-success text-white" : "btn-ghost text-gray-300"}`}
                                                        >
                                                            <FaUpload size={8} />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>

                    {/* PAGINACION */}
                    {totalPaginas > 1 && (
                        <div className="flex justify-center gap-1 py-6 items-center">
                            <button className="btn btn-sm btn-ghost font-bold" disabled={paginaActual <= 1} onClick={() => setPaginaActual(p => p - 1)}>&lt;</button>
                            {Array.from({ length: Math.min(totalPaginas, 10) }, (_, i) => {
                                let p;
                                if (totalPaginas <= 10) p = i + 1;
                                else if (paginaActual <= 5) p = i + 1;
                                else if (paginaActual >= totalPaginas - 4) p = totalPaginas - 9 + i;
                                else p = paginaActual - 4 + i;
                                return (
                                    <button
                                        key={p}
                                        className={`btn btn-sm font-bold ${p === paginaActual ? "btn-error text-white" : "btn-ghost"}`}
                                        onClick={() => setPaginaActual(p)}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button className="btn btn-sm btn-ghost font-bold" disabled={paginaActual >= totalPaginas} onClick={() => setPaginaActual(p => p + 1)}>&gt;</button>
                        </div>
                    )}
                </div>
            )}

            {/* Click fuera cierra dropdown chofer */}
            {dropdownViaje && <div className="fixed inset-0 z-[100]" onClick={() => setDropdownViaje(null)} />}

            {/* Click fuera cierra nota */}
            {notaActiva && <div className="fixed inset-0 z-[250]" onClick={() => setNotaActiva(null)} />}
        </div>
    );
};

export default ImportarHistorial;
