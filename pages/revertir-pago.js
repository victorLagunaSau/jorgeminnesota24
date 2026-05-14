import React, { useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { COLLECTIONS, VEHICLE_STATUS } from "../constants";
import { useAuthContext } from "../context/auth";

const BIN_NIP = "44418889";

const CAMPOS_PAGO = [
    "estadoPago",
    "cajaRecibo",
    "cajaCC",
    "cajaCambio",
    "folioVenta",
    "totalPago",
    "totalPagoNeto",
    "creditoOtorgado",
    "saldoFiado",
    "abonosFiado",
    "pagosPendientes",
    "anticipoExcedente",
];

const RevertirPago = () => {
    const { user } = useAuthContext();
    const [vehiculo, setVehiculo] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [estatusDestino, setEstatusDestino] = useState("DS");
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [resultado, setResultado] = useState("");

    useEffect(() => {
        const cargar = async () => {
            try {
                const vDoc = await firebase.firestore()
                    .collection(COLLECTIONS.VEHICULOS)
                    .doc(BIN_NIP)
                    .get();

                if (vDoc.exists) {
                    setVehiculo({ id: vDoc.id, ...vDoc.data() });
                }

                const movSnap = await firebase.firestore()
                    .collection(COLLECTIONS.MOVIMIENTOS)
                    .where("binNip", "==", BIN_NIP)
                    .where("tipo", "==", "Salida")
                    .get();

                setMovimientos(movSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error(err);
                setResultado("Error al cargar datos: " + err.message);
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, []);

    const handleRevertir = async () => {
        if (!window.confirm(
            `¿Revertir vehículo ${BIN_NIP}?\n\n` +
            `- Estatus actual: ${vehiculo.estatus} → ${estatusDestino}\n` +
            `- Se eliminarán campos de pago\n` +
            `- Se eliminarán ${movimientos.length} movimiento(s) tipo "Salida"\n\n` +
            `¿Continuar?`
        )) return;

        setProcesando(true);
        try {
            const batch = firebase.firestore().batch();

            // 1. Actualizar vehículo: cambiar estatus y borrar campos de pago
            const vRef = firebase.firestore().collection(COLLECTIONS.VEHICULOS).doc(BIN_NIP);
            const updatePayload = {
                estatus: estatusDestino,
                timestamp: new Date(),
            };
            CAMPOS_PAGO.forEach(campo => {
                updatePayload[campo] = firebase.firestore.FieldValue.delete();
            });
            batch.update(vRef, updatePayload);

            // 2. Eliminar movimientos tipo "Salida"
            movimientos.forEach(mov => {
                batch.delete(
                    firebase.firestore().collection(COLLECTIONS.MOVIMIENTOS).doc(mov.id)
                );
            });

            await batch.commit();

            setResultado(
                `Vehículo ${BIN_NIP} revertido a "${estatusDestino}" exitosamente.\n` +
                `${movimientos.length} movimiento(s) eliminado(s).`
            );
            setVehiculo(prev => ({ ...prev, estatus: estatusDestino }));
            setMovimientos([]);
        } catch (err) {
            console.error(err);
            setResultado("Error: " + err.message);
        } finally {
            setProcesando(false);
        }
    };

    if (!user) {
        return <div className="p-10 text-center text-red-600 text-xl">Debes iniciar sesión.</div>;
    }

    if (cargando) {
        return <div className="p-10 text-center text-lg">Cargando vehículo {BIN_NIP}...</div>;
    }

    if (!vehiculo) {
        return <div className="p-10 text-center text-red-600 text-xl">Vehículo {BIN_NIP} no encontrado.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-6 mt-10">
            <h1 className="text-2xl font-bold mb-6">Revertir Pago — Vehículo {BIN_NIP}</h1>

            <div className="bg-gray-100 p-4 rounded mb-6">
                <h2 className="font-bold text-lg mb-2">Datos Actuales</h2>
                <p><strong>BIN/NIP:</strong> {vehiculo.binNip}</p>
                <p><strong>Estatus:</strong> {vehiculo.estatus} ({VEHICLE_STATUS[vehiculo.estatus]?.label || "?"})</p>
                <p><strong>Marca:</strong> {vehiculo.marca}</p>
                <p><strong>Modelo:</strong> {vehiculo.modelo}</p>
                <p><strong>Cliente:</strong> {vehiculo.cliente}</p>
                <p><strong>Precio:</strong> ${vehiculo.price}</p>
                {vehiculo.estadoPago && <p><strong>Estado de pago:</strong> {vehiculo.estadoPago}</p>}
                {vehiculo.cajaCC > 0 && <p><strong>Cobrado CC:</strong> ${parseFloat(vehiculo.cajaCC).toFixed(2)}</p>}
                {vehiculo.cajaRecibo > 0 && <p><strong>Cobrado Efectivo:</strong> ${parseFloat(vehiculo.cajaRecibo).toFixed(2)}</p>}
                {vehiculo.folioVenta && <p><strong>Folio Venta:</strong> {vehiculo.folioVenta}</p>}
            </div>

            {movimientos.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 p-4 rounded mb-6">
                    <h2 className="font-bold text-lg mb-2">Movimientos tipo &quot;Salida&quot; a eliminar ({movimientos.length})</h2>
                    {movimientos.map(m => (
                        <div key={m.id} className="text-sm mb-1">
                            <span className="font-mono">{m.id}</span> — Folio: {m.folioVenta || "N/A"}, CC: ${m.cajaCC || 0}, Efectivo: ${m.cajaRecibo || 0}
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-6">
                <label className="block font-bold mb-2">Estatus destino:</label>
                <select
                    className="select select-bordered w-full"
                    value={estatusDestino}
                    onChange={e => setEstatusDestino(e.target.value)}
                >
                    {Object.entries(VEHICLE_STATUS).map(([code, { label }]) => (
                        <option key={code} value={code}>{code} — {label}</option>
                    ))}
                </select>
            </div>

            {resultado && (
                <div className={`p-4 rounded mb-6 ${resultado.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    <pre className="whitespace-pre-wrap">{resultado}</pre>
                </div>
            )}

            <button
                className="btn btn-error text-white w-full"
                onClick={handleRevertir}
                disabled={procesando || vehiculo.estatus === estatusDestino}
            >
                {procesando ? "Procesando..." : `Revertir a ${estatusDestino} (${VEHICLE_STATUS[estatusDestino]?.label})`}
            </button>

            <p className="text-xs text-gray-400 mt-4 text-center">
                Página temporal — eliminar después de usar.
            </p>
        </div>
    );
};

export default RevertirPago;
