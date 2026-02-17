import React from 'react';
import moment from 'moment';

const ReciboPago = React.forwardRef(({viajeData}, ref) => {
    if (!viajeData) return null;

    // --- LÓGICA DE REPARACIÓN DE SUMAS (NO AFECTA EL DISEÑO) ---
    // Recalculamos para asegurar que el recibo siempre sume bien los vehículos listados
    const fletesCalc = viajeData.vehiculos?.reduce((acc, v) => acc + (parseFloat(v.flete) || 0), 0) || 0;
    const storageCalc = viajeData.vehiculos?.reduce((acc, v) => acc + (parseFloat(v.storage) || 0), 0) || 0;
    const sobrepesoCalc = viajeData.vehiculos?.reduce((acc, v) => acc + (parseFloat(v.sPeso) || 0), 0) || 0;
    const extrasCalc = viajeData.vehiculos?.reduce((acc, v) => acc + (parseFloat(v.gExtra) || 0), 0) || 0;
    const totalCalc = fletesCalc + storageCalc + sobrepesoCalc + extrasCalc;

    return (
        <div ref={ref} className="p-10 bg-white text-black font-sans print:p-6" style={{width: "100%"}}>

            {/* ENCABEZADO PROFESIONAL */}
            <div className="flex justify-between items-start border-black pb-6">
                <div className="flex gap-4 items-center">
                    <img src="/assets/Logoprint.png" className="w-24" alt="Logo"/>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">Recibo de Pago</h1>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] mt-2">Liquidación de Fletes y Gastos</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="bg-black text-white px-4 py-2">
                        <p className="text-[9px] font-bold uppercase opacity-70 leading-none mb-1">Folio de Pago</p>
                        <p className="text-xl font-black leading-none">{viajeData.folioPago}</p>
                    </div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Emisión: {moment(viajeData.fechaPago).format('DD/MM/YYYY HH:mm')}</p>
                </div>
            </div>

            {/* CUADRO DE ACTORES DEL PAGO */}
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase italic mb-1">Empresa Beneficiaria:</p>
                <p className="text-xl font-black uppercase text-black leading-tight">{viajeData.empresaLiquidada}</p>
                <p className="text-[11px] font-bold text-gray-600 mt-2">
                    Transportista: <span className="uppercase"> {viajeData.chofer?.nombre}</span> Referencia:
                    # {viajeData.numViaje}
                </p>
            </div>

            {/* CONTENEDOR PRINCIPAL: TABLA (IZQUIERDA) Y RESUMEN (DERECHA) */}
            <div className="grid grid-cols-3 gap-6 items-start mb-6 mt-4">

                {/* COLUMNA IZQUIERDA: TABLA ULTRA COMPACTA */}
                <div className="col-span-2">
                    <table className="w-full border-collapse border border-black">
                        <thead>
                        <tr className="bg-gray-100 text-[9px] uppercase font-black border-b-2 border-black">
                            <th className="p-1 border-r border-black text-left">Lote / Vehículo</th>
                            <th className="p-1 border-r border-black text-right">F</th>
                            <th className="p-1 border-r border-black text-right">S</th>
                            <th className="p-1 border-r border-black text-right">SP</th>
                            <th className="p-1 border-r border-black text-right">GE</th>
                            <th className="p-1 text-right bg-gray-200">Total</th>
                        </tr>
                        </thead>
                        <tbody>
                        {viajeData.vehiculos?.map((v, i) => (
                            <tr key={i} className="border-b border-gray-400 text-[10px] leading-none">
                                <td className="p-1 border-r border-gray-300">
                                    <span className="font-black text-blue-900">{v.lote}</span>
                                    <span className="text-[8px] font-bold text-gray-500 ml-2 uppercase truncate max-w-[100px]">
                                        {v.marca} {v.modelo}
                                    </span>
                                </td>
                                <td className="p-1 border-r border-gray-300 text-right font-mono">${parseFloat(v.flete || 0).toLocaleString()}</td>
                                <td className="p-1 border-r border-gray-300 text-right font-mono">${parseFloat(v.storage || 0).toLocaleString()}</td>
                                <td className="p-1 border-r border-gray-300 text-right font-mono">${parseFloat(v.sPeso || 0).toLocaleString()}</td>
                                <td className="p-1 border-r border-gray-300 text-right font-mono">${parseFloat(v.gExtra || 0).toLocaleString()}</td>
                                <td className="p-1 text-right font-black font-mono bg-gray-50">
                                    ${(parseFloat(v.flete || 0) + parseFloat(v.storage || 0) + parseFloat(v.sPeso || 0) + parseFloat(v.gExtra || 0)).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* COLUMNA DERECHA: RESUMEN Y TOTALES */}
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="border-4 border-black p-3 rounded-xl shadow-lg bg-gray-50">
                        <h4 className="text-[10px] font-black uppercase mb-3 border-b border-black pb-1">Resumen de Liquidación</h4>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span>Fletes:</span>
                                <span>${fletesCalc.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span>Storages:</span>
                                <span>${storageCalc.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span>S. Pesos:</span>
                                <span>${sobrepesoCalc.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span>G. Extras:</span>
                                <span>${extrasCalc.toLocaleString()}</span>
                            </div>

                            <div className="border-t-2 border-black border-dashed mt-2 pt-2">
                                <div className="flex justify-between text-lg font-black uppercase text-black leading-none">
                                    <span>Total:</span>
                                    <span>${totalCalc.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-[8px] text-justify italic leading-tight text-gray-500 border border-gray-200 p-2 rounded">
                        <p className="font-bold text-black mb-1 uppercase tracking-tighter">Cláusula de Conformidad:</p>
                        Recibí la cantidad mencionada a mi entera satisfacción por concepto de liquidación total del viaje {viajeData.numViaje}. Al firmar, otorgo finiquito total y libero a la empresa de reclamaciones posteriores.
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE FIRMAS */}
            <div className="mt-24 grid grid-cols-2 gap-32 px-12">
                <div className="text-center">
                    <div className="border-t-2 border-black pt-2">
                        <p className="text-xs font-black uppercase italic">{viajeData.chofer?.nombre}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1 italic">Nombre y Firma del Chofer</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t-2 border-black pt-2">
                        <p className="text-xs font-black uppercase italic">{viajeData.pagadoPor?.nombre || "ADMINISTRACIÓN"}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1 italic">Autorizado por Caja</p>
                    </div>
                </div>
            </div>

            <div className="mt-4 text-center">
                <p className="text-[9px] font-black text-gray-300 uppercase italic tracking-[0.3em]">Documento de Control No Reutilizable</p>
            </div>
        </div>
    );
});

export default ReciboPago;