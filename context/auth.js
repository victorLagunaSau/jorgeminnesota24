import React, { createContext, useContext } from "react";
import { useAuth } from "../hooks/useAuth";

// Create Auth Context
const AuthContext = createContext(null);

/**
 * Auth Provider component - wraps the app with auth state
 */
export const AuthProvider = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 * @returns {object} Auth context value
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;