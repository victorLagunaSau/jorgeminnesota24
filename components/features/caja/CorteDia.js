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
                                                 totalAnticiposCC,
                                                 entradasData,
                                                 totalRecibido,
                                                 salidasData,
                                                 totalSalidas,
                                                 isAdminMaster,
                                                 onDataChange,
                                                 modificacionesData
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
            isAdminMaster={isAdminMaster}
            onDataChange={onDataChange}
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
        <TablaEntradas entradasData={entradasData} totalRecibido={totalRecibido} isAdminMaster={isAdminMaster} onDataChange={onDataChange}/>

        {/* Tabla de Salidas */}
        <TablaSalidas salidasData={salidasData} totalSalidas={totalSalidas} isAdminMaster={isAdminMaster} onDataChange={onDataChange}/>

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
                <td className="border px-4 py-2 font-semibold">Total de Salidas / Pagos:</td>
                <td className="border px-4 py-2 font-semibold text-right text-red-500">
                    -${totalSalidas.toFixed(2).toLocaleString('en-US')}
                </td>
            </tr>
            <tr>
                <td className="border px-4 py-2 font-bold">Total General:</td>
                <td className="border px-4 py-2 font-bold text-right">
                    ${(
                        totalCaja + totalAnticipos + totalAbonosEfectivo + totalRecibido - totalSalidas
                    ).toFixed(2).toLocaleString('en-US')}
                </td>
            </tr>
        </tbody>
    </table>
</div>

        {/* Modificaciones del Día - en página aparte al imprimir */}
        {modificacionesData && modificacionesData.length > 0 && (
            <div className="mt-6" style={{ pageBreakBefore: 'always' }}>
                <h3 className="text-xl font-semibold text-orange-800 mb-2">Modificaciones del Día</h3>
                <p className="text-xs text-gray-400 mb-2">{modificacionesData.length} modificación(es) — {endDate}</p>
                <table className="min-w-full bg-white border text-xs">
                    <thead>
                        <tr className="bg-orange-50">
                            <th className="px-2 py-1 border">Lote</th>
                            <th className="px-2 py-1 border">Marca</th>
                            <th className="px-2 py-1 border">Modelo</th>
                            <th className="px-2 py-1 border">Cliente</th>
                            <th className="px-2 py-1 border">Modificación</th>
                            <th className="px-2 py-1 border">Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modificacionesData.map((m) => (
                            <tr key={m.id}>
                                <td className="px-2 py-1 border font-bold">{m.binNip || '-'}</td>
                                <td className="px-2 py-1 border">{m.marca || '-'}</td>
                                <td className="px-2 py-1 border">{m.modelo || '-'}</td>
                                <td className="px-2 py-1 border">{m.cliente || '-'}</td>
                                <td className="px-2 py-1 border">
                                    {m.cambios ? Object.entries(m.cambios).map(([campo, val]) => (
                                        <div key={campo}>
                                            <span className="font-semibold">{campo}:</span>{' '}
                                            <span className="text-red-500 line-through">{String(val.antes || '-')}</span>
                                            {' → '}
                                            <span className="text-green-600 font-bold">{String(val.despues || '-')}</span>
                                        </div>
                                    )) : m.accion || '-'}
                                </td>
                                <td className="px-2 py-1 border text-gray-600">{m.descripcion || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
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
    const [modificacionesData, setModificacionesData] = useState([]);
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
                const conCaja = todos.filter(u => u.caja === true || u.adminMaster === true);
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

        // Consulta de modificaciones del día (auditLog)
        const auditSnapshot = await firestore()
            .collection(COLLECTIONS.AUDIT_LOG)
            .where("timestamp", ">", new Date(startTimestamp))
            .where("timestamp", "<", new Date(endTimestamp))
            .get();

        const auditDocs = auditSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredModificaciones = auditDocs.filter(m => m.usuarioId === targetUser.id);
        filteredModificaciones.sort((a, b) => {
            const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp?.seconds || 0) * 1000;
            const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp?.seconds || 0) * 1000;
            return ta - tb;
        });

        setVehiculosData(filteredVehiculos);
        setEntradasData(filteredEntradas);
        setSalidasData(filteredSalidas);
        setAbonosData(filteredAbonos);
        setAnticiposData(filteredAnticipos);
        setModificacionesData(filteredModificaciones);
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
                totalAnticiposCC={totalAnticiposCC}
                entradasData={entradasData}
                totalRecibido={totalRecibido}
                salidasData={salidasData}
                totalSalidas={totalSalidas}
                isAdminMaster={isAdminMaster}
                onDataChange={handleButtonClick}
                modificacionesData={modificacionesData}
            />
        </div>
    );
};

export default CorteDia;
