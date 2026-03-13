import React from 'react';
import moment from 'moment';

const HojaVerificacion = React.forwardRef(({viajeData}, ref) => {
    if (!viajeData) return null;

    const folioLabel = `Hoja Chofer - Folio: ${viajeData.numViaje}`;

    return (
        <div ref={ref} className="p-6 bg-white text-black font-sans w-full"
             style={{ minWidth: "27.9cm" }}>

            {/* CONFIGURACIÓN DE IMPRESIÓN */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        size: letter landscape; 
                        margin: 0.5cm; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }
                }
            ` }} />

            {/* Título oculto para que el navegador lo detecte como título de página */}
            <title>{folioLabel}</title>

            {/* ENCABEZADO */}
            <div className="flex justify-between items-center border-b-4 border-red-600 pb-2 mb-4">
                <div className="flex gap-4 items-center">
                    <img src="/assets/Logoprint.png" className="w-20" alt="Logo"/>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">
                            Hoja Chofer
                        </h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Control de Recepción en Patio y Auditoría de Gastos
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right border-r-2 border-gray-200 pr-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Emisión</p>
                        <p className="text-sm font-bold uppercase">{moment().format('DD/MM/YYYY HH:mm')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Folio de Viaje</p>
                        <p className="text-3xl font-black text-red-600 leading-none italic">#{viajeData.numViaje}</p>
                    </div>
                </div>
            </div>

            {/* DATOS DE TRANSPORTE */}
            <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-100 px-4 py-3 rounded border-2 border-black text-[11px]">
                <div>
                    <span className="font-black text-gray-500 uppercase block text-[9px]">Transportista:</span>
                    <span className="font-black text-lg uppercase">{viajeData.chofer?.nombre}</span>
                </div>
                <div>
                    <span className="font-black text-gray-500 uppercase block text-[9px]">Empresa / Propietario:</span>
                    <span className="font-bold text-lg uppercase italic">{viajeData.chofer?.empresa}</span>
                </div>
                <div className="text-right border-l-2 border-gray-300">
                    <span className="font-black text-gray-500 uppercase block text-[9px]">Total de Carga:</span>
                    <span className="font-black text-2xl">{viajeData.vehiculos?.length} UNIDADES</span>
                </div>
            </div>

            {/* TABLA */}
            <table className="w-full border-collapse border-2 border-black">
                <thead>
                    <tr className="bg-black text-white text-[9px] uppercase font-black italic">
                        <th className="border border-white p-2 w-8">#</th>
                        <th className="border border-white p-2 text-left w-56">Vehículo / Lote</th>
                        <th className="border border-white p-2 text-left">Cliente Oficial</th>
                        <th className="border border-white p-2">Flete</th>
                        <th className="border border-white p-2">Storage</th>
                        <th className="border border-white p-2">S.Peso</th>
                        <th className="border border-white p-2">G.Extra</th>
                        <th className="border border-white p-2 bg-red-700">Total</th>
                        <th className="border border-white p-2 w-12 text-center">Tít.</th>
                        <th className="border border-white p-2 w-20 text-center">CHECK</th>
                    </tr>
                </thead>
                <tbody>
                {viajeData.vehiculos?.map((v, index) => {
                    const totalUnidad = (parseFloat(v.flete) || 0) + (parseFloat(v.storage) || 0) + (parseFloat(v.sPeso) || 0) + (parseFloat(v.gExtra) || 0);
                    return (
                        <tr key={index} className="text-[10px] border-b-2 border-black h-12">
                            <td className="border-r-2 border-black text-center font-black bg-gray-100">{index + 1}</td>
                            <td className="border-r-2 border-black p-1 px-3 leading-tight">
                                <div className="font-black text-blue-900 text-sm tracking-tight">{v.lote}</div>
                                <div className="uppercase font-black text-black">{v.marca} {v.modelo}</div>
                                <div className="text-[8px] text-gray-500 font-bold uppercase">{v.almacen} - {v.ciudad}</div>
                            </td>
                            <td className="border-r-2 border-black p-1 px-2 uppercase leading-none">
                                <div className="font-black text-[11px] text-red-700">{v.clienteNombre || 'SIN ASIGNAR'}</div>
                                <div className="text-[8px] text-gray-400 font-bold mt-1">Ref: {v.clienteAlt || 'N/A'}</div>
                            </td>
                            <td className="border-r-2 border-black p-1 text-center font-bold">${v.flete}</td>
                            <td className="border-r-2 border-black p-1 text-center font-bold text-gray-500">${v.storage}</td>
                            <td className="border-r-2 border-black p-1 text-center font-bold text-gray-500">${v.sPeso}</td>
                            <td className="border-r-2 border-black p-1 text-center font-bold text-gray-500">${v.gExtra}</td>
                            <td className="border-r-2 border-black p-1 text-center font-black bg-red-50 text-sm">${totalUnidad.toLocaleString()}</td>
                            <td className="border-r-2 border-black p-1 text-center font-black text-sm">{v.titulo === "SI" ? "☑" : "☐"}</td>
                            <td className="p-1">
                                <div className="w-12 h-8 border-2 border-dashed border-gray-400 mx-auto rounded"></div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>

            {/* FIRMAS */}
            <div className="mt-4 grid grid-cols-3 gap-6">
                <div className="col-span-1 border-2 border-black p-2 rounded h-24">
                    <p className="text-[9px] font-black uppercase text-gray-400 border-b border-gray-200 mb-1">Notas de Patio:</p>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-10 items-end px-10">
                    <div className="text-center">
                        <div className="border-t-4 border-black pt-1">
                            <p className="text-[11px] font-black uppercase">{viajeData.chofer?.nombre}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase italic leading-none">Transportista (Entrega)</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t-4 border-black pt-1">
                            <p className="text-[11px] font-black uppercase">___________________________</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase italic leading-none">Recibido en Patio (Verifica)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PIE DE PÁGINA */}
            <div className="mt-6 text-center border-t border-gray-200 pt-2">
                <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-[0.3em]">
                    Logística Jorge Minnesota - Matamoros Custom Office - System Verified
                </p>
            </div>
        </div>
    );
});

export default HojaVerificacion;