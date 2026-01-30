import React, { forwardRef } from "react";
import { FaCar, FaUser, FaMapMarkerAlt } from "react-icons/fa";

const HojaChofer = forwardRef(({ viaje }, ref) => {
    if (!viaje) return null;

    return (
        <div ref={ref} className="p-5 bg-white text-black font-sans min-h-screen">
            {/* ESTILOS DE IMPRESIÓN FORZADOS */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: letter; margin: 1cm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            ` }} />

            {/* ENCABEZADO */}
            <div className="mb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase italic tracking-tighter">Hoja de Despacho</h1>
                    <p className="text-xl font-bold text-gray-700">Logística Jorge Minnesota</p>
                </div>
                <div className="text-right">
                    <div className="text-1xl font-black bg-black text-white px-6 py-1">FOLIO: {viaje.numViaje}</div>
                    <p className="text-sm font-bold mt-1 uppercase italic">Fecha: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* INFO DEL TRANSPORTISTA */}
            <div className="grid grid-cols-2 gap-4 ">
                <div className="flex items-center gap-3">
                    <div>
                        <p className="text-sm font-black uppercase leading-none">Transportista {viaje.chofer?.nombre}</p>
                        <p className="text-sm font-bold text-gray-600 mt-1">Chofer {viaje.chofer?.empresa}</p>
                    </div>
                </div>
                <div className="text-right pl-4 flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-gray-500">Unidades en este viaje</p>
                    <p className="text-2xl font-black italic">{viaje.vehiculos?.length}</p>
                </div>
            </div>

            {/* TABLA DE UNIDADES */}
            <table className="w-full border-collapse border-2 border-black">
                <thead>
                    <tr className="bg-black text-white text-[9px] uppercase italic">
                        <th className="border border-white p-2 w-10">#</th>
                        <th className="border border-white p-2 text-left">Lote / Almacen</th>
                        <th className="border border-white p-2 text-left">Marca / Modelo</th>
                        <th className="border border-white p-2">Storage</th>
                        <th className="border border-white p-2">Sobrepeso</th>
                        <th className="border border-white p-2">G. Extra</th>
                        <th className="border border-white p-2">Título</th>
                    </tr>
                </thead>
                <tbody>
                    {viaje.vehiculos?.map((v, i) => (
                        <tr key={i} className="border-b-1 border-black h-14 text-center">
                            <td className="border-r-2 border-black font-bold bg-gray-50 italic">{i + 1}</td>
                            <td className="border-r-2 border-black p-2 text-left uppercase text-[12px] leading-tight">
                                <div className="font-black">{v.lote}</div>
                                <div className="font-black">{v.almacen}</div>
                            </td>

                            <td className="border-r-2 border-black p-2 text-left uppercase text-[12px] leading-tight">
                                <div className="font-black">{v.marca}</div>
                                <div>{v.modelo}</div>
                            </td>
                            {/* ESPACIOS PARA CORRECCIÓN MANUAL */}
                            <td className="border-r-2 border-black p-1 w-20">
                                <div className="border border-dashed border-gray-400 h-7 rounded mt-1"></div>
                            </td>
                            <td className="border-r-2 border-black p-1 w-20">
                                <div className="border border-dashed border-gray-400 h-7 rounded mt-1"></div>
                            </td>
                            <td className="border-r-2 border-black p-1 w-20">
                                <div className="border border-dashed border-gray-400 h-7 rounded mt-1"></div>
                            </td>
                            <td className="p-2 w-16 text-3xl">
                                {v.titulo === "SI" ? "☑" : "☐"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* NOTAS Y FIRMAS */}
            <div className="mt-12 grid grid-cols-2 gap-20">
                <div className="border-t-2 border-black pt-2 text-center">
                    <p className="font-black uppercase text-sm italic">Firma Despacho</p>
                    <p className="text-[10px] text-gray-400">Autorización ColeKey Office</p>
                </div>
                <div className="border-t-2 border-black pt-2 text-center">
                    <p className="font-black uppercase text-sm italic">Firma Transportista</p>
                    <p className="text-[10px] text-gray-400">Acepto responsabilidad de carga</p>
                </div>
            </div>

            <div className="mt-1 text-center ">
                <p className="text-[9px] font-bold text-gray-400 uppercase italic tracking-widest">
                    Documento generado por Sistema de Control de Tránsito
                </p>
            </div>
        </div>
    );
});

export default HojaChofer;