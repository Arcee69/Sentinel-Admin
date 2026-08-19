import { Route, Routes } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import AuthLayout from "../layout/AuthLayout";
import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Intelligence from "../pages/Intelligence";
import Operations from "../pages/Operations";
import Communications from "../pages/Communications";
import CommandCenter from "../pages/CommandCenter";
import Elections from "../pages/Elections";
import ParticipationLayout from "../pages/participation/Layout";
import ParticipationNational from "../pages/participation/National";
import ParticipationGeography from "../pages/participation/Geography";
import ParticipationPollingUnits from "../pages/participation/PollingUnits";
import ParticipationRegister from "../pages/participation/Register";
import ParticipationHistorical from "../pages/participation/Historical";
import ParticipationAnomalies from "../pages/participation/Anomalies";
import ParticipationMap from "../pages/participation/TurnoutMap";
import ParticipationLive from "../pages/participation/Live";
import Reports from "../pages/Reports";
import Agents from "../pages/Agents";
import AgentDetail from "../pages/AgentDetail";
import SettingsPage from "../pages/Settings";
import NotFound from "../pages/NotFound";

export default function Routers() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/command" element={<CommandCenter />} />
          <Route path="/elections" element={<Elections />} />
          <Route path="/participation" element={<ParticipationLayout />}>
            <Route index element={<ParticipationNational />} />
            <Route path="geography" element={<ParticipationGeography />} />
            <Route path="polling-units" element={<ParticipationPollingUnits />} />
            <Route path="register" element={<ParticipationRegister />} />
            <Route path="historical" element={<ParticipationHistorical />} />
            <Route path="anomalies" element={<ParticipationAnomalies />} />
            <Route path="map" element={<ParticipationMap />} />
            <Route path="live" element={<ParticipationLive />} />
          </Route>
          <Route path="/reports" element={<Reports />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentDetail />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
