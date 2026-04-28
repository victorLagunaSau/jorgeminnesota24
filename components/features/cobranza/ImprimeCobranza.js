import React, { forwardRef } from "react";
import moment from "moment";

const ImprimeCobranza = forwardRef(({ vehiculos }, ref) => {
    const fmt = (n) =>
        `$${Math.abs(n)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

    const formatFecha = (ts) => {
        if (!ts) return "-";
        const d = ts.seconds
            ? new Date(ts.seconds * 1000)
            : ts instanceof Date
            ? ts
            : null;
        return d
            ? d.toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
              })
            : "-";
    };

    const calcPrecio = (v) =>
        (parseFloat(v.price) || 0) +
        (parseFloat(v.storage) || 0) +
        (parseFloat(v.sobrePeso) || 0) +
        (parseFloat(v.gastosExtra) || 0);

    const calcCobrado = (v) =>
        (parseFloat(v.cajaRecibo) || 0) -
        (parseFloat(v.cajaCambio) || 0) +
        (parseFloat(v.cajaCC) || 0);

    const calcPendiente = (v) =>
        parseFloat(v.saldoFiado) || parseFloat(v.pagoTotalPendiente) || 0;

    const totalPrecio = vehiculos.reduce((s, v) => s + calcPrecio(v), 0);
    const totalCobrado = vehiculos.reduce((s, v) => s + calcCobrado(v), 0);
    const totalPendiente = vehiculos.reduce((s, v) => s + calcPendiente(v), 0);

    return (
        <div ref={ref} style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#000", padding: "20px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #b40a0a", paddingBottom: "8px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src="/assets/Logoprint.png" alt="Logo" style={{ height: "40px" }} />
                    <div>
                        <div style={{ fontSize: "16px", fontWeight: "bold", color: "#b40a0a" }}>REPORTE DE COBRANZA</div>
                        <div style={{ fontSize: "10px", color: "#666" }}>Jorge Minnesota Logistic LLC</div>
                    </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "10px", color: "#666" }}>
                    <div><strong>Fecha:</strong> {moment().format("DD/MM/YYYY HH:mm")}</div>
                    <div><strong>Vehículos:</strong> {vehiculos.length}</div>
                </div>
            </div>

            {/* Resumen */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: "4px", padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color: "#666", fontWeight: "bold", textTransform: "uppercase" }}>Precio Total</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{fmt(totalPrecio)}</div>
                </div>
                <div style={{ flex: 1, border: "1px solid #16a34a", borderRadius: "4px", padding: "8px", textAlign: "center", background: "#f0fdf4" }}>
                    <div style={{ fontSize: "9px", color: "#16a34a", fontWeight: "bold", textTransform: "uppercase" }}>Cobrado</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "#15803d" }}>{fmt(totalCobrado)}</div>
                </div>
                <div style={{ flex: 1, border: "1px solid #ea580c", borderRadius: "4px", padding: "8px", textAlign: "center", background: "#fff7ed" }}>
                    <div style={{ fontSize: "9px", color: "#ea580c", fontWeight: "bold", textTransform: "uppercase" }}>Pendiente</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "#c2410c" }}>{fmt(totalPendiente)}</div>
                </div>
            </div>

            {/* Tabla */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                    <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #d1d5db" }}>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Fecha</th>
                        <th style={thStyle}>Cliente</th>
                        <th style={thStyle}>Lote</th>
                        <th style={thStyle}>Vehículo</th>
                        <th style={thStyle}>Origen</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Flete</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Storage</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>S.Peso</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>G.Extra</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Precio</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Cobrado</th>
                        <th style={{ ...thStyle, textAlign: "right", color: "#ea580c" }}>Pendiente</th>
                    </tr>
                </thead>
                <tbody>
                    {vehiculos.map((v, i) => {
                        const precio = calcPrecio(v);
                        const cobrado = calcCobrado(v);
                        const pendiente = calcPendiente(v);

                        return (
                            <tr key={v.id || i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <td style={tdStyle}>{i + 1}</td>
                                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatFecha(v.timestamp)}</td>
                                <td style={{ ...tdStyle, fontWeight: "bold" }}>{v.cliente}</td>
                                <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: "bold" }}>{v.binNip}</td>
                                <td style={tdStyle}>{v.marca} {v.modelo}</td>
                                <td style={{ ...tdStyle, fontSize: "9px" }}>{v.ciudad}, {v.estado}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(parseFloat(v.price) || 0)}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(parseFloat(v.storage) || 0)}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(parseFloat(v.sobrePeso) || 0)}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(parseFloat(v.gastosExtra) || 0)}</td>
                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>{fmt(precio)}</td>
                                <td style={{ ...tdStyle, textAlign: "right", color: "#16a34a" }}>{fmt(cobrado)}</td>
                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold", color: "#ea580c" }}>{fmt(pendiente)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr style={{ borderTop: "2px solid #374151", background: "#f9fafb", fontWeight: "bold" }}>
                        <td colSpan="10" style={{ ...tdStyle, textAlign: "right", fontSize: "11px" }}>TOTALES:</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontSize: "11px" }}>{fmt(totalPrecio)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontSize: "11px", color: "#15803d" }}>{fmt(totalCobrado)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontSize: "11px", color: "#c2410c" }}>{fmt(totalPendiente)}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Footer */}
            <div style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#999" }}>
                <div>Jorge Minnesota Logistic LLC — 932 N. Minnesota Ave., Brownsville, TX 78521</div>
                <div>Generado: {moment().format("DD/MM/YYYY HH:mm:ss")}</div>
            </div>
        </div>
    );
});

const thStyle = {
    padding: "6px 4px",
    textAlign: "left",
    fontSize: "9px",
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#6b7280",
};

const tdStyle = {
    padding: "5px 4px",
};

export default ImprimeCobranza;
