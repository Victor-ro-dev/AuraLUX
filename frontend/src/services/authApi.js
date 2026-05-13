import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const loginRequest = (email, password) =>
  api.post("/auth/login", { email, password });

export const registerRequest = (name, email, password) =>
  api.post("/auth/register", { name, email, password });
