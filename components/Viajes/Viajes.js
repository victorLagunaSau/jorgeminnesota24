import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FormViaje from "./FormViaje";
import TablaViajes from "./TablaViajes";

const Viajes = ({ user }) => {
    const [view, setView] = useState("administracion");

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full font-sans p-2"
        >
            <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border-l-8 border-red-600">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">
                        Administración de Viajes
                    </h2>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        Control Operativo | Logística Integral
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right border-r pr-6 border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase italic">Usuario:</p>
                        <p className="text-sm font-black text-red-600 uppercase">{user?.nombre || "Admin"}</p>
                    </div>

                    <button
                        onClick={() => setView(view === "administracion" ? "nuevo" : "administracion")}
                        className={`btn btn-sm px-6 font-bold uppercase text-[11px] shadow-sm transition-all duration-300 ${
                            view === "administracion" ? "btn-error text-white" : "btn-outline border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        {view === "administracion" ? "Nuevo Viaje" : "Ver Administración"}
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    initial={{ opacity: 0, x: view === "nuevo" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: view === "nuevo" ? -20 : 20 }}
                    transition={{ duration: 0.2 }}
                >
                    {view === "nuevo" ? <FormViaje user={user} /> : <TablaViajes user={user} />}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default Viajes;