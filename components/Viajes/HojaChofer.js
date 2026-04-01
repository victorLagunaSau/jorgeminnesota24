import React, { forwardRef } from "react";

const HojaChofer = forwardRef(({ viaje }, ref) => {
    if (!viaje) return null;

    // Rellenar hasta 10 filas
    const filasVacias = Math.max(0, 10 - (viaje.vehiculos?.length || 0));
    const vehiculosConVacios = [...(viaje.vehiculos || []), ...Array(filasVacias).fill(null)];

    return (
        <div ref={ref} className="bg-white text-black w-full" style={{ padding: "0.2cm", height: "21.59cm", width: "27.94cm", fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: letter landscape;
                        margin: 0.2cm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
                .red-border {
                    border: 2px solid #dc2626 !important;
                }
                .shadow-subtle {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                }
            ` }} />

            {/* HEADER */}
            <div className="flex justify-between items-start" style={{ marginBottom: "3px", borderBottom: "2px solid #dc2626", paddingBottom: "3px", backgroundColor: "#fee2e2" }}>
                <div className="flex-shrink-0" style={{ width: "120px" }}>
                    <div className="text-[6px] italic" style={{ color: "#dc2626", marginBottom: "1px" }}>Tu Confianza es Nuestra Campaña</div>
                    <img src="/assets/Logoprint.png" alt="Logo" style={{ width: "95px", height: "auto" }} />
                </div>

                <div className="text-center flex-1" style={{ padding: "0 10px" }}>
                    <h1 className="font-bold" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.8px', fontSize: "22px", marginBottom: "2px", color: "#dc2626" }}>Bill of Lading</h1>
                    <div className="text-[9px] font-semibold" style={{ lineHeight: '1.2', color: "#333" }}>
                        <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', marginBottom: "1px" }}>Jorge Minnesota Logistic LLC</div>
                        <div style={{ marginBottom: "0px" }}>932 N. Minnesota Ave.</div>
                        <div style={{ fontStyle: 'italic', marginBottom: "1px" }}>Brownsville TX, 78521</div>
                        <div className="font-black" style={{ fontSize: "10px", color: "#dc2626" }}>+(956) 371-8314</div>
                    </div>
                </div>

                <div className="flex-shrink-0" style={{ width: "120px" }}>
                    <div className="text-[6px] text-right" style={{ color: "#666", marginBottom: "1px" }}>www.jorgeminnesota.com</div>
                    <div className="red-border shadow-subtle" style={{ padding: "2px", backgroundColor: "#fafafa", marginBottom: "3px" }}>
                        <div className="text-[7px] font-black text-center" style={{ letterSpacing: '0.4px', color: "#dc2626" }}>WORK ORDER #</div>
                        <div className="bg-white text-center font-black" style={{ padding: "2px 0", fontSize: "13px", color: "#1a1a1a" }}>{viaje.numViaje}</div>
                    </div>
                    <div className="red-border shadow-subtle" style={{ padding: "2px", backgroundColor: "#fafafa" }}>
                        <div className="text-[7px] font-black text-center" style={{ letterSpacing: '0.4px', color: "#dc2626" }}>DATE</div>
                        <div className="bg-white text-center font-bold" style={{ padding: "2px 0", fontSize: "9px", color: "#1a1a1a" }}>{new Date().toLocaleDateString('en-US')}</div>
                    </div>
                </div>
            </div>

            {/* DRIVER INFO */}
            <div style={{ marginBottom: "3px", backgroundColor: "#f9fafb", padding: "3px 6px", borderRadius: "2px", border: "1px solid #e5e7eb" }}>
                <div className="flex items-center" style={{ marginBottom: "2px" }}>
                    <span className="font-black text-[9px]" style={{ width: "55px", letterSpacing: '0.2px', color: "#374151" }}><i>DRIVER:</i></span>
                    <div className="flex-1 border-b-2 pl-2 font-bold text-[9px] uppercase" style={{ height: "16px", paddingTop: "2px", borderColor: "#6b7280" }}>
                        {viaje.chofer?.nombre || ""}
                    </div>
                </div>
                <div className="flex items-center" style={{ marginBottom: "2px" }}>
                    <span className="font-black text-[9px]" style={{ width: "55px", letterSpacing: '0.2px', color: "#374151" }}><i>PHONE:</i></span>
                    <div className="flex-1 border-b-2" style={{ height: "16px", borderColor: "#6b7280" }}></div>
                </div>
                <div className="flex items-center">
                    <span className="font-black text-[9px]" style={{ width: "55px", letterSpacing: '0.2px', color: "#374151" }}><i>PICKUP:</i></span>
                    <div className="flex-1 border-b-2" style={{ height: "16px", borderColor: "#6b7280" }}></div>
                </div>
            </div>

            {/* TABLA */}
            <table className="w-full border-collapse shadow-subtle" style={{ tableLayout: "fixed", marginBottom: "3px" }}>
                <thead>
                    <tr className="font-black text-[7px]" style={{ height: "16px", letterSpacing: '0.3px', backgroundColor: "#dc2626", color: "#ffffff" }}>
                        <th className="text-center" style={{ width: "20px", border: "2px solid #dc2626" }}>★</th>
                        <th className="text-left px-1" style={{ width: "115px", border: "2px solid #dc2626" }}>CUSTOMER</th>
                        <th className="text-left px-1" style={{ width: "62px", border: "2px solid #dc2626" }}>STOCK#</th>
                        <th className="text-left px-1" style={{ width: "98px", border: "2px solid #dc2626" }}>CAR</th>
                        <th className="text-center" style={{ width: "34px", border: "2px solid #dc2626" }}>YEAR</th>
                        <th className="text-center px-1" style={{ width: "52px", border: "2px solid #dc2626" }}>PIN/BUYER</th>
                        <th className="text-left px-1" style={{ width: "78px", border: "2px solid #dc2626" }}>CITY</th>
                        <th className="text-left px-1" style={{ width: "62px", border: "2px solid #dc2626" }}>SUBASTA</th>
                        <th className="text-center" style={{ width: "44px", border: "2px solid #dc2626" }}>FLETE</th>
                        <th className="text-center" style={{ width: "48px", border: "2px solid #dc2626" }}>STORAGE</th>
                        <th className="text-center" style={{ width: "44px", border: "2px solid #dc2626" }}>TOTAL</th>
                        <th className="text-center" style={{ width: "34px", border: "2px solid #dc2626" }}>TITLE</th>
                    </tr>
                </thead>
                <tbody>
                    {vehiculosConVacios.map((v, i) => (
                        <tr key={i} style={{ height: "21px", backgroundColor: i % 2 === 0 ? "#ffffff" : "#fef2f2" }}>
                            <td className="red-border text-center font-black text-[9px]" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>{i + 1}</td>
                            <td className="red-border px-1 text-[7px] font-semibold uppercase" style={{ lineHeight: '1.2', color: "#374151" }}>
                                {v ? (v.clienteNombre || v.clienteAlt || "") : ""}
                            </td>
                            <td className="red-border px-1 text-[7px] font-black" style={{ color: "#1f2937" }}>
                                {v ? v.lote : ""}
                            </td>
                            <td className="red-border px-1 text-[6px] font-semibold uppercase" style={{ lineHeight: '1.25', color: "#374151" }}>
                                {v ? `${v.marca} ${v.modelo}` : ""}
                            </td>
                            <td className="red-border text-center text-[7px] font-bold" style={{ color: "#4b5563" }}>
                                {v ? v.year || "" : ""}
                            </td>
                            <td className="red-border text-center text-[6px] font-medium" style={{ color: "#6b7280" }}>
                                {v ? v.pin || "" : ""}
                            </td>
                            <td className="red-border px-1 text-[6px] font-semibold uppercase" style={{ lineHeight: '1.25', color: "#374151" }}>
                                {v ? v.ciudad : ""}
                            </td>
                            <td className="red-border px-1 text-[6px] font-semibold uppercase" style={{ lineHeight: '1.25', color: "#374151" }}>
                                {v ? v.almacen : ""}
                            </td>
                            <td className="red-border text-center text-[7px] font-bold" style={{ color: "#1f2937" }}>
                                {v ? `$${v.flete}` : ""}
                            </td>
                            <td className="red-border text-center text-[7px] font-bold" style={{ color: "#1f2937" }}>
                                {v ? `$${v.storage || 0}` : ""}
                            </td>
                            <td className="red-border text-center text-[7px] font-black" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
                                {v ? `$${(parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0))}` : ""}
                            </td>
                            <td className="red-border text-center text-[10px]" style={{ color: "#dc2626" }}>
                                {v && v.titulo === "SI" ? "☑" : v ? "☐" : ""}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* FOOTER */}
            <div className="flex justify-between items-end" style={{ marginBottom: "3px" }}>
                <div className="flex-1">
                    <div style={{ width: "150px", borderTop: "2px solid #1f2937", paddingTop: "3px" }}>
                        <div className="text-center font-black text-[8px]" style={{ letterSpacing: '0.5px', color: "#374151" }}><i>DRIVER SIGNATURE</i></div>
                    </div>
                </div>

                <div className="flex items-end gap-2">
                    <div className="text-right">
                        <div className="font-black text-[9px]" style={{ marginBottom: "2px", color: "#1f2937" }}><i>SUB-TOTAL</i></div>
                        <div className="flex gap-2 items-center" style={{ marginBottom: "2px" }}>
                            <span className="font-black text-[8px]" style={{ width: "48px", textAlign: "right", color: "#4b5563" }}>CHEQUE</span>
                            <div className="red-border shadow-subtle" style={{ width: "65px", height: "14px", backgroundColor: "#fafafa" }}></div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="font-black text-[8px]" style={{ width: "48px", textAlign: "right", color: "#4b5563" }}>EFECTIVO</span>
                            <div className="red-border shadow-subtle" style={{ width: "65px", height: "14px", backgroundColor: "#fafafa" }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="red-border shadow-subtle" style={{ width: "75px", height: "14px", backgroundColor: "#fafafa", marginBottom: "2px" }}></div>
                        <div className="red-border shadow-subtle" style={{ width: "75px", height: "44px", backgroundColor: "#dcfce7", border: "2px solid #16a34a" }}>
                            <div className="text-center font-black text-[8px]" style={{ paddingTop: "3px", letterSpacing: '0.5px', color: "#166534" }}><i>TOTAL</i></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex justify-end">
                    <div style={{ width: "150px", borderTop: "2px solid #1f2937", paddingTop: "3px" }}>
                        <div className="text-center font-black text-[8px]" style={{ letterSpacing: '0.5px', color: "#374151" }}><i>COMPANY SIGNATURE</i></div>
                    </div>
                </div>
            </div>

            {/* NOTE */}
            <div style={{ backgroundColor: "#f9fafb", padding: "3px", borderRadius: "2px", border: "1px solid #e5e7eb" }}>
                <div className="font-black text-[9px]" style={{ letterSpacing: '0.3px', marginBottom: "1px", color: "#374151" }}><i>NOTE:</i></div>
                <div style={{ height: "9px", marginBottom: "1px", borderBottom: "1px solid #d1d5db" }}></div>
                <div style={{ height: "9px", borderBottom: "1px solid #d1d5db" }}></div>
            </div>
        </div>
    );
});

export default HojaChofer;