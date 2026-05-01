const firebase = require("firebase/app");
require("firebase/firestore");

const config = {
    apiKey: "AIzaSyDJGBFa9gVwJpIedfidnFxotapD-uY1J9M",
    authDomain: "jorgeminnesota-bd031.firebaseapp.com",
    projectId: "jorgeminnesota-bd031",
};
if (!firebase.apps.length) firebase.initializeApp(config);
const db = firebase.firestore();

async function debug() {
    const abril = new Date(2026, 3, 1);
    const finMayo = new Date(2026, 5, 0, 23, 59, 59);

    const snap = await db.collection("viajesPagados")
        .where("fechaPago", ">=", abril)
        .where("fechaPago", "<=", finMayo)
        .get();

    console.log(`Viajes pagados abril-mayo: ${snap.docs.length}\n`);

    // Mostrar estructura de los primeros 3
    snap.docs.slice(0, 3).forEach(doc => {
        const v = doc.data();
        console.log(`--- ${doc.id} ---`);
        console.log(`  numViaje: ${v.numViaje}`);
        console.log(`  folioPago: ${v.folioPago}`);
        console.log(`  chofer: ${v.chofer?.nombre}`);
        console.log(`  empresaLiquidada: ${v.empresaLiquidada}`);
        console.log(`  estadoOrigen: ${v.estadoOrigen}`);
        console.log(`  vehiculos: ${(v.vehiculos || []).length}`);
        console.log(`  resumenFinanciero:`, JSON.stringify(v.resumenFinanciero, null, 4));
        console.log(`  fechaPago:`, v.fechaPago);
        console.log();
    });

    // Contar por mes
    let abril_count = 0, mayo_count = 0;
    let totalAbril = 0, totalMayo = 0;
    let vehAbril = 0, vehMayo = 0;

    snap.docs.forEach(doc => {
        const v = doc.data();
        const fecha = v.fechaPago?.toDate ? v.fechaPago.toDate() : new Date(v.fechaPago?.seconds * 1000);
        const gran = parseFloat(v.resumenFinanciero?.granTotal) || 0;
        const vehs = (v.vehiculos || []).length;

        if (fecha.getMonth() === 3) { abril_count++; totalAbril += gran; vehAbril += vehs; }
        if (fecha.getMonth() === 4) { mayo_count++; totalMayo += gran; vehMayo += vehs; }
    });

    console.log(`Abril: ${abril_count} viajes, ${vehAbril} vehículos, total: $${totalAbril.toFixed(2)}`);
    console.log(`Mayo: ${mayo_count} viajes, ${vehMayo} vehículos, total: $${totalMayo.toFixed(2)}`);

    process.exit(0);
}

debug().catch(err => { console.error(err); process.exit(1); });
