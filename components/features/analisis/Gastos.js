import React, { useState, useEffect, useRef, useMemo } from "react";
import { firestore, storage } from "../../../firebase/firebaseIni";
import { useAuthContext } from "../../../context/auth";
import imageCompression from "browser-image-compression";
import { FaCamera, FaTimes, FaCheck, FaSpinner, FaTrash, FaEye, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const Gastos = () => {
    const { user } = useAuthContext();
    const isAdminMaster = user?.adminMaster === true;
    const fileInputRef = useRef(null);

    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subiendo, setSubiendo] = useState(false);
    const [comprimiendo, setComprimiendo] = useState(false);
    const [vista, setVista] = useState("pendientes");

    // Mes seleccionado para revisados
    const hoy = new Date();
    const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
    const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());

    // Modal
    const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
    const [editMonto, setEditMonto] = useState("");
    const [editConcepto, setEditConcepto] = useState("");
    const [editFecha, setEditFecha] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [imagenGrande, setImagenGrande] = useState(null);

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
            archivoFinal = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 2000, useWebWorker: true, fileType: "image/webp" });
        } catch {
            try { archivoFinal = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 2000, useWebWorker: true }); }
            catch { alert("Error al comprimir."); setComprimiendo(false); return; }
        }
        setComprimiendo(false);
        setSubiendo(true);
        try {
            const ts = Date.now();
            const ext = archivoFinal.type === "image/webp" ? "webp" : "jpg";
            const path = `gastos/${ts}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
            const ref = storage().ref(path);
            await ref.put(archivoFinal);
            const url = await ref.getDownloadURL();
            await firestore().collection("gastos").add({
                imagenUrl: url, imagenPath: path, estado: "pendiente",
                monto: null, concepto: null, fechaGasto: null,
                creadoPor: { nombre: user?.nombre || user?.email || "Usuario", id: user?.uid || "" },
                fechaCreacion: firestore.FieldValue.serverTimestamp(),
                revisadoPor: null, fechaRevision: null,
            });
        } catch { alert("Error al subir."); }
        setSubiendo(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRevisar = async () => {
        if (!gastoSeleccionado) return;
        if (!editMonto || parseFloat(editMonto) <= 0) return alert("Ingresa un monto.");
        if (!editConcepto.trim()) return alert("Escribe el concepto.");
        if (!editFecha) return alert("Selecciona la fecha.");
        setGuardando(true);
        try {
            await firestore().collection("gastos").doc(gastoSeleccionado.id).update({
                monto: parseFloat(editMonto), concepto: editConcepto.trim(),
                fechaGasto: editFecha, estado: "revisado",
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

    const pendientes = gastos.filter(g => g.estado === "pendiente");

    // Revisados filtrados por mes/anio y ordenados por fecha del gasto
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

    if (loading) return <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-gray-400 text-2xl" /></div>;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-gray-800">Gastos</h2>
                <div className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" id="foto-gasto" />
                    {(comprimiendo || subiendo) ? (
                        <span className="text-sm text-gray-500 flex items-center gap-2"><FaSpinner className="animate-spin" /> {comprimiendo ? "Comprimiendo..." : "Subiendo..."}</span>
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

            {/* Selector de mes para revisados */}
            {vista === "revisados" && (
                <div className="flex items-center justify-between mb-4">
                    <button onClick={mesAnterior} className="p-2 hover:bg-gray-100 rounded transition-colors">
                        <FaChevronLeft size={12} className="text-gray-500" />
                    </button>
                    <span className="text-sm font-bold text-gray-700">
                        {MESES[mesSeleccionado]} {anioSeleccionado}
                    </span>
                    <button onClick={mesSiguiente} className="p-2 hover:bg-gray-100 rounded transition-colors">
                        <FaChevronRight size={12} className="text-gray-500" />
                    </button>
                </div>
            )}

            {/* Tabla */}
            {lista.length === 0 ? (
                <p className="text-gray-400 text-sm py-10 text-center">
                    {vista === "pendientes" ? "No hay gastos pendientes" : `Sin gastos en ${MESES[mesSeleccionado]}`}
                </p>
            ) : (
                <>
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="text-left text-[11px] text-gray-400 uppercase border-b border-gray-200">
                                <th className="pb-2 pl-1 font-medium w-12"></th>
                                <th className="pb-2 font-medium">Concepto</th>
                                <th className="pb-2 font-medium">Fecha</th>
                                <th className="pb-2 font-medium">Subido por</th>
                                <th className="pb-2 text-right font-medium">Monto</th>
                                {isAdminMaster && <th className="pb-2 w-8"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((g) => (
                                <tr
                                    key={g.id}
                                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-200"
                                    onClick={() => {
                                        setGastoSeleccionado(g);
                                        setEditMonto(g.monto ? g.monto.toString() : "");
                                        setEditConcepto(g.concepto || "");
                                        setEditFecha(g.fechaGasto || new Date().toISOString().split("T")[0]);
                                    }}
                                >
                                    <td className="py-2.5 pl-1">
                                        <img src={g.imagenUrl} alt="" className="w-9 h-9 rounded object-cover bg-gray-100" loading="lazy" />
                                    </td>
                                    <td className="py-2.5 text-gray-800 font-medium truncate max-w-[200px]">
                                        {g.concepto || <span className="text-gray-300 italic font-normal">Sin concepto</span>}
                                    </td>
                                    <td className="py-2.5 text-gray-500 whitespace-nowrap">{formatFecha(g.fechaGasto)}</td>
                                    <td className="py-2.5 text-gray-500 truncate max-w-[120px]">{g.creadoPor?.nombre}</td>
                                    <td className="py-2.5 text-right font-bold text-gray-800 whitespace-nowrap">{formatMoneda(g.monto)}</td>
                                    {isAdminMaster && (
                                        <td className="py-2.5 pr-1 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEliminar(g); }}
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                title="Eliminar"
                                            >
                                                <FaTimes size={10} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {vista === "revisados" && revisadosMes.length > 0 && (
                        <div className="flex justify-end items-center gap-3 mt-3 pt-3 border-t border-gray-200 pr-1">
                            <span className="text-xs text-gray-400 uppercase">Total {MESES[mesSeleccionado]}</span>
                            <span className="text-base font-black text-gray-800">{formatMoneda(totalMes)}</span>
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
                            <button onClick={() => setImagenGrande(gastoSeleccionado.imagenUrl)} className="absolute bottom-2 right-2 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60">
                                <FaEye size={12} />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-400 mb-3">Subido por {gastoSeleccionado.creadoPor?.nombre}</p>
                            {gastoSeleccionado.estado === "revisado" && (
                                <div className="mb-4 text-sm">
                                    <p className="text-gray-800 font-bold">{gastoSeleccionado.concepto}</p>
                                    <p className="text-gray-500">{formatFecha(gastoSeleccionado.fechaGasto)} &middot; {formatMoneda(gastoSeleccionado.monto)}</p>
                                </div>
                            )}
                            {isAdminMaster && (
                                <div className="border-t border-gray-100 pt-3">
                                    <div className="mb-2">
                                        <label className="block text-[11px] text-gray-400 mb-1">Concepto *</label>
                                        <input type="text" value={editConcepto} onChange={(e) => setEditConcepto(e.target.value)}
                                            placeholder="Pago de luz, Gasolina..." className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
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
                            )}
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
