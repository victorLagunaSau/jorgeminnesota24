import React, {useState, useRef, useEffect} from "react";
import {firestore} from "../../../firebase/firebaseIni";
import { COLLECTIONS, USER_TYPES } from "../../../constants";
import ReactToPrint from "react-to-print";
import TablaVehiculos from "./TablaVehiculos";
import TablaEntradas from "./TablaEntradas";
import TablaSalidas from "./TablaSalidas";

// Componente para mostrar e imprimir la tabla de movimientos
const ReporteMovimientos = React.forwardRef(({
                                                 user,
                                                 endDate,
                                                 vehiculosData,
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
                                                 entradasData,
                                                 totalRecibido,
                                                 salidasData,
                                                 totalSalidas
                                             }, ref) => (
    <div ref={ref} className="m-4" style={{maxWidth: "90%", marginLeft: "auto", marginRight: "auto"}}>
        <div className="encabezado-impresion w-full flex justify-between border-t border-gray-300 pt-1 hidden-print">
            <img src="/assets/Logoprint.png" className="w-15 mr-2" alt="Logo"/>
            <p className="text-gray-400">Corte de caja {user.nombre}</p>
        </div>
        <h3 className="mt-8 text-xl font-semibold">Corte del día: {endDate} - {user.nombre}</h3>

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
                            <th className="px-2 py-1 border text-right">Anticipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {anticiposData.map((a) => (
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
                                <td className="px-2 py-1 border text-right font-bold text-green-700">
                                    ${(parseFloat(a.anticipoPago) || 0).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-green-50 font-semibold">
                            <td colSpan="3" className="px-2 py-1 border text-right">Total Anticipos:</td>
                            <td className="px-2 py-1 border text-right text-green-700">${totalAnticipos.toFixed(2)}</td>
                        </tr>
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
                <td className="border px-4 py-2 font-semibold text-green-700">Anticipos (Pagos Adelantados):</td>
                <td className="border px-4 py-2 font-semibold text-right text-green-700">
                    ${totalAnticipos.toFixed(2).toLocaleString('en-US')}
                </td>
            </tr>
            <tr>
                <td className="border px-4 py-2 font-semibold">Total de Entradas:</td>
                <td className="border px-4 py-2 font-semibold text-right">
                    ${totalRecibido.toFixed(2).toLocaleString('en-US')}
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
                        totalCaja + totalAnticipos + totalRecibido - totalSalidas
                    ).toFixed(2).toLocaleString('en-US')}
                </td>
            </tr>
        </tbody>
    </table>
</div>
    </div>
));

// Componente principal de Corte del Día
const CorteDia = ({user}) => {
    const isAdminMaster = user?.adminMaster === true;
    const [endDate, setEndDate] = useState("");
    const [vehiculosData, setVehiculosData] = useState([]);
    const [entradasData, setEntradasData] = useState([]);
    const [salidasData, setSalidasData] = useState([]);
    const [abonosData, setAbonosData] = useState([]);
    const [anticiposData, setAnticiposData] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const componentRef = useRef(null);

    // Admin Master: lista de usuarios con caja
    const [usuariosCaja, setUsuariosCaja] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedUserObj, setSelectedUserObj] = useState(null);

    useEffect(() => {
        if (!isAdminMaster) return;
        const unsub = firestore()
            .collection(COLLECTIONS.USERS)
            .where("tipo", "==", USER_TYPES.ADMIN)
            .onSnapshot((snap) => {
                const todos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const conCaja = todos.filter(u => u.caja === true);
                conCaja.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
                setUsuariosCaja(conCaja);
            });
        return () => unsub();
    }, [isAdminMaster]);

    // Cuando cambia el usuario seleccionado
    useEffect(() => {
        if (!isAdminMaster) {
            setSelectedUserObj(user);
            return;
        }
        if (selectedUserId) {
            const found = usuariosCaja.find(u => u.id === selectedUserId);
            setSelectedUserObj(found || null);
        } else {
            setSelectedUserObj(null);
        }
    }, [selectedUserId, usuariosCaja, isAdminMaster, user]);

    const handleButtonClick = async () => {
        if (!endDate) {
            setErrorMessage("Por favor, selecciona una fecha.");
            return;
        }
        const targetUser = isAdminMaster ? selectedUserObj : user;
        if (!targetUser) {
            setErrorMessage("Por favor, selecciona un usuario.");
            return;
        }
        setErrorMessage("");

        const [anio, mes, dia] = endDate.split('-').map(Number);
        const startTimestamp = new Date(anio, mes - 1, dia, 0, 0, 0, 0).getTime();
        const endTimestamp = new Date(anio, mes - 1, dia, 23, 59, 59, 999).getTime();

        // Consulta a Firestore para obtener todos los movimientos en el rango de fechas
        const movementsSnapshot = await firestore()
            .collection(COLLECTIONS.MOVIMIENTOS)
            .where("timestamp", ">", new Date(startTimestamp))
            .where("timestamp", "<", new Date(endTimestamp))
            .get();

        const movements = movementsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        const filteredUserID = movements.filter((movement) => movement.idUsuario === targetUser.id);
        const filteredVehiculos = filteredUserID.filter((movement) => movement.estatus === "EN" && movement.tipo !== "Pago" && movement.tipo !== "Abono");
        const filteredEntradas = filteredUserID.filter((movement) => movement.estatus === "EE" && movement.tipo === "Entrada");
        const filteredSalidas = filteredUserID.filter((movement) => movement.estatus === "SE" && movement.tipo === "Pago");
        const filteredAbonos = filteredUserID.filter((movement) => movement.tipo === "Abono");
        const filteredAnticipos = filteredUserID.filter((movement) => movement.tipo === "Anticipo");

        setVehiculosData(filteredVehiculos);
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
        (total, m) => total + (parseFloat(m.anticipoPago) || 0),
        0
    );

    const totalRecibido = entradasData.reduce((total, movement) => total + (parseFloat(movement.cajaRecibo) || 0), 0);

    const totalSalidas = salidasData.reduce((total, movement) => total + (parseFloat(movement.salidaCaja) || 0), 0);

    const reportUser = isAdminMaster && selectedUserObj ? selectedUserObj : user;

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="home">
            <h3 className="justify-center text-3xl lg:text-3xl font-medium text-black-500">
                Reporte de <strong>Movimientos</strong>.
            </h3>

            <div className="flex flex-col md:flex-row md:items-end gap-4 mt-4">
                {/* Selector de usuario - Solo Admin Master */}
                {isAdminMaster && (
                    <div className="mb-4 md:mb-0">
                        <label className="block text-black-500 font-semibold">Usuario:</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg min-w-[200px]"
                        >
                            <option value="">-- Seleccionar usuario --</option>
                            {usuariosCaja.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.nombre} {u.adminMaster ? '(Master)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="mb-4 md:mb-0">
                    <label className="block text-black-500">Fecha Final: {endDate}</label>
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
                <div className="text-red-500 mb-2 mt-2">{errorMessage}</div>
            )}

            <button
                onClick={handleButtonClick}
                className="bg-red-500 text-white-100 px-4 py-2 rounded-lg m-3"
            >
                Hacer corte
            </button>

            <ReactToPrint
                trigger={() => (
                    <button className="bg-blue-500 text-white-100 px-4 py-2 rounded-lg m-3">
                        Imprimir Corte
                    </button>
                )}
                content={() => componentRef.current}
            />

            {/* Reporte Movimientos */}
            <ReporteMovimientos
                user={reportUser}
                ref={componentRef}
                endDate={endDate}
                vehiculosData={vehiculosData}
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
                entradasData={entradasData}
                totalRecibido={totalRecibido}
                salidasData={salidasData}
                totalSalidas={totalSalidas}
            />
        </div>
    );
};

export default CorteDia;
