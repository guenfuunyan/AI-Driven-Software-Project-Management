import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { ProjectList } from './pages/ProjectList';

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
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="ai-assistant" element={<div className="p-4">AI Assistant Interface Coming Soon</div>} />
            <Route path="settings" element={<div className="p-4">Settings Coming Soon</div>} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
