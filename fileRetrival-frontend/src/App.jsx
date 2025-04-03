import React, { useEffect, useContext, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
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
      key: "compare",
      icon: <DiffOutlined />,
      label: "Compare",
      onClick: () => navigate("/compare")
    });
  }
  
  // Add remaining menu items
  menuItems.push(
    {
      key: "approvals",
      icon: <AuditOutlined />,
      label: "Approvals",
      onClick: () => navigate("/approvals")
    },
    {
      key: "dashboard",
      icon: <AppstoreOutlined />,
      label: "Dashboard",
      onClick: () => navigate("/dashboard")
    }
  );

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
        backgroundColor: '#092e5d', // Blue background for the logo part
        borderRight: '2px solid #ffffff', // White border beside the logo
        padding: collapsed ? "10px" : "8px"
      }}>
        <img 
          src="src/media/company_logo.png" 
          alt="Company Logo" 
          style={{
            height: collapsed ? "40px" : "48px",
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

const AppContent = () => {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';
  const hideNavbar = ["/login", "/register"].includes(location.pathname);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Format the current path
  const currentPath = location.pathname === "/"
    ? "Files"
    : location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!hideNavbar && user && (
        <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      <Layout style={{
        marginLeft: !hideNavbar && user ? (collapsed ? 80 : 220) : 0,
        transition: 'all 0.2s',
        backgroundColor: isDarkMode ? '#161617' : '#f0f2f5'
      }}>
        {!hideNavbar && user && (
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
              {/* Removed the toggle button from here since it's now in the sidebar */}
              
              <div style={{
                marginLeft: "8px",
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 500,
                display: "flex",
                alignItems: "center"
              }}>
                {/* DocHub Name with simpler styling */}
                <span style={{ 
                  margin: 0, 
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "18px"
                }}>
                  DocHub
                </span>
                
                <span style={{ margin: "0 12px", opacity: 0.6 }}>|</span>
                <HomeOutlined style={{ marginRight: "8px" }} />
                {currentPath}
              </div>
            </div>

            {/* Right side of header - User Profile & Dark Mode Toggle */}
            <Space size={16}>
              <Switch
                checkedChildren={<BulbFilled />}
                unCheckedChildren={<BulbOutlined />}
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              
              {/* New UserProfile Component */}
              <UserProfile 
                user={user} 
                isDarkMode={isDarkMode} 
                handleLogout={handleLogout} 
              />
            </Space>
          </Header>
        )}

        <Content style={{
          padding: 16,
          minHeight: 280,
          backgroundColor: isDarkMode ? '#202021' : '#ffffff'
        }}>
          <Routes>
            <Route path="/" element={<FileManager />} />
            {/* <Route path="/compare" element={<FileComparison />} /> */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/approvals" element={<PendingApprovals userId={user?.id} />} />
          </Routes>
        </Content>

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