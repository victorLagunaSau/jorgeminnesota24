import React from "react";
import { motion } from "framer-motion";
import FormChofer from "./FormChofer";
import TablaChoferes from "./TablaChoferes";

const Choferes = ({ user }) => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-2 bg-red-600 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
                        Control de Choferes
                    </h2>
                </div>
            </div>

            {/* Formulario con herencia de usuario para registro */}
            <FormChofer user={user} />

            {/* Tabla autónoma que consulta Firebase */}
            <TablaChoferes />
        </motion.div>
    );
};

export default Choferes;