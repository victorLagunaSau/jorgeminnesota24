import React, { useState, useEffect, useRef } from "react";
import firebase from "firebase/app";
import "firebase/firestore";
import { storage } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaPlus, FaTrash, FaChevronDown, FaChevronRight, FaFilePdf, FaUpload, FaExternalLinkAlt } from "react-icons/fa";

const EMPLEADOS = [
    { id: "cristela", nombre: "Cristela Govea", email: "goveacristela@gmail.com", sueldoSemanal: 500 },
    { id: "olivia", nombre: "Olivia Cervantes", email: "olivia_cervantes@hotmail.com", sueldoSemanal: 500 },
    { id: "adela", nombre: "Adela Arizmendi", email: "adelaarizmendi1976@icloud.com", sueldoSemanal: 1000 },
    { id: "jorge", nombre: "Jorge Martinez", email: "jorgeminnesota19@gmail.com", sueldoSemanal: 1000 },
];

// Genera semanas lunes-sábado para un mes dado
const getSemanasDelMes = (anio, mes) => {
    const semanas = [];
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);

    // Encontrar el primer lunes (puede ser del mes anterior)
    let lunes = new Date(primerDia);
    const dia = lunes.getDay();
    if (dia !== 1) {
        // Retroceder al lunes más cercano
        const diff = dia === 0 ? 6 : dia - 1;
        lunes.setDate(lunes.getDate() - diff);
    }

    let numSemana = 1;
    while (lunes <= ultimoDia) {
        const sabado = new Date(lunes);
        sabado.setDate(lunes.getDate() + 5);

        const inicioLabel = lunes.getDate() + " " + lunes.toLocaleDateString("es-MX", { month: "short" });
        const finLabel = sabado.getDate() + " " + sabado.toLocaleDateString("es-MX", { month: "short" });

        semanas.push({
            num: numSemana,
            label: `Semana ${numSemana}: ${inicioLabel} - ${finLabel}`,
            inicio: new Date(lunes),
            fin: new Date(sabado.getFullYear(), sabado.getMonth(), sabado.getDate(), 23, 59, 59, 999),
            key: `${anio}-${String(mes).padStart(2, "0")}-S${numSemana}`,
        });

        lunes = new Date(lunes);
        lunes.setDate(lunes.getDate() + 7);
        numSemana++;
    }
    return semanas;
};

