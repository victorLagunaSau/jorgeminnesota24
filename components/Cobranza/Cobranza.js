import React, {useEffect, useState} from "react";
import {firestore} from "../../firebase/firebaseIni";
import * as XLSX from "xlsx";
import PagosPendientes from "./PagosPendientes";

const Cobranza = ({user}) => {
    const [vehiculosConPagoPendiente, setVehiculosConPagoPendiente] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 20;
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedVehiculoId, setSelectedVehiculoId] = useState(null);

    useEffect(() => {
        const obtenerCobranza = () => {
            try {
                const unsubscribe = firestore()
                    .collection("vehiculos")
                    .where("pagosPendientes", "==", true)
                    .onSnapshot((vehiculosSnapshot) => {
                        const vehiculos = vehiculosSnapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        setVehiculosConPagoPendiente(vehiculos);
                    });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error al obtener los vehículos con pago pendiente:", error);
            }
        };

        obtenerCobranza();
    }, []);

    const filteredVehiculos = vehiculosConPagoPendiente.filter(
        (vehiculo) =>
            vehiculo.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.binNip.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredVehiculos);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cobranza");
        XLSX.writeFile(workbook, "cobranza.xlsx");
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleOpenModal = (vehiculoId) => {
        setSelectedVehiculoId(vehiculoId);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedVehiculoId(null);
        setModalOpen(false);
    };

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="cobranza">
            <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
                <strong>Cobranza</strong>
            </h3>

            <div className="my-4">
                <input
                    type="text"
                    placeholder="Buscar por cliente, vehículo o binNip"
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    className="input input-bordered w-full max-w-xs"
                />
            </div>

            <div className="flex justify-end my-4">
                <button
                    onClick={exportToExcel}
                    className="btn bg-green-500 text-white-100 px-4 py-2 rounded-lg"
                >
                    Exportar a Excel
                </button>
            </div>
            <div className="flex justify-start mt-4 space-x-2">
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Anterior
                </button>
                <span className="flex items-center text-sm px-2">
                    Página {currentPage} de {Math.ceil(filteredVehiculos.length / itemsPerPage)}
                </span>
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= filteredVehiculos.length}
                >
                    Siguiente
                </button>
            </div>
            <table className="table-auto w-full my-4">
                <thead>
                <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Vehículo</th>
                    <th className="px-4 py-2">Pago Total Pendiente</th>
                    <th className="px-4 py-2">Acción</th>
                </tr>
                </thead>
                <tbody>
                {filteredVehiculos
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((vehiculo, index) => (
                        <tr key={vehiculo.id}>
                            <td className="border px-4 py-2">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>
                            <td className="border px-4 py-2">{vehiculo.cliente}</td>
                            <td className="border px-4 py-2">{vehiculo.modelo}</td>
                            <td className="border px-4 py-2">${vehiculo.pagoTotalPendiente || 0}</td>
                            <td>
                                <button
                                    className="btn btn-info btn-sm"
                                    onClick={() => handleOpenModal(vehiculo.id)}
                                >
                                    Pagar ahora
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-start mt-4 space-x-2">
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Anterior
                </button>
                <span className="flex items-center text-sm px-2">
                    Página {currentPage} de {Math.ceil(filteredVehiculos.length / itemsPerPage)}
                </span>
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= filteredVehiculos.length}
                >
                    Siguiente
                </button>
            </div>

            {modalOpen && selectedVehiculoId && (
                <PagosPendientes
                    vehiculoId={selectedVehiculoId}
                    onClose={handleCloseModal}
                    user={user}
                />
            )}
        </div>
    );
};

export default Cobranza;
