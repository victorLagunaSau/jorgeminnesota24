import React from "react";
import { motion } from "framer-motion";
import FormEmpresa from "./FormEmpresa";
import TablaEmpresas from "./TablaEmpresas";

const Empresas = ({ user }) => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="mb-4 flex items-center gap-2">
                <div className="h-6 w-2 bg-blue-800 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
                    Registro de Empresas (USA Carriers)
                </h2>
            </div>

            <FormEmpresa user={user} />
            <TablaEmpresas />
        </motion.div>
    );
};

export default Empresas;