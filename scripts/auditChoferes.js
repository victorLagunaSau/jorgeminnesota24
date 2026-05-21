/**
 * Script temporal: Audita viajes pagados para encontrar choferes sin empresa
 * o que no existen en la colección de choferes.
 *
 * Ejecutar: node scripts/auditChoferes.js
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

async function main() {
    console.log("Cargando choferes...");
    const choferesSnap = await db.collection("choferes").get();
    const choferes = {};
    choferesSnap.docs.forEach(doc => {
        const d = doc.data();
        choferes[doc.id] = {
            nombre: d.nombreChofer || "",
            empresa: d.empresaNombre || "",
        };
    });
    console.log(`Total choferes en sistema: ${Object.keys(choferes).length}\n`);

    console.log("Cargando viajes pagados...");
    const viajesSnap = await db.collection("viajesPagados").get();
    console.log(`Total viajes pagados: ${viajesSnap.size}\n`);

    const sinChofer = [];
    const choferNoExiste = [];
    const sinEmpresaEnViaje = [];
    const sinEmpresaEnChofer = [];
    const choferPendiente = [];

    viajesSnap.docs.forEach(doc => {
        const v = doc.data();
        const numViaje = v.numViaje || doc.id;

        // Viajes sin chofer asignado
        if (!v.chofer || !v.chofer.nombre) {
            if (v.choferPendiente) {
                choferPendiente.push({
                    viaje: numViaje,
                    choferExcel: v.choferExcel || "",
                });
            } else {
                sinChofer.push({ viaje: numViaje });
            }
            return;
        }

        const choferId = v.chofer.id;
        const choferNombre = v.chofer.nombre;
        const empresaViaje = v.chofer.empresa || v.empresaLiquidada || "";

        // Chofer en el viaje no existe en la colección de choferes
        if (choferId && !choferId.startsWith("TEMPORAL_") && !choferes[choferId]) {
            choferNoExiste.push({
                viaje: numViaje,
                choferId,
                choferNombre,
            });
        }

        // Viaje sin empresa
        if (!empresaViaje) {
            sinEmpresaEnViaje.push({
                viaje: numViaje,
                choferId,
                choferNombre,
            });
        }

        // Chofer existe pero no tiene empresa en la colección de choferes
        if (choferId && choferes[choferId] && !choferes[choferId].empresa) {
            sinEmpresaEnChofer.push({
                viaje: numViaje,
                choferId,
                choferNombre,
                nombreEnSistema: choferes[choferId].nombre,
            });
        }
    });

    console.log("=== RESULTADOS DE AUDITORÍA ===\n");

    if (choferPendiente.length > 0) {
        console.log(`❌ VIAJES CON CHOFER PENDIENTE (${choferPendiente.length}):`);
        choferPendiente.forEach(r => console.log(`   Viaje #${r.viaje} — Ref Excel: "${r.choferExcel}"`));
        console.log();
    }

    if (sinChofer.length > 0) {
        console.log(`❌ VIAJES SIN CHOFER (${sinChofer.length}):`);
        sinChofer.forEach(r => console.log(`   Viaje #${r.viaje}`));
        console.log();
    }

    if (choferNoExiste.length > 0) {
        console.log(`⚠️  CHOFER EN VIAJE NO EXISTE EN COLECCIÓN CHOFERES (${choferNoExiste.length}):`);
        choferNoExiste.forEach(r => console.log(`   Viaje #${r.viaje} — "${r.choferNombre}" (ID: ${r.choferId})`));
        console.log();
    }

    if (sinEmpresaEnViaje.length > 0) {
        console.log(`⚠️  VIAJES SIN EMPRESA REGISTRADA (${sinEmpresaEnViaje.length}):`);
        sinEmpresaEnViaje.forEach(r => console.log(`   Viaje #${r.viaje} — Chofer: "${r.choferNombre}"`));
        console.log();
    }

    if (sinEmpresaEnChofer.length > 0) {
        console.log(`⚠️  CHOFER EXISTE PERO SIN EMPRESA EN SU FICHA (${sinEmpresaEnChofer.length}):`);
        sinEmpresaEnChofer.forEach(r => console.log(`   Viaje #${r.viaje} — "${r.choferNombre}" (ID: ${r.choferId})`));
        console.log();
    }

    if (choferPendiente.length === 0 && sinChofer.length === 0 && choferNoExiste.length === 0 && sinEmpresaEnViaje.length === 0 && sinEmpresaEnChofer.length === 0) {
        console.log("✅ Todos los viajes tienen chofer y empresa correctamente asignados.");
    }

    // --- Choferes TEMPORAL_ y LIBRE_ en historial ---
    console.log("\n=== CHOFERES TEMPORALES EN HISTORIAL ===\n");
    const temporales = [];
    const libres = [];

    viajesSnap.docs.forEach(doc => {
        const v = doc.data();
        const numViaje = v.numViaje || doc.id;
        const choferId = v.chofer?.id || "";
        const choferNombre = v.chofer?.nombre || "";

        if (choferId.startsWith("TEMPORAL_")) {
            temporales.push({ viaje: numViaje, choferId, choferNombre, empresa: v.chofer?.empresa || v.empresaLiquidada || "" });
        } else if (choferId.startsWith("LIBRE_")) {
            libres.push({ viaje: numViaje, choferId, choferNombre, empresa: v.chofer?.empresa || v.empresaLiquidada || "" });
        }
    });

    if (temporales.length > 0) {
        console.log(`CHOFERES TEMPORAL_ (${temporales.length}):`);
        temporales.forEach(r => console.log(`   Viaje #${r.viaje} — "${r.choferNombre}" (ID: ${r.choferId}) — Empresa: "${r.empresa}"`));
    } else {
        console.log("No hay choferes TEMPORAL_ en el historial.");
    }

    console.log();

    if (libres.length > 0) {
        console.log(`CHOFERES LIBRE_ (${libres.length}):`);
        libres.forEach(r => console.log(`   Viaje #${r.viaje} — "${r.choferNombre}" (ID: ${r.choferId}) — Empresa: "${r.empresa}"`));
    } else {
        console.log("No hay choferes LIBRE_ en el historial.");
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
