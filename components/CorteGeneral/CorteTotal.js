import React, {useState, useRef} from "react";
import {firestore} from "../../firebase/firebaseIni";
import ReactToPrint from "react-to-print";
import TablaVehiculos from "./TablaVehiculos";
import TablaEntradas from "./TablaEntradas";
import TablaSalidas from "./TablaSalidas";

// Componente para mostrar e imprimir la tabla de movimientos
const ReporteMovimientos = React.forwardRef(({
                                                 startDate,
                                                 endDate,
                                                 vehiculosData,
                                                 totalPago,
                                                 totalCaja,
                                                 totalCC,
                                                 totalPendientes,
                                                 entradasData,
                                                 totalRecibido,
                                                 salidasData,
                                                 totalSalidas
                                             }, ref) => (
    <div ref={ref} className="m-4" style={{maxWidth: "90%", marginLeft: "auto", marginRight: "auto"}}>
        <div className="encabezado-impresion w-full flex justify-between border-t border-gray-300 pt-1 hidden-print">
            <img src="/assets/Logoprint.png" className="w-15 mr-2" alt="Logo"/>
            <p className="text-gray-400">Reporte general del {startDate} al {endDate}</p>
        </div>
        <h3 className="mt-8 text-xl font-semibold">Reporte del período: {startDate} al {endDate}</h3>

        {/* Tabla de Vehículos */}
        <TablaVehiculos
            vehiculosData={vehiculosData}
            totalPago={totalPago}
            totalCaja={totalCaja}
            totalCC={totalCC}
            totalPendientes={totalPendientes}
        />

        {/* Tabla de Entradas */}
        <TablaEntradas entradasData={entradasData} totalRecibido={totalRecibido}/>

        {/* Tabla de Salidas */}
        <TablaSalidas salidasData={salidasData} totalSalidas={totalSalidas}/>

        <div className="mt-4 border-t border-gray-300 pt-4">
            <h3 className="text-xl font-semibold">Resumen de Efectivo</h3>
            <table className="table-auto w-full border-collapse border border-gray-200 mt-2">
                <tbody>
                <tr>
                    <td className="border px-4 py-2 font-semibold">Total en Caja Vehículos:</td>
                    <td className="border px-4 py-2 font-semibold text-right">
                        ${totalCaja.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-semibold">Total en Caja CC:</td>
                    <td className="border px-4 py-2 font-semibold text-right">
                        ${totalCC.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-semibold">Total de Entradas:</td>
                    <td className="border px-4 py-2 font-semibold text-right">
                        ${totalRecibido.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-bold">Total Ingresos:</td>
                    <td className="border px-4 py-2 font-bold text-right">
                        ${(
                        totalCaja + totalCC + totalRecibido
                    ).toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-semibold">Total de Salidas / Pagos:</td>
                    <td className="border px-4 py-2 font-semibold text-right text-red-500">
                        -${totalSalidas.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-bold">Total General:</td>
                    <td className="border px-4 py-2 font-bold text-right">
                        ${(
                        totalCaja + totalCC + totalRecibido - totalSalidas
                    ).toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>
));

// Componente principal de Corte Total
const CorteTotal = () => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [vehiculosData, setVehiculosData] = useState([]);
    const [entradasData, setEntradasData] = useState([]);
    const [salidasData, setSalidasData] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const componentRef = useRef(null);

    const handleButtonClick = async () => {
        if (!startDate || !endDate) {
            setErrorMessage("Por favor, selecciona ambas fechas.");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setErrorMessage("La fecha de inicio no puede ser mayor a la fecha final.");
            return;
        }

        setErrorMessage("");

        // Ajustamos las fechas para incluir todo el día
        const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
        const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);

        // Consulta a Firestore para obtener todos los movimientos en el rango de fechas
        const movementsSnapshot = await firestore()
            .collection("movimientos")
            .where("timestamp", ">=", new Date(startTimestamp))
            .where("timestamp", "<=", new Date(endTimestamp))
            .get();

        const movements = movementsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Filtrar los movimientos para vehículos (sin filtrar por usuario)
        const filteredVehiculos = movements.filter((movement) => movement.estatus === "EN" && movement.tipo !== "Pago");

        // Filtrar los movimientos para entradas (sin filtrar por usuario)
const filteredEntradas = movements.filter((movement) =>
    movement.estatus === "EE" &&
    movement.tipo === "Entrada" &&
    movement.tipoPago !== "ECI"
);
setEntradasData(filteredEntradas);

        // Filtrar los movimientos para salidas (sin filtrar por usuario)
        const filteredSalidas = movements.filter((movement) => movement.estatus === "SE" && movement.tipo === "Pago");
        setVehiculosData(filteredVehiculos);
        setEntradasData(filteredEntradas);
        setSalidasData(filteredSalidas);

    };

    const totalPago = vehiculosData.reduce((total, movement) => total + (parseFloat(movement.totalPago) || 0), 0);
    const totalCaja = vehiculosData.reduce((total, movement) => {
        const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
        return total + caja;
    }, 0);
    const totalCC = vehiculosData.reduce((total, movement) => total + (parseFloat(movement.cajaCC) || 0), 0);
    const totalPendientes = vehiculosData.reduce((total, movement) => total + (parseFloat(movement.pagoTotalPendiente) || 0), 0);


    const totalRecibido = entradasData.reduce((total, movement) => total + (parseFloat(movement.cajaRecibo) || 0), 0);

    const totalSalidas = salidasData.reduce((total, movement) => total + (parseFloat(movement.salidaCaja) || 0), 0);


    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="home">
            <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
                Reporte <strong>General</strong> de Movimientos
            </h3>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="w-full md:w-1/2">
                    <label className="block text-black-500">Fecha Inicio:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                    />
                </div>
                <div className="w-full md:w-1/2">
                    <label className="block text-black-500">Fecha Final:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                    />
                </div>
            </div>

            {errorMessage && (
                <div className="text-red-500 mb-2">{errorMessage}</div>
            )}

            <button
                onClick={handleButtonClick}
                className="bg-red-500 text-white-100 px-4 py-2 rounded-lg m-3"
            >
                Generar Reporte
            </button>

            <ReactToPrint
                trigger={() => (
                    <button className="bg-blue-500 text-white-100 px-4 py-2 rounded-lg m-3">
                        Imprimir Reporte
                    </button>
                )}
                content={() => componentRef.current}
            />

            {/* Reporte Movimientos */}
            <ReporteMovimientos
                ref={componentRef}
                startDate={startDate}
                endDate={endDate}
                vehiculosData={vehiculosData}
                totalPago={totalPago}
                totalCaja={totalCaja}
                totalCC={totalCC}
                totalPendientes={totalPendientes}
                entradasData={entradasData}
                totalRecibido={totalRecibido}
                salidasData={salidasData}
                totalSalidas={totalSalidas}
            />
        </div>
    );
};

export default CorteTotal;