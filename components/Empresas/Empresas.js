import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FormEmpresa from "./FormEmpresa";
import TablaEmpresas from "./TablaEmpresas";
import { FaTimes } from "react-icons/fa";

const Empresas = ({ user }) => {
    // Estado para saber qué empresa estamos editando
    const [empresaAEditar, setEmpresaAEditar] = useState(null);

    const handleEditar = (empresa) => {
        setEmpresaAEditar(empresa);
        // Hacemos scroll hacia arriba para que el usuario vea el formulario lleno
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setEmpresaAEditar(null);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-6 w-2 ${empresaAEditar ? 'bg-orange-500' : 'bg-blue-800'} rounded-full transition-colors`}></div>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
                        {empresaAEditar ? `Editando: ${empresaAEditar.nombreEmpresa}` : 'Registro de Empresas (USA Carriers)'}
                    </h2>
                </div>

                {/* Botón para salir del modo edición */}
                <AnimatePresence>
                    {empresaAEditar && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            onClick={cancelarEdicion}
                            className="btn btn-xs btn-error text-white gap-1"
                        >
                            <FaTimes /> Cancelar Edición
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Pasamos la empresa seleccionada y la función para limpiar tras guardar */}
            <FormEmpresa
                user={user}
                empresaAEditar={empresaAEditar}
                onSuccess={cancelarEdicion}
            />

            <TablaEmpresas onEditar={handleEditar} />
        </motion.div>
    );
};

export default Empresas;