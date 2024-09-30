import React, { useState } from "react";
import EditarEstadosPrecios from "./EditarEstadosPrecios";

const TablaEstadosPrecios = ({ estados }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [currentRegions, setCurrentRegions] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar si el modal está abierto

    const itemsPerPage = 7;

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const filteredEstados = estados.filter((estado) =>
        estado.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredEstados.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(filteredEstados.length / itemsPerPage);

    const handleModalOpen = (data) => {
        setCurrentRegions(data);
        setIsModalOpen(true); // Abre el modal
    };

    const closeModal = () => {
        setIsModalOpen(false); // Cierra el modal
    };

    return (

        <div>

            <dialog id="my_modal_1" className="modal" open={isModalOpen}> {/* Asegúrate de agregar el atributo 'open' */}
                {currentRegions && <EditarEstadosPrecios currentRegions={currentRegions} closeModal={closeModal} />}
            </dialog>
            <div className="max-w-screen-xl mt-8 mb-6 sm:mt-14 sm:mb-14 sm:px-8 lg:px-16 mx-auto">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black-100 mx-auto text-center">
                    Estados Registrados
                </h3>
            </div>
            <div className="grid sm:grid-cols-2 grid-flow gap-2 bg-white-500 mb-3">
                <div className="label-text">
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input input-bordered input-primary min-w-[300px] w-full bg-white-500"
                    />
                </div>
                <div
                    className="label-text-alt"
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "flex-end",
                    }}
                >
                    <p className="text-sm m-2 text-black-100">Paginas:</p>
                    {totalPages > 1 && (
                        <div className="join m-2">
                            {Array.from({length: totalPages}, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(i + 1)}
                                    className={
                                        currentPage === i + 1
                                            ? "join-item btn btn-active text-primary"
                                            : " join-item btn"
                                    }
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto rounded-box">
                <table className="table bg-white-500  table-pin-rows table-pin-cols">
                    <thead>
                    <tr className={"text-black-100"}>
                        <th>#</th>
                        <th className="text-xl">Nombre</th>
                        <th>Regiones</th>
                        <th>Editar</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentItems.map((data, index) => (
                        <tr key={index}>
                            <td>{indexOfFirstItem + index + 1}</td>
                            <td>
                                <p className="text-lg">{data.state}</p>
                            </td>
                            <td>
                                {data.regionslength}
                            </td>
                            <td>
                                <button
                                    className="btn btn-link"
                                    onClick={() => handleModalOpen(data)}
                                >
                                    Editar
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <div
                    className="label-text-alt"
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "flex-end",
                    }}
                >
                    <p className="text-sm m-2 text-black-100">Paginas:</p>
                    {totalPages > 1 && (
                        <div className="join m-2">
                            {Array.from({length: totalPages}, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(i + 1)}
                                    className={
                                        currentPage === i + 1
                                            ? "join-item btn btn-active text-primary"
                                            : " join-item btn"
                                    }
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TablaEstadosPrecios;
