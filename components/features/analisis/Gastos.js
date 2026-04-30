import React, { useState, useEffect, useRef, useMemo } from "react";
import { firestore, storage } from "../../../firebase/firebaseIni";
import { useAuthContext } from "../../../context/auth";
import imageCompression from "browser-image-compression";
import * as XLSX from "xlsx";
import { FaCamera, FaTimes, FaCheck, FaSpinner, FaTrash, FaEye, FaChevronLeft, FaChevronRight, FaFileExcel, FaCrop } from "react-icons/fa";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const CATEGORIAS = [
    "Fuel & Tolls",
    "Truck Maintenance & Repairs",
    "Insurance",
    "Rent / Office",
    "Payroll / Labor",
    "Licenses & Permits",
    "Phone & Internet",
    "Supplies",
    "Professional Services",
    "Meals",
    "Other",
];

const METODOS_PAGO = ["Cash", "Card", "Check", "Zelle", "Transfer"];

async function autoCropReceipt(blob) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;

    const bright = (x, y) => {
        const i = (y * w + x) * 4;
        return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    };

    const step = Math.max(1, Math.floor(Math.min(w, h) / 300));

    // Sample background brightness from corners (10% of each corner)
    const cornerSize = Math.floor(Math.min(w, h) * 0.08);
    let bgSum = 0, bgN = 0;
    const corners = [
        [0, 0], [w - cornerSize, 0],
        [0, h - cornerSize], [w - cornerSize, h - cornerSize]
    ];
    for (const [cx, cy] of corners) {
        for (let y = cy; y < cy + cornerSize; y += step) {
            for (let x = cx; x < cx + cornerSize; x += step) {
                if (x < w && y < h) { bgSum += bright(x, y); bgN++; }
            }
        }
    }
    const bgBright = bgN > 0 ? bgSum / bgN : 128;

    // Threshold: how different a pixel must be from background to count as "receipt"
    const threshold = 25;

    // Check if a row has enough "non-background" pixels (>25% of the row)
    const rowHasContent = (y) => {
        let diff = 0, total = 0;
        for (let x = 0; x < w; x += step) {
            if (Math.abs(bright(x, y) - bgBright) > threshold) diff++;
            total++;
        }
        return diff / total > 0.25;
    };

    const colHasContent = (x) => {
        let diff = 0, total = 0;
        for (let y = 0; y < h; y += step) {
            if (Math.abs(bright(x, y) - bgBright) > threshold) diff++;
            total++;
        }
        return diff / total > 0.25;
    };

    const pad = Math.floor(Math.min(w, h) * 0.01);

    // Scan from each edge
    let top = 0;
    for (let y = 0; y < h; y += step) {
        if (rowHasContent(y)) { top = Math.max(0, y - pad); break; }
    }
    let bottom = h;
    for (let y = h - 1; y >= 0; y -= step) {
        if (rowHasContent(y)) { bottom = Math.min(h, y + pad); break; }
    }
    let left = 0;
    for (let x = 0; x < w; x += step) {
        if (colHasContent(x)) { left = Math.max(0, x - pad); break; }
    }
    let right = w;
    for (let x = w - 1; x >= 0; x -= step) {
        if (colHasContent(x)) { right = Math.min(w, x + pad); break; }
    }

    const cropW = right - left;
    const cropH = bottom - top;

    // Only crop if we actually trimmed something significant (>5% from at least one side)
    if (cropW >= w * 0.95 && cropH >= h * 0.95) return blob;
    // Safety: if crop area is too small, something went wrong
    if (cropW < w * 0.15 || cropH < h * 0.15) return blob;

    const out = document.createElement("canvas");
    out.width = cropW;
    out.height = cropH;
    out.getContext("2d").drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);

    return new Promise(resolve => {
        out.toBlob(b => resolve(b || blob), "image/webp", 0.93);
    });
}

