import React, {useState} from 'react';
import ImprimeSalida from './ImprimeSalida';
import ImprimeSalidaSinPendientes from './ImprimeSalidaSinPendientes';
import moment from 'moment';
import { firestore } from "../../../firebase/firebaseIni";
import { COLLECTIONS } from "../../../constants";
import { registrarAuditLog } from "../../../utils/auditLog";
import { FaTrash } from "react-icons/fa";

const Pagado = ({vehiculo, user, binNip, onVehiculoEliminado}) => {
    const isAdminMaster = user?.adminMaster === true;
    const vehiculoData = vehiculo[0] || {};

    const {
        ciudad = "Desconocido",
        estado = "Desconocido",
        modelo = "Desconocido",
        marca = "Desconocido",
        price = 0,
        pago = 0,
        storage = 0,
        sobrePeso = 0,
        gastosExtra = 0,
        totalPago = 0,
        titulo = "NO",
        cliente = "No especificado",
        telefonoCliente = "No especificado",
        pagosPendientes = false,
        pagoTotalPendiente = 0,
        pagos001 = 0,
        pagos002 = 0,
        pagos003 = 0,
        pagos004 = 0,
        pagos005 = 0,
        estadoPago = "pagado",
        creditoOtorgado = 0,
        saldoFiado = 0,
        cajaRecibo = 0,
        cajaCC = 0,
        registro = {seconds: 0, nanoseconds: 0},
        folioVenta = "pendiente"
    } = vehiculoData;

    const [showModal, setShowModal] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const handleImprimeSalida = () => {
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const handleEliminarVehiculo = async () => {
        if (!binNip) return;

        const confirmar = window.confirm(
            `¿Eliminar el vehículo ${binNip} y TODOS sus registros?\n\n` +
            `Se eliminará:\n` +
            `- Vehículo de /vehiculos/\n` +
            `- Todos sus movimientos\n` +
            `- Su referencia en viajes pagados\n` +
            `- Lotes en tránsito\n\n` +
            `Se descargará un respaldo JSON antes de borrar.\n` +
            `Esta acción es IRREVERSIBLE.`
        );
        if (!confirmar) return;

        try {
            setEliminando(true);

            // 1. Buscar movimientos
            const movSnap = await firestore()
                .collection(COLLECTIONS.MOVIMIENTOS)
                .where("lote", "==", binNip)
                .get();

            // 2. Buscar viajes pagados que contengan este lote
            const viajesSnap = await firestore()
                .collection(COLLECTIONS.VIAJES_PAGADOS)
                .get();
            const viajesRelacionados = [];
            viajesSnap.docs.forEach(doc => {
                const data = doc.data();
                if (Array.isArray(data.vehiculos) && data.vehiculos.some(v => v.lote === binNip)) {
                    viajesRelacionados.push({ docId: doc.id, totalVehiculos: data.vehiculos.length, data });
                }
            });

            // 3. Buscar en lotesEnTransito
            const loteDoc = await firestore()
                .collection(COLLECTIONS.LOTES_EN_TRANSITO)
                .doc(binNip)
                .get();

            // 4. Respaldo JSON
            const respaldo = {
                binNip,
                vehiculo: vehiculoData,
                movimientos: movSnap.docs.map(d => ({ docId: d.id, ...d.data() })),
                viajesRelacionados,
                loteEnTransito: loteDoc.exists ? loteDoc.data() : null
            };
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const jsonStr = JSON.stringify(respaldo, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `respaldo_${binNip}_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 5. Audit log
            await registrarAuditLog("eliminacion", user, {
                binNip,
                cliente: vehiculoData.cliente,
                marca: vehiculoData.marca,
                modelo: vehiculoData.modelo,
            });

            // 6. Batch delete
            const batch = firestore().batch();

            // Movimientos
            movSnap.docs.forEach(doc => {
                batch.delete(firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(doc.id));
            });

            // Vehículo
            batch.delete(firestore().collection(COLLECTIONS.VEHICULOS).doc(binNip));

            // Lote en tránsito
            if (loteDoc.exists) {
                batch.delete(firestore().collection(COLLECTIONS.LOTES_EN_TRANSITO).doc(binNip));
            }

            // Viajes pagados
            for (const viaje of viajesRelacionados) {
                if (viaje.totalVehiculos <= 1) {
                    batch.delete(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(viaje.docId));
                } else {
                    const vehiculosActualizados = viaje.data.vehiculos.filter(v => v.lote !== binNip);
                    batch.update(firestore().collection(COLLECTIONS.VIAJES_PAGADOS).doc(viaje.docId), {
                        vehiculos: vehiculosActualizados
                    });
                }
            }

            await batch.commit();

            alert(
                `Vehículo ${binNip} eliminado exitosamente.\n\n` +
                `- ${movSnap.size} movimiento(s)\n` +
                `- ${viajesRelacionados.length} viaje(s) limpiados\n` +
                `- ${loteDoc.exists ? 1 : 0} lote(s) en tránsito\n\n` +
                `Respaldo descargado.`
            );

            if (onVehiculoEliminado) onVehiculoEliminado();

        } catch (error) {
            console.error("Error al eliminar vehículo:", error);
            alert("Error al eliminar el vehículo. Revisa la consola.");
        } finally {
            setEliminando(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-2">
            <div>
                {folioVenta && folioVenta !== "pendiente" && (
                    <p className="text-black-500 text-2xl">
                        <strong className="mr-3">Folio:</strong> {folioVenta}
                    </p>
                )}
                <p className="text-black-500 text-2xl">
                    <strong className="mr-3"> Alta de Vehículo: </strong> {
                    vehiculoData?.registro?.timestamp?.seconds
                        ? moment(vehiculoData.registro.timestamp.seconds * 1000).format('DD/MM/YYYY HH:mm:ss')
                        : registro?.seconds
                            ? moment(registro.seconds * 1000).format('DD/MM/YYYY HH:mm:ss')
                            : "Sin fecha"
                }
                </p>

                <label className="block text-black-500">Procedencia:</label>
                <div className="flex">
                    <p className="ml-2">Ciudad: <strong>{ciudad}</strong></p>
                    <p className="ml-2">Estado: <strong>{estado}</strong></p>
                </div>

                <label className="block text-black-500">Vehículo:</label>
                <div className="flex">
                    <p className="ml-2">Modelo: <strong>{modelo}</strong></p>
                    <p className="ml-2">Marca: <strong>{marca}</strong></p>
                    <p className="ml-2">Título: <strong>{titulo}</strong></p>
                </div>

                <label className="block text-black-500">Cliente:</label>
                <p className="ml-2">Nombre: <strong>{cliente}</strong></p>
                <p className="ml-2">Teléfono: <strong>{telefonoCliente}</strong></p>

                <p className="mt-4 text-xl">Precio de transporte: <strong>$ {price} DLL</strong></p>
                <div>
                    <p>Pago en Dll: <strong>{pago}</strong></p>
                    <p>Pago Extras por Storage: <strong>{storage}</strong></p>
                    <p>Pago Sobre Peso: <strong>{sobrePeso}</strong></p>
                    <p>Pago Extras: <strong>{gastosExtra}</strong></p>
                    <p className="mt-4 text-xl">Total: <strong>$ {totalPago} DLL</strong></p>
                </div>

                {estadoPago === "fiado" && (
                    <div className="mt-4 p-4 rounded-xl border-l-8 border-orange-600 bg-orange-100">
                        <h2 className="text-lg font-bold text-orange-800 uppercase">
                            Vehículo salió FIADO
                        </h2>
                        <p>Efectivo cobrado: <strong>${parseFloat(cajaRecibo).toFixed(2)}</strong></p>
                        <p>CC cobrado: <strong>${parseFloat(cajaCC).toFixed(2)}</strong></p>
                        <p>Crédito otorgado al cliente: <strong>${parseFloat(creditoOtorgado).toFixed(2)}</strong></p>
                        <p>Saldo pendiente: <strong>${parseFloat(saldoFiado).toFixed(2)}</strong></p>
                    </div>
                )}
                {pagosPendientes && (
                    <div className="mt-4 p-4 bg-yellow-100 rounded">
                        <h2 className="text-lg font-bold text-red-500">Pagos Pendientes</h2>
                        <p>Pagos Parciales:</p>
                        <ul className="list-disc ml-6">
                            {pagos001 > 0 && <li>Pago 1: ${pagos001}</li>}
                            {pagos002 > 0 && <li>Pago 2: ${pagos002}</li>}
                            {pagos003 > 0 && <li>Pago 3: ${pagos003}</li>}
                            {pagos004 > 0 && <li>Pago 4: ${pagos004}</li>}
                            {pagos005 > 0 && <li>Pago 5: ${pagos005}</li>}
                        </ul>
                        <p>Total Pendiente: <strong>${pagoTotalPendiente}</strong></p>
                    </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                    <button className="btn btn-outline btn-error" onClick={handleImprimeSalida}>
                        Imprimir
                    </button>
                    {isAdminMaster && binNip && (
                        <button
                            className="btn btn-error text-white gap-2"
                            onClick={handleEliminarVehiculo}
                            disabled={eliminando}
                        >
                            <FaTrash />
                            {eliminando ? "Eliminando..." : "Eliminar Vehículo"}
                        </button>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 flex justify-center items-center z-50">
                    <div className="modal-box max-w-5xl w-full bg-white-500">
                        {(pagosPendientes || estadoPago === "fiado") ? (
                            <ImprimeSalidaSinPendientes
                                onClose={closeModal}
                                vehiculoData={vehiculoData}
                                pago={pago}
                                storage={storage}
                                titulo={titulo}
                            />
                        ) : (
                            <ImprimeSalida
                                onClose={closeModal}
                                vehiculoData={vehiculoData}
                                pago={pago}
                                storage={storage}
                                titulo={titulo}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pagado;
