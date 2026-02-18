import React, {useState, useEffect, useRef} from "react";
import ReactToPrint from "react-to-print";
import {firestore} from "../../firebase/firebaseIni";
import {
    FaTrash, FaCheckCircle, FaExclamationCircle,
    FaPrint, FaCar, FaCheckDouble, FaTimes, FaLink
} from "react-icons/fa";
import HojaChofer from "./HojaChofer";

const FormViaje = ({user}) => {
    // --- ESTADOS DE CONTROL ---
    const [viajeIniciado, setViajeIniciado] = useState(false);
    const [choferes, setChoferes] = useState([]);
    const [provincias, setProvincias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [alertMessage, setAlertMessage] = useState({msg: '', tipo: ''});

    // --- ESTADOS PARA MODAL DE ÉXITO E IMPRESIÓN ---
    const [mostrarModalExito, setMostrarModalExito] = useState(false);
    const [viajeReciente, setViajeReciente] = useState(null);

    // --- REFERENCIAS (Para la impresión automática) ---
    const componenteRef = useRef();
    const btnPrintRef = useRef();

    const [encabezado, setEncabezado] = useState({
        numViaje: "",
        choferId: "",
        fecha: new Date().toLocaleDateString()
    });

    const [vehiculos, setVehiculos] = useState([]);

// --- CARGA DE DATOS (FILTRADO HÍBRIDO: PROPIOS + LIDERADOS) ---
    useEffect(() => {
        if (!user) return;

        // Consultamos la colección para filtrar localmente (Firebase 7 no soporta consultas OR complejas fácilmente)
        const unsubChoferes = firestore().collection("choferes")
            .onSnapshot(snap => {
                const todos = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                if (!user.admin) {
                    // Si no es admin: Ve sus choferes (empresaId) O choferes donde es líder (empresaLiderId)
                    const filtrados = todos.filter(c =>
                        c.empresaId === user.id || c.empresaLiderId === user.id
                    );
                    setChoferes(filtrados.map(c => ({
                        id: c.id,
                        nombre: c.nombreChofer,
                        empresa: c.empresaNombre,
                        empresaLiderId: c.empresaLiderId || "",
                        esSubcontratado: c.empresaLiderId === user.id && c.empresaId !== user.id
                    })));
                } else {
                    // Si es admin: Ve todos
                    setChoferes(todos.map(c => ({
                        id: c.id,
                        nombre: c.nombreChofer,
                        empresa: c.empresaNombre,
                        empresaLiderId: c.empresaLiderId || "",
                        esSubcontratado: false
                    })));
                }
            });

        const unsubProvincias = firestore().collection("province").orderBy("state", "asc")
            .onSnapshot(snap => {
                setProvincias(snap.docs.map(doc => ({
                    id: doc.id,
                    state: doc.data().state,
                    regions: doc.data().regions || []
                })));
                setLoading(false);
            });

        return () => {
            unsubChoferes();
            unsubProvincias();
        };
    }, [user]);

    // --- FUNCIÓN PARA FOLIO AUTOMÁTICO ---
    const iniciarViajeConFolio = async () => {
        setLoading(true);
        try {
            const conRef = firestore().collection("config").doc("consecutivos");
            const doc = await conRef.get();
            const proximo = (doc.data()["viajesPendientes"] || 0) + 1;

            setEncabezado(prev => ({...prev, numViaje: String(proximo)}));
            setViajeIniciado(true);
        } catch (e) {
            setAlertMessage({msg: "Error al obtener folio", tipo: 'error'});
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE LA TABLA ---
    const agregarFila = () => {
        if (vehiculos.length >= 13) return;
        setVehiculos([...vehiculos, {
            id: Date.now(),
            lote: "", marca: "", modelo: "", clienteAlt: "",
            almacen: "Copart",
            estado: "", ciudad: "",
            flete: 0,          // Se usará para el COST (chofer)
            precioVenta: 0,    // Se usará para el PRICE (cliente) - OCULTO
            storage: "0", sPeso: "0", gExtra: "0", titulo: "NO"
        }]);
    };

    const handleTableChange = (id, field, value) => {
        const nuevosVehiculos = vehiculos.map(v => {
            if (v.id === id) {
                let valorFinal = value;
                if (['storage', 'sPeso', 'gExtra'].includes(field)) {
                    valorFinal = value === "" ? "0" : parseFloat(value).toString();
                }

                let actualizacion = {...v, [field]: valorFinal};

                if (field === 'estado') {
                    const estadoData = provincias.find(p => p.state === value);
                    if (estadoData && estadoData.regions?.length > 0) {
                        actualizacion.ciudad = estadoData.regions[0].city;
                        // LOGICA DE COSTO VS PRECIO
                        actualizacion.flete = parseFloat(estadoData.regions[0].cost || 0);
                        actualizacion.precioVenta = parseFloat(estadoData.regions[0].price || 0);
                    } else {
                        actualizacion.ciudad = "";
                        actualizacion.flete = 0;
                        actualizacion.precioVenta = 0;
                    }
                }

                if (field === 'ciudad') {
                    const estadoData = provincias.find(p => p.state === v.estado);
                    const regionData = estadoData?.regions?.find(r => r.city === value);
                    if (regionData) {
                        // LOGICA DE COSTO VS PRECIO
                        actualizacion.flete = parseFloat(regionData.cost || 0);
                        actualizacion.precioVenta = parseFloat(regionData.price || 0);
                    } else {
                        actualizacion.flete = 0;
                        actualizacion.precioVenta = 0;
                    }
                }
                return actualizacion;
            }
            return v;
        });
        setVehiculos(nuevosVehiculos);
    };

    const validarLoteUnico = async (id, loteValue) => {
        if (!loteValue?.trim()) return;
        const loteLimpio = loteValue.toUpperCase().trim();
        try {
            const [docV, docT] = await Promise.all([
                firestore().collection("vehiculos").doc(loteLimpio).get(),
                firestore().collection("lotesEnTransito").doc(loteLimpio).get()
            ]);
            if (docV.exists || docT.exists) {
                setAlertMessage({msg: `Lote ${loteLimpio} duplicado o en tránsito`, tipo: 'error'});
                setVehiculos(vehiculos.map(v => v.id === id ? {...v, lote: ""} : v));
                setTimeout(() => setAlertMessage({msg: '', tipo: ''}), 5000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const esValido = vehiculos.length > 0 && vehiculos.every(v =>
        v.lote.trim() !== "" && v.marca.trim() !== "" && v.clienteAlt.trim() !== "" && v.flete > 0
    );

    // --- ACCIÓN FINALIZAR CON TRANSACCIÓN ---
    const finalizarViaje = async () => {
        if (!esValido) return;
        setGuardando(true);
        try {
            const conRef = firestore().collection("config").doc("consecutivos");

            await firestore().runTransaction(async (transaction) => {
                const conDoc = await transaction.get(conRef);
                const proximoFolio = (conDoc.data()["viajesPendientes"] || 0) + 1;
                const numViajeFinal = String(proximoFolio);

                const tFlete = vehiculos.reduce((acc, v) => acc + v.flete, 0);
                const choferData = choferes.find(c => c.id === encabezado.choferId);

                const viajeData = {
                    numViaje: numViajeFinal,
                    chofer: choferData,
                    empresaId: user.id, // ID del creador (Carrier o Admin)
                    empresaLiderId: choferData.empresaLiderId || "", // Guardamos quién es el líder de este chofer
                    estatus: "PENDIENTE",
                    fechaCreacion: new Date(),
                    creadoPor: {
                        id: user?.id || "N/A",
                        nombre: user?.nombre || "Admin",
                        tipo: user?.tipo || "desconocido"
                    },
                    resumenFinanciero: {
                        totalFletes: tFlete,
                        totalSoloGastos: vehiculos.reduce((acc, v) => acc + (parseFloat(v.storage) + parseFloat(v.sPeso) + parseFloat(v.gExtra)), 0),
                        totalVehiculos: vehiculos.length
                    },
                    vehiculos: vehiculos.map((v, index) => ({...v, order: index + 1}))
                };

                transaction.set(firestore().collection("viajesPendientes").doc(numViajeFinal), viajeData);

                vehiculos.forEach(v => {
                    transaction.set(firestore().collection("lotesEnTransito").doc(v.lote), {
                        viajeAsignado: numViajeFinal,
                        choferNombre: choferData.nombre,
                        fechaBloqueo: new Date()
                    });
                });

                transaction.update(conRef, {"viajesPendientes": proximoFolio});
                setViajeReciente(viajeData);
            });

            setMostrarModalExito(true);
            setGuardando(false);

            setTimeout(() => {
                if (btnPrintRef.current) btnPrintRef.current.click();
            }, 600);

        } catch (e) {
            setAlertMessage({msg: "Error al guardar viaje: " + e.message, tipo: 'error'});
            setGuardando(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 font-sans text-black">

            <div style={{display: "none"}}>
                <HojaChofer ref={componenteRef} viaje={viajeReciente}/>
            </div>

            {/* MODAL DE ÉXITO */}
            {mostrarModalExito && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div
                        className="bg-white rounded-xl max-w-md w-full shadow-2xl border-2 border-t-8 border-blue-600 p-8 text-center animate-in zoom-in">
                        <div className="text-blue-600 text-6xl flex justify-center mb-4"><FaCheckCircle/></div>
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-gray-800">Viaje
                            Registrado</h4>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mt-2">Folio:
                            #{viajeReciente?.numViaje}</p>

                        <div className="my-6 p-4 bg-blue-50 rounded-lg border border-dashed border-blue-200">
                            <p className="text-lg font-black text-gray-800 uppercase leading-none">{viajeReciente?.chofer?.nombre}</p>
                            <p className="text-[10px] font-black text-gray-400 mt-2 uppercase">{viajeReciente?.vehiculos?.length} UNIDADES
                                EN TRÁNSITO</p>
                        </div>

                        <ReactToPrint
                            trigger={() => (
                                <button ref={btnPrintRef}
                                        className="btn btn-info text-white w-full h-14 uppercase font-black tracking-widest gap-2">
                                    <FaPrint/> Imprimir Hoja Chofer
                                </button>
                            )}
                            content={() => componenteRef.current}
                        />

                        <button onClick={() => {
                            setVehiculos([]);
                            setEncabezado({numViaje: "", choferId: "", fecha: new Date().toLocaleDateString()});
                            setViajeIniciado(false);
                            setMostrarModalExito(false);
                        }} className="btn btn-success text-white w-full mt-4 h-14 gap-3 font-black uppercase shadow-lg">
                            <FaCheckDouble/> Registrar Nuevo Viaje
                        </button>
                    </div>
                </div>
            )}

            {alertMessage.msg && (
                <div
                    className={`alert ${alertMessage.tipo === 'success' ? 'alert-success' : 'alert-error'} mb-4 text-white font-bold text-[12px]`}>
                    <FaExclamationCircle/> <span>{alertMessage.msg}</span>
                </div>
            )}

            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 border-b pb-4">Registra un Nuevo
                Viaje</h2>

            <div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 items-end">
                <div>
                    <label className="block text-[10px] font-black text-red-600 uppercase mb-1 italic">Núm. Viaje
                        (Auto)</label>
                    <input type="text" disabled
                           className="input input-bordered input-sm w-full bg-gray-100 text-black font-bold uppercase text-center"
                           value={encabezado.numViaje} placeholder="Automático"/>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1 italic">Chofer *</label>
                    <select disabled={viajeIniciado}
                            className="select select-bordered select-sm w-full bg-white text-black font-bold"
                            value={encabezado.choferId}
                            onChange={(e) => setEncabezado({...encabezado, choferId: e.target.value})}>
                        <option value="">{loading ? "Cargando..." : "Elegir Chofer"}</option>
                        {choferes.map(c => (
                            <option key={c.id} value={c.id} className={c.esSubcontratado ? "text-blue-700 font-bold" : ""}>
                                {c.nombre} {c.esSubcontratado ? "🔗 (Subcontratado)" : `(${c.empresa})`}
                            </option>
                        ))}
                    </select>
                </div>
                <div
                    className="text-center font-mono font-bold text-gray-500 uppercase text-xs">{encabezado.fecha}</div>

                <button onClick={viajeIniciado ? () => setViajeIniciado(false) : iniciarViajeConFolio}
                        disabled={!encabezado.choferId}
                        className={`btn btn-sm w-full font-black ${viajeIniciado ? 'btn-outline' : 'btn-error text-white'}`}>
                    {viajeIniciado ? "Modificar Chofer" : "Iniciar Registro"}
                </button>
            </div>

            <div
                className={`transition-all duration-500 ${viajeIniciado ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-4">
                    <span
                        className="text-[11px] font-black uppercase text-gray-400 italic">Unidades: {vehiculos.length} / 13</span>
                    <button onClick={agregarFila} disabled={vehiculos.length >= 13}
                            className="btn btn-sm btn-info text-white font-black px-8">+ Agregar
                    </button>
                </div>

                <div className="overflow-x-auto border rounded-xl shadow-inner max-h-[400px]">
                    <table className="table table-compact w-full">
                        <thead>
                        <tr className="text-[10px] uppercase bg-gray-100 text-gray-500 sticky top-0 z-20">
                            <th>#</th>
                            <th>Lote *</th>
                            <th>Marca *</th>
                            <th>Modelo *</th>
                            <th>Cliente *</th>
                            <th>Almacén</th>
                            <th>Estado *</th>
                            <th>Ciudad *</th>
                            <th className="text-blue-800">Flete</th>
                            <th>Storage</th>
                            <th>S. Peso</th>
                            <th>G. Extra</th>
                            <th>Título</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody className="bg-white">
                        {vehiculos.map((v, i) => (
                            <tr key={v.id} className="bg-gray-200">
                                <td className="font-mono text-[10px] text-gray-400 italic">{i + 1}</td>
                                <td>
                                    <input
                                        type="text"
                                        value={v.lote}
                                        maxLength={8}
                                        onBlur={(e) => validarLoteUnico(v.id, e.target.value)}
                                        onChange={(e) => handleTableChange(v.id, 'lote', e.target.value)}
                                        className={`input input-xs w-full font-black ${v.lote.length === 8 ? 'text-blue-700' : 'text-red-600'}`}
                                        placeholder="8 dígitos"
                                    />
                                </td>
                                <td><input type="text" value={v.marca}
                                           onChange={(e) => handleTableChange(v.id, 'marca', e.target.value.toUpperCase())}
                                           className="input input-xs w-full bg-white-500 uppercase"/></td>
                                <td><input type="text" value={v.modelo}
                                           onChange={(e) => handleTableChange(v.id, 'modelo', e.target.value.toUpperCase())}
                                           className="input input-xs w-full bg-white-500 uppercase"/></td>
                                <td><input type="text" value={v.clienteAlt}
                                           onChange={(e) => handleTableChange(v.id, 'clienteAlt', e.target.value.toUpperCase())}
                                           className="input input-xs w-full bg-white-500 uppercase"/></td>
                                <td>
                                    <select value={v.almacen}
                                            onChange={(e) => handleTableChange(v.id, 'almacen', e.target.value)}
                                            className="select select-ghost select-xs w-full">
                                        <option value="Copart">Copart</option>
                                        <option value="IAA">IAA</option>
                                        <option value="Manheim">Manheim</option>
                                        <option value="Adesa">Adesa</option>
                                        <option value="Otra">Otra</option>
                                    </select>
                                </td>
                                <td>
                                    <select value={v.estado}
                                            onChange={(e) => handleTableChange(v.id, 'estado', e.target.value)}
                                            className="select select-xs w-full text-red-800 font-bold">
                                        <option value="">-- ST --</option>
                                        {provincias.map(p => <option key={p.id} value={p.state}>{p.state}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select value={v.ciudad}
                                            onChange={(e) => handleTableChange(v.id, 'ciudad', e.target.value)}
                                            className="select select-xs w-full text-red-800 font-bold">
                                        {provincias.find(p => p.state === v.estado)?.regions.map((r, idx) => (
                                            <option key={idx} value={r.city}>{r.city}</option>))}
                                    </select>
                                </td>
                                <td className="font-black text-blue-900 text-center">${v.flete}</td>
                                <td><input type="number" value={v.storage}
                                           onChange={(e) => handleTableChange(v.id, 'storage', e.target.value)}
                                           className="input input-xs w-16 text-center"/></td>
                                <td><input type="number" value={v.sPeso}
                                           onChange={(e) => handleTableChange(v.id, 'sPeso', e.target.value)}
                                           className="input input-xs w-16 text-center"/></td>
                                <td><input type="number" value={v.gExtra}
                                           onChange={(e) => handleTableChange(v.id, 'gExtra', e.target.value)}
                                           className="input input-xs w-16 text-center"/></td>
                                <td>
                                    <select value={v.titulo}
                                            onChange={(e) => handleTableChange(v.id, 'titulo', e.target.value)}
                                            className="select select-xs w-full font-bold">
                                        <option value="NO">NO</option>
                                        <option value="SI">SI</option>
                                    </select>
                                </td>
                                <td>
                                    <button onClick={() => setVehiculos(vehiculos.filter(veh => veh.id !== v.id))}
                                            className="text-red-400"><FaTrash size={12}/></button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={finalizarViaje} disabled={!esValido || guardando}
                        className="btn btn-error text-white font-black px-16 gap-3 shadow-xl">
                    {guardando ? <span className="loading loading-spinner"></span> : <FaCheckCircle/>} FINALIZAR VIAJE
                </button>
            </div>
        </div>
    );
};

export default FormViaje;