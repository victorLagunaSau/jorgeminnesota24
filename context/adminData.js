import React, { createContext, useContext, useEffect, useState } from "react";
import { firestore } from "../firebase/firebaseIni";
import { COLLECTIONS } from "../constants";

const AdminDataContext = createContext(null);

/**
 * Provider que carga datos compartidos UNA sola vez para todo el panel admin
 * Evita que cada componente haga su propia consulta a Firebase
 */
export const AdminDataProvider = ({ children }) => {
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribers = [];

    // Suscripción a choferes
    const unsubChoferes = firestore()
      .collection(COLLECTIONS.CHOFERES)
      .orderBy("folio", "desc")
      .onSnapshot((snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setChoferes(data);
      });
    unsubscribers.push(unsubChoferes);

    // Suscripción a clientes
    const unsubClientes = firestore()
      .collection(COLLECTIONS.CLIENTES)
      .orderBy("nombreCliente", "asc")
      .onSnapshot((snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setClientes(data);
      });
    unsubscribers.push(unsubClientes);

    // Suscripción a empresas
    const unsubEmpresas = firestore()
      .collection(COLLECTIONS.EMPRESAS)
      .orderBy("nombreEmpresa", "asc")
      .onSnapshot((snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setEmpresas(data);
      });
    unsubscribers.push(unsubEmpresas);

    setLoading(false);

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Helpers para buscar por ID
  const getChoferById = (id) => choferes.find((c) => c.id === id);
  const getClienteById = (id) => clientes.find((c) => c.id === id);
  const getEmpresaById = (id) => empresas.find((e) => e.id === id);

  // Helpers para buscar por nombre
  const getChoferByNombre = (nombre) =>
    choferes.find((c) => c.nombreChofer?.toLowerCase() === nombre?.toLowerCase());
  const getClienteByNombre = (nombre) =>
    clientes.find((c) => c.nombreCliente?.toLowerCase() === nombre?.toLowerCase());

  return (
    <AdminDataContext.Provider
      value={{
        // Data
        choferes,
        clientes,
        empresas,
        loading,
        // Helpers
        getChoferById,
        getClienteById,
        getEmpresaById,
        getChoferByNombre,
        getClienteByNombre,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
};

/**
 * Hook para usar el contexto de datos admin
 */
export const useAdminData = () => {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData debe usarse dentro de AdminDataProvider");
  }
  return context;
};

export default AdminDataContext;
