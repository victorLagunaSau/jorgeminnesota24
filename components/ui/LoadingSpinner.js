import React from "react";

const LoadingSpinner = ({ texto = "Cargando...", size = "lg", className = "" }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-10 gap-3 ${className}`}>
            <span className={`loading loading-spinner loading-${size} text-info`}></span>
            {texto && <p className="text-[11px] font-bold text-gray-400 uppercase">{texto}</p>}
        </div>
    );
};

export default LoadingSpinner;
