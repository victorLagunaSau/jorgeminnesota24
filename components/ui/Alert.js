import React from "react";
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaTimes } from "react-icons/fa";

const ICONS = {
    success: FaCheckCircle,
    error: FaTimesCircle,
    warning: FaExclamationTriangle,
    info: FaInfoCircle,
};

const STYLES = {
    success: "alert-success",
    error: "alert-error",
    warning: "alert-warning",
    info: "alert-info",
};

const Alert = ({ mostrar, mensaje, tipo = "info", onClose, className = "" }) => {
    if (!mostrar) return null;

    const Icon = ICONS[tipo] || ICONS.info;

    return (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in ${className}`}>
            <div className={`alert ${STYLES[tipo] || STYLES.info} shadow-lg text-white font-bold py-2 px-6 flex items-center gap-2`}>
                <Icon className="shrink-0" />
                <span className="text-[12px] uppercase">{mensaje}</span>
                {onClose && (
                    <button onClick={onClose} className="btn btn-ghost btn-xs text-white ml-2">
                        <FaTimes />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Alert;
