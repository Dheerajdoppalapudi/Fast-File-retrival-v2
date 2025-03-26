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
const { Text } = Typography;

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
  const { logout } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';

  const selectedKey = location.pathname === "/" ? "files" : location.pathname.slice(1);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
      {/* App Logo */}
      <div className="logo" style={{ 
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: isDarkMode ? '1px solid #3f3f3f' : '1px solid #d0d0d0',
        backgroundColor: isDarkMode ? '#2c2c2b' : '#e0e4ea'
      }}>
        <Typography.Title level={4} style={{ 
          margin: 0, 
          color: "#1890ff",
          fontSize: collapsed ? '16px' : '20px'
        }}>
          {collapsed ? "DS" : "DocSystem"}
        </Typography.Title>
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
        items={[
          {
            key: "files",
            icon: <FileOutlined />,
            label: "Files",
            onClick: () => navigate("/")
          },
          {
            key: "compare",
            icon: <DiffOutlined />,
            label: "Compare",
            onClick: () => navigate("/compare")
          },
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
        ]}
      />

      {/* Bottom Controls - Only Logout now */}
      <div className="sidebar-footer" style={{ 
        position: "absolute", 
        bottom: 0, 
        width: "100%",
        padding: "16px 0",
        borderTop: isDarkMode ? '1px solid #3f3f3f' : '1px solid #d0d0d0',
        backgroundColor: isDarkMode ? '#313130' : '#e8ecf0',
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px"
      }}>
        {collapsed ? (
          <Tooltip title="Logout" placement="right">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
              }}
            />
          </Tooltip>
        ) : (
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
            }}
          >
            Logout
          </Button>
        )}
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
            background: isDarkMode ? '#202021' : '#ffffff',
            borderBottom: isDarkMode ? '1px solid #2a2a2b' : '1px solid #e0e0e0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            {/* Left side of header */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '16px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'
                }}
              />

              <span style={{
                marginLeft: "16px",
                color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                fontWeight: 500
              }}>
                <HomeOutlined style={{ marginRight: "8px" }} />
                {location.pathname === "/"
                  ? "Files"
                  : location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2)}
              </span>
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