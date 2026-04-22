import React from "react";
import { VEHICLE_STATUS, VEHICLE_STATUS_CODES, VEHICLE_STATUS_DESCRIPTIONS } from "../../constants";

const StatusSteps = ({ estatus, showDescription = true }) => {
    const currentIndex = VEHICLE_STATUS_CODES.indexOf(estatus);

    return (
        <div>
            <ul className="steps steps-gray-500 mt-4 w-full">
                {VEHICLE_STATUS_CODES.map((code, index) => (
                    <li
                        key={code}
                        className={`step ${index <= currentIndex ? "step-info text-black-500 text-xs" : "text-xs"}`}
                    >
                        {VEHICLE_STATUS[code].label}
                    </li>
                ))}
            </ul>

            {showDescription && estatus && (
                <div className="w-full max-w-3xl mx-auto mt-2">
                    <div className="bg-gray-100 shadow-md p-6 rounded-md">
                        <p className="text-2xl lg:text-3xl font-medium text-blue-700 leading-normal">
                            {VEHICLE_STATUS[estatus]?.label}
                        </p>
                        <p className="text-black-500">
                            {VEHICLE_STATUS_DESCRIPTIONS[estatus]}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusSteps;
