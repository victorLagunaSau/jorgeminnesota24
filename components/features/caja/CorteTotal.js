import React, {useState, useRef} from "react";
import {firestore} from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import ReactToPrint from "react-to-print";
import TablaVehiculos from "./TablaVehiculos";
import TablaEntradas from "./TablaEntradas";
import TablaSalidas from "./TablaSalidas";
import TablaVehiculosPendientes from "./TablaVehiculosPendientes";

// Componente para mostrar e imprimir la tabla de movimientos
const ReporteMovimientos = React.forwardRef(({
                                                 startDate,
                                                 endDate,
                                                 vehiculosData,
                                                 vehiculosPendientesData,
                                                 totalPago,
                                                 totalCaja,
                                                 totalCC,
                                                 totalPendientes,
                                                 totalCredito,
                                                 abonosData,
                                                 totalAbonosEfectivo,
                                                 totalAbonosCC,
                                                 anticiposData,
                                                 totalAnticipos,
                                                 totalAnticiposCC,
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
            totalCredito={totalCredito}
        />

        {/* Tabla de Anticipos (Pagos Adelantados) */}
        {anticiposData && anticiposData.length > 0 && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-green-800">Pagos Adelantados (Anticipos)</h3>
                <table className="min-w-full bg-white border text-xs">
                    <thead>
                        <tr className="bg-green-50">
                            <th className="px-2 py-1 border">Fecha</th>
                            <th className="px-2 py-1 border">Lote</th>
                            <th className="px-2 py-1 border">Cliente / Vehículo</th>
                            <th className="px-2 py-1 border text-center">Método</th>
                            <th className="px-2 py-1 border text-right">Anticipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {anticiposData.map((a) => {
                            const metodo = a.metodoPagoAnticipo || 'efectivo';
                            return (
                            <tr key={a.id}>
                                <td className="px-2 py-1 border">
                                    {a.timestamp?.seconds
                                        ? new Date(a.timestamp.seconds * 1000).toLocaleDateString()
                                        : "-"}
                                </td>
                                <td className="px-2 py-1 border font-bold">{a.binNip}</td>
                                <td className="px-2 py-1 border">
                                    {a.cliente} — {a.marca} {a.modelo}
                                </td>
                                <td className={`px-2 py-1 border text-center font-bold text-[10px] ${metodo === 'cc' ? 'text-blue-600' : 'text-green-700'}`}>
                                    {metodo === 'cc' ? 'CC' : 'EFECTIVO'}
                                </td>
                                <td className={`px-2 py-1 border text-right font-bold ${metodo === 'cc' ? 'text-blue-600' : 'text-green-700'}`}>
                                    ${(parseFloat(a.anticipoPago) || 0).toFixed(2)}
                                </td>
                            </tr>
                            );
                        })}
                        {totalAnticipos > 0 && (
                        <tr className="bg-green-50 font-semibold">
                            <td colSpan="4" className="px-2 py-1 border text-right">Total Anticipos Efectivo:</td>
                            <td className="px-2 py-1 border text-right text-green-700">${totalAnticipos.toFixed(2)}</td>
                        </tr>
                        )}
                        {totalAnticiposCC > 0 && (
                        <tr className="bg-blue-50 font-semibold">
                            <td colSpan="4" className="px-2 py-1 border text-right">Total Anticipos CC:</td>
                            <td className="px-2 py-1 border text-right text-blue-600">${totalAnticiposCC.toFixed(2)}</td>
                        </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* Tabla de Abonos (Cobranza) */}
        {abonosData && abonosData.length > 0 && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-blue-800">Abonos de Cobranza</h3>
                <table className="min-w-full bg-white border text-xs">
                    <thead>
                        <tr className="bg-blue-50">
                            <th className="px-2 py-1 border">Fecha</th>
                            <th className="px-2 py-1 border">Lote</th>
                            <th className="px-2 py-1 border">Cliente / Vehículo</th>
                            <th className="px-2 py-1 border text-right">Efectivo</th>
                            <th className="px-2 py-1 border text-right">CC</th>
                            <th className="px-2 py-1 border text-right">Total Abono</th>
                        </tr>
                    </thead>
                    <tbody>
                        {abonosData.map((a) => (
                            <tr key={a.id}>
                                <td className="px-2 py-1 border">
                                    {a.timestamp?.seconds
                                        ? new Date(a.timestamp.seconds * 1000).toLocaleDateString()
                                        : a.timestamp instanceof Date
                                        ? a.timestamp.toLocaleDateString()
                                        : "-"}
                                </td>
                                <td className="px-2 py-1 border font-bold">{a.binNip}</td>
                                <td className="px-2 py-1 border">
                                    {a.cliente} — {a.marca} {a.modelo}
                                </td>
                                <td className="px-2 py-1 border text-right text-green-700">
                                    {(parseFloat(a.cajaRecibo) || 0) > 0 ? `$${(parseFloat(a.cajaRecibo) || 0).toFixed(2)}` : '-'}
                                </td>
                                <td className="px-2 py-1 border text-right text-blue-600">
                                    {(parseFloat(a.cajaCC) || 0) > 0 ? `$${(parseFloat(a.cajaCC) || 0).toFixed(2)}` : '-'}
                                </td>
                                <td className="px-2 py-1 border text-right font-bold">
                                    ${(parseFloat(a.montoAbono) || (parseFloat(a.cajaRecibo) || 0) + (parseFloat(a.cajaCC) || 0)).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {totalAbonosEfectivo > 0 && (
                        <tr className="bg-blue-50 font-semibold">
                            <td colSpan="5" className="px-2 py-1 border text-right">Total Abonos Efectivo:</td>
                            <td className="px-2 py-1 border text-right text-green-700">${totalAbonosEfectivo.toFixed(2)}</td>
                        </tr>
                        )}
                        {totalAbonosCC > 0 && (
                        <tr className="bg-blue-50 font-semibold">
                            <td colSpan="5" className="px-2 py-1 border text-right">Total Abonos CC:</td>
                            <td className="px-2 py-1 border text-right text-blue-600">${totalAbonosCC.toFixed(2)}</td>
                        </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

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
                    <td className="border px-4 py-2 font-semibold text-green-700">Anticipos Efectivo:</td>
                    <td className="border px-4 py-2 font-semibold text-right text-green-700">
                        ${totalAnticipos.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                {totalAnticiposCC > 0 && (
                <tr>
                    <td className="border px-4 py-2 font-semibold text-blue-600">Anticipos CC:</td>
                    <td className="border px-4 py-2 font-semibold text-right text-blue-600">
                        ${totalAnticiposCC.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                )}
                {totalAbonosEfectivo > 0 && (
                <tr>
                    <td className="border px-4 py-2 font-semibold text-blue-800">Abonos Cobranza Efectivo:</td>
                    <td className="border px-4 py-2 font-semibold text-right text-blue-800">
                        ${totalAbonosEfectivo.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                )}
                {totalAbonosCC > 0 && (
                <tr>
                    <td className="border px-4 py-2 font-semibold text-blue-600">Abonos Cobranza CC:</td>
                    <td className="border px-4 py-2 font-semibold text-right text-blue-600">
                        ${totalAbonosCC.toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                )}
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
                        totalCaja + totalCC + totalAnticipos + totalAbonosEfectivo + totalAbonosCC + totalRecibido
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
                        totalCaja + totalCC + totalAnticipos + totalAbonosEfectivo + totalAbonosCC + totalRecibido - totalSalidas
                    ).toFixed(2).toLocaleString('en-US')}
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <TablaVehiculosPendientes
            vehiculosData={vehiculosPendientesData}
            totalPago={totalPago}
            totalCaja={totalCaja}
            totalCC={totalCC}
            totalPendientes={totalPendientes}
        />
    </div>
));

// Componente principal de Corte Total
const CorteTotal = () => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [vehiculosData, setVehiculosData] = useState([]);
    const [vehiculosPendientesData, setVehiculosPendientesData] = useState([]);
    const [entradasData, setEntradasData] = useState([]);
    const [salidasData, setSalidasData] = useState([]);
    const [abonosData, setAbonosData] = useState([]);
    const [anticiposData, setAnticiposData] = useState([]);
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

        // Parseamos fechas en hora local para evitar desfase UTC
        const [anioI, mesI, diaI] = startDate.split('-').map(Number);
        const [anioF, mesF, diaF] = endDate.split('-').map(Number);
        const startTimestamp = new Date(anioI, mesI - 1, diaI, 0, 0, 0, 0).getTime();
        const endTimestamp = new Date(anioF, mesF - 1, diaF, 23, 59, 59, 999).getTime();

        // Consulta a Firestore para obtener todos los movimientos en el rango de fechas
        const movementsSnapshot = await firestore()
            .collection(COLLECTIONS.MOVIMIENTOS)
            .where("timestamp", ">=", new Date(startTimestamp))
            .where("timestamp", "<=", new Date(endTimestamp))
            .get();

        const movements = movementsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Filtrar los movimientos para vehículos (sin filtrar por usuario)
        const filteredVehiculos = movements.filter((movement) => movement.estatus === "EN" && movement.tipo !== "Pago" && movement.tipo !== "Abono");
        const filteredAbonos = movements.filter((movement) => movement.tipo === "Abono");
        const filteredAnticipos = movements.filter((movement) => movement.tipo === "Anticipo");
        // Vehículos con pago pendiente (salidas que no son abonos ni pagos de caja)
        const filteredVehiculosPendientes = movements.filter((movement) => movement.tipo !== "Pago" && movement.tipo !== "Abono");
        // Filtrar los movimientos para entradas (sin filtrar por usuario)
        const filteredEntradas = movements.filter((movement) =>
            movement.estatus === "EE" &&
            movement.tipo === "Entrada" &&
            movement.entradaCajaTipo !== "ECI"
        );
        setEntradasData(filteredEntradas);


        // Filtrar los movimientos para salidas (sin filtrar por usuario)
        const filteredSalidas = movements.filter((movement) => movement.estatus === "SE" && movement.tipo === "Pago");
        setVehiculosData(filteredVehiculos);
        setVehiculosPendientesData(filteredVehiculosPendientes);
        setEntradasData(filteredEntradas);
        setSalidasData(filteredSalidas);
        setAbonosData(filteredAbonos);
        setAnticiposData(filteredAnticipos);
    };

    const totalPago = vehiculosData.reduce((total, movement) => total + (parseFloat(movement.totalPago) || 0), 0);
    const totalCaja = vehiculosData.reduce((total, movement) => {
        const caja = (parseFloat(movement.cajaRecibo) || 0) - (parseFloat(movement.cajaCambio) || 0);
        return total + caja;
    }, 0);
    const totalCC = vehiculosData.reduce((total, movement) => total + (parseFloat(movement.cajaCC) || 0), 0);
    const totalPendientes = vehiculosData.reduce(
        (total, m) =>
            total +
            (typeof m.saldoFiado === "number"
                ? parseFloat(m.saldoFiado)
                : (parseFloat(m.pagoTotalPendiente) || 0)),
        0
    );
    const totalCredito = vehiculosData.reduce(
        (total, m) => total + (parseFloat(m.creditoOtorgado) || 0),
        0
    );
    const totalAbonosEfectivo = abonosData.reduce(
        (total, m) => total + (parseFloat(m.cajaRecibo) || 0),
        0
    );
    const totalAbonosCC = abonosData.reduce(
        (total, m) => total + (parseFloat(m.cajaCC) || 0),
        0
    );
    const totalAnticipos = anticiposData.reduce(
        (total, m) => {
            const metodo = m.metodoPagoAnticipo || 'efectivo';
            if (metodo === 'cc') return total;
            return total + (parseFloat(m.anticipoPago) || 0);
        },
        0
    );
    const totalAnticiposCC = anticiposData.reduce(
        (total, m) => {
            const metodo = m.metodoPagoAnticipo || 'efectivo';
            if (metodo !== 'cc') return total;
            return total + (parseFloat(m.anticipoPago) || 0);
        },
        0
    );

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
                vehiculosPendientesData={vehiculosPendientesData}
                totalPago={totalPago}
                totalCaja={totalCaja}
                totalCC={totalCC}
                totalPendientes={totalPendientes}
                totalCredito={totalCredito}
                abonosData={abonosData}
                totalAbonosEfectivo={totalAbonosEfectivo}
                totalAbonosCC={totalAbonosCC}
                anticiposData={anticiposData}
                totalAnticipos={totalAnticipos}
                totalAnticiposCC={totalAnticiposCC}
                entradasData={entradasData}
                totalRecibido={totalRecibido}
                salidasData={salidasData}
                totalSalidas={totalSalidas}
            />
        </div>
    );
};

export default CorteTotal;