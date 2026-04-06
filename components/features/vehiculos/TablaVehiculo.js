import React, { useState } from "react";
import * as XLSX from "xlsx";

const TablaVehiculo = ({ movimientos, setMovimientos, editar }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Función para exportar a Excel
    const exportToExcel = () => {
        const dataWithoutId = movimientos.map((movimiento) => {
            const { id, ...rest } = movimiento;
            return { ...rest };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataWithoutId);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

        const now = new Date();
        const fileName = `movimientos_${now.toISOString().slice(0, 10)}.xlsx`;

        XLSX.writeFile(workbook, fileName);
    };

    // Función para manejar la paginación
    const handlePageChange = (direction) => {
        setCurrentPage((prev) => (direction === "next" ? prev + 1 : prev - 1));
    };

    // Calcular los elementos que se mostrarán en la página actual
    const indexOfLastMovement = currentPage * itemsPerPage;
    const indexOfFirstMovement = indexOfLastMovement - itemsPerPage;
    const currentMovimientos = movimientos.slice(indexOfFirstMovement, indexOfLastMovement);
    const totalPages = Math.ceil(movimientos.length / itemsPerPage);

    return (
        <div className="mt-8">
            {/* Botón de exportación a Excel */}
            <button
                onClick={exportToExcel}
                className="bg-green-500 text-white-100 px-4 py-2 rounded-lg mb-4"
            >
                Exportar a Excel
            </button>

            {isCopied && (
                <div role="alert" className="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none"
                         viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Copiado con éxito</span>
                </div>
            )}
            <h2 className="text-xl font-bold mb-2">Movimientos Agregados</h2>
            <div className="overflow-x-auto">
                <table id="tablaVehiculos" className="table w-full text-black-500">
                    <thead className="text-black-500">
                        <tr>
                            <th className="w-3/12">Cliente</th>
                            <th className="w-1/12">Bin o Nip</th>
                            <th className="w-1/12">GatePass / Lote</th>
                            <th className="w-2/12">Vehículo</th>
                            <th className="w-3/12">Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentMovimientos.map((movimiento, index) => (
                            <tr key={index}>
                                <td className="w-3/12">
                                    <div className="flex">
                                        <div className="w-1/12 text-xl m-2">{index + 1}</div>
                                        <div className="w-11/12">
                                            <div>{movimiento.cliente}</div>
                                            <div>
                                                <a href={`https://wa.me/${movimiento.telefonoCliente}`} target="_blank"
                                                   className="text-blue-500">
                                                    {movimiento.telefonoCliente}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="w-1/12 items-center">
                                    {editar ? (
                                        <p>{movimiento.binNip}</p>
                                    ) : (
                                        <div>
                                            <button
                                                className="btn btn-info btn-link btn-sm text-black-500"
                                                onClick={() => handleCopiarBin(movimiento.binNip)}
                                            >
                                                BIN o NUMERO DE LOTE
                                            </button>
                                            <button
                                                className="btn btn-info btn-link btn-sm text-black-500"
                                                onClick={() => handleCopiarWhats(movimiento.binNip)}
                                            >
                                                {movimiento.binNip}
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td className="w-1/12 items-center">
                                    {editar ? (
                                        <p>{movimiento.gatePass}</p>
                                    ) : (
                                        <div>
                                            GP:
                                            <button
                                                className="btn btn-info btn-link btn-sm text-black-500"
                                                onClick={() => handleCopiarGate(movimiento.gatePass)}
                                            >
                                                {movimiento.gatePass}
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td className="w-2/12">
                                    <div>{movimiento.marca}</div>
                                    <div>{movimiento.modelo}</div>
                                </td>
                                <td className="w-3/2">{movimiento.descripcion}</td>
                                {editar && (
                                    <td className="w-1/12">
                                        <button
                                            className="btn btn-danger btn-circle btn-sm"
                                            onClick={(event) => handleBorrarVehiculo(index, event)}
                                        >
                                            X
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Controles de Paginación */}
            <div className="flex justify-end mt-4 space-x-4">
                <button
                    onClick={() => handlePageChange("prev")}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                >
                    Anterior
                </button>
                <p>Página {currentPage} de {totalPages}</p>
                <button
                    onClick={() => handlePageChange("next")}
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary"
                >
                    Siguiente
                </button>
                <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                    className="select select-bordered"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
            </div>
        </div>
    );
};

export default TablaVehiculo;
