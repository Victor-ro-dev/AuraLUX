import { useState } from "react";
import { loginRequest } from "../services/authApi";
import { getProfile } from "../services/userApi";
import { useAuth } from "../contexts/AuthContext";

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const doLogin = async (email, password) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await loginRequest(email, password);
      const token = data.access_token;
      const profile = await getProfile(token);
      login(profile, token);
      return profile;
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao autenticar");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { login: doLogin, loading, error };
}
