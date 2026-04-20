import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const Pagination = ({
    pagina,
    totalPags,
    onAnterior,
    onSiguiente,
    esPrimera,
    esUltima,
    totalItems,
    className = "",
}) => {
    if (totalPags <= 1 && totalItems <= 0) return null;

    return (
        <div className={`flex items-center justify-between gap-3 ${className}`}>
            <span className="text-[10px] font-bold text-gray-400 uppercase italic">
                {totalItems} registros
            </span>
            <div className="flex items-center gap-1">
                <button
                    className="btn btn-xs btn-outline border-gray-300 text-gray-600"
                    disabled={esPrimera}
                    onClick={onAnterior}
                >
                    <FaChevronLeft size={10} />
                </button>
                <span className="text-[10px] font-black uppercase text-gray-500 px-2">
                    {pagina} / {totalPags}
                </span>
                <button
                    className="btn btn-xs btn-outline border-gray-300 text-gray-600"
                    disabled={esUltima}
                    onClick={onSiguiente}
                >
                    <FaChevronRight size={10} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
