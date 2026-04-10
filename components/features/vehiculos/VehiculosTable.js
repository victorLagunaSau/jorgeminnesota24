import React, { useState } from 'react';

const VehiculosTable = ({
    vehiculos,
    statusFilter,
    currentPage,
    itemsPerPage,
    handleCopiarBin,
    handleEditClick,
    sortOrder,
    handleSortByDate
}) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopiarWhats = (binNip) => {
        const textoACopiar = `El id de tu vehículo es ${binNip}:\nRastrea aquí tu vehículo:\nhttps://www.jorgeminnesota.com/rastreo#${binNip}\n`;
        navigator.clipboard.writeText(textoACopiar);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <table className="table-auto w-full my-4">
            <thead>
                <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2 flex items-center">
                        Est:
                        <select
                            className="ml-2 p-1 border border-gray-300 rounded-md"
                            value={statusFilter}
                            onChange={(e) => handleSortByDate(e.target.value)}
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
                            className="ml-4 p-1 border border-gray-300 rounded-md"
                            onClick={handleSortByDate}
                        >
                            {sortOrder === "asc" ? "Reg ^" : "Reg ˅"}
                        </button>
                    </th>
                    <th className="px-4 py-2">Viaja de:</th>
                    <th className="px-4 py-2">Almacen</th>
                    <th className="px-4 py-2">Vehículo</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Acciones</th>
                </tr>
            </thead>
            <tbody>
                {vehiculos
                    .filter((vehiculo) => {
                        if (statusFilter === "") return true;
                        return vehiculo.estatus === statusFilter;
                    })
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
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
    );
};

export default VehiculosTable;
