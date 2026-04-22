import { firestore } from "../firebase/firebaseIni";
import { COLLECTIONS } from "../constants";

/**
 * Registra una acción en el audit log.
 * @param {string} accion - "edicion" | "eliminacion" | "cambioLote"
 * @param {object} usuario - { nombre, uid }
 * @param {object} vehiculo - { binNip, cliente, marca, modelo }
 * @param {object} [cambios] - { campo: { antes, despues } }
 */
export const registrarAuditLog = async (accion, usuario, vehiculo, cambios = null) => {
    try {
        await firestore().collection(COLLECTIONS.AUDIT_LOG).add({
            accion,
            usuario: usuario?.nombre || "Desconocido",
            usuarioId: usuario?.uid || "",
            binNip: vehiculo?.binNip || "",
            cliente: vehiculo?.cliente || "",
            marca: vehiculo?.marca || "",
            modelo: vehiculo?.modelo || "",
            cambios,
            timestamp: new Date(),
        });
    } catch (err) {
        console.error("Error registrando audit log:", err);
    }
};
