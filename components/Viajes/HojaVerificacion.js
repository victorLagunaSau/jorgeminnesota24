import React from 'react';
import moment from 'moment';

const HojaVerificacion = React.forwardRef(({viajeData}, ref) => {
    if (!viajeData) return null;

    const folioLabel = `Bill of Lading - Folio: ${viajeData.numViaje}`;

    // Rellenar hasta 10 filas
    const filasVacias = Math.max(0, 10 - (viajeData.vehiculos?.length || 0));
    const vehiculosConVacios = [...(viajeData.vehiculos || []), ...Array(filasVacias).fill(null)];

    return (
        <div ref={ref} className="bg-white text-black" style={{
            padding: "0.5cm",
            width: "27.94cm",
            height: "21.59cm",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            display: 'flex',
            flexDirection: 'column',
            pageBreakAfter: 'always',
            pageBreakInside: 'avoid'
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: letter landscape;
                        margin: 0;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    html, body {
                        height: 100%;
                        overflow: hidden;
                    }
                }
                .modern-border {
                    border: 1.5px solid #e11d48 !important;
                }
                .modern-shadow {
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .subtle-shadow {
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                }
            ` }} />

            <title>{folioLabel}</title>

            {/* HEADER MODERNIZADO */}
            <div className="flex justify-between items-center modern-shadow" style={{
                marginBottom: "4px",
                padding: "6px 10px",
                background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
                borderRadius: "6px",
                flexShrink: 0
            }}>
                <div className="flex-shrink-0 flex items-center gap-2" style={{ width: "120px" }}>
                    <div className="bg-white rounded p-1 subtle-shadow">
                        <img src="/assets/Logoprint.png" alt="Logo" style={{ width: "80px", height: "auto" }} />
                    </div>
                </div>

                <div className="text-center flex-1" style={{ padding: "0 12px" }}>
                    <h1 className="font-black tracking-tight" style={{
                        fontSize: "22px",
                        marginBottom: "2px",
                        color: "#ffffff",
                        textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        letterSpacing: '1px'
                    }}>
                        BILL OF LADING
                    </h1>
                    <div className="text-[8px] font-semibold" style={{ lineHeight: '1.3', color: "#ffe4e6" }}>
                        <div>Jorge Minnesota Logistic LLC • 932 N. Minnesota Ave. • Brownsville TX, 78521</div>
                        <div className="font-black" style={{ fontSize: "9px", color: "#ffffff", marginTop: "1px" }}>
                            ☎ (956) 371-8314 • www.jorgeminnesota.com
                        </div>
                    </div>
                </div>

                <div className="flex gap-2" style={{ width: "120px" }}>
                    <div className="bg-white rounded p-1 subtle-shadow flex-1">
                        <div className="text-[6px] font-black text-center" style={{ color: "#be123c", marginBottom: "1px" }}>WORK ORDER</div>
                        <div className="text-center font-black" style={{ fontSize: "12px", color: "#1f2937", letterSpacing: '0.5px' }}>
                            #{viajeData.numViaje}
                        </div>
                    </div>
                    <div className="bg-white rounded p-1 subtle-shadow flex-1">
                        <div className="text-[6px] font-black text-center" style={{ color: "#be123c", marginBottom: "1px" }}>DATE</div>
                        <div className="text-center font-bold" style={{ fontSize: "8px", color: "#1f2937" }}>
                            {moment().format('MM/DD/YY')}
                        </div>
                    </div>
                </div>
            </div>

            {/* DRIVER INFO MODERNIZADO */}
            <div className="modern-shadow" style={{
                marginBottom: "4px",
                background: 'linear-gradient(to right, #ffffff, #fef2f2)',
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #fecdd3",
                flexShrink: 0
            }}>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center">
                        <span className="font-black text-[8px]" style={{ width: "45px", color: "#be123c" }}>DRIVER:</span>
                        <div className="flex-1 border-b-2 pl-2 font-bold text-[8px] uppercase" style={{
                            height: "14px",
                            paddingTop: "2px",
                            borderColor: "#fda4af",
                            color: "#1f2937"
                        }}>
                            {viajeData.chofer?.nombre || ""}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="font-black text-[8px]" style={{ width: "42px", color: "#be123c" }}>PHONE:</span>
                        <div className="flex-1 border-b-2" style={{ height: "14px", borderColor: "#fda4af" }}></div>
                    </div>
                    <div className="flex items-center">
                        <span className="font-black text-[8px]" style={{ width: "45px", color: "#be123c" }}>PICKUP:</span>
                        <div className="flex-1 border-b-2" style={{ height: "14px", borderColor: "#fda4af" }}></div>
                    </div>
                </div>
            </div>

            {/* TABLA MODERNIZADA */}
            <div className="modern-shadow" style={{ borderRadius: "6px", overflow: "hidden", marginBottom: "4px", flex: "1 1 auto", minHeight: "0" }}>
                <table className="w-full border-collapse" style={{ tableLayout: "fixed", height: "100%" }}>
                    <thead>
                        <tr className="font-black text-[7px]" style={{
                            letterSpacing: '0.5px',
                            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                            color: "#ffffff"
                        }}>
                            <th className="text-center" style={{ width: "22px", borderRight: "1px solid #475569" }}>★</th>
                            <th className="text-left px-2" style={{ width: "115px", borderRight: "1px solid #475569" }}>CUSTOMER</th>
                            <th className="text-left px-2" style={{ width: "62px", borderRight: "1px solid #475569" }}>STOCK#</th>
                            <th className="text-left px-2" style={{ width: "98px", borderRight: "1px solid #475569" }}>VEHICLE</th>
                            <th className="text-center" style={{ width: "34px", borderRight: "1px solid #475569" }}>YEAR</th>
                            <th className="text-center px-1" style={{ width: "52px", borderRight: "1px solid #475569" }}>PIN</th>
                            <th className="text-left px-2" style={{ width: "78px", borderRight: "1px solid #475569" }}>CITY</th>
                            <th className="text-left px-2" style={{ width: "62px", borderRight: "1px solid #475569" }}>AUCTION</th>
                            <th className="text-center" style={{ width: "44px", borderRight: "1px solid #475569" }}>FLETE</th>
                            <th className="text-center" style={{ width: "48px", borderRight: "1px solid #475569" }}>STORAGE</th>
                            <th className="text-center" style={{ width: "44px", borderRight: "1px solid #475569" }}>TOTAL</th>
                            <th className="text-center" style={{ width: "34px" }}>TITLE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehiculosConVacios.map((v, i) => (
                            <tr key={i} style={{
                                backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                                borderBottom: "1px solid #e2e8f0"
                            }}>
                                <td className="text-center font-black text-[9px]" style={{
                                    backgroundColor: v ? "linear-gradient(135deg, #fecdd3, #fda4af)" : "#f8fafc",
                                    color: "#be123c",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? i + 1 : ""}
                                </td>
                                <td className="px-2 text-[7px] font-semibold uppercase" style={{
                                    lineHeight: '1.3',
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? (v.clienteNombre || v.clienteAlt || "") : ""}
                                </td>
                                <td className="px-2 text-[7px] font-black" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? v.lote : ""}
                                </td>
                                <td className="px-2 text-[6px] font-semibold uppercase" style={{
                                    lineHeight: '1.3',
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? `${v.marca} ${v.modelo}` : ""}
                                </td>
                                <td className="text-center text-[7px] font-bold" style={{
                                    color: "#475569",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? v.year || "" : ""}
                                </td>
                                <td className="text-center text-[6px] font-medium" style={{
                                    color: "#64748b",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? v.pin || "" : ""}
                                </td>
                                <td className="px-2 text-[6px] font-semibold uppercase" style={{
                                    lineHeight: '1.3',
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? v.ciudad : ""}
                                </td>
                                <td className="px-2 text-[6px] font-semibold uppercase" style={{
                                    lineHeight: '1.3',
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? v.almacen : ""}
                                </td>
                                <td className="text-center text-[7px] font-bold" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? `$${v.flete}` : ""}
                                </td>
                                <td className="text-center text-[7px] font-bold" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? `$${v.storage || 0}` : ""}
                                </td>
                                <td className="text-center text-[7px] font-black" style={{
                                    background: v ? "linear-gradient(135deg, #d1fae5, #a7f3d0)" : "transparent",
                                    color: "#065f46",
                                    borderRight: "1px solid #e2e8f0"
                                }}>
                                    {v ? `$${(parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0))}` : ""}
                                </td>
                                <td className="text-center text-[11px]" style={{ color: "#be123c" }}>
                                    {v && v.titulo === "SI" ? "✓" : v ? "○" : ""}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FOOTER MODERNIZADO */}
            <div className="flex justify-between items-end gap-2" style={{ flexShrink: 0 }}>
                <div className="flex-1">
                    <div className="bg-white rounded p-2 subtle-shadow" style={{ maxWidth: "150px", border: "1px solid #e2e8f0" }}>
                        <div className="text-center font-black text-[7px]" style={{
                            color: "#64748b",
                            marginBottom: "3px",
                            letterSpacing: '0.5px'
                        }}>
                            DRIVER SIGNATURE
                        </div>
                        <div style={{ borderTop: "2px solid #cbd5e1", paddingTop: "2px" }}></div>
                    </div>
                </div>

                <div className="flex items-end gap-2">
                    <div className="space-y-1">
                        <div className="bg-white rounded p-2 subtle-shadow" style={{ border: "1px solid #e2e8f0" }}>
                            <div className="font-black text-[6px] text-center" style={{
                                marginBottom: "2px",
                                color: "#64748b",
                                letterSpacing: '0.5px'
                            }}>
                                SUB-TOTAL
                            </div>
                            <div className="flex gap-2 items-center" style={{ marginBottom: "2px" }}>
                                <span className="font-bold text-[6px]" style={{ width: "40px", textAlign: "right", color: "#64748b" }}>CHEQUE</span>
                                <div className="bg-gray-50 rounded" style={{
                                    width: "55px",
                                    height: "11px",
                                    border: "1px solid #cbd5e1"
                                }}></div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="font-bold text-[6px]" style={{ width: "40px", textAlign: "right", color: "#64748b" }}>EFECTIVO</span>
                                <div className="bg-gray-50 rounded" style={{
                                    width: "55px",
                                    height: "11px",
                                    border: "1px solid #cbd5e1"
                                }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="modern-shadow rounded overflow-hidden" style={{ border: "2px solid #10b981" }}>
                        <div className="bg-white" style={{ padding: "2px", borderBottom: "1px solid #d1fae5" }}>
                            <div className="text-center font-black text-[6px]" style={{
                                color: "#065f46",
                                letterSpacing: '0.5px'
                            }}>
                                TOTAL
                            </div>
                        </div>
                        <div style={{
                            width: "65px",
                            height: "34px",
                            background: "linear-gradient(135deg, #d1fae5, #a7f3d0)"
                        }}></div>
                    </div>
                </div>

                <div className="flex-1 flex justify-end">
                    <div className="bg-white rounded p-2 subtle-shadow" style={{ maxWidth: "150px", border: "1px solid #e2e8f0" }}>
                        <div className="text-center font-black text-[7px]" style={{
                            color: "#64748b",
                            marginBottom: "3px",
                            letterSpacing: '0.5px'
                        }}>
                            COMPANY SIGNATURE
                        </div>
                        <div style={{ borderTop: "2px solid #cbd5e1", paddingTop: "2px" }}></div>
                    </div>
                </div>
            </div>

        </div>
    );
});

export default HojaVerificacion;