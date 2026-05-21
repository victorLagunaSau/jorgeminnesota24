/**
 * Script: Resetear folios de vehículos
 * - Elimina folioVenta de vehículos cobrados ANTES del 1 enero 2026
 * - Reasigna folios consecutivos a vehículos cobrados DESDE el 1 enero 2026
 * - Actualiza el contador en config/consecutivos
 *
 * Modo: node scripts/resetFolios.js          → dry run (solo muestra)
 *       node scripts/resetFolios.js --exec   → ejecuta los cambios
 */
const firebase = require("firebase/app");
require("firebase/firestore");

const config = {
    apiKey: "AIzaSyDJGBFa9gVwJpIedfidnFxotapD-uY1J9M",
    authDomain: "jorgeminnesota-bd031.firebaseapp.com",
    projectId: "jorgeminnesota-bd031",
    storageBucket: "jorgeminnesota-bd031.appspot.com",
    messagingSenderId: "272499240779",
    appId: "1:272499240779:web:a573fbb54a23ca6d2502ce",
};

if (!firebase.apps.length) firebase.initializeApp(config);
const db = firebase.firestore();

const EXEC = process.argv.includes("--exec");
const CORTE = new Date("2026-01-01T00:00:00");

async function main() {
    console.log(EXEC ? "=== MODO EJECUCIÓN ===" : "=== MODO DRY RUN (sin cambios) ===");
    console.log(`Fecha de corte: ${CORTE.toISOString()}\n`);

    // 1. Cargar todos los vehículos con estatus "EN" (cobrados)
    console.log("Cargando vehículos cobrados (estatus EN)...");
    const snap = await db.collection("vehiculos").where("estatus", "==", "EN").get();
    console.log(`Total vehículos EN: ${snap.size}\n`);

    const anteriores = []; // antes del 1 enero 2026
    const recientes = [];  // desde el 1 enero 2026

    snap.docs.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        let fechaPago = null;

        // Intentar obtener fecha de pago
        if (d.timestamp && d.timestamp.toDate) {
            fechaPago = d.timestamp.toDate();
        } else if (d.timestamp && d.timestamp.seconds) {
            fechaPago = new Date(d.timestamp.seconds * 1000);
        }

        const item = {
            id,
            fechaPago,
            folioActual: d.folioVenta || null,
            marca: d.marca || "",
            modelo: d.modelo || "",
            cliente: d.cliente || "",
        };

        if (!fechaPago || fechaPago < CORTE) {
            anteriores.push(item);
        } else {
            recientes.push(item);
        }
    });

    // Ordenar recientes por fecha de pago (más viejo primero)
    recientes.sort((a, b) => a.fechaPago - b.fechaPago);

    console.log(`Vehículos ANTES del 1 enero 2026: ${anteriores.length} → se les QUITA folio`);
    const anterioresConFolio = anteriores.filter(v => v.folioActual && v.folioActual !== "pendiente");
    console.log(`   (${anterioresConFolio.length} tienen folio actualmente)\n`);

    console.log(`Vehículos DESDE el 1 enero 2026: ${recientes.length} → se les ASIGNA folio nuevo`);
    console.log(`   Nuevo rango de folios: 1 a ${recientes.length}\n`);

    // Mostrar los primeros y últimos del rango nuevo
    if (recientes.length > 0) {
        console.log("Primeros 5 del nuevo rango:");
        recientes.slice(0, 5).forEach((v, i) => {
            console.log(`   Folio ${i + 1} → ${v.id} — ${v.marca} ${v.modelo} — ${v.cliente} — Pagado: ${v.fechaPago?.toLocaleDateString()}`);
        });
        if (recientes.length > 5) {
            console.log("   ...");
            console.log("Últimos 3:");
            recientes.slice(-3).forEach((v, i) => {
                const folio = recientes.length - 2 + i;
                console.log(`   Folio ${folio} → ${v.id} — ${v.marca} ${v.modelo} — ${v.cliente} — Pagado: ${v.fechaPago?.toLocaleDateString()}`);
            });
        }
    }

    if (!EXEC) {
        console.log("\n--- Para ejecutar los cambios, corre: node scripts/resetFolios.js --exec ---");
        process.exit(0);
    }

    // === EJECUCIÓN ===
    console.log("\nEjecutando cambios...\n");

    // Firestore batch tiene límite de 500 operaciones
    const BATCH_SIZE = 450;

    // Paso 1: Quitar folio a los anteriores que lo tienen
    if (anterioresConFolio.length > 0) {
        console.log(`Quitando folio a ${anterioresConFolio.length} vehículos anteriores...`);
        for (let i = 0; i < anterioresConFolio.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = anterioresConFolio.slice(i, i + BATCH_SIZE);
            chunk.forEach(v => {
                batch.update(db.collection("vehiculos").doc(v.id), {
                    folioVenta: firebase.firestore.FieldValue.delete()
                });
            });
            await batch.commit();
            console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} actualizados`);
        }
        console.log("   Listo.\n");
    }

    // Paso 2: Asignar nuevos folios a los recientes
    console.log(`Asignando nuevos folios a ${recientes.length} vehículos...`);
    for (let i = 0; i < recientes.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = recientes.slice(i, i + BATCH_SIZE);
        chunk.forEach((v, j) => {
            const nuevoFolio = i + j + 1;
            batch.update(db.collection("vehiculos").doc(v.id), {
                folioVenta: nuevoFolio
            });
        });
        await batch.commit();
        console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: folios ${i + 1} a ${i + chunk.length}`);
    }
    console.log("   Listo.\n");

    // Paso 3: Actualizar el contador
    const nuevoContador = recientes.length;
    console.log(`Actualizando contador en config/consecutivos → folioventa: ${nuevoContador}`);
    await db.collection("config").doc("consecutivos").update({
        folioventa: nuevoContador
    });
    console.log("   Listo.\n");

    // También actualizar folioVenta en movimientos
    console.log("Actualizando folios en movimientos...");
    const movSnap = await db.collection("movimientos").where("tipo", "==", "Salida").get();
    console.log(`Total movimientos de salida: ${movSnap.size}`);

    // Crear mapa de lote → nuevo folio
    const folioMap = {};
    recientes.forEach((v, i) => { folioMap[v.id] = i + 1; });

    let movActualizados = 0;
    let movLimpiados = 0;
    const movBatches = [];
    let currentBatch = db.batch();
    let batchCount = 0;

    movSnap.docs.forEach(doc => {
        const d = doc.data();
        const binNip = d.binNip;
        if (folioMap[binNip]) {
            currentBatch.update(db.collection("movimientos").doc(doc.id), { folioVenta: folioMap[binNip] });
            movActualizados++;
        } else if (d.folioVenta) {
            currentBatch.update(db.collection("movimientos").doc(doc.id), { folioVenta: firebase.firestore.FieldValue.delete() });
            movLimpiados++;
        }
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
            movBatches.push(currentBatch);
            currentBatch = db.batch();
            batchCount = 0;
        }
    });
    if (batchCount > 0) movBatches.push(currentBatch);

    for (const b of movBatches) {
        await b.commit();
    }
    console.log(`   ${movActualizados} movimientos con nuevo folio, ${movLimpiados} folios eliminados\n`);

    console.log("=== COMPLETADO ===");
    console.log(`Folios asignados: 1 a ${nuevoContador}`);
    console.log(`Contador actualizado: ${nuevoContador}`);
    console.log(`El próximo vehículo cobrado será folio ${nuevoContador + 1}`);

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
