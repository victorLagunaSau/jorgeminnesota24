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

const LOTE = "44547403";

function formatTs(ts) {
    if (!ts) return "N/A";
    const d = ts.seconds ? new Date(ts.seconds * 1000) : ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "medium" });
}

async function main() {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`  RASTREO COMPLETO DEL LOTE: ${LOTE}`);
    console.log(`${"=".repeat(80)}\n`);

    // 1. Buscar en vehiculos
    console.log("── 1. COLECCIÓN: vehiculos ──────────────────────────────────");
    const vehDoc = await db.collection("vehiculos").doc(LOTE).get();
    if (vehDoc.exists) {
        const v = vehDoc.data();
        console.log(`  Estado:        ${v.estado} - ${v.ciudad}`);
        console.log(`  Estatus:       ${v.estatus}`);
        console.log(`  Cliente:       ${v.cliente} (ID: ${v.clienteId || "N/A"})`);
        console.log(`  Marca/Modelo:  ${v.marca} ${v.modelo}`);
        console.log(`  Almacén:       ${v.almacen}`);
        console.log(`  ─── PRECIOS ───`);
        console.log(`  price (cliente):      $${v.price}`);
        console.log(`  flete (chofer):       $${v.flete}`);
        console.log(`  precioVenta:          $${v.precioVenta || "N/A"}`);
        console.log(`  storage:              $${v.storage}`);
        console.log(`  sobrePeso:            $${v.sobrePeso}`);
        console.log(`  gastosExtra:          $${v.gastosExtra}`);
        console.log(`  storageChofer:        $${v.storageChofer || "N/A"}`);
        console.log(`  sobrePesoChofer:      $${v.sobrePesoChofer || "N/A"}`);
        console.log(`  gastosExtraChofer:    $${v.gastosExtraChofer || "N/A"}`);
        console.log(`  preciosClienteEditados: ${v.preciosClienteEditados}`);
        console.log(`  ─── VIAJE ───`);
        console.log(`  numViaje:      ${v.numViaje}`);
        console.log(`  folioPago:     ${v.folioPago}`);
        console.log(`  ─── REGISTRO ───`);
        console.log(`  Registrado por: ${v.registro?.usuario} (${formatTs(v.registro?.timestamp)})`);
        console.log(`  Datos origen:   ${v.datosOrigen?.usuario} (${formatTs(v.datosOrigen?.fechaRegistro)})`);
        if (v.ultimaActualizacionPrecios) {
            console.log(`  Últ. actualización precios: ${v.ultimaActualizacionPrecios.usuario} (${formatTs(v.ultimaActualizacionPrecios.fecha)})`);
            console.log(`    Viaje relacionado: ${v.ultimaActualizacionPrecios.viajeRelacionado}`);
        }
    } else {
        console.log("  ⚠️  NO ENCONTRADO en vehiculos");
    }

    // 2. Buscar en movimientos
    console.log("\n── 2. COLECCIÓN: movimientos ────────────────────────────────");
    const movSnap = await db.collection("movimientos").where("binNip", "==", LOTE).get();
    if (movSnap.empty) {
        console.log("  Sin movimientos");
    } else {
        const movs = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        movs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        movs.forEach((m, i) => {
            console.log(`\n  [${i + 1}] Tipo: ${m.tipo} | Estatus: ${m.estatus} | ${formatTs(m.timestamp)}`);
            console.log(`      Usuario: ${m.usuario} (${m.idUsuario || ""})`);
            console.log(`      price: $${m.price || "N/A"} | flete: $${m.flete || "N/A"} | storage: $${m.storage || "N/A"}`);
            console.log(`      sobrePeso: $${m.sobrePeso || "N/A"} | gastosExtra: $${m.gastosExtra || "N/A"}`);
            if (m.numViaje) console.log(`      numViaje: ${m.numViaje}`);
            if (m.nota) console.log(`      nota: ${m.nota}`);
            if (m.tipoRegistro) console.log(`      tipoRegistro: ${m.tipoRegistro}`);
        });
    }

    // 3. Buscar en viajesPagados
    console.log("\n── 3. COLECCIÓN: viajesPagados ──────────────────────────────");
    const vpSnap = await db.collection("viajesPagados").get();
    const viajesConLote = vpSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(vp => (vp.vehiculos || []).some(v => v.lote === LOTE));

    if (viajesConLote.length === 0) {
        console.log("  No encontrado en ningún viaje pagado");
    } else {
        viajesConLote.forEach(vp => {
            const vehiculoEnViaje = vp.vehiculos.find(v => v.lote === LOTE);
            console.log(`\n  Viaje: ${vp.numViaje} | Folio: ${vp.folioPago} | Método: ${vp.metodo || "NORMAL"}`);
            console.log(`  Fecha pago:     ${formatTs(vp.fechaPago)}`);
            console.log(`  Pagado por:     ${vp.pagadoPor?.nombre} (${vp.pagadoPor?.id || ""})`);
            console.log(`  Chofer:         ${vp.chofer?.nombre}`);
            console.log(`  Empresa líder:  ${vp.empresaLiderId}`);
            console.log(`  Estado origen:  ${vp.estadoOrigen}`);
            console.log(`  ─── DATOS DEL VEHÍCULO EN EL VIAJE ───`);
            console.log(`    lote:          ${vehiculoEnViaje.lote}`);
            console.log(`    marca/modelo:  ${vehiculoEnViaje.marca} ${vehiculoEnViaje.modelo}`);
            console.log(`    estado/ciudad: ${vehiculoEnViaje.estado} - ${vehiculoEnViaje.ciudad}`);
            console.log(`    clienteAlt:    ${vehiculoEnViaje.clienteAlt || "N/A"}`);
            console.log(`    clienteNombre: ${vehiculoEnViaje.clienteNombre || "N/A"}`);
            console.log(`    flete (chofer):   $${vehiculoEnViaje.flete}`);
            console.log(`    precioVenta:      $${vehiculoEnViaje.precioVenta || "N/A"}`);
            console.log(`    storage:          $${vehiculoEnViaje.storage}`);
            console.log(`    sPeso:            $${vehiculoEnViaje.sPeso}`);
            console.log(`    gExtra:           $${vehiculoEnViaje.gExtra}`);
            console.log(`    storageCliente:   $${vehiculoEnViaje.storageCliente || "N/A"}`);
            console.log(`    sPesoCliente:     $${vehiculoEnViaje.sPesoCliente || "N/A"}`);
            console.log(`    gExtraCliente:    $${vehiculoEnViaje.gExtraCliente || "N/A"}`);
            console.log(`    preciosClienteEditados: ${vehiculoEnViaje.preciosClienteEditados}`);
            console.log(`    yaPagado:         ${vehiculoEnViaje.yaPagado}`);
            console.log(`    titulo:           ${vehiculoEnViaje.titulo}`);

            // Resumen financiero del viaje
            if (vp.resumenFinanciero) {
                const rf = vp.resumenFinanciero;
                console.log(`  ─── RESUMEN FINANCIERO DEL VIAJE ───`);
                console.log(`    totalFletes:         $${rf.totalFletes}`);
                console.log(`    totalStorage:        $${rf.totalStorage}`);
                console.log(`    granTotal (chofer):  $${rf.granTotal}`);
                console.log(`    totalPrecioVenta:    $${rf.totalPrecioVenta || "N/A"}`);
                console.log(`    granTotalCliente:    $${rf.granTotalCliente || "N/A"}`);
            }
            if (vp.metodoPago) {
                console.log(`  ─── MÉTODO DE PAGO ───`);
                console.log(`    efectivo: $${vp.metodoPago.efectivo} | cheque: $${vp.metodoPago.cheque} | zelle: $${vp.metodoPago.zelle}`);
            }
        });
    }

    // 4. Buscar en viajesPendientes
    console.log("\n── 4. COLECCIÓN: viajesPendientes ──────────────────────────");
    const vpendSnap = await db.collection("viajesPendientes").get();
    const pendConLote = vpendSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(vp => (vp.vehiculos || []).some(v => v.lote === LOTE));

    if (pendConLote.length === 0) {
        console.log("  No encontrado en viajes pendientes");
    } else {
        pendConLote.forEach(vp => {
            const vehiculoEnViaje = vp.vehiculos.find(v => v.lote === LOTE);
            console.log(`  Viaje pendiente: ${vp.id} | Estatus: ${vp.estatus}`);
            console.log(`  flete: $${vehiculoEnViaje.flete} | precioVenta: $${vehiculoEnViaje.precioVenta || "N/A"}`);
        });
    }

    // 5. Buscar en auditLog
    console.log("\n── 5. COLECCIÓN: auditLog ───────────────────────────────────");
    const auditSnap = await db.collection("auditLog").where("binNip", "==", LOTE).get();
    if (auditSnap.empty) {
        console.log("  Sin registros de auditoría");
    } else {
        auditSnap.docs.forEach(d => {
            const a = d.data();
            console.log(`\n  Acción: ${a.accion} | Usuario: ${a.usuario} | ${formatTs(a.timestamp)}`);
            if (a.cambios) {
                Object.entries(a.cambios).forEach(([campo, vals]) => {
                    console.log(`    ${campo}: ${vals.antes} → ${vals.despues}`);
                });
            }
        });
    }

    // 6. Buscar en lotesEnTransito
    console.log("\n── 6. COLECCIÓN: lotesEnTransito ────────────────────────────");
    const loteDoc = await db.collection("lotesEnTransito").doc(LOTE).get();
    if (loteDoc.exists) {
        const l = loteDoc.data();
        console.log(`  viajeAsignado: ${l.viajeAsignado} | chofer: ${l.choferNombre} | ${formatTs(l.fechaBloqueo)}`);
    } else {
        console.log("  No está en tránsito");
    }

    // 7. Precio correcto según la matriz
    console.log("\n── 7. PRECIO CORRECTO SEGÚN MATRIZ ─────────────────────────");
    if (vehDoc.exists) {
        const v = vehDoc.data();
        const estado = (v.estado || "").toUpperCase().trim();
        const ciudad = (v.ciudad || "").toUpperCase().trim();
        const provSnap = await db.collection("province").get();
        let encontrado = false;
        provSnap.docs.forEach(doc => {
            const data = doc.data();
            if ((data.state || "").toUpperCase().trim() === estado) {
                (data.regions || []).forEach(r => {
                    if ((r.city || "").toUpperCase().trim() === ciudad) {
                        encontrado = true;
                        console.log(`  Ruta: ${estado} - ${ciudad}`);
                        console.log(`  precioPagina (correcto): $${r.precioPagina || r.price}`);
                        console.log(`  cost (chofer):           $${r.cost}`);
                        console.log(`  profit:                  $${r.profit}`);
                        console.log(`  ─── COMPARACIÓN ───`);
                        console.log(`  price en vehículo:       $${v.price}`);
                        const esperado = parseFloat(r.precioPagina || r.price || 0);
                        const actual = parseFloat(v.price || 0);
                        if (Math.abs(actual - esperado) > 0.01) {
                            console.log(`  ❌ DIFERENCIA:            $${(actual - esperado).toFixed(2)} (${actual < esperado ? "COBRA DE MENOS" : "COBRA DE MÁS"})`);
                        } else {
                            console.log(`  ✅ PRECIO CORRECTO`);
                        }
                    }
                });
            }
        });
        if (!encontrado) console.log(`  ⚠️  Ruta ${estado} - ${ciudad} no encontrada en la matriz`);
    }

    console.log(`\n${"=".repeat(80)}\n`);
    process.exit(0);
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
