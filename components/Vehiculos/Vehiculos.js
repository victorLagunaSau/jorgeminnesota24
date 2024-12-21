import React, { useEffect, useState } from "react";
import { firestore } from "../../firebase/firebaseIni";
import * as XLSX from "xlsx";
import FormDatosVehiculo from "./FormDatosVehiculo";
import FormEditarVehiculo from "./FormEditarVehiculo";
import VehiculosTable from "./VehiculosTable"; // Importamos el componente de la tabla

const Vehiculos = ({ user }) => {
    const [vehiculosNoAsignados, setVehiculosNoAsignados] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("asc");
    const itemsPerPage = 20;

    const handleSortByDate = () => {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
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

                {/* Modals */}
                <dialog open={isRegisterModalOpen} className="modal">
                    <div className="modal-box w-11/12 max-w-5xl bg-white-100">
                        <FormDatosVehiculo user={user} onClose={() => setIsRegisterModalOpen(false)} />
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

            {/* Tabla de vehículos */}
            <VehiculosTable
                vehiculos={filteredVehiculos}
                statusFilter={statusFilter}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                handleCopiarBin={handleCopiarBin}
                handleCopiarWhats={handleCopiarWhats}
                handleEditClick={handleEditClick}
                sortOrder={sortOrder}
                handleSortByDate={handleSortByDate}
            />

            {/* Paginación */}
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
                    disabled={currentPage === Math.ceil(filteredVehiculos.length / itemsPerPage)}
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
};

export default Vehiculos;
