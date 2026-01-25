import React, { useState } from "react";
import { motion } from "framer-motion";
import FormCliente from "./FormCliente";
import TablaClientes from "./TablaClientes";

const Clientes = ({ user }) => {
    // Estado inicial limpio y con campos específicos para evitar colisiones
    const [datos, setDatos] = useState({
        cliente: "",
        telefonoCliente: "",
        apodo: "",
        ciudadCliente: "",
        estadoCliente: "",
        rfc: null,    // Reservado
        email: null   // Reservado
    });

    const handleGuardar = () => {
        if (!datos.cliente || !datos.telefonoCliente) {
            alert("Nombre y Teléfono son obligatorios para el registro.");
            return;
        }

        // Estructura lista para enviar a Firebase
        const objetoParaGuardar = {
            ...datos,
            registro: {
                usuario: user.nombre,
                idUsuario: user.id,
                timestamp: new Date() // O firebase.firestore.FieldValue.serverTimestamp()
            }
        };

        console.log("Objeto validado y listo para persistencia:", objetoParaGuardar);
        // Próximo paso: Integrar tu mecánica de Folios
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="mb-4 flex items-center gap-2">
                <div className="h-6 w-2 bg-red-600 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
                    Directorio de Clientes
                </h2>
            </div>

            <FormCliente user={user}/>

            <TablaClientes clientes={user} />
        </motion.div>
    );
};

export default Clientes;