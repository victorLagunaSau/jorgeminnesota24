import React, { useState, useEffect } from "react";
import { firestore } from "../../../firebase/firebaseIni";
import firebase from "firebase/app";
import moment from "moment";
import { FaCar, FaCalendarAlt, FaSave, FaUserCheck, FaMapMarkerAlt, FaDollarSign } from "react-icons/fa";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const RegistroMasivoVehiculos = ({ user }) => {
    // ESTADO CON TODOS LOS DATOS DE LA BD
    const [datos, setDatos] = useState({
        fechaManual: moment().format("YYYY-MM-DD"),
        binNip: "",
        gatePass: "",
        marca: "",
        modelo: "",
        tipoVehiculo: "", // A, B, C
        almacen: "",
        descripcion: "",
        // Datos de Ubicación y Precio
        estado: "",
        ciudad: "",
        price: 0, // Precio de lista
        flete: 0, // Precio final de cobro
        // Gastos Adicionales
        storage: 0,
        sobrePeso: 0,
        gastosExtra: 0,
        titulo: "NO",
        // Datos del Cliente
        clienteId: "",
        clienteNombre: "",
        clienteTelefono: ""
    });

    const [listaSesion, setListaSesion] = useState([]);
    const [loading, setLoading] = useState(false);
    const [estados, setEstados] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [clientesDB, setClientesDB] = useState([]);
    const [busquedaCliente, setBusquedaCliente] = useState("");

    useEffect(() => {
        const fetchCatalogos = async () => {
            const estSnap = await firestore().collection("province").get();
            setEstados(estSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const cliSnap = await firestore().collection("clientes").get();
            setClientesDB(cliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchCatalogos();
    }, []);

    const handleEstadoChange = (nombreEstado) => {
        const selected = estados.find(e => e.state === nombreEstado);
        setCiudades(selected ? selected.regions : []);
        setDatos({ ...datos, estado: nombreEstado, ciudad: "" });
    };

    const ejecutarRegistro = async () => {
        // Validaciones críticas
        if (!datos.binNip || !datos.clienteId || !datos.estado || !datos.ciudad || !datos.marca) {
            alert("Error: Faltan campos obligatorios (*)");
            return;
        }

        setLoading(true);
        try {
            // Candado de Duplicidad
            const check = await firestore().collection("vehiculos").doc(datos.binNip.trim()).get();
            if (check.exists) {
                alert(`El Lote ${datos.binNip} ya existe.`);
                setLoading(false);
                return;
            }

            const timestampFinal = moment(datos.fechaManual).toDate();

            // CONSTRUCCIÓN DEL OBJETO COMPLETO IGUAL A TU BD
            const vehiculoFinal = {
                active: true,
                asignado: false,
                binNip: datos.binNip.toUpperCase().trim(),
                gatePass: datos.gatePass.toUpperCase(),
                almacen: datos.almacen,
                tipoVehiculo: datos.tipoVehiculo,
                marca: datos.marca.toUpperCase(),
                modelo: datos.modelo.toUpperCase(),
                descripcion: datos.descripcion,
                estado: datos.estado,
                ciudad: datos.ciudad,
                price: datos.price.toString(), // Mantenemos formato string como en tu ejemplo
                flete: parseFloat(datos.flete || datos.price),
                storage: parseFloat(datos.storage),
                sobrePeso: parseFloat(datos.sobrePeso),
                gastosExtra: parseFloat(datos.gastosExtra),
                titulo: datos.titulo,
                estatus: "PR",
                // Datos de Cliente Vinculados
                clienteId: datos.clienteId,
                clienteNombre: datos.clienteNombre,
                cliente: datos.clienteNombre, // Campo duplicado por compatibilidad
                clienteTelefono: datos.clienteTelefono,
                telefonoCliente: datos.clienteTelefono,
                comentariosChofer: null,
                registro: {
                    usuario: user.nombre,
                    idUsuario: user.id,
                    timestamp: timestampFinal
                }
            };

            const batch = firestore().batch();
            batch.set(firestore().collection("vehiculos").doc(vehiculoFinal.binNip), vehiculoFinal);
            batch.set(firestore().collection("movimientos").doc(), {
                ...vehiculoFinal,
                tipo: "+",
                tipoRegistro: "PR"
            });

            await batch.commit();

            setListaSesion([vehiculoFinal, ...listaSesion]);
            // Limpiamos solo lo específico del carro
            setDatos({
                ...datos,
                binNip: "", gatePass: "", marca: "", modelo: "",
                storage: 0, sobrePeso: 0, gastosExtra: 0, descripcion: ""
            });
            alert("Vehículo registrado con éxito.");

        } catch (e) {
            console.error(e);
            alert("Error al registrar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 bg-white text-black font-sans min-h-screen">
            <h2 className="text-2xl font-black uppercase italic mb-4 border-b-2 border-black">Registro Histórico de Inventario</h2>

            {/* FORMULARIO DE ALTA */}
            <div className="bg-gray-50 border-2 border-black p-4 rounded-lg mb-6 shadow-md">

                {/* FILA 1: FECHA Y UBICACIÓN */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-red-50 p-1 rounded border border-red-200">
                        <label className="text-[9px] font-black text-red-600 uppercase italic">Fecha Ingreso:</label>
                        <input type="date" value={datos.fechaManual} onChange={e => setDatos({...datos, fechaManual: e.target.value})} className="w-full bg-transparent font-bold" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase">Estado:</label>
                        <select className="select select-bordered select-sm w-full font-bold" value={datos.estado} onChange={e => handleEstadoChange(e.target.value)}>
                            <option value="">Selecciona...</option>
                            {estados.map(e => <option key={e.id} value={e.state}>{e.state}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase">Ciudad:</label>
                        <select className="select select-bordered select-sm w-full font-bold" value={datos.ciudad} onChange={e => {
                            const sel = ciudades.find(c => c.city === e.target.value);
                            setDatos({...datos, ciudad: e.target.value, price: sel?.cost || 0, flete: sel?.cost || 0});
                        }}>
                            <option value="">Selecciona...</option>
                            {ciudades.map(c => <option key={c.city} value={c.city}>{c.city}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-blue-600">Precio Flete ($):</label>
                        <input type="number" value={datos.flete} onChange={e => setDatos({...datos, flete: e.target.value})} className="input input-bordered input-sm w-full font-black text-blue-700" />
                    </div>
                </div>

                {/* FILA 2: DATOS DEL VEHÍCULO */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 border-t pt-3">
                    <input type="text" placeholder="BIN / LOTE *" className="input input-bordered input-sm font-black text-blue-600" value={datos.binNip} onChange={e => setDatos({...datos, binNip: e.target.value})} />
                    <input type="text" placeholder="GATE PASS / COMPRADOR" className="input input-bordered input-sm font-bold" value={datos.gatePass} onChange={e => setDatos({...datos, gatePass: e.target.value})} />
                    <select className="select select-bordered select-sm font-bold" value={datos.almacen} onChange={e => setDatos({...datos, almacen: e.target.value})}>
                        <option value="">Almacén...</option>
                        <option value="Copart">Copart</option>
                        <option value="Adesa">Adesa</option>
                        <option value="Manheim">Manheim</option>
                        <option value="Insurance Auto Auctions">IAAI</option>
                    </select>
                    <select className="select select-bordered select-sm font-bold" value={datos.tipoVehiculo} onChange={e => setDatos({...datos, tipoVehiculo: e.target.value})}>
                        <option value="">Tipo...</option>
                        <option value="A">A Ligero</option>
                        <option value="B">B Mediano</option>
                        <option value="C">C Pesado</option>
                    </select>
                    <select className="select select-bordered select-sm font-bold text-red-600" value={datos.titulo} onChange={e => setDatos({...datos, titulo: e.target.value})}>
                        <option value="NO">¿TÍTULO? NO</option>
                        <option value="SI">¿TÍTULO? SI</option>
                    </select>
                </div>

                {/* FILA 3: MARCA, MODELO Y CLIENTE */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <input type="text" placeholder="MARCA *" className="input input-bordered input-sm font-bold" value={datos.marca} onChange={e => setDatos({...datos, marca: e.target.value})} />
                    <input type="text" placeholder="MODELO *" className="input input-bordered input-sm font-bold" value={datos.modelo} onChange={e => setDatos({...datos, modelo: e.target.value})} />

                    {/* BUSCADOR DE CLIENTE OFICIAL */}
                    <div className="relative">
                        <input type="text" placeholder="BUSCAR CLIENTE..." className="input input-bordered input-sm w-full font-black text-red-700"
                               value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} />
                        {busquedaCliente && (
                            <div className="absolute z-50 w-full bg-white border-2 border-black shadow-xl max-h-40 overflow-y-auto">
                                {clientesDB.filter(c => c.cliente.toLowerCase().includes(busquedaCliente.toLowerCase())).map(c => (
                                    <div key={c.id} className="p-2 hover:bg-gray-100 cursor-pointer text-[10px] font-bold border-b"
                                         onClick={() => {
                                             setDatos({...datos, clienteId: c.id, clienteNombre: c.cliente, clienteTelefono: c.telefonoCliente});
                                             setBusquedaCliente("");
                                         }}>
                                        {c.cliente}
                                    </div>
                                ))}
                            </div>
                        )}
                        {datos.clienteNombre && <div className="text-[9px] font-black text-green-600 mt-1 uppercase italic">✓ {datos.clienteNombre}</div>}
                    </div>

                    <input type="text" placeholder="COMENTARIOS" className="input input-bordered input-sm font-medium" value={datos.descripcion} onChange={e => setDatos({...datos, descripcion: e.target.value})} />
                </div>

                {/* FILA 4: GASTOS EXTRAS Y BOTÓN */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t pt-3 items-center">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[8px] font-black uppercase">Storage</label>
                            <input type="number" value={datos.storage} onChange={e => setDatos({...datos, storage: e.target.value})} className="input input-bordered input-sm w-full" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[8px] font-black uppercase">S.Peso</label>
                            <input type="number" value={datos.sobrePeso} onChange={e => setDatos({...datos, sobrePeso: e.target.value})} className="input input-bordered input-sm w-full" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[8px] font-black uppercase">G.Extra</label>
                            <input type="number" value={datos.gastosExtra} onChange={e => setDatos({...datos, gastosExtra: e.target.value})} className="input input-bordered input-sm w-full" />
                        </div>
                    </div>
                    <div className="col-span-2"></div>
                    <button onClick={ejecutarRegistro} disabled={loading} className="btn btn-error btn-sm text-white font-black uppercase w-full">
                        {loading ? "Registrando..." : "+ Guardar Vehículo en Inventario"}
                    </button>
                </div>
            </div>

            {/* TABLA DE SESIÓN */}
            <div className="overflow-x-auto border-2 border-black rounded-lg">
                <table className="table table-compact w-full text-[11px]">
                    <thead className="bg-black text-white uppercase italic">
                        <tr>
                            <th>Fecha</th>
                            <th>Lote</th>
                            <th>Vehículo</th>
                            <th>Cliente</th>
                            <th className="text-right">Total Cobro</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaSesion.map((v, i) => (
                            <tr key={i} className="border-b font-bold hover:bg-gray-50">
                                <td>{moment(v.registro.timestamp).format("DD/MM/YYYY")}</td>
                                <td className="text-blue-700 font-black">{v.binNip}</td>
                                <td className="uppercase">{v.marca} {v.modelo}</td>
                                <td className="uppercase text-red-600">{v.clienteNombre}</td>
                                <td className="text-right font-black">${(v.flete + v.storage + v.sobrePeso + v.gastosExtra).toLocaleString()}</td>
                                <td><span className="badge badge-success text-[9px] text-white">LISTO</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RegistroMasivoVehiculos;