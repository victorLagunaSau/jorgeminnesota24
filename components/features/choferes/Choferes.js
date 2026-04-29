import React, { useState } from "react";
import { motion } from "framer-motion";
import FormChofer from "./FormChofer";
import TablaChoferes from "./TablaChoferes";

const Choferes = ({ user }) => {
    const isAdminMaster = user?.adminMaster === true;
    const [choferAEditar, setChoferAEditar] = useState(null);

    const handleEditar = (chofer) => {
        setChoferAEditar(chofer);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCancelarEdicion = () => {
        setChoferAEditar(null);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-6 w-2 rounded-full ${choferAEditar ? 'bg-blue-600' : 'bg-red-600'}`}></div>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
                        {choferAEditar ? 'Editando Chofer' : 'Control de Choferes'}
                    </h2>
                    {choferAEditar && (
                        <span className="text-sm font-black text-blue-600 uppercase italic ml-2">
                            #{choferAEditar.folio} — {choferAEditar.nombreChofer}
                        </span>
                    )}
                </div>
                {choferAEditar && (
                    <button
                        onClick={handleCancelarEdicion}
                        className="btn btn-sm bg-gray-200 hover:bg-gray-300 text-gray-700 border-none font-bold uppercase"
                    >
                        Cancelar Edición
                    </button>
                )}
            </div>

            <FormChofer
                user={user}
                choferAEditar={choferAEditar}
                onSuccess={handleCancelarEdicion}
            />

            <TablaChoferes onEditarChofer={isAdminMaster ? handleEditar : null} isAdminMaster={isAdminMaster} />
        </motion.div>
    );
};

export default Choferes;
