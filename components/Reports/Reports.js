import React, {useState} from "react";
import {firestore} from '../../firebase/firebaseIni';
import * as XLSX from 'xlsx'; // Importar la librería para exportar a Excel

const Report = () => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [searchTerm, setSearchTerm] = useState(""); // Estado para el buscador

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const startTimestamp = new Date(startDate).getTime();
            const endTimestamp = new Date(endDate).getTime();

            const movementsSnapshot = await firestore()
                .collection("movimientos")
                .where("timestamp", ">=", new Date(startTimestamp))
                .where("timestamp", "<=", new Date(endTimestamp))
                .get();

            const movementsData = movementsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            setMovements(movementsData);
        } catch (error) {
            console.error("Error fetching movements:", error);
        }
        setLoading(false);
    };

    // Filtrar movimientos según el término de búsqueda
    const filteredMovements = movements.filter(movement => {
        return (
            movement.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movement.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movement.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movement.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movement.binNip.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    // Calcular movimientos por página
    const indexOfLastMovement = currentPage * itemsPerPage;
    const indexOfFirstMovement = indexOfLastMovement - itemsPerPage;
    const currentMovements = filteredMovements.slice(indexOfFirstMovement, indexOfLastMovement);

    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

const exportToExcel = () => {
    // Exclude 'id' from the export
    const dataWithoutId = filteredMovements.map((movement, index) => {
        const { id, ...rest } = movement;  // Destructure to remove 'id'
        return {
            ...rest  // Return the rest of the fields without 'id'
        };
    });

    // Crear la hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(dataWithoutId);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

    // Obtener la fecha y hora actual para el nombre del archivo
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Mes actual (0 indexado)
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    // Formatear nombre del archivo con fecha y hora
    const fileName = `movimientos_${year}-${month}-${day}_${hours}-${minutes}.xlsx`;

    // Descargar el archivo Excel
    XLSX.writeFile(workbook, fileName);
};


    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="home">
            <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
                Reporte de <strong>Movimientos</strong>.
            </h3>

            <div className="flex flex-col md:flex-row md:items-center justify-between mt-4">
                <div className="mb-4 md:mb-0">
                    <label className="block text-black-500">Fecha Inicial:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                    />
                </div>
                <div className="mb-4 md:mb-0">
                    <label className="block text-black-500">Fecha Final:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                    />
                </div>
                <button
                    onClick={fetchMovements}
                    className="bg-red-500 text-white-100 px-4 py-2 rounded-lg"
                >
                    Aceptar
                </button>
            </div>

            {/* Buscador */}
            <div className="mt-4">
                <input
                    type="text"
                    placeholder="Buscar por Cliente, Ciudad, Estado, Modelo o Bin"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input input-bordered w-full max-w-lg"
                />
            </div>

            {/* Botón Exportar a Excel */}
            <div className="mt-4">
                <button
                    onClick={exportToExcel}
                    className="bg-green-500 text-white-100 px-4 py-2 rounded-lg"
                >
                    Exportar a Excel
                </button>
            </div>

            {loading ? (
                <p className="mt-4">Loading...</p>
            ) : (
                filteredMovements.length > 0 && (
                    <>
                        {/* Barra de desplazamiento superior */}
                        <div className="flex justify-end items-center mt-4 space-x-4">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{marginRight: '10px'}}
                            >
                                Anterior
                            </button>

                            <p className="mr-4">Página {currentPage} de {totalPages}</p>

                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{marginRight: '10px'}}
                            >
                                Siguiente
                            </button>

                            <div className="flex justify-end">
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                                    className="select select-bordered"
                                    style={{marginLeft: '10px'}}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        {/* Tabla de movimientos */}
                        <div className="overflow-x-auto mt-5">
                            <div className="w-full overflow-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Cliente</th>
                                        <th>Almacen</th>
                                        <th>Vehiculo</th>
                                        <th>Costos</th>
                                        <th>Viaje</th>
                                        <th>Responsable</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {currentMovements.map((movement, index) => (
                                        <tr key={movement.id}>
                                            <th>{indexOfFirstMovement + index + 1}</th>
                                            <td>
                                                <p>{movement.cliente}</p>
                                                <p>Telefono: {movement.telefonoCliente}</p>
                                            </td>
                                            <td className="w-32 truncate">
                                                <p>{movement.almacen}</p>
                                                <p>Bin: {movement.binNip}</p>
                                                <p>G/P: {movement.gatePass}</p>
                                                <p>Estado: {movement.estado}</p>
                                                <p>Ciudad: {movement.ciudad}</p>
                                            </td>
                                            <td className="w-28 truncate">
                                                <p>Marca: {movement.marca}</p>
                                                <p>Modelo: {movement.modelo}</p>
                                                <p>Precio: {movement.price}</p>
                                                <p>Tipo: {movement.tipoVehiculo}</p>
                                            </td>
                                            <td className="w-32 truncate">
                                                <p>Precio: {movement.price}</p>
                                                <p>Storage: {movement.storage}</p>
                                                <p>S/Peso: {movement.sobrePeso}</p>
                                                <p>Extras: {movement.gastosExtra}</p>
                                            </td>
                                            <td className="w-32 truncate">
                                                {new Date(movement.timestamp.seconds * 1000).toLocaleString()}
                                                <p>Estatus: {movement.estatus}</p>
                                                <p>Mov.: {movement.tipo}</p>
                                                <p>Descrip.: {movement.descripcion}</p>
                                            </td>
                                            <td>{movement.usuario}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Barra de desplazamiento inferior */}
                        <div className="flex justify-end items-center mt-4 space-x-4">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{marginRight: '10px'}}
                            >
                                Anterior
                            </button>

                            <p className="mr-4">Página {currentPage} de {totalPages}</p>

                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{marginRight: '10px'}}
                            >
                                Siguiente
                            </button>

                            <div className="flex justify-end">
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                                    className="select select-bordered"
                                    style={{marginLeft: '10px'}}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                    </>
                )
            )}
        </div>
    );
};

export default Report;