const Empleados = () => {
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [empleadoExpandido, setEmpleadoExpandido] = useState(null);
    const [modalPago, setModalPago] = useState({ show: false, empleado: null });
    const [formPago, setFormPago] = useState({ monto: "", concepto: "Sueldo semanal", nota: "" });
    const [archivoPago, setArchivoPago] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [confirmEliminar, setConfirmEliminar] = useState(null);
    const [subiendoPdf, setSubiendoPdf] = useState(null);
    const fileInputRef = useRef(null);
    const fileInputSubirRef = useRef(null);
    const [filtroMes, setFiltroMes] = useState(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    });
    const [filtroSemana, setFiltroSemana] = useState("todas");

    // Calcular semanas del mes seleccionado
    const [anioSel, mesSel] = filtroMes.split("-").map(Number);
    const semanasDelMes = getSemanasDelMes(anioSel, mesSel);
    const semanaActiva = semanasDelMes.find(s => s.key === filtroSemana) || null;

    useEffect(() => {
        const unsub = firebase.firestore()
            .collection(COLLECTIONS.PAGOS_NOMINA)
            .orderBy("fecha", "desc")
            .onSnapshot(snap => {
                setPagos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            });
        return () => unsub();
    }, []);

    const subirPdf = async (archivo, empleadoId, pagoId) => {
        const ref = storage().ref(`nominas/${empleadoId}/${pagoId}_${archivo.name}`);
        await ref.put(archivo);
        return await ref.getDownloadURL();
    };

    const registrarPago = async () => {
        if (!formPago.monto || parseFloat(formPago.monto) <= 0) return;
        setGuardando(true);
        try {
            const pagoData = {
                empleadoId: modalPago.empleado.id,
                empleadoNombre: modalPago.empleado.nombre,
                monto: parseFloat(formPago.monto),
                concepto: formPago.concepto,
                nota: formPago.nota,
                fecha: new Date(),
                semana: semanaActiva ? semanaActiva.key : null,
                semanaLabel: semanaActiva ? semanaActiva.label : null,
            };

            const docRef = await firebase.firestore().collection(COLLECTIONS.PAGOS_NOMINA).add(pagoData);

            // Subir PDF si se adjuntó
            if (archivoPago) {
                const url = await subirPdf(archivoPago, modalPago.empleado.id, docRef.id);
                await docRef.update({ archivoUrl: url, archivoNombre: archivoPago.name });
            }

            setModalPago({ show: false, empleado: null });
            setFormPago({ monto: "", concepto: "Sueldo semanal", nota: "" });
            setArchivoPago(null);
        } catch (err) {
            alert("Error al registrar pago: " + err.message);
        } finally {
            setGuardando(false);
        }
    };

    const subirPdfAPago = async (pagoId, empleadoId, archivo) => {
        setSubiendoPdf(pagoId);
        try {
            const url = await subirPdf(archivo, empleadoId, pagoId);
            await firebase.firestore().collection(COLLECTIONS.PAGOS_NOMINA).doc(pagoId).update({
                archivoUrl: url,
                archivoNombre: archivo.name
            });
        } catch (err) {
            alert("Error al subir archivo: " + err.message);
        } finally {
            setSubiendoPdf(null);
        }
    };

    const eliminarPago = async (pagoId) => {
        try {
            await firebase.firestore().collection(COLLECTIONS.PAGOS_NOMINA).doc(pagoId).delete();
            setConfirmEliminar(null);
        } catch (err) {
            alert("Error al eliminar: " + err.message);
        }
    };

    const getPagosEmpleado = (empleadoId) => {
        return pagos.filter(p => {
            if (p.empleadoId !== empleadoId) return false;
            const fecha = p.fecha?.toDate ? p.fecha.toDate() : new Date(p.fecha);
            // Filtro por mes
            if (fecha.getFullYear() !== anioSel || fecha.getMonth() + 1 !== mesSel) return false;
            // Filtro por semana
            if (semanaActiva) {
                return fecha >= semanaActiva.inicio && fecha <= semanaActiva.fin;
            }
            return true;
        });
    };

    const getTotalEmpleado = (empleadoId) => {
        return getPagosEmpleado(empleadoId).reduce((acc, p) => acc + (p.monto || 0), 0);
    };

    const getTotalGeneral = () => {
        return EMPLEADOS.reduce((acc, e) => acc + getTotalEmpleado(e.id), 0);
    };

    const getTotalPagosAllTime = (empleadoId) => {
        return pagos.filter(p => p.empleadoId === empleadoId).reduce((acc, p) => acc + (p.monto || 0), 0);
    };

    // Total acumulado del año actual
    const getTotalAnio = () => {
        const anioActual = new Date().getFullYear();
        return pagos.filter(p => {
            const fecha = p.fecha?.toDate ? p.fecha.toDate() : new Date(p.fecha);
            return fecha.getFullYear() === anioActual;
        }).reduce((acc, p) => acc + (p.monto || 0), 0);
    };

    const formatFecha = (fecha) => {
        const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
        return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const mesLabel = () => {
        const [anio, mes] = filtroMes.split("-").map(Number);
        const d = new Date(anio, mes - 1);
        return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    };

    const nominaSemanal = EMPLEADOS.reduce((a, e) => a + e.sueldoSemanal, 0);

    if (loading) {
        return <div className="flex justify-center py-20"><div className="loading loading-spinner loading-lg text-gray-400"></div></div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Empleados</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Control de pagos y nomina</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={filtroMes}
                        onChange={(e) => { setFiltroMes(e.target.value); setFiltroSemana("todas"); }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 focus:border-gray-400 focus:outline-none"
                    />
                </div>
            </div>

            {/* Selector de semanas */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setFiltroSemana("todas")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${filtroSemana === "todas" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >
                    Todo el mes
                </button>
                {semanasDelMes.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setFiltroSemana(s.key)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${filtroSemana === s.key ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Resumen */}
            <div className="flex flex-wrap gap-6 mb-8 pb-6 border-b border-gray-100">
                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Pagado {semanaActiva ? `semana ${semanaActiva.num}` : mesLabel()}</p>
                    <p className="text-2xl font-black text-gray-800 mt-0.5">${getTotalGeneral().toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Nomina semanal</p>
                    <p className="text-2xl font-black text-gray-800 mt-0.5">${nominaSemanal.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Acumulado {new Date().getFullYear()}</p>
                    <p className="text-2xl font-black text-gray-800 mt-0.5">${getTotalAnio().toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Empleados</p>
                    <p className="text-2xl font-black text-gray-800 mt-0.5">{EMPLEADOS.length}</p>
                </div>
            </div>

            {/* Lista de empleados */}
            <div className="space-y-2">
                {EMPLEADOS.map(emp => {
                    const pagosEmp = getPagosEmpleado(emp.id);
                    const totalMes = getTotalEmpleado(emp.id);
                    const totalHistorico = getTotalPagosAllTime(emp.id);
                    const expandido = empleadoExpandido === emp.id;

                    return (
                        <div key={emp.id} className={`border rounded-lg overflow-hidden transition-colors ${expandido ? 'border-gray-300 bg-white' : 'border-gray-100 bg-white'}`}>
                            {/* Header empleado */}
                            <div
                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setEmpleadoExpandido(expandido ? null : emp.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                                        {emp.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{emp.nombre}</p>
                                        <p className="text-[11px] text-gray-400">{emp.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] text-gray-400">Semanal</p>
                                        <p className="font-bold text-gray-600 text-sm">${emp.sueldoSemanal}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400">Este mes</p>
                                        <p className="font-bold text-gray-800 text-sm">${totalMes.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] text-gray-400">Total historico</p>
                                        <p className="font-bold text-gray-500 text-sm">${totalHistorico.toLocaleString()}</p>
                                    </div>
                                    {expandido ? <FaChevronDown size={10} className="text-gray-300" /> : <FaChevronRight size={10} className="text-gray-300" />}
                                </div>
                            </div>

                            {/* Detalle expandido */}
                            {expandido && (
                                <div className="border-t border-gray-100 px-4 py-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[11px] text-gray-400 font-semibold">Pagos - {semanaActiva ? `Semana ${semanaActiva.num} (${semanaActiva.label.split(": ")[1]})` : mesLabel()}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFormPago({ monto: String(emp.sueldoSemanal), concepto: "Sueldo semanal", nota: "" });
                                                setArchivoPago(null);
                                                setModalPago({ show: true, empleado: emp });
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-[11px] font-semibold transition-colors"
                                        >
                                            <FaPlus size={9} /> Registrar Pago
                                        </button>
                                    </div>

                                    {pagosEmp.length === 0 ? (
                                        <p className="text-center text-gray-300 text-sm py-6">Sin pagos este mes</p>
                                    ) : (
                                        <table className="w-full text-[12px]">
                                            <thead>
                                                <tr className="text-gray-400 text-[10px] uppercase border-b border-gray-100">
                                                    <td className="py-2 px-1">Fecha</td>
                                                    <td className="py-2 px-1">Concepto</td>
                                                    <td className="py-2 px-1">Nota</td>
                                                    <td className="py-2 px-1 text-right">Monto</td>
                                                    <td className="py-2 px-1 text-center">PDF</td>
                                                    <td className="py-2 px-1 w-8"></td>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagosEmp.map(p => (
                                                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                        <td className="py-2 px-1 text-gray-500">{formatFecha(p.fecha)}</td>
                                                        <td className="py-2 px-1 font-semibold text-gray-700">{p.concepto}</td>
                                                        <td className="py-2 px-1 text-gray-400">{p.nota || "-"}</td>
                                                        <td className="py-2 px-1 text-right font-bold text-gray-800">${p.monto.toLocaleString()}</td>
                                                        <td className="py-2 px-1 text-center">
                                                            {subiendoPdf === p.id ? (
                                                                <span className="loading loading-spinner loading-xs text-gray-400"></span>
                                                            ) : p.archivoUrl ? (
                                                                <a href={p.archivoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors" title={p.archivoNombre}>
                                                                    <FaFilePdf size={13} />
                                                                    <FaExternalLinkAlt size={8} />
                                                                </a>
                                                            ) : (
                                                                <>
                                                                    <input
                                                                        type="file"
                                                                        accept=".pdf"
                                                                        className="hidden"
                                                                        ref={el => { if (subiendoPdf === `ref-${p.id}`) fileInputSubirRef.current = el; }}
                                                                        onChange={(e) => {
                                                                            if (e.target.files[0]) subirPdfAPago(p.id, p.empleadoId, e.target.files[0]);
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            const input = document.createElement('input');
                                                                            input.type = 'file';
                                                                            input.accept = '.pdf';
                                                                            input.onchange = (e) => {
                                                                                if (e.target.files[0]) subirPdfAPago(p.id, p.empleadoId, e.target.files[0]);
                                                                            };
                                                                            input.click();
                                                                        }}
                                                                        className="text-gray-300 hover:text-gray-500 transition-colors"
                                                                        title="Subir comprobante PDF"
                                                                    >
                                                                        <FaUpload size={11} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-1 text-center">
                                                            {confirmEliminar === p.id ? (
                                                                <div className="flex gap-1 justify-center">
                                                                    <button onClick={() => eliminarPago(p.id)} className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-semibold">Si</button>
                                                                    <button onClick={() => setConfirmEliminar(null)} className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-semibold">No</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setConfirmEliminar(p.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                                                                    <FaTrash size={10} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t border-gray-200">
                                                    <td colSpan={3} className="py-2 px-1 text-right text-[10px] text-gray-400 uppercase font-semibold">Total</td>
                                                    <td className="py-2 px-1 text-right font-bold text-gray-800">${totalMes.toLocaleString()}</td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal registrar pago */}
            {modalPago.show && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setModalPago({ show: false, empleado: null }); setArchivoPago(null); }}>
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-sm font-black text-gray-800 uppercase">Registrar Pago</h3>
                        <p className="text-[11px] text-gray-400 mb-4">{modalPago.empleado.nombre} — ${modalPago.empleado.sueldoSemanal}/semana</p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase block mb-1">Monto</label>
                                <input
                                    type="number"
                                    value={formPago.monto}
                                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-bold text-lg focus:border-gray-400 focus:outline-none"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase block mb-1">Concepto</label>
                                <select
                                    value={formPago.concepto}
                                    onChange={(e) => setFormPago({ ...formPago, concepto: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-semibold text-sm focus:border-gray-400 focus:outline-none"
                                >
                                    <option>Sueldo semanal</option>
                                    <option>Bono</option>
                                    <option>Adelanto</option>
                                    <option>Horas extra</option>
                                    <option>Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase block mb-1">Nota (opcional)</label>
                                <input
                                    type="text"
                                    value={formPago.nota}
                                    onChange={(e) => setFormPago({ ...formPago, nota: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:outline-none"
                                    placeholder="Ej: Semana del 1 al 7 mayo"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase block mb-1">Comprobante PDF (opcional)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => setArchivoPago(e.target.files[0] || null)}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`w-full px-3 py-2 border border-dashed rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${archivoPago ? 'border-gray-400 bg-gray-50 text-gray-700' : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'}`}
                                >
                                    <FaFilePdf size={12} />
                                    {archivoPago ? archivoPago.name : "Seleccionar archivo..."}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => { setModalPago({ show: false, empleado: null }); setArchivoPago(null); }}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={registrarPago}
                                disabled={guardando || !formPago.monto || parseFloat(formPago.monto) <= 0}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                {guardando ? "Guardando..." : `Pagar $${formPago.monto || "0"}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Empleados;
