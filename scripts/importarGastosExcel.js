/**
 * Script para importar gastos desde Libro1.xlsx a Firestore
 * Uso: node scripts/importarGastosExcel.js
 */
const XLSX = require("xlsx");
const firebase = require("firebase/app");
require("firebase/firestore");

// Firebase config
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


// Convertir serial Excel a YYYY-MM-DD
function excelDateToString(serial) {
    if (!serial || typeof serial !== "number") return null;
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

async function importar() {
    const wb = XLSX.readFile("Libro1.xlsx");
    const ws = wb.Sheets["Hoja1"];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    const gastos = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Saltar filas de header, totales y vacías
        const firstCol = String(row[0]).trim();
        if (firstCol === "" || firstCol === "NUM.") continue;
        // Verificar que sea una fila de datos (tiene fecha numérica en col 1)
        if (typeof row[1] !== "number") continue;

        const fecha = excelDateToString(row[1]);
        if (!fecha) continue;

        const concepto = String(row[2] || "").trim();  // PROVEEDOR = concepto
        const categoria = String(row[3] || "").trim(); // CONCEPTO = categoría
        const cash = typeof row[4] === "number" ? row[4] : 0;
        const card = typeof row[5] === "number" ? row[5] : 0;
        const monto = cash + card;

        if (monto <= 0) continue;

        const metodoPago = card > 0 ? "Card" : "Cash";

        gastos.push({
            concepto,
            monto: Math.round(monto * 100) / 100,
            fechaGasto: fecha,
            categoria,
            metodoPago,
            estado: "revisado",
            imagenUrl: null,
            imagenPath: null,
            creadoPor: { nombre: "Importación Excel", id: "excel-import" },
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            revisadoPor: { nombre: "Importación Excel", id: "excel-import" },
            fechaRevision: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    console.log(`\nTotal gastos a importar: ${gastos.length}\n`);

    // Preview primeros 10
    console.log("--- Preview (primeros 10) ---");
    gastos.slice(0, 10).forEach((g, i) => {
        console.log(`${i + 1}. ${g.fechaGasto} | ${g.concepto} | ${g.metodoPago} | $${g.monto} | ${g.categoria}`);
    });

    console.log("\n--- Preview (últimos 5) ---");
    gastos.slice(-5).forEach((g, i) => {
        console.log(`${gastos.length - 4 + i}. ${g.fechaGasto} | ${g.concepto} | ${g.metodoPago} | $${g.monto} | ${g.categoria}`);
    });

    // Resumen por mes
    const porMes = {};
    gastos.forEach(g => {
        const mes = g.fechaGasto.substring(0, 7);
        if (!porMes[mes]) porMes[mes] = { count: 0, total: 0 };
        porMes[mes].count++;
        porMes[mes].total += g.monto;
    });
    console.log("\n--- Resumen por mes ---");
    Object.entries(porMes).sort().forEach(([mes, d]) => {
        console.log(`${mes}: ${d.count} gastos, $${d.total.toFixed(2)}`);
    });

    // Preguntar confirmación
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const respuesta = await new Promise(resolve => {
        rl.question("\n¿Importar todos estos gastos a Firestore? (si/no): ", resolve);
    });
    rl.close();

    if (respuesta.toLowerCase() !== "si") {
        console.log("Cancelado.");
        process.exit(0);
    }

    // Importar en batches de 500
    console.log("\nImportando...");
    let batch = db.batch();
    let count = 0;
    let batchCount = 0;

    for (const gasto of gastos) {
        const ref = db.collection("gastos").doc();
        batch.set(ref, gasto);
        count++;
        batchCount++;

        if (batchCount === 500) {
            await batch.commit();
            console.log(`  Batch completado: ${count}/${gastos.length}`);
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`  Batch final: ${count}/${gastos.length}`);
    }

    console.log(`\n✓ ${count} gastos importados exitosamente.`);
    process.exit(0);
}

importar().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
