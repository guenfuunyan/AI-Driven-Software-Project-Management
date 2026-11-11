import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import SprintPage from './pages/SprintPage';
import StoriesPage from './pages/StoriesPage';
import TasksPage from './pages/TasksPage';
import RisksPage from './pages/RisksPage';
import ForecastPage from './pages/ForecastPage';
import AIPage from './pages/AIPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { useAuthStore } from './store/auth';

function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  return token ? <Layout /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb', // Tailwind blue-600
          fontFamily: 'Inter, sans-serif',
          borderRadius: 8,
        },
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes wrapped with auth check and main sidebar layout */}
        <Route element={<ProtectedRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="sprint" element={<SprintPage />} />
          <Route path="stories" element={<StoriesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
