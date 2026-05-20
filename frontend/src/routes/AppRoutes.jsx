import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Form from "../pages/Form";
import Dashboard from "../pages/Dashboard";
import OAuthCallback from "../pages/OAuthCallback";
import SciencePresets from "../pages/SciencePresets";
import PrivateRoute from "./PrivateRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/outlook/callback" element={<OAuthCallback />} />
      <Route path="/science/presets" element={<SciencePresets />} />

      {/* Rotas protegidas */}
      <Route
        path="/form"
        element={
          <PrivateRoute>
            <Form />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
