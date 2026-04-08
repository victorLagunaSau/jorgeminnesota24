import { useState, useEffect, useCallback } from "react";
import { auth, firestore } from "../firebase/firebaseIni";
import { COLLECTIONS, USER_TYPES } from "../constants";

/**
 * Custom hook for authentication management
 * @returns {object} Auth state and methods
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user data from Firestore
          const userDoc = await firestore()
            .collection(COLLECTIONS.USERS)
            .doc(firebaseUser.uid)
            .get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            let fullUserData = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData,
            };

            // Si es empresa, cargar también los datos de la empresa
            if (userData.tipo === USER_TYPES.EMPRESA) {
              const empresaDoc = await firestore()
                .collection(COLLECTIONS.EMPRESAS)
                .doc(firebaseUser.uid)
                .get();

              if (empresaDoc.exists) {
                fullUserData.datosEmpresa = empresaDoc.data();
              }
            }

            // Si es cliente, cargar también los datos del cliente
            if (userData.tipo === USER_TYPES.CLIENTE) {
              // Primero intentar con el UID (clientes nuevos)
              let clienteDoc = await firestore()
                .collection(COLLECTIONS.CLIENTES)
                .doc(firebaseUser.uid)
                .get();

              // Si no existe, buscar por clienteIdOriginal (clientes existentes con auth agregado)
              if (!clienteDoc.exists && userData.clienteIdOriginal) {
                clienteDoc = await firestore()
                  .collection(COLLECTIONS.CLIENTES)
                  .doc(userData.clienteIdOriginal)
                  .get();
              }

              if (clienteDoc.exists) {
                fullUserData.datosCliente = {
                  id: clienteDoc.id,
                  ...clienteDoc.data()
                };
              }
            }

            setUser(fullUserData);
          } else {
            // User exists in Auth but not in Firestore
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email,
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await auth().signInWithEmailAndPassword(email, password);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await auth().signOut();
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new user account
  const createUser = useCallback(async (email, password, userData = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await auth().createUserWithEmailAndPassword(email, password);

      // Create user document in Firestore
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(result.user.uid)
        .set({
          email,
          createdAt: new Date(),
          ...userData,
        });

      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send password reset email
  const resetPassword = useCallback(async (email) => {
    setError(null);
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Permission checks
  const isAdmin = user?.tipo === USER_TYPES.ADMIN || user?.admin === true;
  const isEmpresa = user?.tipo === USER_TYPES.EMPRESA;
  const isChofer = user?.tipo === USER_TYPES.CHOFER;
  const isCliente = user?.tipo === USER_TYPES.CLIENTE;
  const hasCajaAccess = user?.caja === true;

  // Check if user has permission for a specific module
  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (isAdmin) return true;

      switch (permission) {
        case "caja":
          return hasCajaAccess;
        case "viajes":
          return isEmpresa || isChofer;
        case "admin":
          return isAdmin;
        case "portal":
          return isCliente;
        default:
          return false;
      }
    },
    [user, isAdmin, isEmpresa, isChofer, isCliente, hasCajaAccess]
  );

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin,
    isEmpresa,
    isChofer,
    isCliente,
    hasCajaAccess,
    signIn,
    signOut,
    createUser,
    resetPassword,
    hasPermission,
  };
};

export default useAuth;
