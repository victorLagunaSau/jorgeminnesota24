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
    const [ordenAscendente, setOrdenAscendente] = useState(true);
    const [filtroBinNip, setFiltroBinNip] = useState("");

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
    console.log(filteredVehiculos)
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

    const ordenarPorFecha = () => {
        const vehiculosOrdenados = [...filteredVehiculos].sort((a, b) => {
            const fechaA = a.registro?.timestamp?.seconds || 0;
            const fechaB = b.registro?.timestamp?.seconds || 0;
            return ordenAscendente ? fechaA - fechaB : fechaB - fechaA;
        });
        setVehiculosConPagoPendiente(vehiculosOrdenados);
        setOrdenAscendente(!ordenAscendente);
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
                    <th className="px-4 py-2 cursor-pointer" onClick={ordenarPorFecha}>
                        Cliente / Fecha de registro
                        <span className="ml-1 text-xs">
                            {ordenAscendente ? "▲" : "▼"}
                        </span>
                    </th>
                    <th className="px-4 py-2">
                        Vehículo / Bin/Nip
                    </th>
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

                            <td className="border px-4 py-2">
                                <div className="font-semibold">{vehiculo.cliente}</div>
                                <div className="text-sm text-gray-500">Registro:
                                    {vehiculo.registro?.timestamp?.seconds
                                        ? new Date(vehiculo.registro.timestamp.seconds * 1000).toLocaleDateString()
                                        : "Sin fecha"}
                                </div>
                            </td>


                            <td className="border px-4 py-2">
                                <   div className="font-semibold">{vehiculo.modelo}</div>
                                <div className="text-sm text-gray-500"> Bin/Nip: {vehiculo.binNip}</div>
                            </td>
                            <td className="border px-4 py-2">${vehiculo.pagoTotalPendiente || 0}</td>
                            <td className="border px-4 py-2">
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
