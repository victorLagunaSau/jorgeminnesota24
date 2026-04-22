import React from "react";
import { FaInbox } from "react-icons/fa";

const EmptyState = ({ mensaje = "No hay registros", icono: Icon = FaInbox, className = "" }) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 gap-3 text-gray-300 ${className}`}>
            <Icon size={40} />
            <p className="text-[12px] font-bold uppercase">{mensaje}</p>
        </div>
    );
};

export default EmptyState;
