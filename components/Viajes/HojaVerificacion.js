import React from 'react';
import moment from 'moment';

const HojaVerificacion = React.forwardRef(({viajeData}, ref) => {
    if (!viajeData) return null;

    return (
        <div ref={ref} className="p-4 bg-white text-black font-sans print:p-2"
             style={{width: "100%", minHeight: "27.9cm"}}>

            {/* ENCABEZADO COMPACTO */}
            <div className="flex justify-between items-center border-b-2 border-red-600 pb-2 mb-4">
                <div className="flex gap-3 items-center">
                    <img src="/assets/Logoprint.png" className="w-16" alt="Logo"/>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">
                            Hoja de Verificación Física
                        </h1>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Control de Recepción en Patio</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-red-600 leading-none">VIAJE #{viajeData.numViaje}</p>
                    <p className="text-[8px] font-bold uppercase">{moment().format('DD/MM/YYYY HH:mm')}</p>
                </div>
            </div>

            {/* DATOS DE TRANSPORTE EN UNA SOLA LÍNEA */}
            <div className="flex justify-between mb-4 bg-gray-50 px-3 py-2 rounded border border-gray-200 text-[10px]">
                <div>
                    <span className="font-black text-gray-400 uppercase mr-2">Chofer:</span>
                    <span className="font-bold uppercase">{viajeData.chofer?.nombre}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="font-bold italic text-gray-500">{viajeData.chofer?.empresa}</span>
                </div>
                <div>
                    <span className="font-black text-gray-400 uppercase mr-2">Unidades:</span>
                    <span className="font-bold">{viajeData.vehiculos?.length} Vehículos</span>
                </div>
            </div>

            {/* TABLA ULTRA COMPACTA */}
            <table className="w-full border-collapse border border-black">
                <thead>
                    <tr className="bg-gray-100 text-[9px] uppercase font-black">
                        <th className="border border-black p-1 w-6">#</th>
                        <th className="border border-black p-1 text-left">Identificación del Vehículo (Lote / Marca / Modelo)</th>
                        <th className="border border-black p-1 text-left w-44">Procedencia / Almacén</th>
                        <th className="border border-black p-1 w-14 text-center">Título</th>
                        <th className="border border-black p-1 w-24 text-center">Check [ OK ]</th>
                    </tr>
                </thead>
                <tbody>
                {viajeData.vehiculos?.map((v, index) => (
                    <tr key={index} className="text-[10px] border-b border-black h-10">
                        <td className="border border-black p-1 text-center font-bold bg-gray-50">{index + 1}</td>
                        <td className="border border-black p-1 px-3">
                            <div className="flex items-baseline gap-2 leading-none">
                                <span className="font-black text-blue-800 text-sm tracking-tight">{v.lote}</span>
                                <span className="uppercase font-black text-black">{v.marca}</span>
                                <span className="uppercase font-bold text-gray-600">{v.modelo}</span>
                            </div>
                            <div className="text-[8px] text-gray-400 italic font-bold">Ref Cliente: {v.clienteAlt || 'N/A'}</div>
                        </td>
                        <td className="border border-black p-1 uppercase leading-tight">
                            <div className="font-bold text-[10px]">{v.ciudad}</div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 text-[9px]">{v.estado}</span>
                                <span className="text-red-700 font-black text-[9px] underline">[{v.almacen || 'PENDIENTE'}]</span>
                            </div>
                        </td>
                        <td className="border border-black p-1 text-center font-black text-sm">
                            {v.titulo}
                        </td>
                        <td className="border border-black p-1">
                            <div className="w-16 h-7 border-2 border-black mx-auto rounded flex items-center justify-center font-black text-gray-200">
                                [ ]
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* OBSERVACIONES GENERALES FUERA DE TABLA */}
            <div className="mt-4 border-2 border-black p-3 rounded h-12">
                <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Observaciones Generales de Patio:</p>
            </div>

            {/* ÁREA DE FIRMAS COMPACTA */}
            <div className="mt-8 grid grid-cols-2 gap-16 px-10">
                <div className="text-center">
                    <div className="border-t-2 border-black pt-1">
                        <p className="text-[10px] font-black uppercase">{viajeData.chofer?.nombre}</p>
                        <p className="text-[8px] text-gray-400 uppercase italic">Firma de Entrega (Transportista)</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t-2 border-black pt-1">
                        <p className="text-[10px] font-black uppercase">___________________________</p>
                        <p className="text-[8px] text-gray-400 uppercase italic">Firma de Recibido (Patio)</p>
                    </div>
                </div>
            </div>

            {/* NOTA LEGAL AL PIE */}
            <div className="mt-4 text-center border-t border-gray-100 pt-2">
                <p className="text-[8px] font-bold text-gray-300 uppercase italic">
                    Este documento es un comprobante de recepción física. El pago del flete está sujeto a la conformidad
                    de los datos aquí registrados.
                </p>
            </div>
        </div>
    );
});

export default HojaVerificacion;