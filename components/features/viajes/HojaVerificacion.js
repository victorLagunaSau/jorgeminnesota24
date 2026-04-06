import React from 'react';
import moment from 'moment';

const HojaVerificacion = React.forwardRef(({viajeData}, ref) => {
    if (!viajeData) return null;

    const folioLabel = `Bill of Lading - Folio: ${viajeData.numViaje}`;

    // Rellenar hasta 10 filas
    const filasVacias = Math.max(0, 10 - (viajeData.vehiculos?.length || 0));
    const vehiculosConVacios = [...(viajeData.vehiculos || []), ...Array(filasVacias).fill(null)];

    // Calcular totales separados
    const totalFlete = (viajeData.vehiculos || []).reduce((sum, v) => sum + parseFloat(v.flete || 0), 0);
    const totalStorage = (viajeData.vehiculos || []).reduce((sum, v) => sum + parseFloat(v.storage || 0), 0);
    const totalSobrepeso = (viajeData.vehiculos || []).reduce((sum, v) => sum + parseFloat(v.sPeso || 0), 0);
    const totalGastosExtra = (viajeData.vehiculos || []).reduce((sum, v) => sum + parseFloat(v.gExtra || 0), 0);
    const subtotal = totalFlete + totalStorage + totalSobrepeso + totalGastosExtra;
    const total = subtotal;

    return (
        <div ref={ref} className="bg-white text-black" style={{
            padding: "0.5cm",
            width: "27.94cm",
            height: "21.59cm",
            fontFamily: "'Raleway', 'Montserrat', 'Poppins', sans-serif",
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
            <div className="flex justify-between items-center" style={{
                marginBottom: "3px",
                padding: "12px 18px",
                borderRadius: "12px",
                flexShrink: 0,
                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.15)',
                backgroundColor: "#ffffff",
                border: "3px solid #1f2937"
            }}>
                <div className="flex-shrink-0 flex items-center gap-2" style={{ width: "160px" }}>
                    <div className="bg-gray-50 rounded-xl p-3 subtle-shadow" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: "2px solid #e5e7eb" }}>
                        <img src="/assets/Logoprint.png" alt="Logo" style={{ width: "120px", height: "auto" }} />
                    </div>
                </div>

                <div className="text-center flex-1" style={{ padding: "0 24px" }}>
                    <h1 className="font-black tracking-tight" style={{
                        fontSize: "42px",
                        color: "#000000",
                        letterSpacing: '2.5px',
                        fontFamily: "'Bebas Neue', 'Oswald', 'Raleway', sans-serif",
                        lineHeight: '1',
                        margin: "0"
                    }}>
                        BILL OF LADING
                    </h1>
                    <div className="font-black" style={{
                        fontSize: "18px",
                        color: "#1f2937",
                        fontWeight: "800",
                        lineHeight: '1',
                        margin: "4px 0 2px 0"
                    }}>
                        Jorge Minnesota Logistic LLC
                    </div>
                    <div className="font-semibold" style={{ lineHeight: '1.1', color: "#4b5563", letterSpacing: '0.3px', fontSize: "13px" }}>
                        <div style={{ margin: "2px 0" }}>932 N. Minnesota Ave.</div>
                        <div style={{ margin: "2px 0" }}>Brownsville, Texas, 78521</div>
                        <div className="font-bold" style={{ fontSize: "14px", color: "#1f2937", margin: "2px 0", letterSpacing: '0.5px' }}>
                            +1 (956) 371-8314
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3" style={{ width: "180px" }}>
                    <div className="bg-gray-50 rounded-xl p-3 subtle-shadow" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: "2px solid #e5e7eb" }}>
                        <div className="text-[9px] font-black text-center uppercase tracking-wider" style={{ color: "#dc2626", marginBottom: "4px", letterSpacing: '1.5px' }}>Viaje</div>
                        <div className="text-center font-black" style={{ fontSize: "28px", color: "#1f2937", letterSpacing: '1px', lineHeight: '1' }}>
                            #{viajeData.numViaje}
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 subtle-shadow" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: "2px solid #e5e7eb" }}>
                        <div className="text-[9px] font-black text-center uppercase tracking-wider" style={{ color: "#dc2626", marginBottom: "4px", letterSpacing: '1.5px' }}>Date</div>
                        <div className="text-center font-black" style={{ fontSize: "22px", color: "#1f2937", letterSpacing: '0.5px', lineHeight: '1' }}>
                            {moment().format('MM/DD/YY')}
                        </div>
                    </div>
                </div>
            </div>

            {/* ESTADO DEL VIAJE */}
            <div className="modern-shadow" style={{
                marginBottom: "3px",
                background: 'linear-gradient(to right, #fef2f2, #fee2e2)',
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #fecdd3",
                flexShrink: 0
            }}>
                <div className="flex items-center justify-center">
                    <span className="font-black text-[10px]" style={{ color: "#be123c", fontWeight: "900", marginRight: "8px" }}>ESTADO:</span>
                    <div className="flex-1 text-center font-black text-[14px] uppercase" style={{
                        color: "#991b1b",
                        fontWeight: "900",
                        letterSpacing: '1px'
                    }}>
                        {viajeData.estadoOrigen || ""}
                    </div>
                </div>
            </div>

            {/* DRIVER INFO MODERNIZADO */}
            <div className="modern-shadow" style={{
                marginBottom: "3px",
                background: 'linear-gradient(to right, #ffffff, #fef2f2)',
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #fecdd3",
                flexShrink: 0
            }}>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center">
                        <span className="font-black text-[10px]" style={{ width: "50px", color: "#be123c", fontWeight: "900" }}>DRIVER:</span>
                        <div className="flex-1 border-b-2 pl-2 font-bold text-[10px] uppercase" style={{
                            height: "16px",
                            paddingTop: "2px",
                            borderColor: "#fda4af",
                            color: "#1f2937",
                            fontWeight: "800"
                        }}>
                            {viajeData.chofer?.nombre || ""}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="font-black text-[10px]" style={{ width: "48px", color: "#be123c", fontWeight: "900" }}>PHONE:</span>
                        <div className="flex-1 border-b-2 pl-2 font-bold text-[10px]" style={{
                            height: "16px",
                            paddingTop: "2px",
                            borderColor: "#fda4af",
                            color: "#1f2937",
                            fontWeight: "800"
                        }}>
                            {viajeData.chofer?.telefono || ""}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="font-black text-[10px]" style={{ width: "65px", color: "#be123c", fontWeight: "900" }}>COMPANY:</span>
                        <div className="flex-1 border-b-2 pl-2 font-bold text-[9px] uppercase" style={{
                            height: "16px",
                            paddingTop: "2px",
                            borderColor: "#fda4af",
                            color: "#1f2937",
                            fontWeight: "800"
                        }}>
                            {viajeData.chofer?.empresa || viajeData.empresaNombre || ""}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA MODERNIZADA */}
            <div className="modern-shadow" style={{ borderRadius: "6px", overflow: "hidden", marginBottom: "3px", flex: "1 1 auto", minHeight: "0" }}>
                <table className="w-full border-collapse" style={{ tableLayout: "fixed", height: "100%" }}>
                    <thead>
                        <tr className="font-black text-[11px]" style={{
                            letterSpacing: '0.5px',
                            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                            color: "#ffffff",
                            fontWeight: "900"
                        }}>
                            <th className="text-center" style={{ width: "22px", borderRight: "1px solid #475569", fontWeight: "900" }}>★</th>
                            <th className="text-left px-2" style={{ width: "120px", borderRight: "1px solid #475569", fontWeight: "900" }}>CUSTOMER</th>
                            <th className="text-left px-2" style={{ width: "60px", borderRight: "1px solid #475569", fontWeight: "900" }}>STOCK#</th>
                            <th className="text-left px-2" style={{ width: "100px", borderRight: "1px solid #475569", fontWeight: "900" }}>VEHICLE</th>
                            <th className="text-left px-2" style={{ width: "75px", borderRight: "1px solid #475569", fontWeight: "900" }}>CITY</th>
                            <th className="text-left px-2" style={{ width: "70px", borderRight: "1px solid #475569", fontWeight: "900" }}>AUCTION</th>
                            <th className="text-center" style={{ width: "45px", borderRight: "1px solid #475569", fontWeight: "900" }}>FLETE</th>
                            <th className="text-center" style={{ width: "45px", borderRight: "1px solid #475569", fontWeight: "900" }}>STORAGE</th>
                            <th className="text-center" style={{ width: "40px", borderRight: "1px solid #475569", fontWeight: "900" }}>S.PESO</th>
                            <th className="text-center" style={{ width: "40px", borderRight: "1px solid #475569", fontWeight: "900" }}>G.EXTRA</th>
                            <th className="text-center" style={{ width: "50px", borderRight: "1px solid #475569", fontWeight: "900" }}>TOTAL</th>
                            <th className="text-center" style={{ width: "35px", fontWeight: "900" }}>TITLE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehiculosConVacios.map((v, i) => (
                            <tr key={i} style={{
                                backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                                borderBottom: "1px solid #e2e8f0",
                                height: "18px"
                            }}>
                                <td className="text-center font-black text-[12px]" style={{
                                    backgroundColor: v ? "linear-gradient(135deg, #fecdd3, #fda4af)" : "#f8fafc",
                                    color: "#be123c",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "900"
                                }}>
                                    {v ? i + 1 : ""}
                                </td>
                                <td className="px-2 text-[11px] font-bold uppercase" style={{
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                    fontWeight: "700"
                                }}>
                                    {v ? (v.clienteNombre || v.clienteAlt || "") : ""}
                                </td>
                                <td className="px-2 text-[11px] font-black" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "900"
                                }}>
                                    {v ? v.lote : ""}
                                </td>
                                <td className="px-2 text-[10px] font-bold uppercase" style={{
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                    fontWeight: "700"
                                }}>
                                    {v ? `${v.marca} ${v.modelo}` : ""}
                                </td>
                                <td className="px-2 text-[10px] font-bold uppercase" style={{
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                    fontWeight: "700"
                                }}>
                                    {v ? v.ciudad : ""}
                                </td>
                                <td className="px-2 text-[10px] font-bold uppercase" style={{
                                    color: "#1f2937",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    verticalAlign: "middle",
                                    fontWeight: "700"
                                }}>
                                    {v ? v.almacen : ""}
                                </td>
                                <td className="text-center text-[11px] font-bold" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "800"
                                }}>
                                    {v ? `$${v.flete}` : ""}
                                </td>
                                <td className="text-center text-[11px] font-bold" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "800"
                                }}>
                                    {v ? `$${v.storage || 0}` : ""}
                                </td>
                                <td className="text-center text-[11px] font-bold" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "800"
                                }}>
                                    {v ? `$${v.sPeso || 0}` : ""}
                                </td>
                                <td className="text-center text-[11px] font-bold" style={{
                                    color: "#0f172a",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "800"
                                }}>
                                    {v ? `$${v.gExtra || 0}` : ""}
                                </td>
                                <td className="text-center text-[11px] font-black" style={{
                                    background: v ? "linear-gradient(135deg, #d1fae5, #a7f3d0)" : "transparent",
                                    color: "#065f46",
                                    borderRight: "1px solid #e2e8f0",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "900"
                                }}>
                                    {v ? `$${(parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0))}` : ""}
                                </td>
                                <td className="text-center text-[11px] font-black" style={{
                                    color: "#be123c",
                                    height: "18px",
                                    maxHeight: "18px",
                                    overflow: "hidden",
                                    verticalAlign: "middle",
                                    fontWeight: "900"
                                }}>
                                    {v && v.titulo === "SI" ? "SI" : v ? "X" : ""}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        {/* Fila única de Totales por columna */}
                        <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                            <td colSpan="6"></td>
                            <td className="text-center px-2 font-black text-[13px]" style={{
                                color: "#0f172a",
                                padding: "8px 4px",
                                fontWeight: "900",
                                borderRight: "1px solid #e2e8f0"
                            }}>
                                ${totalFlete.toFixed(2)}
                            </td>
                            <td className="text-center px-2 font-black text-[13px]" style={{
                                color: "#0f172a",
                                padding: "8px 4px",
                                fontWeight: "900",
                                borderRight: "1px solid #e2e8f0"
                            }}>
                                ${totalStorage.toFixed(2)}
                            </td>
                            <td className="text-center px-2 font-black text-[13px]" style={{
                                color: "#0f172a",
                                padding: "8px 4px",
                                fontWeight: "900",
                                borderRight: "1px solid #e2e8f0"
                            }}>
                                ${totalSobrepeso.toFixed(2)}
                            </td>
                            <td className="text-center px-2 font-black text-[13px]" style={{
                                color: "#0f172a",
                                padding: "8px 4px",
                                fontWeight: "900",
                                borderRight: "1px solid #e2e8f0"
                            }}>
                                ${totalGastosExtra.toFixed(2)}
                            </td>
                            <td colSpan="2"></td>
                        </tr>

                        {/* Fila de Subtotal */}
                        <tr style={{ backgroundColor: "#1e293b", borderTop: "2px solid #475569" }}>
                            <td colSpan="10" className="text-right px-2 font-black text-[14px]" style={{
                                color: "#ffffff",
                                padding: "8px 8px",
                                letterSpacing: '0.5px',
                                fontWeight: "900"
                            }}>
                                SUBTOTAL:
                            </td>
                            <td className="text-center px-2 font-black text-[15px]" style={{
                                color: "#ffffff",
                                padding: "8px",
                                letterSpacing: '0.5px',
                                fontWeight: "900"
                            }}>
                                ${subtotal.toFixed(2)}
                            </td>
                            <td colSpan="1"></td>
                        </tr>

                        {/* Fila de Total con Cheque, Efectivo y Zelle */}
                        <tr style={{ backgroundColor: "#10b981", borderTop: "3px solid #059669" }}>
                            <td colSpan="7" className="text-right px-2 font-black text-[16px]" style={{
                                color: "#ffffff",
                                padding: "10px 8px",
                                letterSpacing: '0.5px',
                                fontWeight: "900"
                            }}>
                                TOTAL:
                            </td>
                            <td colSpan="3" className="text-center px-2 font-black text-[18px]" style={{
                                color: "#ffffff",
                                padding: "10px",
                                letterSpacing: '0.5px',
                                fontWeight: "900"
                            }}>
                                ${total.toFixed(2)}
                            </td>
                            <td colSpan="2" style={{ padding: "6px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span className="font-bold text-[10px]" style={{ color: "#ffffff", fontWeight: "900", minWidth: "50px" }}>CHEQUE:</span>
                                        <div className="bg-white rounded font-black text-[11px] text-center" style={{
                                            flex: 1,
                                            height: "14px",
                                            border: "1px solid #059669",
                                            color: "#065f46",
                                            lineHeight: "14px"
                                        }}>
                                            {viajeData.metodoPago?.cheque ? `$${viajeData.metodoPago.cheque}` : ""}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span className="font-bold text-[10px]" style={{ color: "#ffffff", fontWeight: "900", minWidth: "50px" }}>EFECTIVO:</span>
                                        <div className="bg-white rounded font-black text-[11px] text-center" style={{
                                            flex: 1,
                                            height: "14px",
                                            border: "1px solid #059669",
                                            color: "#065f46",
                                            lineHeight: "14px"
                                        }}>
                                            {viajeData.metodoPago?.efectivo ? `$${viajeData.metodoPago.efectivo}` : ""}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span className="font-bold text-[10px]" style={{ color: "#ffffff", fontWeight: "900", minWidth: "50px" }}>ZELLE:</span>
                                        <div className="bg-white rounded font-black text-[11px] text-center" style={{
                                            flex: 1,
                                            height: "14px",
                                            border: "1px solid #059669",
                                            color: "#065f46",
                                            lineHeight: "14px"
                                        }}>
                                            {viajeData.metodoPago?.zelle ? `$${viajeData.metodoPago.zelle}` : ""}
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* FOOTER MODERNIZADO */}
            <div className="flex items-end" style={{ flexShrink: 0, paddingTop: "6px" }}>
                <div>
                    <div style={{ height: "50px", marginBottom: "4px" }}></div>
                    <div className="font-black text-[11px]" style={{
                        color: "#64748b",
                        letterSpacing: '0.5px',
                        textAlign: "center",
                        fontWeight: "900"
                    }}>
                        DRIVER SIGNATURE
                    </div>
                    <div style={{ borderTop: "3px solid #1f2937", width: "300px", marginTop: "4px" }}></div>
                </div>
            </div>

        </div>
    );
});

export default HojaVerificacion;