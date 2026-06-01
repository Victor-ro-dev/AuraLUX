import axios from "axios";

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";
const api = axios.create({ baseURL: BASE });

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getProfile = (token) =>
  api.get("/users/me", authHeader(token)).then((r) => r.data);

export const updateChronotype = (token, data) =>
  api.put("/users/me/chronotype", data, authHeader(token)).then((r) => r.data);
