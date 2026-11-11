import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme } from 'antd';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Menu as MenuIcon,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <LayoutDashboard size={18} />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '/projects',
      icon: <FolderKanban size={18} />,
      label: <Link to="/projects">Projects</Link>,
    },
    {
      key: '/ai-assistant',
      icon: <Bot size={18} />,
      label: <Link to="/ai-assistant">AI Assistant</Link>,
    },
    {
      key: '/settings',
      icon: <Settings size={18} />,
      label: <Link to="/settings">Settings</Link>,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        className="border-r border-gray-200 shadow-sm"
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
            {!collapsed && (
              <span className="font-bold text-lg text-gray-800 tracking-tight">
                ProjectManager
              </span>
            )}
          </motion.div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="mt-4 border-none"
        />
        <div className="absolute bottom-4 left-0 w-full px-4">
          <Button 
            type="text" 
            icon={<LogOut size={18} />} 
            className="w-full flex items-center justify-start text-gray-500 hover:text-red-500"
          >
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} className="flex items-center px-4 shadow-sm z-10">
          <Button
            type="text"
            icon={<MenuIcon />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div className="flex-1" />
          <div className="flex items-center gap-4 pr-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                AD
              </div>
              <span className="text-sm font-medium">Admin User</span>
            </div>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: 'transparent',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
};
