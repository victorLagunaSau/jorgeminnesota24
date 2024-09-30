import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { firestore } from "../../firebase/firebaseIni";
import FormDatosVehiculo from "./FormDatosVehiculo";
import FormEditarVehiculo from "./FormEditarVehiculo";

const Vehiculos = ({ user }) => {
    const [vehiculosNoAsignados, setVehiculosNoAsignados] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedVehiculo, setSelectedVehiculo] = useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false); // Para el modal de registro
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Para el modal de edición
    const itemsPerPage = 20;

    useEffect(() => {
        const obtenerVehiculos = () => {
            try {
                const unsubscribe = firestore()
                    .collection('vehiculos')
                    .where('asignado', '==', false)
                    .onSnapshot((vehiculosSnapshot) => {
                        const vehiculosNoAsignados = vehiculosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    const handlePageChange = (direction) => {
        if (direction === 'next') {
            setCurrentPage((prevPage) => prevPage + 1);
        } else if (direction === 'prev') {
            setCurrentPage((prevPage) => prevPage - 1);
        }
    };

    const currentItems = filteredVehiculos.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleEditClick = (vehiculo) => {
        setSelectedVehiculo(vehiculo);
        setIsEditModalOpen(true); // Abrir modal de edición
    };

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="clientes">
            <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
                <strong>Vehículos</strong>
            </h3>
            <div className="flex flex-col w-full my-4">
                <motion.h3 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black-100 mx-auto text-center">
                    <button
                        className="btn btn-outline btn-error"
                        onClick={() => setIsRegisterModalOpen(true)} // Abrir modal de registro
                    >
                        + Registra Vehículo
                    </button>
                </motion.h3>

                {/* Modal de registro */}
                <dialog open={isRegisterModalOpen} className="modal">
                    <div className="modal-box w-11/12 max-w-5xl bg-white-100">
                        <FormDatosVehiculo user={user} onClose={() => setIsRegisterModalOpen(false)} />
                    </div>
                </dialog>

                {/* Modal de edición */}
                <dialog open={isEditModalOpen} className="modal">
                    <div className="modal-box w-11/12 max-w-5xl bg-white-100">
                        {selectedVehiculo && (
                            <FormEditarVehiculo vehiculo={selectedVehiculo} onClose={() => {
                                setSelectedVehiculo(null);
                                setIsEditModalOpen(false); // Cerrar modal de edición
                            }} />
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
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                            <th className="px-4 py-2">Viaja de:</th>
                            <th className="px-4 py-2">Almacen</th>
                            <th className="px-4 py-2">Vehículo</th>
                            <th className="px-4 py-2">Cliente</th>
                            <th className="px-4 py-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map((vehiculo, index) => (
                            <tr key={vehiculo.id}>
                                <td className="border px-4 py-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                                        <strong className="text-black-500">{vehiculo.tipoVehiculo}</strong>
                                    </div>
                                </td>
                                <td className="border px-4 py-2">
                                    <div>
                                        <p>Cliente: </p>
                                        <strong className="text-black-500">{vehiculo.cliente}</strong>
                                        <p>Telefono: </p>
                                        <strong className="text-black-500">
                                            <a href={`https://wa.me/${vehiculo.telefonoCliente}`} target="_blank"
                                                className="text-blue-500">
                                                {vehiculo.telefonoCliente}
                                            </a>
                                        </strong>
                                    </div>
                                </td>
                                <td className="border px-4 py-2">
                                    <button
                                        className="btn btn-outline btn-warning"
                                        onClick={() => handleEditClick(vehiculo)}
                                    >
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between my-4">
                    <button
                        className="btn btn-outline btn-secondary"
                        onClick={() => handlePageChange('prev')}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </button>
                    <button
                        className="btn btn-outline btn-secondary"
                        onClick={() => handlePageChange('next')}
                        disabled={currentPage * itemsPerPage >= filteredVehiculos.length}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Vehiculos;
