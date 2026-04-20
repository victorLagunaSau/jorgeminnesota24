import React from "react";
import { FaSearch } from "react-icons/fa";

const SearchBar = ({
    value,
    onChange,
    placeholder = "Buscar...",
    className = "",
}) => {
    return (
        <div className={`relative flex-1 min-w-[200px] ${className}`}>
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input
                type="text"
                placeholder={placeholder}
                className="input input-bordered input-sm w-full pl-9 bg-white text-black font-bold uppercase text-[11px]"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};

export default SearchBar;
