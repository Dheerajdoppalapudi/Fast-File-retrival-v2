import React, { useContext } from "react";
import { Menu, Layout, Typography, Space, Avatar, Switch, Button, Tooltip } from "antd";
import { 
  FileOutlined, 
  DiffOutlined, 
  LogoutOutlined, 
  AuditOutlined,
  BulbOutlined,
  BulbFilled,
  AppstoreOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ThemeContext } from "../../context/ThemeContext";

const { Header } = Layout;
const { Text } = Typography;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  const selectedKey = location.pathname === "/" ? "file-manager" : location.pathname.slice(1);
  const isDarkMode = theme === 'dark';
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Header 
      style={{ 
        padding: "0", 
        display: "flex", 
        alignItems: "center", 
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)", 
        position: "sticky", 
        top: 0, 
        zIndex: 1,
        backgroundColor: isDarkMode ? '#202021' : '#fff',
        color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
        height: "64px"
      }}
    >
      {/* Logo Section */}
      <div className="logo" style={{ 
        padding: "0 24px", 
        height: "100%", 
        display: "flex", 
        alignItems: "center",
        borderRight: isDarkMode ? "1px solid #313130" : "1px solid #f0f0f0" 
      }}>
        <Typography.Title level={4} style={{ margin: 0, color: "#1890ff" }}>
          DocSystem
        </Typography.Title>
      </div>
      
      {/* Menu Section - Centered */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <Menu 
          mode="horizontal" 
          selectedKeys={[selectedKey]} 
          style={{ 
            borderBottom: "none",
            backgroundColor: 'transparent',
            display: "flex",
            justifyContent: "center"
          }}
          theme={isDarkMode ? 'dark' : 'light'}
        >
          <Menu.Item key="file-manager" icon={<FileOutlined />} onClick={() => navigate("/")}>
            Files
          </Menu.Item>
          {/* <Menu.Item key="compare" icon={<DiffOutlined />} onClick={() => navigate("/compare")}>
            Compare
          </Menu.Item> */}
          <Menu.Item key="approvals" icon={<AuditOutlined />} onClick={() => navigate("/approvals")}>
            Approvals
          </Menu.Item>
          {/* <Menu.Item key="dashboard" icon={<AppstoreOutlined />} onClick={() => navigate("/dashboard")}>
            Dashboard
          </Menu.Item> */}
        </Menu>
      </div>
      
      {/* Right Controls */}
      <div style={{ 
        padding: "0 24px", 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        gap: "16px",
        borderLeft: isDarkMode ? "1px solid #313130" : "1px solid #f0f0f0"
      }}>
        <Switch
          checkedChildren={<BulbFilled />}
          unCheckedChildren={<BulbOutlined />}
          checked={isDarkMode}
          onChange={toggleTheme}
        />
        
        <Space align="center">
          <Avatar 
            style={{ 
              backgroundColor: "#1890ff", 
              display: "flex", 
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {user.username?.charAt(0).toUpperCase() || <UserOutlined />}
          </Avatar>
          
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Text strong style={{ 
              color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
              lineHeight: 1.2,
              fontSize: "14px"
            }}>
              {user.username}
            </Text>
            <Text style={{ 
              color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
              lineHeight: 1.2,
              fontSize: "12px"
            }}>
              {user.role}
            </Text>
          </div>
        </Space>
        
        {/* Minimalist logout button with tooltip */}
        <Tooltip title="Logout">
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            style={{
              color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "40px",
              width: "40px"
            }}
          />
        </Tooltip>
      </div>
    </Header>
  );
};

export default Navbar;