async function autoCropFromPath(imagePath) {
    const ref = storage().ref(imagePath);
    const url = await ref.getDownloadURL();
    const proxyUrl = `/api/proxy-storage?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    return autoCropReceipt(blob);
}

const Gastos = () => {
    const { user } = useAuthContext();
    const isAdminMaster = user?.adminMaster === true;
    const fileInputRef = useRef(null);

    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subiendo, setSubiendo] = useState(false);
    const [comprimiendo, setComprimiendo] = useState(false);
    const [vista, setVista] = useState("pendientes");

    const hoy = new Date();
    const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
    const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());
    const [mesesAcumulado, setMesesAcumulado] = useState([]);

    // Modal
    const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
    const [editMonto, setEditMonto] = useState("");
    const [editConcepto, setEditConcepto] = useState("");
    const [editFecha, setEditFecha] = useState("");
    const [editCategoria, setEditCategoria] = useState("");
    const [editMetodo, setEditMetodo] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [imagenGrande, setImagenGrande] = useState(null);
    const [recortando, setRecortando] = useState(false);

    useEffect(() => {
        const unsub = firestore()
            .collection("gastos")
            .orderBy("fechaCreacion", "desc")
            .onSnapshot(snap => {
                setGastos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            }, () => setLoading(false));
        return () => unsub();
    }, []);

    const handleFoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setComprimiendo(true);
        let archivoFinal = file;
        try {
            archivoFinal = await imageCompression(file, { maxSizeMB: 2.5, maxWidthOrHeight: 3000, useWebWorker: true, fileType: "image/webp" });
        } catch {
            try { archivoFinal = await imageCompression(file, { maxSizeMB: 3, maxWidthOrHeight: 3000, useWebWorker: true }); }
            catch { alert("Error al comprimir."); setComprimiendo(false); return; }
        }
        // Auto-detect and crop receipt
        try {
            archivoFinal = await autoCropReceipt(archivoFinal);
        } catch {}
        setComprimiendo(false);
        setSubiendo(true);
        try {
            const ts = Date.now();
            const ext = "webp";
            const path = `gastos/${ts}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
            const ref = storage().ref(path);
            await ref.put(archivoFinal, { contentType: "image/webp" });
            const url = await ref.getDownloadURL();
            await firestore().collection("gastos").add({
                imagenUrl: url, imagenPath: path, estado: "pendiente",
                monto: null, concepto: null, fechaGasto: null,
                categoria: null, metodoPago: null,
                creadoPor: { nombre: user?.nombre || user?.email || "Usuario", id: user?.uid || "" },
                fechaCreacion: firestore.FieldValue.serverTimestamp(),
                revisadoPor: null, fechaRevision: null,
            });
        } catch { alert("Error al subir."); }
        setSubiendo(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRecortarManual = async () => {
        if (!gastoSeleccionado || !gastoSeleccionado.imagenPath) return;
        setRecortando(true);
        try {
            const cropped = await autoCropFromPath(gastoSeleccionado.imagenPath);
            const path = gastoSeleccionado.imagenPath;
            const ref = storage().ref(path);
            await ref.put(cropped, { contentType: "image/webp" });
            const url = await ref.getDownloadURL();
            await firestore().collection("gastos").doc(gastoSeleccionado.id).update({ imagenUrl: url });
            setGastoSeleccionado({ ...gastoSeleccionado, imagenUrl: url });
        } catch (err) {
            console.error("Error recortar:", err);
            alert("Error al recortar.");
        }
        setRecortando(false);
    };

    const handleRevisar = async () => {
        if (!gastoSeleccionado) return;
        if (!editMonto || parseFloat(editMonto) <= 0) return alert("Ingresa un monto.");
        if (!editConcepto.trim()) return alert("Escribe el concepto.");
        if (!editFecha) return alert("Selecciona la fecha.");
        if (!editCategoria) return alert("Selecciona la categoria.");
        if (!editMetodo) return alert("Selecciona el metodo de pago.");
        setGuardando(true);
        try {
            await firestore().collection("gastos").doc(gastoSeleccionado.id).update({
                monto: parseFloat(editMonto), concepto: editConcepto.trim(),
                fechaGasto: editFecha, categoria: editCategoria, metodoPago: editMetodo,
                estado: "revisado",
                revisadoPor: { nombre: user?.nombre || user?.email || "Admin", id: user?.uid || "" },
                fechaRevision: firestore.FieldValue.serverTimestamp(),
            });
            setGastoSeleccionado(null);
        } catch { alert("Error al guardar."); }
        setGuardando(false);
    };

    const handleEliminar = async (gasto) => {
        if (!confirm("Eliminar este gasto?")) return;
        try {
            if (gasto.imagenPath) { try { await storage().ref(gasto.imagenPath).delete(); } catch {} }
            await firestore().collection("gastos").doc(gasto.id).delete();
            if (gastoSeleccionado?.id === gasto.id) setGastoSeleccionado(null);
        } catch { alert("Error al eliminar."); }
    };

    const exportarExcel = () => {
        if (revisadosMes.length === 0) return;
        const datos = revisadosMes.map(g => ({
            "Date": g.fechaGasto || "",
            "Description": g.concepto || "",
            "Category": g.categoria || "",
            "Payment Method": g.metodoPago || "",
            "Amount": g.monto || 0,
            "Uploaded By": g.creadoPor?.nombre || "",
        }));
        datos.push({ "Date": "", "Description": "", "Category": "", "Payment Method": "TOTAL", "Amount": totalMes, "Uploaded By": "" });

        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${MESES[mesSeleccionado]} ${anioSeleccionado}`);
        XLSX.writeFile(wb, `Expenses_${MESES[mesSeleccionado]}_${anioSeleccionado}.xlsx`);
    };

    const pendientes = gastos.filter(g => g.estado === "pendiente");

    const revisadosMes = useMemo(() => {
        return gastos
            .filter(g => {
                if (g.estado !== "revisado" || !g.fechaGasto) return false;
                const [y, m] = g.fechaGasto.split("-");
                return parseInt(y) === anioSeleccionado && parseInt(m) - 1 === mesSeleccionado;
            })
            .sort((a, b) => a.fechaGasto.localeCompare(b.fechaGasto));
    }, [gastos, mesSeleccionado, anioSeleccionado]);

    const totalMes = revisadosMes.reduce((acc, g) => acc + (g.monto || 0), 0);

    // Meses disponibles con datos
    const mesesDisponibles = useMemo(() => {
        const meses = {};
        gastos.forEach(g => {
            if (g.estado !== "revisado" || !g.fechaGasto) return;
            const key = g.fechaGasto.substring(0, 7); // "YYYY-MM"
            if (!meses[key]) meses[key] = { key, total: 0, count: 0 };
            meses[key].total += (g.monto || 0);
            meses[key].count++;
        });
        return Object.values(meses).sort((a, b) => a.key.localeCompare(b.key));
    }, [gastos]);

    const totalAcumulado = useMemo(() => {
        if (mesesAcumulado.length === 0) return null;
        return mesesAcumulado.reduce((acc, mesKey) => {
            const found = mesesDisponibles.find(m => m.key === mesKey);
            return acc + (found ? found.total : 0);
        }, 0);
    }, [mesesAcumulado, mesesDisponibles]);

    const toggleMesAcumulado = (mesKey) => {
        setMesesAcumulado(prev =>
            prev.includes(mesKey) ? prev.filter(m => m !== mesKey) : [...prev, mesKey]
        );
    };

    const formatMesKey = (key) => {
        const [y, m] = key.split("-");
        return `${MESES[parseInt(m) - 1].substring(0, 3)} ${y}`;
    };

    const lista = vista === "pendientes" ? pendientes : revisadosMes;

    const mesAnterior = () => {
        if (mesSeleccionado === 0) { setMesSeleccionado(11); setAnioSeleccionado(a => a - 1); }
        else setMesSeleccionado(m => m - 1);
    };
    const mesSiguiente = () => {
        if (mesSeleccionado === 11) { setMesSeleccionado(0); setAnioSeleccionado(a => a + 1); }
        else setMesSeleccionado(m => m + 1);
    };

    const formatFecha = (f) => {
        if (!f) return "—";
        const [y, m, d] = f.split("-");
        return `${parseInt(d)} ${MESES[parseInt(m) - 1].substring(0, 3)} ${y}`;
    };

    const formatMoneda = (n) => {
        if (n == null) return "—";
        return `$${parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const abrirGasto = (g) => {
        setGastoSeleccionado(g);
        setEditMonto(g.monto ? g.monto.toString() : "");
        setEditConcepto(g.concepto || "");
        setEditFecha(g.fechaGasto || new Date().toISOString().split("T")[0]);
        setEditCategoria(g.categoria || "");
        setEditMetodo(g.metodoPago || "");
    };

    if (loading) return <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-gray-400 text-2xl" /></div>;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-gray-800">Gastos</h2>
                <div className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" id="foto-gasto" />
                    {(comprimiendo || subiendo) ? (
                        <span className="text-sm text-gray-500 flex items-center gap-2"><FaSpinner className="animate-spin" /> {comprimiendo ? "Detectando recibo..." : "Subiendo..."}</span>
                    ) : (
                        <label htmlFor="foto-gasto" className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded text-xs font-bold cursor-pointer hover:bg-gray-700">
                            <FaCamera /> Subir Foto
                        </label>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-200">
                <button
                    onClick={() => setVista("pendientes")}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                        vista === "pendientes" ? "border-gray-800 text-gray-800" : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                >
                    Pendientes {pendientes.length > 0 && `(${pendientes.length})`}
                </button>
                <button
                    onClick={() => setVista("revisados")}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                        vista === "revisados" ? "border-gray-800 text-gray-800" : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                >
                    Revisados
                </button>
            </div>

            {/* Acumulado de meses */}
            {vista === "revisados" && mesesDisponibles.length > 0 && (
                <div className="mb-3 bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 uppercase font-bold mb-2">Acumulado por meses</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {mesesDisponibles.map(m => (
                            <button
                                key={m.key}
                                onClick={() => toggleMesAcumulado(m.key)}
                                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                                    mesesAcumulado.includes(m.key)
                                        ? "bg-gray-800 text-white"
                                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
                                }`}
                            >
                                {formatMesKey(m.key)}
                            </button>
                        ))}
                    </div>
                    {totalAcumulado !== null && mesesAcumulado.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-[11px] text-gray-400">
                                {mesesAcumulado.length} {mesesAcumulado.length === 1 ? "mes" : "meses"} seleccionados
                            </span>
                            <span className="text-sm font-black text-gray-800">{formatMoneda(totalAcumulado)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Selector de mes + Excel para revisados */}
            {vista === "revisados" && (
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                        <button onClick={mesAnterior} className="p-1 hover:bg-gray-100 rounded">
                            <FaChevronLeft size={11} className="text-gray-500" />
                        </button>
                        <span className="text-sm font-bold text-gray-700">
                            {MESES[mesSeleccionado]} {anioSeleccionado}
                        </span>
                        <button onClick={mesSiguiente} className="p-1 hover:bg-gray-100 rounded">
                            <FaChevronRight size={11} className="text-gray-500" />
                        </button>
                    </div>
                    {revisadosMes.length > 0 && (
                        <button onClick={exportarExcel} className="flex items-center gap-1 text-xs text-green-700 font-bold hover:bg-green-50 px-2 py-1 rounded" title="Exportar Excel">
                            <FaFileExcel size={13} /> Excel
                        </button>
                    )}
                </div>
            )}

            {/* Tabla */}
            {lista.length === 0 ? (
                <p className="text-gray-400 text-sm py-10 text-center">
                    {vista === "pendientes" ? "No hay gastos pendientes" : `Sin gastos en ${MESES[mesSeleccionado]}`}
                </p>
            ) : (
                <>
                    <table className={`w-full ${vista === "revisados" ? "text-[11px]" : "text-[13px]"}`}>
                        <thead>
                            <tr className="text-left text-[10px] text-gray-400 uppercase border-b border-gray-200">
                                {vista === "pendientes" && <th className="pb-1 pl-1 font-medium w-10"></th>}
                                <th className="pb-1 font-medium">Concepto</th>
                                {vista === "revisados" && <th className="pb-1 font-medium">Categoria</th>}
                                <th className="pb-1 font-medium">Fecha</th>
                                {vista === "revisados" && <th className="pb-1 font-medium">Pago</th>}
                                {vista === "pendientes" && <th className="pb-1 font-medium">Subido por</th>}
                                <th className="pb-1 text-right font-medium">Monto</th>
                                <th className="pb-1 w-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((g) => (
                                <tr
                                    key={g.id}
                                    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-200 ${vista === "revisados" ? "leading-tight" : ""}`}
                                    onClick={() => abrirGasto(g)}
                                >
                                    {vista === "pendientes" && (
                                        <td className="py-2 pl-1">
                                            <img src={g.imagenUrl} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" loading="lazy" />
                                        </td>
                                    )}
                                    <td className={`${vista === "revisados" ? "py-1" : "py-2"} text-gray-800 font-medium truncate max-w-[180px]`}>
                                        {g.concepto || <span className="text-gray-300 italic font-normal">Sin concepto</span>}
                                    </td>
                                    {vista === "revisados" && (
                                        <td className="py-1 text-gray-500 truncate max-w-[120px]">{g.categoria || "—"}</td>
                                    )}
                                    <td className={`${vista === "revisados" ? "py-1" : "py-2"} text-gray-500 whitespace-nowrap`}>{formatFecha(g.fechaGasto)}</td>
                                    {vista === "revisados" && (
                                        <td className="py-1 text-gray-500">{g.metodoPago || "—"}</td>
                                    )}
                                    {vista === "pendientes" && (
                                        <td className="py-2 text-gray-500 truncate max-w-[100px]">{g.creadoPor?.nombre}</td>
                                    )}
                                    <td className={`${vista === "revisados" ? "py-1" : "py-2"} text-right font-bold text-gray-800 whitespace-nowrap`}>{formatMoneda(g.monto)}</td>
                                    <td className={`${vista === "revisados" ? "py-1" : "py-2"} pr-1 text-center`}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEliminar(g); }}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                                            title="Eliminar"
                                        >
                                            <FaTimes size={9} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {vista === "revisados" && revisadosMes.length > 0 && (
                        <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-gray-200 pr-1">
                            <span className="text-[11px] text-gray-400 uppercase">Total {MESES[mesSeleccionado]}</span>
                            <span className="text-sm font-black text-gray-800">{formatMoneda(totalMes)}</span>
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {gastoSeleccionado && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setGastoSeleccionado(null)}>
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                            <img
                                src={gastoSeleccionado.imagenUrl} alt=""
                                className="w-full max-h-60 object-contain bg-gray-50 rounded-t-xl cursor-pointer"
                                onClick={() => setImagenGrande(gastoSeleccionado.imagenUrl)}
                            />
                            <button onClick={() => setGastoSeleccionado(null)} className="absolute top-2 right-2 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60">
                                <FaTimes size={12} />
                            </button>
                            <div className="absolute bottom-2 right-2 flex gap-1.5">
                                <button
                                    onClick={handleRecortarManual}
                                    disabled={recortando}
                                    className="bg-black/40 text-white px-2 py-1.5 rounded-full hover:bg-black/60 flex items-center gap-1 text-[10px] font-bold"
                                    title="Auto-recortar recibo"
                                >
                                    {recortando ? <FaSpinner className="animate-spin" size={11} /> : <FaCrop size={11} />}
                                    {recortando ? "Recortando..." : "Auto-recortar"}
                                </button>
                                <button onClick={() => setImagenGrande(gastoSeleccionado.imagenUrl)} className="bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60">
                                    <FaEye size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-400 mb-3">Subido por {gastoSeleccionado.creadoPor?.nombre}</p>

                            {gastoSeleccionado.estado === "revisado" && (
                                <div className="mb-4 text-sm">
                                    <p className="text-gray-800 font-bold">{gastoSeleccionado.concepto}</p>
                                    <p className="text-gray-500">
                                        {formatFecha(gastoSeleccionado.fechaGasto)} &middot; {gastoSeleccionado.categoria} &middot; {gastoSeleccionado.metodoPago} &middot; {formatMoneda(gastoSeleccionado.monto)}
                                    </p>
                                </div>
                            )}

                            <div className="border-t border-gray-100 pt-3">
                                <div className="mb-2">
                                    <label className="block text-[11px] text-gray-400 mb-1">Concepto *</label>
                                    <input type="text" value={editConcepto} onChange={(e) => setEditConcepto(e.target.value)}
                                        placeholder="Pago de luz, Gasolina..." className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400" />
                                </div>
                                <div className="mb-2">
                                    <label className="block text-[11px] text-gray-400 mb-1">Categoria *</label>
                                    <select value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)}
                                        className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400">
                                        <option value="">Seleccionar...</option>
                                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Monto *</label>
                                        <input type="number" step="0.01" value={editMonto} onChange={(e) => setEditMonto(e.target.value)}
                                            placeholder="0.00" className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Fecha *</label>
                                        <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)}
                                            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Pago *</label>
                                        <select value={editMetodo} onChange={(e) => setEditMetodo(e.target.value)}
                                            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400">
                                            <option value="">...</option>
                                            {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleRevisar} disabled={guardando}
                                        className="flex-1 bg-gray-800 text-white py-1.5 rounded text-xs font-bold hover:bg-gray-700 disabled:bg-gray-300 flex items-center justify-center gap-1">
                                        {guardando ? <FaSpinner className="animate-spin" size={10} /> : <FaCheck size={10} />}
                                        {gastoSeleccionado.estado === "revisado" ? "Actualizar" : "Confirmar"}
                                    </button>
                                    <button onClick={() => handleEliminar(gastoSeleccionado)}
                                        className="text-red-500 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50">
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {imagenGrande && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setImagenGrande(null)}>
                    <img src={imagenGrande} alt="" className="max-w-full max-h-full object-contain" />
                    <button onClick={() => setImagenGrande(null)} className="absolute top-4 right-4 bg-white/20 text-white p-2 rounded-full hover:bg-white/40">
                        <FaTimes size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Gastos;
