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

async function main() {
    // 1. Cargar matriz y detectar desincronizaciones
    const provSnap = await db.collection("province").get();
    const preciosMap = {};
    const desync = [];

    provSnap.docs.forEach(doc => {
        const data = doc.data();
        const state = (data.state || "").toUpperCase().trim();
        (data.regions || []).forEach(r => {
            const city = (r.city || "").toUpperCase().trim();
            const precioPagina = parseFloat(r.precioPagina || 0);
            const price = parseFloat(r.price || 0);
            const cost = parseFloat(r.cost || 0);
            const key = `${state}|${city}`;
            preciosMap[key] = { precioPagina, price, cost };

            if (Math.abs(precioPagina - price) > 0.01) {
                desync.push({ state, city, precioPagina, price, cost, diff: precioPagina - price });
            }
        });
    });

    console.log(`\n${"=".repeat(90)}`);
    console.log(`  REPORTE: ESTADOS DESINCRONIZADOS (precioPagina ≠ price)`);
    console.log(`${"=".repeat(90)}\n`);

    if (desync.length === 0) {
        console.log("  ✅ Todas las rutas tienen price = precioPagina\n");
    } else {
        console.log(`  ❌ ${desync.length} RUTAS DESINCRONIZADAS:\n`);
        console.log("  ESTADO                 | CIUDAD                 | precioPagina | price    | cost     | DIFF");
        console.log("  " + "-".repeat(86));
        desync.forEach(d => {
            console.log(`  ${d.state.padEnd(22)} | ${d.city.padEnd(22)} | $${d.precioPagina.toFixed(2).padStart(8)} | $${d.price.toFixed(2).padStart(6)} | $${d.cost.toFixed(2).padStart(6)} | ${d.diff > 0 ? "+" : ""}$${d.diff.toFixed(2)}`);
        });
    }

    // 2. Vehiculos no pagados despues del 13 abril afectados
    console.log(`\n${"=".repeat(90)}`);
    console.log(`  VEHÍCULOS NO PAGADOS (después del 13 abril) CON PRECIO INCORRECTO POR DESYNC`);
    console.log(`${"=".repeat(90)}\n`);

    const fechaCorte = new Date("2026-04-13T00:00:00");
    const vehSnap = await db.collection("vehiculos").get();

    const vehiculos = vehSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(v => {
            if (v.estatus === "EN") return false;
            const ts = v.registro?.timestamp || v.timestamp;
            if (!ts) return false;
            const fecha = ts.seconds ? new Date(ts.seconds * 1000) : ts.toDate ? ts.toDate() : new Date(ts);
            return fecha >= fechaCorte;
        });

    const afectados = [];
    vehiculos.forEach(v => {
        const estado = (v.estado || "").toUpperCase().trim();
        const ciudad = (v.ciudad || "").toUpperCase().trim();
        const key = `${estado}|${ciudad}`;
        const config = preciosMap[key];
        if (!config) return;

        const priceVeh = parseFloat(v.price || 0);
        const precioEsperado = config.precioPagina;

        if (Math.abs(priceVeh - precioEsperado) > 0.01) {
            afectados.push({
                lote: v.id || v.binNip,
                cliente: v.cliente,
                marca: v.marca,
                modelo: v.modelo,
                estado, ciudad,
                estatus: v.estatus,
                priceActual: priceVeh,
                precioEsperado,
                priceMatriz: config.price,
                costMatriz: config.cost,
                diff: priceVeh - precioEsperado,
                numViaje: v.numViaje || "N/A",
                folioPago: v.folioPago || "N/A",
            });
        }
    });

    if (afectados.length === 0) {
        console.log("  ✅ Todos los vehículos no pagados tienen el precio correcto.\n");
    } else {
        console.log(`  ❌ ${afectados.length} VEHÍCULOS AFECTADOS:\n`);
        console.log("  LOTE           | CLIENTE              | VEHÍCULO             | RUTA                           | ESTATUS | TIENE    | DEBERÍA  | DIFF     | VIAJE");
        console.log("  " + "-".repeat(145));
        afectados.forEach(v => {
            console.log(
                `  ${(v.lote||"").padEnd(14)} | ${(v.cliente||"").substring(0,20).padEnd(20)} | ${(v.marca+" "+v.modelo).substring(0,20).padEnd(20)} | ${(v.estado+" - "+v.ciudad).substring(0,30).padEnd(30)} | ${(v.estatus||"").padEnd(7)} | $${v.priceActual.toFixed(2).padStart(7)} | $${v.precioEsperado.toFixed(2).padStart(7)} | ${v.diff>0?"+":""}$${v.diff.toFixed(2).padStart(6)} | ${v.numViaje}`
            );
        });
    }

    // 3. Vehiculos YA PAGADOS (EN) despues del 13 abril con precio incorrecto
    console.log(`\n${"=".repeat(90)}`);
    console.log(`  VEHÍCULOS YA PAGADOS (EN) después del 13 abril CON PRECIO INCORRECTO`);
    console.log(`${"=".repeat(90)}\n`);

    const pagados = vehSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(v => {
            if (v.estatus !== "EN") return false;
            const ts = v.registro?.timestamp || v.timestamp;
            if (!ts) return false;
            const fecha = ts.seconds ? new Date(ts.seconds * 1000) : ts.toDate ? ts.toDate() : new Date(ts);
            return fecha >= fechaCorte;
        });

    const pagadosAfectados = [];
    pagados.forEach(v => {
        const estado = (v.estado || "").toUpperCase().trim();
        const ciudad = (v.ciudad || "").toUpperCase().trim();
        const key = `${estado}|${ciudad}`;
        const config = preciosMap[key];
        if (!config) return;

        const priceVeh = parseFloat(v.price || 0);
        const precioEsperado = config.precioPagina;

        if (Math.abs(priceVeh - precioEsperado) > 0.01) {
            pagadosAfectados.push({
                lote: v.id || v.binNip,
                cliente: v.cliente,
                marca: v.marca,
                modelo: v.modelo,
                estado, ciudad,
                estatus: v.estatus,
                priceActual: priceVeh,
                precioEsperado,
                diff: priceVeh - precioEsperado,
                numViaje: v.numViaje || "N/A",
                folioPago: v.folioPago || "N/A",
            });
        }
    });

    if (pagadosAfectados.length === 0) {
        console.log("  ✅ Todos los vehículos pagados tienen el precio correcto.\n");
    } else {
        console.log(`  ❌ ${pagadosAfectados.length} VEHÍCULOS PAGADOS CON PRECIO INCORRECTO:\n`);
        console.log("  LOTE           | CLIENTE              | VEHÍCULO             | RUTA                           | TIENE    | DEBERÍA  | DIFF     | VIAJE    | FOLIO");
        console.log("  " + "-".repeat(145));
        pagadosAfectados.forEach(v => {
            console.log(
                `  ${(v.lote||"").padEnd(14)} | ${(v.cliente||"").substring(0,20).padEnd(20)} | ${(v.marca+" "+v.modelo).substring(0,20).padEnd(20)} | ${(v.estado+" - "+v.ciudad).substring(0,30).padEnd(30)} | $${v.priceActual.toFixed(2).padStart(7)} | $${v.precioEsperado.toFixed(2).padStart(7)} | ${v.diff>0?"+":""}$${v.diff.toFixed(2).padStart(6)} | ${v.numViaje.toString().padEnd(8)} | ${v.folioPago}`
            );
        });
    }

    console.log(`\n${"=".repeat(90)}\n`);
    process.exit(0);
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
