import React, { useEffect, useContext, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Layout, Menu, Typography, Avatar, Divider, Switch, Space, Button, Tooltip } from "antd";
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

const AppSidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';

  const selectedKey = location.pathname === "/" ? "files" : location.pathname.slice(1);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: isDarkMode ? '#202021' : '#fff',
        borderRight: isDarkMode ? '1px solid #313130' : '1px solid #f0f0f0',
        zIndex: 2, // Ensure sidebar is above other content
        paddingBottom: "80px" // Add extra padding at the bottom
      }}
      theme={isDarkMode ? 'dark' : 'light'}
    >
      <div
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "0" : "0 16px",
          borderBottom: isDarkMode ? '1px solid #313130' : '1px solid #f0f0f0',
        }}
      >
        {collapsed ? (
          <Typography.Title level={4} style={{ margin: 0, color: "#1890ff" }}>
            DS
          </Typography.Title>
        ) : (
          <Typography.Title level={4} style={{ margin: 0, color: "#1890ff" }}>
            DocSystem
          </Typography.Title>
        )}
      </div>

      <div
        style={{
          padding: collapsed ? "16px 8px" : "16px",
          textAlign: "center",
          borderBottom: isDarkMode ? '1px solid #313130' : '1px solid #f0f0f0',
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Avatar
          size={collapsed ? "large" : 64}
          style={{
            backgroundColor: "#1890ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {user?.username?.charAt(0).toUpperCase() || <UserOutlined />}
        </Avatar>

        {!collapsed && (
          <>
            <Text
              strong
              style={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                fontSize: "14px",
              }}
            >
              {user?.username}
            </Text>
            <Text
              style={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
                fontSize: "12px",
              }}
            >
              {user?.role}
            </Text>
          </>
        )}
      </div>

      <Menu
        theme={isDarkMode ? 'dark' : 'light'}
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{
          backgroundColor: 'transparent',
          border: 'none'
        }}
      >
        <Menu.Item key="files" icon={<FileOutlined />} onClick={() => navigate("/")}>
          Files
        </Menu.Item>
        <Menu.Item key="compare" icon={<DiffOutlined />} onClick={() => navigate("/compare")}>
          Compare
        </Menu.Item>
        <Menu.Item key="approvals" icon={<AuditOutlined />} onClick={() => navigate("/approvals")}>
          Approvals
        </Menu.Item>
        <Menu.Item key="dashboard" icon={<AppstoreOutlined />} onClick={() => navigate("/dashboard")}>
          Dashboard
        </Menu.Item>
      </Menu>

      <div style={{
        position: "absolute",
        bottom: "32px",
        width: "100%",
        padding: "0 16px 16px 16px"
      }}>
        <Divider style={{ margin: "16px 0", borderColor: isDarkMode ? '#313130' : '#f0f0f0' }} />

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <Switch
            checkedChildren={<BulbFilled />}
            unCheckedChildren={<BulbOutlined />}
            checked={isDarkMode}
            onChange={toggleTheme}
          />
        </div>

        {/* Minimalist logout button that adapts to sidebar collapsed state */}
        {collapsed ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Tooltip title="Logout" placement="right">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 16px",
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'
                }}
              />
            </Tooltip>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center", // Changed from "flex-start" to "center"
                color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
                padding: "4px 16px"
              }}
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </Sider>
  );
};

const AppContent = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';
  const hideNavbar = ["/login", "/register"].includes(location.pathname);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!hideNavbar && user && (
        <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      <Layout style={{
        marginLeft: !hideNavbar && user ? (collapsed ? 80 : 240) : 0,
        transition: 'all 0.2s',
        backgroundColor: isDarkMode ? '#202021' : '#f0f2f5'
      }}>
        {!hideNavbar && user && (
          <Header style={{
            padding: "0 16px",
            background: isDarkMode ? '#202021' : '#fff',
            boxShadow: isDarkMode
              ? "0 1px 0 0 #313130"
              : "0 1px 0 0 #e8e8e8, 0 1px 6px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 1,
            transition: "box-shadow 0.3s ease",
            width: "100%"
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'
              }}
            />

            <Space style={{ marginLeft: "16px" }}>
              <HomeOutlined />
              <span style={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                fontWeight: 500
              }}>
                {location.pathname === "/"
                  ? "Files"
                  : location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2)}
              </span>
            </Space>
          </Header>
        )}

        <Content style={{
          padding: 14,
          minHeight: 280,
          backgroundColor: isDarkMode ? '#202021' : '#fff'
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