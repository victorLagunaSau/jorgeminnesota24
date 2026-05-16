import React, { useState, useEffect, useRef } from "react";
import firebase from "firebase/app";
import "firebase/firestore";
import { storage } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { FaPlus, FaTrash, FaFilePdf, FaUpload, FaExternalLinkAlt } from "react-icons/fa";

const EMPLEADOS = [
    { id: "cristela", nombre: "Cristela Govea", email: "goveacristela@gmail.com", sueldoSemanal: 500 },
    { id: "olivia", nombre: "Olivia Cervantes", email: "olivia_cervantes@hotmail.com", sueldoSemanal: 500 },
    { id: "adela", nombre: "Adela Arizmendi", email: "adelaarizmendi1976@icloud.com", sueldoSemanal: 1000 },
    { id: "jorge", nombre: "Jorge Martinez", email: "jorgeminnesota19@gmail.com", sueldoSemanal: 1000 },
];

// Genera semanas para un mes. La primera semana arranca el 1ro del mes, las demás lunes-sábado.
const getSemanasDelMes = (anio, mes) => {
    const semanas = [];
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);

    // Encontrar el primer lunes del mes
    let lunes = new Date(primerDia);
    const dia = lunes.getDay();
    if (dia !== 1) {
        const avance = dia === 0 ? 1 : 8 - dia;
        lunes.setDate(lunes.getDate() + avance);
    }

    // Semana 1: del 1ro del mes hasta el primer sábado (después del primer lunes)
    const primerSabado = new Date(lunes);
    primerSabado.setDate(lunes.getDate() + 5);

    const fmt = (d) => d.getDate() + " " + d.toLocaleDateString("es-MX", { month: "short" });

    semanas.push({
        num: 1,
        label: `Semana 1: ${fmt(primerDia)} - ${fmt(primerSabado)}`,
        inicio: new Date(primerDia),
        fin: new Date(primerSabado.getFullYear(), primerSabado.getMonth(), primerSabado.getDate(), 23, 59, 59, 999),
        key: `${anio}-${String(mes).padStart(2, "0")}-S1`,
    });

    // Semanas siguientes: lunes-sábado mientras el lunes caiga en el mes
    lunes.setDate(lunes.getDate() + 7);
    let numSemana = 2;
    while (lunes.getMonth() + 1 === mes) {
        const sabado = new Date(lunes);
        sabado.setDate(lunes.getDate() + 5);
        semanas.push({
            num: numSemana,
            label: `Semana ${numSemana}: ${fmt(lunes)} - ${fmt(sabado)}`,
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

// Determinar en qué semana cae una fecha
const getSemanaParaFecha = (fecha, anio, mes) => {
    const semanas = getSemanasDelMes(anio, mes);
    for (const s of semanas) {
        if (fecha >= s.inicio && fecha <= s.fin) return s;
    }
    return semanas[semanas.length - 1] || null;
};

const Empleados = () => {
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalPago, setModalPago] = useState({ show: false, empleado: null });
    const [formPago, setFormPago] = useState({ monto: "", concepto: "Sueldo semanal", nota: "", fecha: "" });
    const [archivoPago, setArchivoPago] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [confirmEliminar, setConfirmEliminar] = useState(null);
    const [subiendoPdf, setSubiendoPdf] = useState(null);
    const fileInputRef = useRef(null);
    const [filtroMes, setFiltroMes] = useState(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    });

    const [anioSel, mesSel] = filtroMes.split("-").map(Number);
    const semanasDelMes = getSemanasDelMes(anioSel, mesSel);

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
            const fechaPago = formPago.fecha ? new Date(formPago.fecha + "T12:00:00") : new Date();
            const fAnio = fechaPago.getFullYear();
            const fMes = fechaPago.getMonth() + 1;
            const semana = getSemanaParaFecha(fechaPago, fAnio, fMes);

            const pagoData = {
                empleadoId: modalPago.empleado.id,
                empleadoNombre: modalPago.empleado.nombre,
                monto: parseFloat(formPago.monto),
                concepto: formPago.concepto,
                nota: formPago.nota,
                fecha: fechaPago,
                semana: semana ? semana.key : `${fAnio}-${String(fMes).padStart(2, "0")}-S1`,
                semanaLabel: semana ? semana.label : null,
            };

            const docRef = await firebase.firestore().collection(COLLECTIONS.PAGOS_NOMINA).add(pagoData);

            if (archivoPago) {
                const url = await subirPdf(archivoPago, modalPago.empleado.id, docRef.id);
                await docRef.update({ archivoUrl: url, archivoNombre: archivoPago.name });
            }

            setModalPago({ show: false, empleado: null });
            setFormPago({ monto: "", concepto: "Sueldo semanal", nota: "", fecha: "" });
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

    const editarFechaPago = async (pagoId, nuevaFechaStr) => {
        try {
            const nuevaFecha = new Date(nuevaFechaStr + "T12:00:00");
            const fAnio = nuevaFecha.getFullYear();
            const fMes = nuevaFecha.getMonth() + 1;
            const semana = getSemanaParaFecha(nuevaFecha, fAnio, fMes);
            await firebase.firestore().collection(COLLECTIONS.PAGOS_NOMINA).doc(pagoId).update({
                fecha: nuevaFecha,
                semana: semana ? semana.key : `${fAnio}-${String(fMes).padStart(2, "0")}-S1`,
                semanaLabel: semana ? semana.label : null,
            });
        } catch (err) {
            alert("Error al actualizar fecha: " + err.message);
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
            if (p.semana) {
                const [sAnio, sMes] = p.semana.split("-").map(Number);
                return sAnio === anioSel && sMes === mesSel;
            }
            const fecha = p.fecha?.toDate ? p.fecha.toDate() : new Date(p.fecha);
            return fecha.getFullYear() === anioSel && fecha.getMonth() + 1 === mesSel;
        }).sort((a, b) => {
            const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
            const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
            return fa - fb;
        });
    };

    const getTotalEmpleado = (empleadoId) => {
        return getPagosEmpleado(empleadoId).reduce((acc, p) => acc + (p.monto || 0), 0);
    };

    const getTotalGeneral = () => {
        return EMPLEADOS.reduce((acc, e) => acc + getTotalEmpleado(e.id), 0);
    };

    const getTotalAnio = () => {
        const anioActual = new Date().getFullYear();
        return pagos.filter(p => {
            if (p.semana) {
                const sAnio = parseInt(p.semana.split("-")[0]);
                return sAnio === anioActual;
            }
            const fecha = p.fecha?.toDate ? p.fecha.toDate() : new Date(p.fecha);
            return fecha.getFullYear() === anioActual;
        }).reduce((acc, p) => acc + (p.monto || 0), 0);
    };

    const formatFecha = (fecha) => {
        const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
        return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
    };

    const getSemanaLabel = (pago) => {
        if (pago.semana) {
            const parts = pago.semana.match(/S(\d+)$/);
            return parts ? `Semana ${parts[1]}:` : "";
        }
        return "";
    };

    const mesLabel = () => {
        const d = new Date(anioSel, mesSel - 1);
        return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    };

    const nominaSemanal = EMPLEADOS.reduce((a, e) => a + e.sueldoSemanal, 0);

    if (loading) {
        return <div className="flex justify-center py-20"><div className="loading loading-spinner loading-lg text-gray-400"></div></div>;
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h2 className="text-2xl font-black text-gray-800">Nómina de Empleados</h2>
                <input
                    type="month"
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 focus:border-gray-400 focus:outline-none"
                />
            </div>

            {/* Resumen del mes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Pagado en {mesLabel()}</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">${getTotalGeneral().toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Nómina semanal</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">${nominaSemanal.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Acumulado {new Date().getFullYear()}</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">${getTotalAnio().toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Semanas del mes</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{semanasDelMes.length}</p>
                </div>
            </div>

            {/* Empleados */}
            <div className="space-y-6">
                {EMPLEADOS.map(emp => {
                    const pagosEmp = getPagosEmpleado(emp.id);
                    const totalMes = getTotalEmpleado(emp.id);

                    return (
                        <div key={emp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            {/* Header del empleado */}
                            <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm">
                                        {emp.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">{emp.nombre}</p>
                                        <p className="text-sm text-gray-400">${emp.sueldoSemanal}/semana</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Total del mes</p>
                                        <p className="font-black text-gray-800 text-xl">${totalMes.toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const hoy = new Date();
                                            const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
                                            setFormPago({ monto: String(emp.sueldoSemanal), concepto: "Sueldo semanal", nota: "", fecha: fechaHoy });
                                            setArchivoPago(null);
                                            setModalPago({ show: true, empleado: emp });
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        <FaPlus size={10} /> Registrar Pago
                                    </button>
                                </div>
                            </div>

                            {/* Tabla de pagos del mes */}
                            <div className="px-5 py-4">
                                {pagosEmp.length === 0 ? (
                                    <p className="text-center text-gray-300 text-base py-8">Sin pagos en {mesLabel()}</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-400 text-xs uppercase border-b border-gray-100">
                                                <th className="py-3 px-2 text-left font-semibold">Semana</th>
                                                <th className="py-3 px-2 text-left font-semibold">Fecha</th>
                                                <th className="py-3 px-2 text-left font-semibold">Concepto</th>
                                                <th className="py-3 px-2 text-left font-semibold">Nota</th>
                                                <th className="py-3 px-2 text-right font-semibold">Monto</th>
                                                <th className="py-3 px-2 text-center font-semibold">Payroll PDF</th>
                                                <th className="py-3 px-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagosEmp.map(p => (
                                                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-2 text-gray-500 font-semibold">{getSemanaLabel(p)}</td>
                                                    <td className="py-3 px-2 text-gray-500">
                                                        <input
                                                            type="date"
                                                            defaultValue={(() => {
                                                                const f = p.fecha?.toDate ? p.fecha.toDate() : new Date(p.fecha);
                                                                return `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}-${String(f.getDate()).padStart(2,"0")}`;
                                                            })()}
                                                            onChange={(e) => { if (e.target.value) editarFechaPago(p.id, e.target.value); }}
                                                            className="px-2 py-1 border border-transparent hover:border-gray-300 focus:border-gray-400 rounded text-sm bg-transparent focus:bg-white outline-none cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-2 font-semibold text-gray-700">{p.concepto}</td>
                                                    <td className="py-3 px-2 text-gray-400">{p.nota || "—"}</td>
                                                    <td className="py-3 px-2 text-right font-bold text-gray-800 text-base">${p.monto.toLocaleString()}</td>
                                                    <td className="py-3 px-2 text-center">
                                                        {subiendoPdf === p.id ? (
                                                            <span className="loading loading-spinner loading-sm text-gray-400"></span>
                                                        ) : p.archivoUrl ? (
                                                            <a
                                                                href={p.archivoUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-xs font-semibold"
                                                                title={p.archivoNombre}
                                                            >
                                                                <FaFilePdf size={14} />
                                                                Ver PDF
                                                                <FaExternalLinkAlt size={9} />
                                                            </a>
                                                        ) : (
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
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 rounded-lg transition-colors text-xs font-semibold"
                                                                title="Subir comprobante PDF"
                                                            >
                                                                <FaUpload size={12} />
                                                                Subir PDF
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        {confirmEliminar === p.id ? (
                                                            <div className="flex gap-1 justify-center">
                                                                <button onClick={() => eliminarPago(p.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded font-semibold">Sí</button>
                                                                <button onClick={() => setConfirmEliminar(null)} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-semibold">No</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setConfirmEliminar(p.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                                                <FaTrash size={12} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-gray-200">
                                                <td colSpan={4} className="py-3 px-2 text-right text-xs text-gray-400 uppercase font-semibold">Total del mes</td>
                                                <td className="py-3 px-2 text-right font-black text-gray-800 text-base">${totalMes.toLocaleString()}</td>
                                                <td colSpan={2}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal registrar pago */}
            {modalPago.show && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setModalPago({ show: false, empleado: null }); setArchivoPago(null); }}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-gray-800">Registrar Pago</h3>
                        <p className="text-sm text-gray-400 mb-5">{modalPago.empleado.nombre} — ${modalPago.empleado.sueldoSemanal}/semana</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={formPago.fecha}
                                    onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg font-semibold text-sm focus:border-gray-400 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">Monto ($)</label>
                                <input
                                    type="number"
                                    value={formPago.monto}
                                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg font-bold text-2xl focus:border-gray-400 focus:outline-none"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">Concepto</label>
                                <select
                                    value={formPago.concepto}
                                    onChange={(e) => setFormPago({ ...formPago, concepto: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg font-semibold text-sm focus:border-gray-400 focus:outline-none"
                                >
                                    <option>Sueldo semanal</option>
                                    <option>Bono</option>
                                    <option>Adelanto</option>
                                    <option>Horas extra</option>
                                    <option>Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-1">Nota (opcional)</label>
                                <input
                                    type="text"
                                    value={formPago.nota}
                                    onChange={(e) => setFormPago({ ...formPago, nota: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:outline-none"
                                    placeholder="Ej: Semana del 1 al 7 mayo"
                                />
                            </div>

                            {/* Área de subir PDF */}
                            <div>
                                <label className="text-xs text-gray-500 font-semibold block mb-2">Documento Payroll (PDF)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => setArchivoPago(e.target.files[0] || null)}
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${archivoPago ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                                >
                                    {archivoPago ? (
                                        <>
                                            <FaFilePdf size={28} className="text-red-500" />
                                            <p className="text-sm font-semibold text-gray-700">{archivoPago.name}</p>
                                            <p className="text-xs text-green-600 font-semibold">Archivo listo para subir</p>
                                        </>
                                    ) : (
                                        <>
                                            <FaUpload size={28} className="text-gray-300" />
                                            <p className="text-sm font-semibold text-gray-500">Click aquí para subir el PDF del payroll</p>
                                            <p className="text-xs text-gray-400">o arrastra el archivo aquí</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setModalPago({ show: false, empleado: null }); setArchivoPago(null); }}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={registrarPago}
                                disabled={guardando || !formPago.monto || parseFloat(formPago.monto) <= 0}
                                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                {guardando ? "Guardando..." : `Registrar Pago $${formPago.monto || "0"}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Empleados;
