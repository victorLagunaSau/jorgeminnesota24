import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FormCliente from "./FormCliente";
import TablaClientes from "./TablaClientes";
import { FaTimes } from "react-icons/fa";

const Clientes = ({ user }) => {
    const [clienteAEditar, setClienteAEditar] = useState(null);

    const handleEditar = (cliente) => {
        setClienteAEditar(cliente);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setClienteAEditar(null);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-6 w-2 ${clienteAEditar ? 'bg-orange-500' : 'bg-red-600'} rounded-full transition-colors`}></div>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
                        {clienteAEditar ? `Editando: ${clienteAEditar.cliente}` : 'Directorio de Clientes'}
                    </h2>
                </div>

                <AnimatePresence>
                    {clienteAEditar && (
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

            <FormCliente
                user={user}
                clienteAEditar={clienteAEditar}
                onSuccess={cancelarEdicion}
            />

            <TablaClientes onEditar={handleEditar} />
        </motion.div>
    );
};

export default Clientes;