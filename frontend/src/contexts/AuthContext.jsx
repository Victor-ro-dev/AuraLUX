import { createContext, useContext, useState, useEffect } from "react";
import { getProfile } from "../services/userApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auralux_token");
    if (!token) {
      setLoading(false);
      return;
    }

    getProfile(token)
      .then((data) => setUser({ ...data, token }))
      .catch(() => localStorage.removeItem("auralux_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("auralux_token", token);
    setUser({ ...userData, token });
  };

  const logout = () => {
    localStorage.removeItem("auralux_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
