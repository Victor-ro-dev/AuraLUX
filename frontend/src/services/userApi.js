import axios from "axios";

const api = axios.create({ baseURL: "/api" });

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getProfile = (token) =>
  api.get("/users/me", authHeader(token)).then((r) => r.data);

export const updateChronotype = (token, data) =>
  api.put("/users/me/chronotype", data, authHeader(token)).then((r) => r.data);
