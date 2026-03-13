import React, { forwardRef } from "react";

const HojaChofer = forwardRef(({ viaje }, ref) => {
    if (!viaje) return null;

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans min-h-screen w-full">
            {/* ESTILOS DE IMPRESIÓN FORZADOS A HORIZONTAL */}
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

            {/* ENCABEZADO - AJUSTADO A ANCHO HORIZONTAL */}
            <div className="mb-4 flex justify-between items-start border-b-4 border-black pb-2">
                <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Hoja de Despacho</h1>
                    <p className="text-xl font-bold text-gray-700 uppercase">Logística Jorge Minnesota</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-500 uppercase">Fecha de Emisión</p>
                        <p className="text-lg font-black italic">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="bg-black text-white px-8 py-2 text-center">
                        <p className="text-[10px] uppercase font-bold">Folio de Viaje</p>
                        <p className="text-3xl font-black italic leading-none">{viaje.numViaje}</p>
                    </div>
                </div>
            </div>

            {/* INFO DEL TRANSPORTISTA Y RESUMEN */}
            <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-100 p-3 border-2 border-black">
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 italic">Transportista:</p>
                    <p className="text-lg font-black uppercase leading-tight">{viaje.chofer?.nombre}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-500 italic">Empresa / Propietario:</p>
                    <p className="text-lg font-black uppercase leading-tight">{viaje.chofer?.empresa}</p>
                </div>
                <div className="text-right border-l-2 border-black pl-4">
                    <p className="text-[10px] font-black uppercase text-gray-500">Total Unidades</p>
                    <p className="text-4xl font-black italic leading-none">{viaje.vehiculos?.length}</p>
                </div>
            </div>

            {/* TABLA DE UNIDADES - AHORA MÁS ANCHA */}
            <table className="w-full border-collapse border-2 border-black text-[12px]">
                <thead>
                    <tr className="bg-black text-white uppercase italic">
                        <th className="border border-white p-2 w-10">#</th>
                        <th className="border border-white p-2 text-left">Lote / BinNip</th>
                        <th className="border border-white p-2 text-left">Almacén / Ciudad</th>
                        <th className="border border-white p-2 text-left">Marca / Modelo</th>
                        <th className="border border-white p-2 w-28">Storage ($)</th>
                        <th className="border border-white p-2 w-28">Sobrepeso ($)</th>
                        <th className="border border-white p-2 w-28">Gastos Extra ($)</th>
                        <th className="border border-white p-2 w-16">Título</th>
                    </tr>
                </thead>
                <tbody>
                    {viaje.vehiculos?.map((v, i) => (
                        <tr key={i} className="border-b-2 border-black h-16">
                            <td className="border-r-2 border-black font-black bg-gray-200 text-center text-lg italic">{i + 1}</td>
                            <td className="border-r-2 border-black p-2 font-black text-blue-800 text-center">
                                {v.lote || v.binNip}
                            </td>
                            <td className="border-r-2 border-black p-2 leading-tight uppercase font-bold">
                                <div>{v.almacen}</div>
                                <div className="text-gray-500 text-[10px]">{v.ciudad}</div>
                            </td>
                            <td className="border-r-2 border-black p-2 leading-tight uppercase">
                                <div className="font-black">{v.marca}</div>
                                <div className="font-bold text-gray-600">{v.modelo}</div>
                            </td>
                            {/* ESPACIOS DE CORRECCIÓN MANUAL */}
                            <td className="border-r-2 border-black p-2">
                                <div className="border-2 border-dashed border-gray-300 h-10 w-full rounded flex items-center justify-center text-gray-300">__</div>
                            </td>
                            <td className="border-r-2 border-black p-2">
                                <div className="border-2 border-dashed border-gray-300 h-10 w-full rounded flex items-center justify-center text-gray-300">__</div>
                            </td>
                            <td className="border-r-2 border-black p-2">
                                <div className="border-2 border-dashed border-gray-300 h-10 w-full rounded flex items-center justify-center text-gray-300">__</div>
                            </td>
                            <td className="p-2 text-4xl text-center font-bold">
                                {v.titulo === "SI" ? "☑" : "☐"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* SECCIÓN DE FIRMAS AL FINAL */}
            <div className="mt-auto pt-10 grid grid-cols-2 gap-32 px-10">
                <div className="border-t-4 border-black pt-2 text-center">
                    <p className="font-black uppercase text-lg italic">Firma Despacho</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Oficina Central Matamoros</p>
                </div>
                <div className="border-t-4 border-black pt-2 text-center">
                    <p className="font-black uppercase text-lg italic">Firma Chofer</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirmo Recepción de Carga</p>
                </div>
            </div>

            <div className="mt-6 text-center border-t border-gray-200 pt-2">
                <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-[0.2em]">
                    System Security Document - Jorgeminessota.com Logistics Division
                </p>
            </div>
        </div>
    );
});

export default HojaChofer;