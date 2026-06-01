import axios from "axios";

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";
const api = axios.create({ baseURL: BASE });

export const loginRequest = (email, password) =>
  api.post("/auth/login", { email, password });

export const registerRequest = (name, email, password) =>
  api.post("/auth/register", { name, email, password });
