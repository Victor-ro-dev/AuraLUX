import axios from "axios";

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";
const api = axios.create({ baseURL: BASE });

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getPresets = (token) =>
  api.get("/light/presets", authHeader(token)).then((r) => r.data);

export const applyAutoLight = (token, currentMode = "auto") =>
  api
    .post("/light/auto", { current_mode: currentMode }, authHeader(token))
    .then((r) => r.data);

export const applyManualLight = (token, payload) =>
  api.post("/light/manual", payload, authHeader(token)).then((r) => r.data);

export const setBrightness = (token, brightness) =>
  api
    .post("/light/brightness", { brightness }, authHeader(token))
    .then((r) => r.data);

export const setPower = (token, state) =>
  api.post("/light/power", { state }, authHeader(token)).then((r) => r.data);

export const getLightHistory = (token, limit = 10) =>
  api
    .get("/light/history", { ...authHeader(token), params: { limit } })
    .then((r) => r.data);

export const syncLightFromCalendar = (token) =>
  api.post("/calendar/sync-light", {}, authHeader(token)).then((r) => r.data);

export const setAutoLightMode = (token, enabled) =>
  api
    .patch(
      "/users/me/auto-light",
      { auto_light_mode: enabled },
      authHeader(token),
    )
    .then((r) => r.data);
