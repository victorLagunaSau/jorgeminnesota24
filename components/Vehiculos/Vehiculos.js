import React, {useEffect, useState} from "react";
import {motion} from "framer-motion";
import {firestore} from "../../firebase/firebaseIni";
import * as XLSX from "xlsx";
import FormDatosVehiculo from "./FormDatosVehiculo";
import FormEditarVehiculo from "./FormEditarVehiculo";

const Vehiculos = ({user}) => {
    const [vehiculosNoAsignados, setVehiculosNoAsignados] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const itemsPerPage = 20;
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        const obtenerVehiculos = () => {
            try {
                const unsubscribe = firestore()
                    .collection('vehiculos')
                    .where('estatus', '!=', 'EN')
                    .onSnapshot((vehiculosSnapshot) => {
                        const vehiculosNoAsignados = vehiculosSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                        setVehiculosNoAsignados(vehiculosNoAsignados);
                    });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error al obtener los vehículos:", error);
            }
        };

        obtenerVehiculos();
    }, []);


    const filteredVehiculos = vehiculosNoAsignados.filter(vehiculo =>
        vehiculo.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehiculo.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehiculo.binNip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehiculo.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSearchTermChange = event => {
        setSearchTerm(event.target.value);
        setCurrentPage(1);
    };

    const handleCopiarWhats = (binNip) => {
        const textoACopiar =
            `El id de tu vehículo es ${binNip}:\n` +
            `Rastrea aquí tu vehículo:\n` +
            `https://www.jorgeminnesota.com/rastreo#${binNip}\n`;

        navigator.clipboard.writeText(textoACopiar);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    const handleCopiarBin = (binNip) => {
        navigator.clipboard.writeText(binNip);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

const exportToExcel = () => {
    // Preprocesar los datos para convertir las fechas a un formato legible
    const vehiculosConFecha = filteredVehiculos.map(vehiculo => {
        // Verificar si el campo de fecha existe y convertirlo a una cadena legible
        if (vehiculo.registro && vehiculo.registro.timestamp) {
            const fecha = new Date(vehiculo.registro.timestamp.seconds * 1000 + vehiculo.registro.timestamp.nanoseconds / 1000000);
            vehiculo.fechaRegistro = fecha.toLocaleString(); // Agregar la fecha formateada a un nuevo campo
        }
        return vehiculo;
    });

    // Crear la hoja de Excel
    const worksheet = XLSX.utils.json_to_sheet(vehiculosConFecha);

    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Agregar la hoja de trabajo al libro de trabajo
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehículos");

    // Exportar el archivo Excel
    XLSX.writeFile(workbook, "vehiculos.xlsx");
};

    const currentItems = filteredVehiculos.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleEditClick = (vehiculo) => {
        setSelectedVehiculo(vehiculo);
        setIsEditModalOpen(true);
    };

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="clientes">
            <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
                <strong>Vehículos</strong>
            </h3>
            <div className="flex flex-col w-full my-4">
                <div className="flex justify-end">
                    <button onClick={exportToExcel} className=" btn bg-green-500 text-white-100 px-4 py-2 rounded-lg">
                        Exportar a Excel
                    </button>
                    <button
                        className="ml-10 btn btn-outline btn-error"
                        onClick={() => setIsRegisterModalOpen(true)}
                    >
                        + Registra Vehículo
                    </button>

                </div>


                <dialog open={isRegisterModalOpen} className="modal">
                    <div className="modal-box w-11/12 max-w-5xl bg-white-100">
                        <FormDatosVehiculo user={user} onClose={() => setIsRegisterModalOpen(false)}/>
                    </div>
                </dialog>

                <dialog open={isEditModalOpen} className="modal">
                    <div className="modal-box w-11/12 max-w-5xl bg-white-100">
                        {selectedVehiculo && (
                            <FormEditarVehiculo vehiculo={selectedVehiculo} onClose={() => {
                                setSelectedVehiculo(null);
                                setIsEditModalOpen(false);
                            }}/>
                        )}
                    </div>
                </dialog>
            </div>
            {isCopied && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="modal modal-open">
                        <div className="modal-box">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 className="stroke-current text-green-500 h-6 w-6 mx-auto mb-4" fill="none"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <p className="text-lg font-medium text-center">Copiado con éxito</p>
                            <div className="modal-action">
                                <button
                                    onClick={() => setIsCopied(false)}
                                    className="btn btn-outline btn-error"
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col w-full my-4">
                <div className="flex border-2 border-primary rounded-md">
                    <input
                        type="text"
                        placeholder="Buscar por estado, ciudad, BIN, modelo o cliente..."
                        value={searchTerm}
                        onChange={handleSearchTermChange}
                        className="input-lg w-full border-gray-300 rounded-l-md px-4 py-2"
                    />
                </div>

                <table className="table-auto w-full my-4">
                    <thead>
                    <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">
                            Estatus:
                            <select
                                className="ml-2 p-1 border border-gray-300 rounded-md"
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
                        </th>
                        <th className="px-4 py-2">Viaja de:</th>
                        <th className="px-4 py-2">Almacen</th>
                        <th className="px-4 py-2">Vehículo</th>
                        <th className="px-4 py-2">Cliente</th>
                        <th className="px-4 py-2">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentItems
                        .filter((vehiculo) => {
                            if (statusFilter === "") return true;
                            return vehiculo.estatus === statusFilter;
                        })
                        .map((vehiculo, index) => (
                            <tr key={vehiculo.id}>
                                <td className="border px-4 py-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>

                                <td className="border px-4 py-2">
                                    {vehiculo.estatus === "PR" &&
                                        <span className="text-black-500 text-xs">Estatus: Registrado</span>}
                                    {vehiculo.estatus === "IN" &&
                                        <span className="text-black-500 text-xs">Estatus: Cargando</span>}
                                    {vehiculo.estatus === "TR" &&
                                        <span className="text-black-500 text-xs">Estatus: En Viaje</span>}
                                    {vehiculo.estatus === "EB" &&
                                        <span className="text-black-500 text-xs">Estatus: En Brownsville</span>}
                                    {vehiculo.estatus === "DS" &&
                                        <span className="text-black-500 text-xs">Estatus: Descargado</span>}
                                    {vehiculo.estatus === "EN" &&
                                        <span className="text-black-500 text-xs">Estatus: Entregado</span>}
                                     <div className="text-black-500 text-xs"> registrado:<br/>
                                    {vehiculo.registro.timestamp ?
                                        new Date(vehiculo.registro.timestamp.seconds * 1000 + vehiculo.registro.timestamp.nanoseconds / 1000000).toLocaleString()
                                        : 'Fecha no asignada'}
                                </div>

                                </td>
                                <td className="border px-4 py-2">
                                    <div>
                                        <p>Estado: </p>
                                        <strong className="text-black-500 text-xl">{vehiculo.estado}</strong>
                                        <p>Ciudad: </p>
                                        <strong className="text-black-500 text-xl">{vehiculo.ciudad}</strong>
                                        <p>Almacen: <strong className="text-black-500">{vehiculo.almacen}</strong></p>
                                    </div>
                                </td>
                                <td className="border px-4 py-2">
                                    <div>
                                        <p>Bin o Lote:</p>
                                        <button
                                            className="btn btn-link btn-sm text-black-500 text-xl"
                                            onClick={() => handleCopiarBin(vehiculo.binNip)}
                                        >
                                            {vehiculo.binNip}
                                        </button>
                                        <p>Gate Pass/Cliente:</p>
                                        <strong className="text-black-500">{vehiculo.gatePass}</strong>
                                    </div>
                                    <button
                                        className="btn btn-outline btn-accent"
                                        onClick={() => handleCopiarWhats(vehiculo.binNip)}
                                    >
                                        Copiar WhatsApp
                                    </button>
                                </td>
                                <td className="border px-4 py-2">
                                    <div>
                                        <p>Modelo: </p>
                                        <strong className="text-black-500">{vehiculo.modelo}</strong>
                                        <p>Tipo: </p>
                                        <strong className="text-black-500">{vehiculo.tipo}</strong>
                                    </div>
                                </td>
                                <td className="border px-4 py-2">
                                    <strong>{vehiculo.cliente}</strong>
                                </td>
                                <td className="border px-4 py-2">
                                    <button
                                        className="btn btn-outline btn-primary"
                                        onClick={() => handleEditClick(vehiculo)}
                                    >
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>
            <div className="flex justify-between my-4">
                <button
                    className="btn btn-outline btn-secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Anterior
                </button>
                <button
                    className="btn btn-outline btn-secondary"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= filteredVehiculos.length}
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
};

export default Vehiculos;
