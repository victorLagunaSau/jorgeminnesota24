/**
 * Script para generar análisis PDF de cargas por estado
 * Uso: node scripts/generarAnalisisPDF.js
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

async function generarAnalisis() {
    console.log("Consultando viajes importados...");
    const snap = await db.collection("viajesPagados")
        .where("metodo", "==", "IMPORTACION_HISTORIAL")
        .get();

    const viajes = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
    console.log(`Total viajes: ${viajes.length}`);

    // Extraer vehículos
    const vehiculos = [];
    viajes.forEach(viaje => {
        (viaje.vehiculos || []).forEach(v => {
            const flete = parseFloat(v.flete) || 0;
            const storage = parseFloat(v.storage) || 0;
            const sPeso = parseFloat(v.sPeso) || 0;
            const gExtra = parseFloat(v.gExtra) || 0;
            vehiculos.push({
                estado: (v.estado || "SIN ESTADO").toUpperCase().trim(),
                total: flete + storage + sPeso + gExtra,
            });
        });
    });

    console.log(`Total cargas: ${vehiculos.length}`);

    // Agrupar por estado
    const porEstado = {};
    vehiculos.forEach(v => {
        if (!porEstado[v.estado]) porEstado[v.estado] = { cargas: 0, total: 0 };
        porEstado[v.estado].cargas++;
        porEstado[v.estado].total += v.total;
    });

    const estadosOrdenados = Object.entries(porEstado)
        .sort((a, b) => b[1].total - a[1].total);

    const totalCargas = vehiculos.length;
    const totalIngreso = vehiculos.reduce((s, v) => s + v.total, 0);
    const fmt = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; padding: 40px 50px; }
    .header { text-align: center; border-bottom: 3px solid #b91c1c; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { font-size: 24px; font-weight: 900; color: #b91c1c; text-transform: uppercase; letter-spacing: 2px; }
    .header .empresa { font-size: 14px; font-weight: 700; color: #333; margin-top: 4px; }
    .header p { font-size: 10px; color: #888; margin-top: 4px; }
    .resumen { display: flex; gap: 20px; margin-bottom: 25px; }
    .resumen-card { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
    .resumen-card .num { font-size: 26px; font-weight: 900; color: #b91c1c; }
    .resumen-card .label { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #1f2937; color: white; padding: 8px 10px; text-align: left; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    td.right { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; }
    td.center { text-align: center; }
    td.bold { font-weight: 800; }
    tr:nth-child(even) { background: #f9fafb; }
    tr.top1 td { background: #fef2f2; }
    tr.top2 td { background: #fff7ed; }
    tr.top3 td { background: #fefce8; }
    .bar-container { width: 100%; background: #e5e7eb; border-radius: 4px; height: 16px; position: relative; }
    .bar { height: 16px; border-radius: 4px; background: #b91c1c; }
    .bar-label { position: absolute; right: 5px; top: 2px; font-size: 9px; font-weight: 800; color: #fff; }
    .bar-label-dark { position: absolute; right: 5px; top: 2px; font-size: 9px; font-weight: 800; color: #666; }
    tr.total-row td { background: #1f2937; color: white; font-weight: 900; font-size: 12px; border: none; }
    tr.total-row td.right { color: white; }
    .footer { text-align: center; margin-top: 30px; padding-top: 12px; border-top: 2px solid #e5e7eb; font-size: 9px; color: #aaa; }
</style>
</head>
<body>

<div class="header">
    <h1>Analisis por Estado</h1>
    <div class="empresa">Jorge Minnesota Logistic LLC</div>
    <p>Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
</div>

<div class="resumen">
    <div class="resumen-card">
        <div class="num">${totalCargas}</div>
        <div class="label">Cargas Totales</div>
    </div>
    <div class="resumen-card">
        <div class="num">${estadosOrdenados.length}</div>
        <div class="label">Estados</div>
    </div>
    <div class="resumen-card">
        <div class="num">$${fmt(totalIngreso)}</div>
        <div class="label">Utilidad Total</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th style="width:35px" class="center">#</th>
            <th>Estado</th>
            <th class="center">Cargas</th>
            <th class="center">% Cargas</th>
            <th class="right">Utilidad</th>
            <th class="center">% Utilidad</th>
            <th style="width:150px"></th>
        </tr>
    </thead>
    <tbody>
        ${estadosOrdenados.map(([estado, d], i) => {
            const pctCargas = ((d.cargas / totalCargas) * 100);
            const pctUtilidad = ((d.total / totalIngreso) * 100);
            const rowClass = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
            return `<tr class="${rowClass}">
                <td class="center bold">${i + 1}</td>
                <td class="bold" style="font-size:12px;">${estado}</td>
                <td class="center bold">${d.cargas}</td>
                <td class="center">${pctCargas.toFixed(1)}%</td>
                <td class="right">$${fmt(d.total)}</td>
                <td class="center bold">${pctUtilidad.toFixed(1)}%</td>
                <td>
                    <div class="bar-container">
                        <div class="bar" style="width:${pctUtilidad}%"></div>
                        ${pctUtilidad > 8 ? `<div class="bar-label">${pctUtilidad.toFixed(1)}%</div>` : `<div class="bar-label-dark">${pctUtilidad.toFixed(1)}%</div>`}
                    </div>
                </td>
            </tr>`;
        }).join("")}
        <tr class="total-row">
            <td></td>
            <td>TOTAL</td>
            <td class="center">${totalCargas}</td>
            <td class="center">100%</td>
            <td class="right">$${fmt(totalIngreso)}</td>
            <td class="center">100%</td>
            <td></td>
        </tr>
    </tbody>
</table>

<div class="footer">
    Jorge Minnesota Logistic LLC &bull; ${new Date().toLocaleString("es-MX")}
</div>

</body>
</html>`;

    console.log("Generando PDF...");
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
        path: "analisis.pdf",
        format: "Letter",
        printBackground: true,
        margin: { top: "30px", bottom: "30px", left: "30px", right: "30px" },
    });
    await browser.close();

    console.log("\n✓ analisis.pdf generado en la raíz del proyecto.");
    process.exit(0);
}

generarAnalisis().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
