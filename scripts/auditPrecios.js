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
    // 1. Cargar matriz de precios
    const provSnap = await db.collection("province").get();
    const preciosMap = {};
    provSnap.docs.forEach((doc) => {
        const data = doc.data();
        const state = (data.state || "").toUpperCase().trim();
        (data.regions || []).forEach((r) => {
            const city = (r.city || "").toUpperCase().trim();
            const key = `${state}|${city}`;
            preciosMap[key] = {
                precioPagina: parseFloat(r.precioPagina || r.price || 0),
                cost: parseFloat(r.cost || 0),
            };
        });
    });

    console.log(`\n✅ Matriz cargada: ${Object.keys(preciosMap).length} rutas\n`);

    // 2. Cargar vehículos no pagados (estatus != "EN") con fecha >= 13 abril 2026
    const fechaCorte = new Date("2026-04-13T00:00:00");
    const vehSnap = await db.collection("vehiculos").get();

    const vehiculos = vehSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((v) => {
            if (v.estatus === "EN") return false;
            const ts = v.registro?.timestamp || v.timestamp;
            if (!ts) return false;
            const fecha = ts.seconds ? new Date(ts.seconds * 1000) : ts.toDate ? ts.toDate() : new Date(ts);
            return fecha >= fechaCorte;
        });

    console.log(`🚗 Vehículos no pagados después del 13 abril: ${vehiculos.length}\n`);

    // 3. Comparar
    const incorrectos = [];
    const sinRuta = [];

    vehiculos.forEach((v) => {
        const estado = (v.estado || "").toUpperCase().trim();
        const ciudad = (v.ciudad || "").toUpperCase().trim();
        const key = `${estado}|${ciudad}`;
        const config = preciosMap[key];

        if (!config) {
            sinRuta.push({
                lote: v.id || v.binNip,
                cliente: v.cliente,
                marca: v.marca,
                modelo: v.modelo,
                estado,
                ciudad,
                priceActual: v.price,
                estatus: v.estatus,
            });
            return;
        }

        const priceVehiculo = parseFloat(v.price || 0);
        const precioEsperado = config.precioPagina;

        if (Math.abs(priceVehiculo - precioEsperado) > 0.01) {
            incorrectos.push({
                lote: v.id || v.binNip,
                cliente: v.cliente,
                marca: v.marca,
                modelo: v.modelo,
                estado,
                ciudad,
                estatus: v.estatus,
                priceActual: priceVehiculo,
                precioEsperado,
                diferencia: priceVehiculo - precioEsperado,
                costChofer: config.cost,
            });
        }
    });

    // 4. Reporte
    if (incorrectos.length === 0) {
        console.log("✅ TODOS los vehículos tienen el precio correcto según la matriz.\n");
    } else {
        console.log(`❌ ${incorrectos.length} VEHÍCULOS CON PRECIO INCORRECTO:\n`);
        console.log("LOTE           | CLIENTE              | VEHÍCULO             | ESTADO-CIUDAD                  | ESTATUS | TIENE    | DEBERÍA  | DIFF");
        console.log("-".repeat(155));
        incorrectos.forEach((v) => {
            console.log(
                `${(v.lote || "").padEnd(14)} | ${(v.cliente || "").substring(0, 20).padEnd(20)} | ${(v.marca + " " + v.modelo).substring(0, 20).padEnd(20)} | ${(v.estado + " - " + v.ciudad).substring(0, 30).padEnd(30)} | ${(v.estatus || "").padEnd(7)} | $${v.priceActual.toFixed(2).padStart(7)} | $${v.precioEsperado.toFixed(2).padStart(7)} | ${v.diferencia > 0 ? "+" : ""}$${v.diferencia.toFixed(2)}`
            );
        });
    }

    if (sinRuta.length > 0) {
        console.log(`\n⚠️  ${sinRuta.length} vehículos sin ruta encontrada en la matriz:\n`);
        sinRuta.forEach((v) => {
            console.log(`   ${v.lote} | ${v.cliente} | ${v.estado} - ${v.ciudad} | price: ${v.priceActual} | estatus: ${v.estatus}`);
        });
    }

    console.log("\n--- FIN DEL REPORTE ---\n");
    process.exit(0);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
