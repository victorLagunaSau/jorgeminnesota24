import React, { useEffect, useState } from "react";
import { firestore } from "../../firebase/firebaseIni";
import * as XLSX from "xlsx";

const Cobranza = () => {
    const [vehiculosConPagoPendiente, setVehiculosConPagoPendiente] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 20;

    useEffect(() => {
        const obtenerCobranza = () => {
            try {
                const unsubscribe = firestore()
                    .collection("vehiculos")
                    .where("pagosPendientes", "==", true) // Filtramos por pagosPendientes = true
                    .onSnapshot((vehiculosSnapshot) => {
                        const vehiculosConPagoPendiente = vehiculosSnapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        setVehiculosConPagoPendiente(vehiculosConPagoPendiente);
                    });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error al obtener los vehículos con pago pendiente:", error);
            }
        };

        obtenerCobranza();
    }, []);

    // Filtrado por término de búsqueda (cliente, vehículo, binNip, etc.)
    const filteredVehiculos = vehiculosConPagoPendiente.filter(
        (vehiculo) =>
            vehiculo.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehiculo.binNip.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1); // Resetear página cuando se cambia el filtro de búsqueda
    };

    // Función para exportar a Excel
    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredVehiculos);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cobranza");
        XLSX.writeFile(workbook, "cobranza.xlsx");
    };

    // Paginación
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    // Formato de moneda
    const formatCurrency = (value) => {
        if (value === null || value === undefined || value === 0) return '';
        return `$ ${parseFloat(value).toFixed(2)}`;
    };

    // Función para calcular la suma de los pagos
    const calculateTotalPayments = (vehiculo) => {
        const pagos = [
            vehiculo.pagos001,
            vehiculo.pagos002,
            vehiculo.pagos003,
            vehiculo.pagos004,
            vehiculo.pagos005
        ];
        return pagos.reduce((total, pago) => total + (pago || 0), 0);
    };

    // Función para manejar el pago
    const handlePayment = (vehiculoId) => {
        // Aquí podrías redirigir a una página de pago o abrir un modal para procesar el pago.
        console.log(`Pagar ahora para el vehículo con ID: ${vehiculoId}`);
    };

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="cobranza">
            <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
                <strong>Cobranza</strong>
            </h3>

            {/* Campo de búsqueda */}
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
                <button onClick={exportToExcel} className="btn bg-green-500 text-white-100 px-4 py-2 rounded-lg">
                    Exportar a Excel
                </button>
            </div>

            {/* Tabla de Cobranza */}
            <table className="table-auto w-full my-4">
                <thead>
                    <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Cliente</th>
                        <th className="px-4 py-2">Vehículo</th>
                        <th className="px-4 py-2">Costo total</th>
                        <th className="px-4 py-2">Pagos</th>
                        <th className="px-4 py-2">Total Pagos</th>
                        <th className="px-4 py-2">Pago Total Pendiente</th>
                        <th className="px-4 py-2">Acción</th> {/* Columna para el botón */}
                    </tr>
                </thead>
                <tbody>
                    {filteredVehiculos
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((vehiculo, index) => {
                            const totalPagos = calculateTotalPayments(vehiculo);
                            return (
                                <tr key={vehiculo.id}>
                                    <td className="border px-4 py-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="border px-4 py-2">{vehiculo.cliente}</td>
                                    <td className="border px-4 py-2">
                                        Mod: {vehiculo.modelo} Marca: {vehiculo.marca} Bin: {vehiculo.binNip}
                                    </td>
                                    <td className="border px-4 py-2">{formatCurrency(vehiculo.totalPago)}</td>

                                    {/* Pagos */}
                                    <td className="border px-4 py-2">
                                        {vehiculo.pagos001 ? <div>P1: {formatCurrency(vehiculo.pagos001)}</div> : null}
                                        {vehiculo.pagos002 ? <div>P2: {formatCurrency(vehiculo.pagos002)}</div> : null}
                                        {vehiculo.pagos003 ? <div>P3: {formatCurrency(vehiculo.pagos003)}</div> : null}
                                        {vehiculo.pagos004 ? <div>P4: {formatCurrency(vehiculo.pagos004)}</div> : null}
                                        {vehiculo.pagos005 ? <div>P5: {formatCurrency(vehiculo.pagos005)}</div> : null}
                                        {(!vehiculo.pagos001 && !vehiculo.pagos002 && !vehiculo.pagos003 && !vehiculo.pagos004 && !vehiculo.pagos005) && (
                                            <div>Pagos: $ 0.00</div>
                                        )}
                                    </td>

                                    <td className="border px-4 py-2">{formatCurrency(totalPagos)}</td>
                                    <td className="border px-4 py-2">{formatCurrency(vehiculo.pagoTotalPendiente)}</td>

                                    {/* Botón "Pagar ahora" */}
                                    <td className="border px-4 py-2 text-center">
                                        <button
                                            onClick={() => handlePayment(vehiculo.id)}
                                            className="btn bg-blue-500 text-white-500 px-4 py-2 rounded-lg"
                                        >
                                            Pagar ahora
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>

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

export default Cobranza;
