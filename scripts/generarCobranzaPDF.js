/**
 * Reporte de vehículos activos (los que salen en la tabla de Vehículos)
 * Uso: node scripts/generarCobranzaPDF.js
 */
const puppeteer = require("puppeteer");
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

const fmt = (n) => `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const ESTATUS = { PR: "Registrado", IN: "Cargando", TR: "En Tránsito", EB: "En Brownsville", DS: "Descargado", EN: "Entregado" };

async function generar() {
    console.log("Consultando vehículos activos (estatus != EN)...");

    const snap = await db.collection("vehiculos")
        .where("estatus", "!=", "EN")
        .get();

    const abril1 = new Date(2026, 3, 1).getTime();
    const finMayo = new Date(2026, 5, 0, 23, 59, 59).getTime();

    console.log(`Total vehículos (sin EN): ${snap.docs.length}`);

    const vehiculos = snap.docs.map(doc => {
        const d = doc.data();
        const ts = d.registro?.timestamp;
        const fechaRegistro = ts ? new Date(ts.seconds * 1000) : null;

        // Solo abril y mayo 2026
        if (!fechaRegistro || fechaRegistro.getTime() < abril1 || fechaRegistro.getTime() > finMayo) return null;

        return {
            id: doc.id,
            lote: doc.id,
            gatePass: d.gatePass || "-",
            almacen: d.almacen || "-",
            tipo: d.tipoVehiculo || "-",
            marca: d.marca || "-",
            modelo: d.modelo || "-",
            cliente: d.cliente || "-",
            telefono: d.telefonoCliente || "-",
            estado: d.estado || "-",
            ciudad: d.ciudad || "-",
            estatus: d.estatus || "-",
            estatusLabel: ESTATUS[d.estatus] || d.estatus || "-",
            price: parseFloat(d.price) || 0,
            storage: parseFloat(d.storage) || 0,
            sobrePeso: parseFloat(d.sobrePeso) || 0,
            gastosExtra: parseFloat(d.gastosExtra) || 0,
            titulo: d.titulo || "-",
            descripcion: d.descripcion || "",
            fechaRegistro,
            fechaStr: fechaRegistro
                ? fechaRegistro.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                : "-",
        };
    }).filter(v => v !== null);

    console.log(`Vehículos abril-mayo 2026: ${vehiculos.length}`);

    // Ordenar por fecha de registro (más reciente primero)
    vehiculos.sort((a, b) => (b.fechaRegistro || 0) - (a.fechaRegistro || 0));

    // Calcular total por vehículo
    vehiculos.forEach(v => {
        v.total = v.price + v.storage + v.sobrePeso + v.gastosExtra;
    });

    const totalPrice = vehiculos.reduce((t, v) => t + v.price, 0);
    const totalStorage = vehiculos.reduce((t, v) => t + v.storage, 0);
    const totalSP = vehiculos.reduce((t, v) => t + v.sobrePeso, 0);
    const totalGE = vehiculos.reduce((t, v) => t + v.gastosExtra, 0);
    const granTotal = vehiculos.reduce((t, v) => t + v.total, 0);

    // Agrupar por estatus
    const porEstatus = {};
    vehiculos.forEach(v => {
        if (!porEstatus[v.estatus]) porEstatus[v.estatus] = { label: v.estatusLabel, count: 0, total: 0 };
        porEstatus[v.estatus].count++;
        porEstatus[v.estatus].total += v.total;
    });

    const hoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

    console.log(`\nResumen por estatus:`);
    Object.entries(porEstatus).forEach(([k, v]) => console.log(`  ${v.label} (${k}): ${v.count} vehículos - ${fmt(v.total)}`));
    console.log(`\nGran Total: ${fmt(granTotal)}`);

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 8px; color: #222; padding: 12px 15px; }
    .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #333; }
    .header h1 { font-size: 15px; text-transform: uppercase; letter-spacing: 2px; }
    .header h2 { font-size: 10px; color: #555; font-weight: normal; margin-top: 2px; }
    .header .fecha { font-size: 8px; color: #888; margin-top: 3px; }
    .resumen-general { display: flex; gap: 8px; margin-bottom: 10px; }
    .resumen-box { flex: 1; border: 1px solid #ddd; border-radius: 3px; padding: 5px 8px; text-align: center; }
    .resumen-box .label { font-size: 7px; color: #888; text-transform: uppercase; }
    .resumen-box .valor { font-size: 13px; font-weight: bold; }
    .resumen-estatus { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .estatus-box { border: 1px solid #ddd; border-radius: 3px; padding: 4px 8px; text-align: center; min-width: 80px; }
    .estatus-box .label { font-size: 6.5px; color: #888; text-transform: uppercase; }
    .estatus-box .valor { font-size: 11px; font-weight: bold; }
    .seccion { margin-bottom: 10px; }
    .seccion-header { background: #333; color: #fff; padding: 4px 8px; font-size: 9px; font-weight: bold; display: flex; justify-content: space-between; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; padding: 2px 3px; text-align: left; font-size: 6.5px; text-transform: uppercase; color: #555; border-bottom: 1px solid #ccc; }
    td { padding: 2px 3px; border-bottom: 1px solid #eee; font-size: 7.5px; }
    tr:nth-child(even) { background: #fafafa; }
    .r { text-align: right; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .lote { font-weight: bold; color: #1a5276; font-size: 7px; }
    .cliente { max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .total { color: #1a5276; }
    tfoot td { border-top: 2px solid #333; background: #f0f0f0; padding: 3px; }
    .page-break { page-break-before: always; }
    .pie { margin-top: 10px; text-align: center; font-size: 7px; color: #aaa; border-top: 1px solid #ddd; padding-top: 5px; }
    .resumen-section { margin-top: 10px; }
    .resumen-section h3 { font-size: 10px; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #333; padding-bottom: 3px; }
    .resumen-section table th { background: #333; color: #fff; }
</style></head><body>

<div class="header">
    <h1>Jorge Minnesota Logistic LLC</h1>
    <h2>Reporte de Vehículos Activos</h2>
    <p class="fecha">Generado el ${hoy}</p>
</div>

<div class="resumen-general">
    <div class="resumen-box">
        <div class="label">Total Vehículos</div>
        <div class="valor">${vehiculos.length}</div>
    </div>
    <div class="resumen-box">
        <div class="label">Total Flete</div>
        <div class="valor">${fmt(totalPrice)}</div>
    </div>
    <div class="resumen-box">
        <div class="label">Total Storage</div>
        <div class="valor">${fmt(totalStorage)}</div>
    </div>
    <div class="resumen-box">
        <div class="label">Total S.Peso</div>
        <div class="valor">${fmt(totalSP)}</div>
    </div>
    <div class="resumen-box">
        <div class="label">Total G.Extra</div>
        <div class="valor">${fmt(totalGE)}</div>
    </div>
    <div class="resumen-box">
        <div class="label">Gran Total</div>
        <div class="valor">${fmt(granTotal)}</div>
    </div>
</div>

<div class="resumen-estatus">
    ${Object.entries(porEstatus).map(([k, v]) => `
    <div class="estatus-box">
        <div class="label">${v.label}</div>
        <div class="valor">${v.count}</div>
    </div>`).join("")}
</div>

<div class="seccion">
    <div class="seccion-header">
        <span>Listado de Vehículos</span>
        <span>${vehiculos.length} vehículos — Total: ${fmt(granTotal)}</span>
    </div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Fecha Reg.</th>
                <th>Lote</th>
                <th>Almacén</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Ciudad</th>
                <th class="c">Estatus</th>
                <th class="r">Flete</th>
                <th class="r">Storage</th>
                <th class="r">S.Peso</th>
                <th class="r">G.Extra</th>
                <th class="r total">Total</th>
            </tr>
        </thead>
        <tbody>
            ${vehiculos.map((v, i) => `
            <tr>
                <td class="c">${i + 1}</td>
                <td class="c">${v.fechaStr}</td>
                <td class="lote">${v.lote}</td>
                <td>${v.almacen}</td>
                <td>${v.marca}</td>
                <td>${v.modelo}</td>
                <td class="cliente">${v.cliente}</td>
                <td>${v.estado}</td>
                <td>${v.ciudad}</td>
                <td class="c">${v.estatus}</td>
                <td class="r">${fmt(v.price)}</td>
                <td class="r">${v.storage > 0 ? fmt(v.storage) : "-"}</td>
                <td class="r">${v.sobrePeso > 0 ? fmt(v.sobrePeso) : "-"}</td>
                <td class="r">${v.gastosExtra > 0 ? fmt(v.gastosExtra) : "-"}</td>
                <td class="r total b">${fmt(v.total)}</td>
            </tr>`).join("")}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="10" class="r b">TOTALES</td>
                <td class="r b">${fmt(totalPrice)}</td>
                <td class="r b">${fmt(totalStorage)}</td>
                <td class="r b">${fmt(totalSP)}</td>
                <td class="r b">${fmt(totalGE)}</td>
                <td class="r b total">${fmt(granTotal)}</td>
            </tr>
        </tfoot>
    </table>
</div>



<div class="pie">Jorge Minnesota Logistic LLC — Reporte de Vehículos Activos — ${hoy}</div>

</body></html>`;

    console.log("\nGenerando PDF...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
        path: "pdf/cobranza.pdf",
        format: "Letter",
        landscape: true,
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "8mm", right: "8mm" },
    });
    await browser.close();

    console.log("PDF generado: pdf/cobranza.pdf");
    process.exit(0);
}

generar().catch(err => { console.error("Error:", err); process.exit(1); });
