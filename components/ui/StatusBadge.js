import React from "react";
import { VEHICLE_STATUS } from "../../constants";

const STATUS_COLORS = {
    PR: "bg-gray-100 text-gray-700",
    IN: "bg-yellow-100 text-yellow-700",
    TR: "bg-blue-100 text-blue-700",
    EB: "bg-purple-100 text-purple-700",
    DS: "bg-orange-100 text-orange-700",
    EN: "bg-green-100 text-green-700",
};

const StatusBadge = ({ status, className = "" }) => {
    const label = VEHICLE_STATUS[status]?.label || status;
    const colorClass = STATUS_COLORS[status] || "bg-gray-100 text-gray-600";

    return (
        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${colorClass} ${className}`}>
            {label}
        </span>
    );
};

export default StatusBadge;
