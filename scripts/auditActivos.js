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
    // 1. Cargar matriz
    const provSnap = await db.collection("province").get();
    const preciosMap = {};
    provSnap.docs.forEach(doc => {
        const data = doc.data();
        const state = (data.state || "").toUpperCase().trim();
        (data.regions || []).forEach(r => {
            const city = (r.city || "").toUpperCase().trim();
            preciosMap[`${state}|${city}`] = {
                precioPagina: parseFloat(r.precioPagina || r.price || 0),
                cost: parseFloat(r.cost || 0),
            };
        });
    });

    // 2. Cargar TODOS los vehiculos que NO sean EN (no pagados/entregados)
    const vehSnap = await db.collection("vehiculos").get();
    const activos = vehSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(v => v.estatus !== "EN");

    console.log(`\n${"=".repeat(100)}`);
    console.log(`  AUDITORÍA: TODOS LOS VEHÍCULOS ACTIVOS (NO ENTREGADOS)`);
    console.log(`${"=".repeat(100)}\n`);
    console.log(`  Total vehículos activos: ${activos.length}\n`);

    // Agrupar por estatus
    const porEstatus = {};
    activos.forEach(v => {
        const est = v.estatus || "SIN_ESTATUS";
        if (!porEstatus[est]) porEstatus[est] = [];
        porEstatus[est].push(v);
    });

    const estatusLabels = { PR: "Registrado", IN: "Cargando", TR: "En Tránsito", EB: "En Brownsville", DS: "Descargado" };

    for (const [estatus, vehiculos] of Object.entries(porEstatus)) {
        console.log(`\n── ESTATUS: ${estatus} (${estatusLabels[estatus] || "?"}) — ${vehiculos.length} vehículos ──`);
        
        const incorrectos = [];
        const sinRuta = [];
        let correctos = 0;

        vehiculos.forEach(v => {
            const estado = (v.estado || "").toUpperCase().trim();
            const ciudad = (v.ciudad || "").toUpperCase().trim();
            const key = `${estado}|${ciudad}`;
            const config = preciosMap[key];

            if (!config) {
                sinRuta.push(v);
                return;
            }

            const priceVeh = parseFloat(v.price || 0);
            const esperado = config.precioPagina;

            if (Math.abs(priceVeh - esperado) > 0.01) {
                incorrectos.push({
                    lote: v.id || v.binNip,
                    cliente: v.cliente,
                    marca: v.marca,
                    modelo: v.modelo,
                    estado, ciudad,
                    priceActual: priceVeh,
                    precioEsperado: esperado,
                    diff: priceVeh - esperado,
                    numViaje: v.numViaje || "N/A",
                });
            } else {
                correctos++;
            }
        });

        console.log(`  ✅ Correctos: ${correctos}`);
        console.log(`  ❌ Incorrectos: ${incorrectos.length}`);
        if (sinRuta.length > 0) console.log(`  ⚠️  Sin ruta en matriz: ${sinRuta.length}`);

        if (incorrectos.length > 0) {
            console.log(`\n  LOTE           | CLIENTE              | VEHÍCULO             | RUTA                           | TIENE    | DEBERÍA  | DIFF     | VIAJE`);
            console.log("  " + "-".repeat(140));
            incorrectos.forEach(v => {
                console.log(
                    `  ${(v.lote||"").padEnd(14)} | ${(v.cliente||"").substring(0,20).padEnd(20)} | ${(v.marca+" "+v.modelo).substring(0,20).padEnd(20)} | ${(v.estado+" - "+v.ciudad).substring(0,30).padEnd(30)} | $${v.priceActual.toFixed(2).padStart(7)} | $${v.precioEsperado.toFixed(2).padStart(7)} | ${v.diff>0?"+":""}$${v.diff.toFixed(2).padStart(6)} | ${v.numViaje}`
                );
            });
        }

        if (sinRuta.length > 0) {
            console.log(`\n  Sin ruta en matriz:`);
            sinRuta.forEach(v => {
                console.log(`    ${v.id || v.binNip} | ${v.cliente} | ${(v.estado||"").toUpperCase()} - ${(v.ciudad||"").toUpperCase()} | price: $${v.price}`);
            });
        }
    }

    // 3. Revisar viajesPendientes
    console.log(`\n${"=".repeat(100)}`);
    console.log(`  AUDITORÍA: VIAJES PENDIENTES`);
    console.log(`${"=".repeat(100)}\n`);

    const vpSnap = await db.collection("viajesPendientes").get();
    console.log(`  Total viajes pendientes: ${vpSnap.docs.length}\n`);

    vpSnap.docs.forEach(doc => {
        const vp = { id: doc.id, ...doc.data() };
        const vehiculos = vp.vehiculos || [];
        const incorrectos = [];

        vehiculos.forEach(v => {
            const estado = (v.estado || "").toUpperCase().trim();
            const ciudad = (v.ciudad || "").toUpperCase().trim();
            const key = `${estado}|${ciudad}`;
            const config = preciosMap[key];
            if (!config) return;

            const precioVenta = parseFloat(v.precioVenta || v.flete || 0);
            const esperado = config.precioPagina;

            if (Math.abs(precioVenta - esperado) > 0.01) {
                incorrectos.push({
                    lote: v.lote,
                    estado, ciudad,
                    precioVenta,
                    esperado,
                    diff: precioVenta - esperado,
                    flete: parseFloat(v.flete || 0),
                });
            }
        });

        if (incorrectos.length > 0) {
            console.log(`  ❌ Viaje: ${vp.id} | ${vp.numViaje || "sin num"} | Chofer: ${vp.chofer?.nombre || "N/A"} | ${incorrectos.length}/${vehiculos.length} vehículos con precio incorrecto`);
            incorrectos.forEach(v => {
                console.log(`      Lote ${v.lote} | ${v.estado}-${v.ciudad} | precioVenta: $${v.precioVenta} | debería: $${v.esperado} | diff: $${v.diff.toFixed(2)} | flete(chofer): $${v.flete}`);
            });
        } else if (vehiculos.length > 0) {
            console.log(`  ✅ Viaje: ${vp.id} | ${vp.numViaje || "sin num"} | ${vehiculos.length} vehículos — todos correctos`);
        }
    });

    // 4. Revisar lotesEnTransito
    console.log(`\n${"=".repeat(100)}`);
    console.log(`  AUDITORÍA: LOTES EN TRÁNSITO`);
    console.log(`${"=".repeat(100)}\n`);

    const lotesSnap = await db.collection("lotesEnTransito").get();
    console.log(`  Total lotes en tránsito: ${lotesSnap.docs.length}\n`);

    if (lotesSnap.docs.length > 0) {
        lotesSnap.docs.forEach(doc => {
            const l = { id: doc.id, ...doc.data() };
            console.log(`  Lote: ${l.id} | Viaje: ${l.viajeAsignado} | Chofer: ${l.choferNombre}`);
        });
    } else {
        console.log("  No hay lotes en tránsito actualmente.");
    }

    console.log(`\n${"=".repeat(100)}\n`);
    process.exit(0);
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
