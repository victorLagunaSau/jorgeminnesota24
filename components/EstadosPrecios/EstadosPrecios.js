import React from "react";
import { motion } from "framer-motion";
import FormEstadosPrecios from "./FormEstadosPrecios";
import TablaEstadoPrecios from "./TablaEstadoPrecios";

const EstadosPrecios = ({ user }) => {
    // Nota: Eliminamos el fetch de aquí.
    // Ahora TablaEstadoPrecios consultará su propia información en tiempo real.

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full font-sans"
        >
            {/* ENCABEZADO ESTILO VÍCTOR */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-2 bg-blue-800 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
                        Configuración de Estados y Precios (CDs)
                    </h2>
                </div>
            </div>

            {/* SECCIÓN DE REGISTRO (FORMULARIO) */}
            <div className="mb-8">
                <FormEstadosPrecios user={user} />
            </div>

            {/* SECCIÓN DE VISUALIZACIÓN (TABLA) */}
            <div className="w-full">
                <TablaEstadoPrecios user={user} />
            </div>

        </motion.div>
    );
};

export default EstadosPrecios;