import React, {useState, useRef} from "react";
import {firestore} from '../../firebase/firebaseIni';
import ReactToPrint from "react-to-print";

// Componente que renderiza el reporte imprimible
const ReportePendientes = React.forwardRef(({iniDate, endDate, data}, ref) => {
    const calcularTotal = (p, s, st, g) =>
        (parseFloat(p) || 0) + (parseFloat(s) || 0) + (parseFloat(st) || 0) + (parseFloat(g) || 0);

    return (
        <div ref={ref} className="m-4" style={{maxWidth: "90%", margin: "0 auto"}}>
            <div className="w-full flex justify-between border-t border-gray-300 pt-1 hidden-print">
                <img src="/assets/Logoprint.png" className="w-15 mr-2" alt="Logo"/>
                <p className="text-gray-400">Vehículos Pendientes de Pago</p>
            </div>
            <h3 className="mt-8 text-xl font-semibold">
                Reporte de Pendientes del {iniDate} al {endDate}
            </h3>
            <table className="mt-4 w-full border-collapse border border-gray-300 text-xs">
                <thead className="bg-gray-200">
                <tr>
                    <th className="border px-2 py-1">#</th>
                    <th className="border px-2 py-1">Fecha</th>
                    <th className="border px-2 py-1">Bin/Nip</th>
                    <th className="border px-2 py-1">Cliente</th>
                    <th className="border px-2 py-1">Ciudad</th>
                    <th className="border px-2 py-1">Modelo</th>
                    <th className="border px-2 py-1 text-right">Price</th>
                    <th className="border px-2 py-1 text-right">Sobrepeso</th>
                    <th className="border px-2 py-1 text-right">Storage</th>
                    <th className="border px-2 py-1 text-right">Gastos Extra</th>
                    <th className="border px-2 py-1 text-right">Total</th>
                </tr>
                </thead>
                <tbody>
                {data.length > 0 ? (
                    (() => {
                        const agrupado = {};
                        data.forEach((v) => {
                            const fechaKey = new Date(v.registro.timestamp.seconds * 1000)
                                .toISOString()
                                .split("T")[0]; // YYYY-MM-DD
                            if (!agrupado[fechaKey]) agrupado[fechaKey] = [];
                            agrupado[fechaKey].push(v);
                        });

                        let globalPrice = 0, globalSobrepeso = 0, globalStorage = 0, globalGastos = 0, globalTotal = 0;
                        let contador = 1;

                        return Object.entries(agrupado).map(([fecha, vehiculos], idx) => {
                            let subtotalPrice = 0, subtotalSobrepeso = 0, subtotalStorage = 0, subtotalGastos = 0,
                                subtotalTotal = 0;

                            const rows = vehiculos.map((v, i) => {
                                const price = parseFloat(v.price) || 0;
                                const sobrepeso = parseFloat(v.sobrePeso) || 0;
                                const storage = parseFloat(v.storage) || 0;
                                const gastos = parseFloat(v.gastosExtra) || 0;
                                const total = price + sobrepeso + storage + gastos;

                                subtotalPrice += price;
                                subtotalSobrepeso += sobrepeso;
                                subtotalStorage += storage;
                                subtotalGastos += gastos;
                                subtotalTotal += total;

                                globalPrice += price;
                                globalSobrepeso += sobrepeso;
                                globalStorage += storage;
                                globalGastos += gastos;
                                globalTotal += total;

                                return (
                                    <tr key={v.id}>
                                        <td className="border px-2 py-1 text-center">{contador++}</td>
                                        <td className="border px-2 py-1">{new Date(v.registro.timestamp.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="border px-2 py-1">{v.binNip}</td>
                                        <td className="border px-2 py-1">{v.cliente}</td>
                                        <td className="border px-2 py-1">{v.ciudad}</td>
                                        <td className="border px-2 py-1">{v.marca} {v.modelo}</td>
                                        <td className="border px-2 py-1 text-right">${price.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right">${sobrepeso.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right">${storage.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right">${gastos.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right font-semibold">${total.toFixed(2)}</td>
                                    </tr>
                                );
                            });

                            return (
                                <React.Fragment key={fecha}>
                                    <tr>
                                        <td colSpan="11" className="bg-gray-100 font-semibold px-2 py-1 text-left">
                                            📅 Día: {new Date(fecha).toLocaleDateString()}
                                        </td>
                                    </tr>
                                    {rows}
                                    <tr className="bg-gray-100 font-semibold">
                                        <td colSpan="6" className="border px-2 py-1 text-right">Subtotal del día:</td>
                                        <td className="border px-2 py-1 text-right">${subtotalPrice.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right">${subtotalSobrepeso.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right">${subtotalStorage.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right">${subtotalGastos.toFixed(2)}</td>
                                        <td className="border px-2 py-1 text-right">${subtotalTotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="11" className="h-2"></td>
                                    </tr>
                                </React.Fragment>
                            );
                        }).concat(
                            <tr key="global-total" className="bg-green-200 font-bold">
                                <td colSpan="6" className="border px-2 py-2 text-right">TOTAL GENERAL:</td>
                                <td className="border px-2 py-2 text-right">${globalPrice.toFixed(2)}</td>
                                <td className="border px-2 py-2 text-right">${globalSobrepeso.toFixed(2)}</td>
                                <td className="border px-2 py-2 text-right">${globalStorage.toFixed(2)}</td>
                                <td className="border px-2 py-2 text-right">${globalGastos.toFixed(2)}</td>
                                <td className="border px-2 py-2 text-right">${globalTotal.toFixed(2)}</td>
                            </tr>
                        );
                    })()
                ) : (
                    <tr>
                        <td colSpan="11" className="border px-2 py-2 text-center">
                            No hay vehículos pendientes en el rango seleccionado.
                        </td>
                    </tr>
                )}
                </tbody>

            </table>
        </div>
    );
});

// Componente principal
const ReportePendientesPago = () => {
    const [iniDate, setIniDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [data, setData] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const componentRef = useRef(null);

    const handleGenerar = async () => {
        if (!iniDate || !endDate) {
            setErrorMessage("Selecciona ambas fechas.");
            return;
        }

        setErrorMessage("");
        const start = new Date(iniDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);

        try {
            const snapshot = await firestore()
                .collection("vehiculos")
                .where("registro.timestamp", ">=", new Date(start))
                .where("registro.timestamp", "<=", new Date(end))
                .get();

            const rawResults = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));


            const results = rawResults.filter(v => v.estatus === "PR");


            setData(results);
        } catch (error) {

            setErrorMessage("Hubo un error al generar el reporte.");
        }
    };


    return (
        <div className="max-w-screen-xl mx-auto mt-6 px-4">
            <h2 className="text-2xl font-bold mb-4">Reporte: Vehículos Pendientes de Pago</h2>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="w-full md:w-1/2">
                    <label className="block text-sm font-medium mb-1">Fecha Inicio:</label>
                    <input
                        type="date"
                        value={iniDate}
                        onChange={(e) => setIniDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <div className="w-full md:w-1/2">
                    <label className="block text-sm font-medium mb-1">Fecha Final:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
            </div>

            {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}

            <div className="flex gap-4 mb-4">
                <button
                    onClick={handleGenerar}
                    className="bg-red-500 text-white-100 px-4 py-2 rounded"
                >
                    Generar Reporte
                </button>

                <ReactToPrint
                    trigger={() => (
                        <button className="bg-blue-500 text-white-100 px-4 py-2 rounded">
                            Imprimir Reporte
                        </button>
                    )}
                    content={() => componentRef.current}
                />
            </div>

            <ReportePendientes
                ref={componentRef}
                iniDate={iniDate}
                endDate={endDate}
                data={data}
            />
        </div>
    );
};

export default ReportePendientesPago;
