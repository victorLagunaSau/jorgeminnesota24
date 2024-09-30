import React, {useState} from "react";

const TablaVehiculo = ({movimientos, setMovimientos, editar}) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleBorrarVehiculo = (index, event) => {
        event.stopPropagation();
        setMovimientos(prevMovimientos => prevMovimientos.filter((_, i) => i !== index));
    };

    const handleCopiarWhats = (binNip) => {
        const textoACopiar =
            `El id de te vehiculos es ${binNip}:\n` +
            `Rastrea aqui tu vehiculo:\n` +
            `https://www.jorgeminnesota.com/rastreo#${binNip}\n`;

        navigator.clipboard.writeText(textoACopiar);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };
    const handleCopiarBin = (binNip) => {
        const textoACopiar = `${binNip}`;

        navigator.clipboard.writeText(textoACopiar);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };
    const handleCopiarGate = (gatePass) => {
        const textoACopiar =
            `GATE PASS/NUMERO COMPRADOR:\n` +
            `${gatePass}`;
        navigator.clipboard.writeText(textoACopiar);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };
    const handleCopiarLote = (gatePass) => {
        const textoACopiar =
            `Número de Lote:\n` +
            `${gatePass}`;
        navigator.clipboard.writeText(textoACopiar);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    return (
        <div className="mt-8">
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
                        <th className="w-1/12">
                            GatePass / Lote
                        </th>
                        <th className="w-2/12">Vehículo</th>
                        <th className="w-3/12">Descripción</th>
                    </tr>
                    </thead>
                    <tbody>
                    {movimientos.map((movimiento, index) => (
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
                                {editar ? (<p>{movimiento.binNip}</p>) : (
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
                                {editar ? (<p>{movimiento.gatePass}</p>) : (

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
                            {editar ? (
                                <td className="w-1/12">
                                    <button
                                        className="btn btn-danger btn-circle btn-sm"
                                        onClick={(event) => handleBorrarVehiculo(index, event)} // Pasar el evento
                                    >
                                        X
                                    </button>
                                </td>
                            ) : null}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TablaVehiculo;
