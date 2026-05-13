import { useState } from "react";
import { registerRequest } from "../services/authApi";

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const register = async (name, email, password) => {
    setLoading(true);
    setError("");
    try {
      await registerRequest(name, email, password);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao cadastrar");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
}
