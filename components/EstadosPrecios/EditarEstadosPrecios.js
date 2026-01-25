import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase/firebaseIni";
import { FaPlus, FaTrash, FaSave, FaExclamationCircle, FaUserClock } from "react-icons/fa";

// Agregamos 'user' a las props para saber quién edita
const EditarEstadosPrecios = ({ currentRegions, closeModal, user }) => {
    const [updatedRegions, setUpdatedRegions] = useState([]);
    const [alertMessage, setAlertMessage] = useState({ msg: '', tipo: '' });

    useEffect(() => {
        if (currentRegions?.regions) {
            const data = currentRegions.regions.map(r => ({
                ...r,
                cost: r.cost || "0"
            })).sort((a, b) => a.order - b.order);
            setUpdatedRegions(data);
        }
    }, [currentRegions]);

    const handleFieldChange = (index, field, value) => {
        const copy = [...updatedRegions];
        copy[index][field] = value;
        setUpdatedRegions(copy);
    };

    const handleAddRegion = () => {
        const nextOrder = updatedRegions.length > 0
            ? Math.max(...updatedRegions.map(r => r.order)) + 1
            : 1;

        setUpdatedRegions([{
            city: '',
            price: '',
            cost: '0',
            isNew: true,
            order: nextOrder
        }, ...updatedRegions]);
    };

    const handleSave = async () => {
        const hasEmpty = updatedRegions.some(r => !r.city || !r.price || !r.cost);
        if (hasEmpty) {
            setAlertMessage({ msg: "Todos los campos son obligatorios.", tipo: 'error' });
            return;
        }

        const hasNegativeMargin = updatedRegions.some(r => parseFloat(r.cost) > parseFloat(r.price));
        if (hasNegativeMargin) {
            setAlertMessage({
                msg: "Error: El Pago al Carrier no puede ser mayor al Cobro del Cliente.",
                tipo: 'error'
            });
            return;
        }

        try {
            // Guardamos las regiones y el objeto de auditoría por fuera
            await firestore().collection("province").doc(currentRegions.id).update({
                regions: updatedRegions,
                ultimaEdicion: {
                    usuario: user?.nombre || "Admin",
                    idUsuario: user?.id || "N/A",
                    timestamp: new Date()
                }
            });

            setAlertMessage({ msg: "Matriz de costos actualizada y registrada", tipo: 'success' });
            setTimeout(() => {
                setAlertMessage({ msg: '', tipo: '' });
                closeModal();
            }, 1500);
        } catch (error) {
            setAlertMessage({ msg: "Error al sincronizar con Firebase", tipo: 'error' });
        }
    };

    return (
        <div className="bg-white font-sans p-2">
            {alertMessage.msg && (
                <div className={`alert ${alertMessage.tipo === 'success' ? 'alert-success' : 'alert-error'} mb-4 shadow-md text-white font-bold text-[12px] uppercase`}>
                    <FaExclamationCircle />
                    <span>{alertMessage.msg}</span>
                </div>
            )}

            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-3">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-blue-900 uppercase italic leading-none">
                        {currentRegions?.state}
                    </h2>
                    {/* Badge informativo de última edición si existe */}
                    {currentRegions?.ultimaEdicion && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-1 uppercase font-bold">
                            <FaUserClock /> Ultima edición por: {currentRegions.ultimaEdicion.usuario}
                        </div>
                    )}
                </div>
                <button onClick={handleAddRegion} className="btn btn-sm btn-info text-white gap-2 font-bold uppercase text-[11px]">
                    <FaPlus /> Nuevo Destino
                </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto border rounded-md">
                <table className="table table-compact w-full border-separate border-spacing-y-1">
                    <thead>
                        <tr className="text-[10px] uppercase text-gray-400 bg-gray-50 border-b">
                            <th className="w-12 text-center">New</th>
                            <th>Ciudad / Destino</th>
                            <th className="w-28 text-blue-700 font-black">Venta ($)</th>
                            <th className="w-28 text-red-600 font-black">Costo Carrier ($)</th>
                            <th className="w-12 text-center"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {updatedRegions.map((region, index) => (
                            <tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                                <td className="text-center">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-xs checkbox-info"
                                        checked={region.isNew}
                                        onChange={(e) => handleFieldChange(index, 'isNew', e.target.checked)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        value={region.city}
                                        onChange={(e) => handleFieldChange(index, 'city', e.target.value.toUpperCase())}
                                        className="input input-bordered input-xs w-full bg-white text-black font-bold uppercase focus:border-blue-500"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={region.price}
                                        onChange={(e) => handleFieldChange(index, 'price', e.target.value)}
                                        className="input input-bordered input-xs w-full bg-blue-50 text-blue-800 font-mono font-bold"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={region.cost}
                                        onChange={(e) => handleFieldChange(index, 'cost', e.target.value)}
                                        className={`input input-bordered input-xs w-full font-mono font-bold bg-white ${parseFloat(region.cost) > parseFloat(region.price) ? 'border-red-500 text-red-600' : 'text-gray-700'}`}
                                    />
                                </td>
                                <td className="text-center">
                                    <button
                                        onClick={() => {
                                            const copy = [...updatedRegions];
                                            copy.splice(index, 1);
                                            setUpdatedRegions(copy);
                                        }}
                                        className="btn btn-ghost btn-xs text-red-400"
                                    >
                                        <FaTrash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="modal-action flex gap-2 pt-4 border-t border-gray-100 mt-4">
                <button onClick={closeModal} className="btn btn-sm btn-ghost px-6 uppercase font-bold text-[11px]">
                    Cancelar
                </button>
                <button onClick={handleSave} className="btn btn-sm btn-info text-white px-10 uppercase font-bold text-[11px] gap-2 shadow-lg">
                    <FaSave /> Guardar Matriz
                </button>
            </div>
        </div>
    );
};

export default EditarEstadosPrecios;