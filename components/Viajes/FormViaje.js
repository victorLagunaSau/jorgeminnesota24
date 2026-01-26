import React, {useState, useEffect} from "react";
import {firestore} from "../../firebase/firebaseIni";
import {FaTrash, FaCheckCircle, FaExclamationCircle} from "react-icons/fa";

const FormViaje = ({user}) => {
    const [viajeIniciado, setViajeIniciado] = useState(false);
    const [choferes, setChoferes] = useState([]);
    const [provincias, setProvincias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [alertMessage, setAlertMessage] = useState({msg: '', tipo: ''});

    const [encabezado, setEncabezado] = useState({
        numViaje: "",
        choferId: "",
        fecha: new Date().toLocaleDateString()
    });

    const [vehiculos, setVehiculos] = useState([]);

    useEffect(() => {
        const unsubChoferes = firestore().collection("choferes").orderBy("nombreChofer", "asc")
            .onSnapshot(snap => {
                setChoferes(snap.docs.map(doc => ({
                    id: doc.id,
                    nombre: doc.data().nombreChofer,
                    empresa: doc.data().empresaNombre
                })));
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
    }, []);

    const agregarFila = () => {
        if (vehiculos.length >= 13) return;
        setVehiculos([...vehiculos, {
            id: Date.now(),
            lote: "", marca: "", modelo: "", clienteAlt: "",
            almacen: "Copart",
            estado: "", ciudad: "", flete: 0, storage: "0", sPeso: "0", gExtra: "0", titulo: "NO"
        }]);
    };

const handleTableChange = (id, field, value) => {
        const nuevosVehiculos = vehiculos.map(v => {
            if (v.id === id) {
                let valorFinal = value;

                // 1. Limpieza de números para gastos extra
                if (['storage', 'sPeso', 'gExtra'].includes(field)) {
                    valorFinal = value === "" ? "0" : parseFloat(value).toString();
                }

                // Creamos el objeto base con el cambio
                let actualizacion = { ...v, [field]: valorFinal };

                // 2. LÓGICA AUTOMÁTICA DE FLETE (ESTADO)
                if (field === 'estado') {
                    const estadoData = provincias.find(p => p.state === value);
                    if (estadoData && estadoData.regions && estadoData.regions.length > 0) {
                        const primeraRegion = estadoData.regions[0];
                        actualizacion.ciudad = primeraRegion.city;
                        actualizacion.flete = parseFloat(primeraRegion.cost || 0);
                    } else {
                        actualizacion.ciudad = "";
                        actualizacion.flete = 0;
                    }
                }

                // 3. LÓGICA AUTOMÁTICA DE FLETE (CIUDAD)
                if (field === 'ciudad') {
                    const estadoData = provincias.find(p => p.state === v.estado);
                    const regionData = estadoData?.regions?.find(r => r.city === value);
                    actualizacion.flete = regionData ? parseFloat(regionData.cost || 0) : 0;
                }

                return actualizacion;
            }
            return v;
        });
        setVehiculos(nuevosVehiculos);
    };

    const validarLoteUnico = async (id, loteValue) => {
        if (!loteValue || loteValue.trim() === "") return;

        const loteLimpio = loteValue.toUpperCase().trim();

        try {
            // Consultamos ambos documentos
            const [docVehiculo, docTransito] = await Promise.all([
                firestore().collection("vehiculos").doc(loteLimpio).get(),
                firestore().collection("lotesEnTransito").doc(loteLimpio).get()
            ]);

            if (docVehiculo.exists || docTransito.exists) {
                // Mostramos alerta
                setAlertMessage({
                    msg: ` EL LOTE ${loteLimpio} YA ESTÁ REGISTRADO O EN TRÁNSITO.`,
                    tipo: 'error'
                });

                // Limpiamos el lote en el estado para que 'esValido' sea false
                const nuevosVehiculos = vehiculos.map(v =>
                    v.id === id ? {...v, lote: ""} : v
                );
                setVehiculos(nuevosVehiculos);

                // La alerta desaparece sola tras 5 segundos
                setTimeout(() => {
                    setAlertMessage({msg: '', tipo: ''});
                }, 5000);
            }
        } catch (error) {
            console.error("Error al validar lote:", error);
        }
    };

    // VALIDACIÓN: Almacén ya no es obligatorio (se eliminó v.almacen.trim() !== "")
    const esValido = vehiculos.length > 0 && vehiculos.every(v =>
        v.lote.trim() !== "" &&
        v.marca.trim() !== "" &&
        v.modelo.trim() !== "" &&
        v.clienteAlt.trim() !== "" &&
        v.estado !== "" &&
        v.ciudad !== "" &&
        v.flete > 0
    );

    const finalizarViaje = async () => {
        if (!esValido) {
            setAlertMessage({msg: "Revisa: Lote, Marca, Modelo, Cliente y Destino son obligatorios.", tipo: 'error'});
            return;
        }

        try {
            setGuardando(true);
            const lotesDocs = await Promise.all(vehiculos.map(v => firestore().collection("lotesEnTransito").doc(v.lote).get()));
            const lotesOcupados = lotesDocs.filter(doc => doc.exists).map(doc => doc.id);

            if (lotesOcupados.length > 0) {
                setAlertMessage({msg: `Lotes ya en tránsito: ${lotesOcupados.join(", ")}`, tipo: 'error'});
                setGuardando(false);
                return;
            }

            const tFlete = vehiculos.reduce((acc, v) => acc + v.flete, 0);
            const tStorage = vehiculos.reduce((acc, v) => acc + parseFloat(v.storage), 0);
            const tSPeso = vehiculos.reduce((acc, v) => acc + parseFloat(v.sPeso), 0);
            const tGExtra = vehiculos.reduce((acc, v) => acc + parseFloat(v.gExtra), 0);
            const tGastosSinFlete = tStorage + tSPeso + tGExtra;
            const tTitulosSI = vehiculos.filter(v => v.titulo === "SI").length;

            const viajeData = {
                numViaje: encabezado.numViaje.toUpperCase(),
                chofer: choferes.find(c => c.id === encabezado.choferId),
                estatus: "PENDIENTE",
                fechaCreacion: new Date(),
                creadoPor: {id: user?.id || "N/A", nombre: user?.nombre || "Admin"},
                editadoPor: null,
                resumenFinanciero: {
                    totalFletes: tFlete,
                    totalStorage: tStorage,
                    totalSobrepeso: tSPeso,
                    totalGastosExtra: tGExtra,
                    totalSoloGastos: tGastosSinFlete,
                    granTotal: tFlete + tGastosSinFlete,
                    cantidadTitulosSI: tTitulosSI,
                    totalVehiculos: vehiculos.length
                },
                /* 🚀 AQUÍ SE GUARDA EL DATO 'ALMACEN' POR CADA VEHÍCULO EN EL ARREGLO DE LA BD */
                vehiculos: vehiculos.map((v, index) => ({...v, order: index + 1, timestamp: new Date()}))
            };

            const batch = firestore().batch();
            batch.set(firestore().collection("viajesPendientes").doc(viajeData.numViaje), viajeData);
            vehiculos.forEach(v => {
                batch.set(firestore().collection("lotesEnTransito").doc(v.lote), {
                    viajeAsignado: viajeData.numViaje,
                    choferNombre: viajeData.chofer.nombre,
                    fechaBloqueo: new Date()
                });
            });

            await batch.commit();
            setAlertMessage({msg: "Viaje guardado. Reiniciando formulario...", tipo: 'success'});

            setTimeout(() => {
                setVehiculos([]);
                setEncabezado({numViaje: "", choferId: "", fecha: new Date().toLocaleDateString()});
                setViajeIniciado(false);
                setAlertMessage({msg: '', tipo: ''});
                setGuardando(false);
            }, 2000);

        } catch (error) {
            setAlertMessage({msg: "Error al procesar el guardado.", tipo: 'error'});
            setGuardando(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 font-sans">
            {alertMessage.msg && (
                <div
                    className={`alert ${alertMessage.tipo === 'success' ? 'alert-success' : 'alert-error'} mb-4 shadow-md text-white font-bold uppercase text-[12px]`}>
                    <FaExclamationCircle/> <span>{alertMessage.msg}</span>
                </div>
            )}


            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter mb-8 border-b pb-4">Registra un
                Nuevo Viaje</h2>

            <div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 items-end shadow-inner">
                <div>
                    <label className="block text-[10px] font-black text-red-600 uppercase mb-1 italic">Número de Viaje
                        *</label>
                    <input type="text" disabled={viajeIniciado}
                           className="input input-bordered input-sm w-full bg-white text-black font-bold uppercase"
                           value={encabezado.numViaje}
                           onChange={(e) => setEncabezado({...encabezado, numViaje: e.target.value})}/>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1 italic">Seleccionar
                        Chofer *</label>
                    <select disabled={viajeIniciado}
                            className="select select-bordered select-sm w-full bg-white text-black font-bold"
                            value={encabezado.choferId}
                            onChange={(e) => setEncabezado({...encabezado, choferId: e.target.value})}>
                        <option value="">{loading ? "Cargando..." : "Elegir Chofer"}</option>
                        {choferes.map(c => (<option key={c.id} value={c.id}>{c.nombre} ({c.empresa})</option>))}
                    </select>
                </div>
                <div className="text-center">
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1 italic">Fecha</label>
                    <span className="text-sm font-mono font-bold text-gray-500">{encabezado.fecha}</span>
                </div>
                <div>
                    <button onClick={() => setViajeIniciado(!viajeIniciado)}
                            disabled={!encabezado.numViaje || !encabezado.choferId}
                            className={`btn btn-sm w-full font-black ${viajeIniciado ? 'btn-outline' : 'btn-error text-white'}`}>
                        {viajeIniciado ? "Modificar Datos" : "Iniciar Viaje"}
                    </button>
                </div>
            </div>

            <div
                className={`transition-all duration-500 ${viajeIniciado ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-4">
                    <span
                        className="text-[11px] font-black uppercase text-gray-400 italic">Unidades: {vehiculos.length} / 13</span>
                    <button onClick={agregarFila} disabled={vehiculos.length >= 13}
                            className="btn btn-sm btn-info text-white font-black px-8">+ Agregar Vehículo
                    </button>
                </div>

                <div className="overflow-x-auto border rounded-xl shadow-2xl bg-gray-100 max-h-[450px]">
                    <table className="table table-compact w-full border-separate border-spacing-0">
                        <thead>
                        <tr className="text-[10px] uppercase text-gray-500 bg-white border-b sticky top-0 z-10">
                            <th className="border-r border-b p-2 text-center w-8 bg-gray-50 italic">#</th>
                            <th className="border-r border-b p-2 w-28">Lote *</th>
                            <th className="border-r border-b p-2 w-28">Marca *</th>
                            <th className="border-r border-b p-2 w-28">Modelo *</th>
                            <th className="border-r border-b p-2 w-32">Cliente *</th>
                            <th className="border-r border-b p-2 w-32">Almacén</th>
                            <th className="border-r border-b p-2 w-40 text-red-700">Estado *</th>
                            <th className="border-r border-b p-2 w-40 text-red-700">Ciudad *</th>
                            <th className="border-r border-b p-2 w-24 text-blue-800 font-black text-center">Flete</th>
                            <th className="border-r border-b p-2 w-16 text-center">Storage</th>
                            <th className="border-r border-b p-2 w-16 text-center">S. Peso</th>
                            <th className="border-r border-b p-2 w-16 text-center">G. Extra</th>
                            <th className="border-r border-b p-2 w-20 text-center">Título</th>
                            <th className="border-b p-2 text-center w-8 bg-gray-50"></th>
                        </tr>
                        </thead>
                        <tbody className="bg-white">
                        {vehiculos.map((v, index) => (
                            <tr key={v.id} className="hover:bg-blue-50 transition-colors">
                                <td className="border-r border-b text-center font-mono text-[10px] text-gray-400 bg-gray-50 italic">{index + 1}</td>
                                <td className="border-r border-b p-0">
                                    <input
                                        type="text"
                                        value={v.lote}
                                        onChange={(e) => handleTableChange(v.id, 'lote', e.target.value.toUpperCase())}
                                        onBlur={(e) => validarLoteUnico(v.id, e.target.value)} // <-- ESTA LÍNEA ES LA CLAVE
                                        className="w-full h-9 px-2 text-[11px] font-black border-none bg-transparent uppercase focus:ring-1 focus:ring-red-600"
                                    />
                                </td>
                                <td className="border-r border-b p-0"><input type="text" value={v.marca}
                                                                             onChange={(e) => handleTableChange(v.id, 'marca', e.target.value.toUpperCase())}
                                                                             className="w-full h-9 px-2 text-[11px] border-none bg-transparent uppercase focus:ring-1 focus:ring-blue-600"/>
                                </td>
                                <td className="border-r border-b p-0"><input type="text" value={v.modelo}
                                                                             onChange={(e) => handleTableChange(v.id, 'modelo', e.target.value.toUpperCase())}
                                                                             className="w-full h-9 px-2 text-[11px] border-none bg-transparent uppercase focus:ring-1 focus:ring-blue-600"/>
                                </td>
                                <td className="border-r border-b p-0"><input type="text" value={v.clienteAlt}
                                                                             onChange={(e) => handleTableChange(v.id, 'clienteAlt', e.target.value.toUpperCase())}
                                                                             className="w-full h-9 px-2 text-[11px] border-none bg-transparent uppercase"/>
                                </td>
                                <td className="border-r border-b p-0 bg-white">
                                    <select value={v.almacen}
                                            onChange={(e) => handleTableChange(v.id, 'almacen', e.target.value)}
                                            className="w-full h-9 px-1 text-[11px] font-bold text-gray-800 border-none bg-transparent focus:ring-0">
                                        <option value="Copart">Copart</option>
                                        <option value="Adesa">Adesa</option>
                                        <option value="Manheim">Manheim</option>
                                        <option value="Insurance Auto Auctions">Insurance Auto Auctions</option>
                                    </select>
                                </td>
                                <td className="border-r border-b p-0 bg-red-50/20">
                                    <select value={v.estado}
                                            onChange={(e) => handleTableChange(v.id, 'estado', e.target.value)}
                                            className="w-full h-9 px-1 text-[11px] font-black text-red-800 border-none bg-transparent">
                                        <option value="">-- ESTADO --</option>
                                        {provincias.map(p => <option key={p.id} value={p.state}>{p.state}</option>)}
                                    </select>
                                </td>
                                <td className="border-r border-b p-0 bg-red-50/20">
                                    <select disabled={!v.estado} value={v.ciudad}
                                            onChange={(e) => handleTableChange(v.id, 'ciudad', e.target.value)}
                                            className="w-full h-9 px-1 text-[11px] font-black text-red-800 border-none bg-transparent">{provincias.find(p => p.state === v.estado)?.regions.map((r, i) => (
                                        <option key={i} value={r.city}>{r.city}</option>))}</select>
                                </td>
                                <td className="border-r border-b p-0 bg-blue-50/50 text-center font-mono font-black text-blue-900 text-[11px]">${v.flete.toLocaleString()}</td>
                                <td className="border-r border-b p-0"><input type="number" value={v.storage}
                                                                             onFocus={(e) => v.storage === "0" && handleTableChange(v.id, 'storage', "")}
                                                                             onChange={(e) => handleTableChange(v.id, 'storage', e.target.value)}
                                                                             className="w-full h-9 px-2 text-[11px] border-none bg-transparent text-center font-mono"/>
                                </td>
                                <td className="border-r border-b p-0"><input type="number" value={v.sPeso}
                                                                             onFocus={(e) => v.sPeso === "0" && handleTableChange(v.id, 'sPeso', "")}
                                                                             onChange={(e) => handleTableChange(v.id, 'sPeso', e.target.value)}
                                                                             className="w-full h-9 px-2 text-[11px] border-none bg-transparent text-center font-mono"/>
                                </td>
                                <td className="border-r border-b p-0"><input type="number" value={v.gExtra}
                                                                             onFocus={(e) => v.gExtra === "0" && handleTableChange(v.id, 'gExtra', "")}
                                                                             onChange={(e) => handleTableChange(v.id, 'gExtra', e.target.value)}
                                                                             className="w-full h-9 px-2 text-[11px] border-none bg-transparent text-center font-mono"/>
                                </td>
                                <td className="border-r border-b p-0">
                                    <select value={v.titulo}
                                            onChange={(e) => handleTableChange(v.id, 'titulo', e.target.value)}
                                            className="w-full h-9 text-center text-[10px] font-black border-none bg-transparent">
                                        <option value="NO">NO</option>
                                        <option value="SI">SI</option>
                                    </select>
                                </td>
                                <td className="border-b p-1 text-center bg-gray-50">
                                    <button onClick={() => setVehiculos(vehiculos.filter(veh => veh.id !== v.id))}
                                            className="text-red-400 hover:text-red-600 transition-colors"><FaTrash
                                        size={12}/></button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={finalizarViaje} disabled={!esValido || guardando}
                        className={`btn btn-error text-white font-black px-16 gap-3 shadow-xl ${(!esValido || guardando) ? 'btn-disabled opacity-30' : ''}`}>
                    {guardando ? <span className="loading loading-spinner"></span> : <FaCheckCircle/>} FINALIZAR VIAJE
                </button>
            </div>
        </div>
    );
};

export default FormViaje;