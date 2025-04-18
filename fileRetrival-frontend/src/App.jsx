import React, { useEffect, useContext, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Layout, Menu, Typography, Avatar, Divider, Switch, Button, Tooltip, Space, Popover } from "antd";
import {
  FileOutlined,
  DiffOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbOutlined,
  BulbFilled,
  UserOutlined,
  HomeOutlined,
  AppstoreOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider, ThemeContext } from "./context/ThemeContext";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import AppFooter from "./components/Common/AppFooter";
import PendingApprovals from "./Pages/PendingApprovals";
import FileManager from "./Pages/FileManager";

const { Content, Sider, Header } = Layout;
const { Text, Title } = Typography;

// New UserProfile Component
const UserProfile = ({ user, isDarkMode, handleLogout }) => {
  const [visible, setVisible] = useState(false);

  const content = (
    <div style={{
      padding: '8px 4px',
      width: '160px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <Avatar
          size={48}
          style={{ backgroundColor: "#1890ff" }}
        >
          {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
        </Avatar>
        <Text strong style={{
          color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
        }}>
          {user?.username}
        </Text>
        <Text type="secondary" style={{
          color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
          fontSize: '12px',
          marginTop: '-4px'
        }}>
          {user?.role || 'User'}
        </Text>
      </div>

      <Button
        type="primary"
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        size="middle"
        style={{
          width: '100%',
          backgroundColor: isDarkMode ? '#1f1f1f' : '#f0f0f0',
          color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
          border: 'none',
          borderRadius: '4px',
          boxShadow: 'none',
        }}
      >
        Logout
      </Button>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="hover"
      placement="bottomRight"
      open={visible}
      onOpenChange={setVisible}
      overlayStyle={{
        width: '180px',
        padding: 0,
      }}
      overlayInnerStyle={{
        backgroundColor: isDarkMode ? '#262626' : '#ffffff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: '8px',
      }}
    >
      <Avatar
        size={36}
        style={{
          backgroundColor: "#1890ff",
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
          transform: visible ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
      </Avatar>
    </Popover>
  );
};

const AppSidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';

  const selectedKey = location.pathname === "/" ? "files" : location.pathname.slice(1);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Create menu items array
  const menuItems = [
    {
      key: "files",
      icon: <FileOutlined />,
      label: "Files",
      onClick: () => navigate("/")
    }
  ];

  // Only add Compare option if user role is VIEWER
  if (user?.role !== "VIEWER") {
    menuItems.push({
      key: "approvals",
      icon: <AuditOutlined />,
      label: "Approvals",
      onClick: () => navigate("/approvals")
    });
  }

  // Add remaining menu items
  menuItems.push({
    key: "dashboard",
    icon: <AppstoreOutlined />,
    label: "Dashboard",
    onClick: () => navigate("/dashboard")
  });

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={220}
      theme={isDarkMode ? 'dark' : 'light'}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 2,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        backgroundColor: isDarkMode ? '#313130' : '#e8ecf0',
      }}
    >
      {/* App Logo with Blue Background and White Border */}
      <div className="logo" style={{
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: '#092e5d',
        borderRight: '0.5px solid #ffffff',
        padding: collapsed ? "10px" : "8px"
      }}>
        <img
          src="src/media/company_logo.png"
          alt="Company Logo"
          style={{
            height: collapsed ? "40px" : "80%",
            width: "auto",
            maxWidth: "100%",
            objectFit: "contain"
          }}
        />
      </div>

      {/* Navigation Menu */}
      <Menu
        theme={isDarkMode ? 'dark' : 'light'}
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{
          borderRight: 0,
          backgroundColor: isDarkMode ? '#313130' : '#e8ecf0'
        }}
        items={menuItems}
      />

      {/* Bottom Controls with Toggle Menu Button */}
      <div className="sidebar-footer" style={{
        position: "absolute",
        bottom: 0,
        width: "100%",
        padding: "16px",
        borderTop: isDarkMode ? '1px solid #3f3f3f' : '1px solid #d0d0d0',
        backgroundColor: isDarkMode ? '#313130' : '#e8ecf0',
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px"
      }}>
        {/* Toggle Menu Button at bottom of sidebar */}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '100%',
            textAlign: 'center',
            color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
            backgroundColor: isDarkMode ? '#252525' : '#e0e0e0',
            borderRadius: '4px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {!collapsed && <span style={{ marginLeft: '8px' }}>Toggle Menu</span>}
        </Button>
      </div>
    </Sider>
  );
};

// Protected Route component to handle authentication
const ProtectedRoute = ({ element }) => {
  const { user } = useContext(AuthContext);
  
  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return element;
};

const AppHeader = ({ user, isDarkMode, handleLogout, toggleTheme, collapsed, setCollapsed }) => {
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  return (
    <Header style={{
      padding: "0 16px",
      background: '#092e5d',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: '#ffffff',
      position: "sticky",
      top: 0,
      zIndex: 1,
      width: "100%"
    }}>
      {/* Left side of header */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{
          marginLeft: "8px",
          color: 'rgba(255, 255, 255, 0.85)',
          fontWeight: 500,
          display: "flex",
          alignItems: "center"
        }}>
          <span style={{
            margin: 0,
            color: "#ffffff",
            fontWeight: 400,
            fontSize: "18px"
          }}>
            DocHub
          </span>
        </div>
      </div>

      {/* Right side of header */}
      <Space size={16}>
        <Switch
          checkedChildren={<BulbFilled />}
          unCheckedChildren={<BulbOutlined />}
          checked={isDarkMode}
          onChange={toggleTheme}
        />

        {/* Only show user profile if logged in */}
        {user && (
          <UserProfile
            user={user}
            isDarkMode={isDarkMode}
            handleLogout={handleLogout}
          />
        )}
      </Space>
    </Header>
  );
};

const AppContent = () => {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Redirect to login if not logged in and not already on login/register page
  useEffect(() => {
    if (!user && !isAuthPage) {
      navigate('/login');
    }
  }, [user, isAuthPage, navigate]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Show sidebar only for logged in users and not on auth pages */}
      {user && !isAuthPage && (
        <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      <Layout style={{
        marginLeft: user && !isAuthPage ? (collapsed ? 80 : 220) : 0,
        transition: 'all 0.2s',
        backgroundColor: isDarkMode ? '#161617' : '#f0f2f5'
      }}>
        {/* Always show header */}
        <AppHeader 
          user={user} 
          isDarkMode={isDarkMode} 
          handleLogout={handleLogout} 
          toggleTheme={toggleTheme}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        <Content style={{
          padding: 16,
          minHeight: 280,
          backgroundColor: isDarkMode ? '#202021' : '#ffffff'
        }}>
          <Routes>
            <Route path="/" element={<ProtectedRoute element={<FileManager />} />} />
            <Route path="/approvals" element={<ProtectedRoute element={<PendingApprovals userId={user?.id} />} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Catch-all redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Content>

        {/* Always show footer */}
        <AppFooter />
      </Layout>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;