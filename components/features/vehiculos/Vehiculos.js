import React, {useEffect, useState} from "react";
import {firestore} from "../../../firebase/firebaseIni";
import * as XLSX from "xlsx";
import FormDatosVehiculo from "./FormDatosVehiculo";
import FormEditarVehiculo from "./FormEditarVehiculo";
import EntregadoVehiculo from './EntregadoVehiculo';

const Vehiculos = ({user}) => {
    const [vehiculosNoAsignados, setVehiculosNoAsignados] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEntregadoModalOpen, setIsEntregadoModalOpen] = useState(false);
    const [vehiculoIdEntregado, setVehiculoIdEntregado] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("desc");
    const itemsPerPage = 20;
    const ID_USUARIO_PERMITIDO = "BdRfEmYfd7ZLjWQHB06uuT6w2112";
    const isAdminMaster = user?.adminMaster === true;
    const edicionPermitida = isAdminMaster || user.id === ID_USUARIO_PERMITIDO;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetVehiculo, setDeleteTargetVehiculo] = useState(null);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState("");
    const CORRECT_PIN = "9571";

    const [isLoteModalOpen, setIsLoteModalOpen] = useState(false);
    const [loteTargetVehiculo, setLoteTargetVehiculo] = useState(null);
    const [nuevoLote, setNuevoLote] = useState("");
    const [loteError, setLoteError] = useState("");
    const [cambiandoLote, setCambiandoLote] = useState(false);


    const handleSortByDate = () => {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    };

    const handleEntregadoClick = (vehiculo) => {
        setSelectedVehiculo(vehiculo);
        setIsEntregadoModalOpen(true);
    };

    const handleCloseEntregadoModal = () => {
        setIsEntregadoModalOpen(false);
        setVehiculoIdEntregado(null);
    };

    useEffect(() => {
        const obtenerVehiculos = () => {
            try {
                const unsubscribe = firestore()
                    .collection("vehiculos")
                    .where("estatus", "!=", "EN")
                    .onSnapshot((vehiculosSnapshot) => {
                        const vehiculosNoAsignados = vehiculosSnapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        setVehiculosNoAsignados(vehiculosNoAsignados);
                    });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error al obtener los vehículos:", error);
            }
        };

        obtenerVehiculos();
    }, []);

    const filteredVehiculos = vehiculosNoAsignados.filter(
        (vehiculo) =>
            vehiculo.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.binNip.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedVehiculos = [...filteredVehiculos].sort((a, b) => {
        const dateA = a.registro?.timestamp
            ? new Date(a.registro.timestamp.seconds * 1000 + a.registro.timestamp.nanoseconds / 1000000)
            : new Date(0);
        const dateB = b.registro?.timestamp
            ? new Date(b.registro.timestamp.seconds * 1000 + b.registro.timestamp.nanoseconds / 1000000)
            : new Date(0);

        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    const currentItems = sortedVehiculos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1);
    };

    const handleCopiarWhats = (binNip) => {
        const textoACopiar = `El id de tu vehículo es ${binNip}:\nRastrea aquí tu vehículo:\nhttps://www.jorgeminnesota.com/rastreo#${binNip}\n`;
        navigator.clipboard.writeText(textoACopiar);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleCopiarBin = (binNip) => {
        navigator.clipboard.writeText(binNip);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const exportToExcel = () => {
        const vehiculosConFecha = filteredVehiculos.map((vehiculo) => {
            if (vehiculo.registro && vehiculo.registro.timestamp) {
                const fecha = new Date(
                    vehiculo.registro.timestamp.seconds * 1000 +
                    vehiculo.registro.timestamp.nanoseconds / 1000000
                );
                vehiculo.fechaRegistro = fecha.toLocaleString();
            }
            return vehiculo;
        });

        const worksheet = XLSX.utils.json_to_sheet(vehiculosConFecha);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vehículos");
        XLSX.writeFile(workbook, "vehiculos.xlsx");
    };

    const handleEditClick = (vehiculo) => {
        setSelectedVehiculo(vehiculo);
        setIsEditModalOpen(true);
    };

    const handleBorrarVehiculoClick = (vehiculo) => {
        setDeleteTargetVehiculo(vehiculo);
        setPinInput("");
        setIsDeleteModalOpen(true);
    };

    const handleCambiarLoteClick = (vehiculo) => {
        setLoteTargetVehiculo(vehiculo);
        setNuevoLote(vehiculo.binNip || "");
        setLoteError("");
        setIsLoteModalOpen(true);
    };

    const handleConfirmCambiarLote = async () => {
        setLoteError("");
        const loteAnterior = loteTargetVehiculo.binNip;
        const loteNuevo = nuevoLote.trim().toUpperCase();

        if (!loteNuevo) { setLoteError("Ingresa un número de lote"); return; }
        if (loteNuevo === loteAnterior) { setLoteError("El lote es el mismo que el actual"); return; }

        setCambiandoLote(true);
        try {
            const db = firestore();

            const existeNuevo = await db.collection("vehiculos").doc(loteNuevo).get();
            if (existeNuevo.exists) {
                setLoteError(`El lote ${loteNuevo} ya existe en vehículos`);
                setCambiandoLote(false);
                return;
            }
            const existeTransito = await db.collection("lotesEnTransito").doc(loteNuevo).get();
            if (existeTransito.exists) {
                setLoteError(`El lote ${loteNuevo} está en tránsito`);
                setCambiandoLote(false);
                return;
            }

            const vehiculoData = { ...loteTargetVehiculo, binNip: loteNuevo };
            delete vehiculoData.id;

            const batch = db.batch();

            batch.set(db.collection("vehiculos").doc(loteNuevo), vehiculoData);
            batch.delete(db.collection("vehiculos").doc(loteAnterior));

            const movSnap = await db.collection("movimientos").where("binNip", "==", loteAnterior).get();
            movSnap.forEach(doc => batch.update(doc.ref, { binNip: loteNuevo }));

            const transitoDoc = await db.collection("lotesEnTransito").doc(loteAnterior).get();
            if (transitoDoc.exists) {
                batch.set(db.collection("lotesEnTransito").doc(loteNuevo), transitoDoc.data());
                batch.delete(db.collection("lotesEnTransito").doc(loteAnterior));
            }

            for (const col of ["viajesPendientes", "viajesPagados"]) {
                const snap = await db.collection(col).get();
                snap.forEach(doc => {
                    const data = doc.data();
                    if (Array.isArray(data.vehiculos) && data.vehiculos.some(v => v.lote === loteAnterior)) {
                        const nuevos = data.vehiculos.map(v => v.lote === loteAnterior ? { ...v, lote: loteNuevo } : v);
                        batch.update(doc.ref, { vehiculos: nuevos });
                    }
                });
            }

            await batch.commit();

            alert(`Lote cambiado de ${loteAnterior} a ${loteNuevo} correctamente.`);
            setIsLoteModalOpen(false);
            setLoteTargetVehiculo(null);
            setNuevoLote("");
        } catch (e) {
            console.error("Error al cambiar lote:", e);
            setLoteError("Error al cambiar el lote: " + e.message);
        } finally {
            setCambiandoLote(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (pinInput !== CORRECT_PIN) {
            alert("PIN incorrecto");
            return;
        }

        try {
            const firestoreInstance = firestore();

            await firestoreInstance.collection("vehiculos").doc(deleteTargetVehiculo.id).delete();

            const movimientosSnapshot = await firestoreInstance
                .collection("movimientos")
                .where("binNip", "==", deleteTargetVehiculo.id)
                .get();

            const batch = firestoreInstance.batch();
            movimientosSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Liberar lote en tránsito si aún existe, para permitir reutilización
            const transitoDoc = await firestoreInstance
                .collection("lotesEnTransito")
                .doc(deleteTargetVehiculo.id)
                .get();
            if (transitoDoc.exists) {
                batch.delete(transitoDoc.ref);
            }

            await batch.commit();

            alert("Vehículo y movimientos eliminados con éxito.");
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error al eliminar el vehículo.");
        } finally {
            setIsDeleteModalOpen(false);
            setDeleteTargetVehiculo(null);
        }
    };

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="clientes">
            {/* HEADER MODERNIZADO */}
            <div className="mb-6">
                <h2 className="text-3xl font-black text-black uppercase italic tracking-tighter">
                    Vehículos
                </h2>
                <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-1">
                    {sortedVehiculos.length} vehículos en sistema
                </p>
            </div>

            {isEntregadoModalOpen && (
                <EntregadoVehiculo
                    user={user}
                    vehiculo={selectedVehiculo}
                    onClose={handleCloseEntregadoModal}
                />
            )}

            <div className="flex flex-col w-full my-4">
                {/* BOTONES DE ACCIÓN */}
                <div className="flex justify-end gap-3 mb-4">
                    <button
                        onClick={exportToExcel}
                        className="btn bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs border-none"
                    >
                        Exportar a Excel
                    </button>
                    {/*
    <button
        className="btn btn-error text-white font-black uppercase text-xs"
        onClick={() => setIsRegisterModalOpen(true)}
    >
        + Registra Vehículo
    </button>
    */}
                </div>

                {/* MODAL REGISTRAR */}
                <dialog open={isRegisterModalOpen} className="modal">
                    <div className="modal-box w-11/12 max-w-5xl bg-white">
                        <FormDatosVehiculo user={user} onClose={() => setIsRegisterModalOpen(false)}/>
                    </div>
                </dialog>

                {/* MODAL EDITAR */}
                <dialog open={isEditModalOpen} className="modal">
                    <div className="modal-box w-11/12 max-w-5xl bg-white">
                        {selectedVehiculo && (
                            <FormEditarVehiculo vehiculo={selectedVehiculo} onClose={() => {
                                setSelectedVehiculo(null);
                                setIsEditModalOpen(false);
                            }}/>
                        )}
                    </div>
                </dialog>
            </div>

            {/* TOAST COPIADO */}
            {isCopied && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full font-bold shadow-lg z-[70]">
                    Copiado al portapapeles
                </div>
            )}

            <div className="flex flex-col w-full my-4">
                {/* BUSCADOR MODERNIZADO */}
                <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden">
                    <input
                        type="text"
                        placeholder="Buscar por estado, ciudad, BIN, modelo o cliente..."
                        value={searchTerm}
                        onChange={handleSearchTermChange}
                        className="input-lg w-full border-none px-4 py-2 font-semibold text-black"
                    />
                </div>

                {/* TABLA MODERNIZADA */}
                <table className="table-auto w-full my-4 border-collapse">
                    <thead>
                    <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-black text-black uppercase text-xs">#</th>
                        <th className="px-4 py-3 text-left font-black text-black uppercase text-xs">
                            <div className="flex items-center gap-2">
                                Est:
                                <select
                                    className="select select-sm border-black font-bold text-xs text-black"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="PR">Registrado</option>
                                    <option value="IN">Cargando</option>
                                    <option value="TR">En Viaje</option>
                                    <option value="EB">En Brownsville</option>
                                    <option value="DS">Descargado</option>
                                    <option value="EN">Entregado</option>
                                </select>
                                <button
                                    className="btn btn-xs btn-outline border-black text-black font-bold"
                                    onClick={handleSortByDate}
                                >
                                    {sortOrder === "asc" ? "Reg ↑" : "Reg ↓"}
                                </button>
                            </div>
                        </th>
                        <th className="px-4 py-3 text-left font-black text-black uppercase text-xs">Viaja de:</th>
                        <th className="px-4 py-3 text-left font-black text-black uppercase text-xs">Almacen</th>
                        <th className="px-4 py-3 text-left font-black text-black uppercase text-xs">Vehículo</th>
                        <th className="px-4 py-3 text-left font-black text-black uppercase text-xs">Cliente</th>
                        <th className="px-4 py-3 text-left font-black text-black uppercase text-xs">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentItems
                        .filter((vehiculo) => {
                            if (statusFilter === "") return true;
                            return vehiculo.estatus === statusFilter;
                        })
                        .map((vehiculo, index) => (
                            <tr key={vehiculo.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-bold text-black">
                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                </td>

                                <td className="px-4 py-3">
                                    <div className="text-sm font-black text-black">
                                        {vehiculo.registro.timestamp ?
                                            new Date(vehiculo.registro.timestamp.seconds * 1000 + vehiculo.registro.timestamp.nanoseconds / 1000000).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '-'}
                                    </div>
                                    <div className="text-[10px] font-bold text-black mt-1">
                                        {vehiculo.estatus === "PR" && "Registrado"}
                                        {vehiculo.estatus === "IN" && "Cargando"}
                                        {vehiculo.estatus === "TR" && "En Viaje"}
                                        {vehiculo.estatus === "EB" && "En Brownsville"}
                                        {vehiculo.estatus === "DS" && "Descargado"}
                                        {vehiculo.estatus === "EN" && "Entregado"}
                                    </div>
                                </td>

                                <td className="px-4 py-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-black uppercase">Estado:</p>
                                        <strong className="text-black text-lg font-black uppercase">{vehiculo.estado}</strong>
                                        <p className="text-[9px] font-bold text-black uppercase mt-1">Ciudad:</p>
                                        <strong className="text-black font-bold">{vehiculo.ciudad}</strong>
                                        <p className="text-[9px] font-bold text-black uppercase mt-1">Almacen: <strong className="text-black">{vehiculo.almacen}</strong></p>
                                    </div>
                                </td>

                                <td className="px-4 py-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-black uppercase">Bin o Lote:</p>
                                        <button
                                            className="font-mono font-black text-black text-lg hover:underline transition-colors"
                                            onClick={() => handleCopiarBin(vehiculo.binNip)}
                                        >
                                            {vehiculo.binNip}
                                        </button>
                                        {vehiculo.numViaje && (
                                            <>
                                                <p className="text-[9px] font-bold text-black uppercase mt-1">Viaje:</p>
                                                <strong className="text-black font-black">#{vehiculo.numViaje}</strong>
                                            </>
                                        )}
                                    </div>
                                </td>

                                <td className="px-4 py-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-black uppercase">Modelo:</p>
                                        <strong className="text-black font-bold">{vehiculo.modelo}</strong>
                                    </div>
                                </td>

                                <td className="px-4 py-3">
                                    <strong className="text-black font-black">{vehiculo.cliente}</strong>
                                </td>

                                <td className="px-4 py-3">
                                    <div className="flex flex-col gap-2">
                                        <button
                                            className="btn btn-xs btn-outline border-black text-black hover:bg-black hover:text-white font-bold"
                                            onClick={() => handleEditClick(vehiculo)}
                                            disabled={!edicionPermitida}
                                        >
                                            Editar
                                        </button>

                                        <button
                                            className="btn btn-xs btn-outline border-black text-black hover:bg-black hover:text-white font-bold"
                                            onClick={() => handleEntregadoClick(vehiculo)}
                                            disabled={!edicionPermitida}
                                        >
                                            Entregado
                                        </button>

                                        {edicionPermitida && (
                                            <>
                                                <button
                                                    className="btn btn-xs btn-outline border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white font-bold"
                                                    onClick={() => handleCambiarLoteClick(vehiculo)}
                                                >
                                                    Cambiar Lote
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-outline border-red-600 text-red-700 hover:bg-red-600 hover:text-white font-bold"
                                                    onClick={() => handleBorrarVehiculoClick(vehiculo)}
                                                >
                                                    Borrar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PAGINACIÓN MODERNIZADA */}
            <div className="flex justify-between items-center my-6 pt-4">
                <button
                    className="btn btn-sm btn-outline border-black text-black hover:bg-black hover:text-white font-bold"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    ← Anterior
                </button>
                <span className="text-sm font-bold text-black">
                    Página {currentPage} de {Math.ceil(filteredVehiculos.length / itemsPerPage) || 1}
                </span>
                <button
                    className="btn btn-sm btn-outline border-black text-black hover:bg-black hover:text-white font-bold"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= filteredVehiculos.length}
                >
                    Siguiente →
                </button>
            </div>

            {/* MODAL CAMBIAR LOTE */}
            <dialog className="modal" open={isLoteModalOpen}>
                <div className="modal-box bg-white border-2 border-blue-600">
                    <h3 className="font-black text-xl uppercase text-black">Cambiar Número de Lote</h3>
                    <p className="py-2 text-black font-semibold text-sm">
                        Lote actual: <span className="font-mono font-black">{loteTargetVehiculo?.binNip}</span>
                    </p>
                    <p className="pb-3 text-xs text-gray-600">
                        Se actualizará el vehículo y todas sus referencias (movimientos, viajes).
                    </p>

                    <input
                        type="text"
                        value={nuevoLote}
                        onChange={(e) => setNuevoLote(e.target.value.toUpperCase())}
                        className="input input-bordered border-blue-600 w-full mb-2 text-center text-lg font-mono font-black tracking-wider text-black uppercase"
                        placeholder="NUEVO LOTE"
                        maxLength={30}
                    />
                    {loteError && <p className="text-red-600 text-xs font-bold mb-2">{loteError}</p>}

                    <div className="modal-action flex justify-between">
                        <button
                            className="btn btn-outline border-black text-black hover:bg-black hover:text-white font-bold"
                            onClick={() => {
                                setIsLoteModalOpen(false);
                                setLoteTargetVehiculo(null);
                                setNuevoLote("");
                                setLoteError("");
                            }}
                            disabled={cambiandoLote}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn bg-blue-600 text-white hover:bg-blue-700 border-none font-black"
                            onClick={handleConfirmCambiarLote}
                            disabled={cambiandoLote}
                        >
                            {cambiandoLote ? "Cambiando..." : "Confirmar Cambio"}
                        </button>
                    </div>
                </div>
            </dialog>

            {/* MODAL ELIMINAR */}
            <dialog id="modal_borrar_vehiculo" className="modal" open={isDeleteModalOpen}>
                <div className="modal-box bg-white border-2 border-black">
                    <h3 className="font-black text-xl uppercase text-black">Confirmar eliminación</h3>
                    <p className="py-4 text-black font-semibold">Ingresa el PIN de 4 dígitos para confirmar:</p>

                    <input
                        type="password"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        maxLength={4}
                        className="input input-bordered border-black w-full mb-4 text-center text-2xl font-mono tracking-widest text-black"
                        placeholder="****"
                    />

                    <div className="modal-action flex justify-between">
                        <button
                            className="btn btn-outline border-black text-black hover:bg-black hover:text-white font-bold"
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setDeleteTargetVehiculo(null);
                                setPinInput("");
                            }}
                        >
                            Cancelar
                        </button>
                        <button className="btn bg-black text-white hover:bg-white hover:text-black border border-black font-black" onClick={handleConfirmDelete}>
                            Confirmar Borrado
                        </button>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default Vehiculos;
