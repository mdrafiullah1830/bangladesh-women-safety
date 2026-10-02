import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { SafetyPage } from "./pages/SafetyPage";
import { StatsPage } from "./pages/StatsPage";
import { PrivacyInfoPage } from "./pages/PrivacyInfoPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmergencyPage } from "./pages/EmergencyPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { IncidentDetailPage } from "./pages/IncidentDetailPage";
import { ContactsPage } from "./pages/ContactsPage";
import { TripsPage } from "./pages/TripsPage";
import { SharesPage } from "./pages/SharesPage";
import { TrackPage } from "./pages/TrackPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ResponderPage } from "./pages/ResponderPage";
import { ModerationPage } from "./pages/ModerationPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route index element={<HomePage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="safety" element={<SafetyPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="privacy" element={<PrivacyInfoPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="track/:token" element={<TrackPage />} />

        {/* Authenticated */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="emergency"
          element={
            <ProtectedRoute>
              <EmergencyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="incidents"
          element={
            <ProtectedRoute>
              <IncidentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="incidents/:id"
          element={
            <ProtectedRoute>
              <IncidentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="contacts"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trips"
          element={
            <ProtectedRoute>
              <TripsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="shares"
          element={
            <ProtectedRoute>
              <SharesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="privacy-centre"
          element={
            <ProtectedRoute>
              <PrivacyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Role-gated consoles */}
        <Route
          path="responder"
          element={
            <ProtectedRoute roles={["RESPONDER", "MODERATOR", "ADMIN"]}>
              <ResponderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="moderation"
          element={
            <ProtectedRoute roles={["MODERATOR", "ADMIN"]}>
              <ModerationPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}