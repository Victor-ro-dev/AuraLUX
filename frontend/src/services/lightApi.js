import axios from "axios";

const api = axios.create({ baseURL: "/api" });

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getPresets = (token) =>
  api.get("/light/presets", authHeader(token)).then((r) => r.data);

export const applyAutoLight = (token, eventType = null) =>
  api
    .post("/light/auto", null, {
      ...authHeader(token),
      params: eventType ? { event_type: eventType } : {},
    })
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
