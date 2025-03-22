import React, { useState, useContext } from "react";
import { Layout, Menu, Typography, Avatar, Tooltip, Divider, Button } from "antd";
import {
  FileOutlined,
  DiffOutlined,
  LogoutOutlined,
  AuditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const { Sider } = Layout;
const { Title, Text } = Typography;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);

  const selectedKey = location.pathname === "/" ? "file-manager" : location.pathname.slice(1);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={toggleCollapsed}
      trigger={null}
      style={{
        backgroundColor: "#001529",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 2,
        boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
      }}
      width={230}
      collapsedWidth={80}
    >
      <div style={{ padding: "16px", textAlign: "center" }}>
        <Title level={4} style={{ color: "#fff", margin: "16px 0" }}>
          {!collapsed ? "DocSystem POC" : "DS"}
        </Title>
        <div 
          className="trigger" 
          onClick={toggleCollapsed} 
          style={{ 
            color: "#fff", 
            fontSize: "16px", 
            cursor: "pointer",
            marginBottom: "24px" 
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      </div>

      <div 
        style={{ 
          padding: collapsed ? "12px 0" : "12px 24px", 
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          marginBottom: "24px"
        }}
      >
        <Avatar 
          size={collapsed ? 40 : 64} 
          icon={<UserOutlined />} 
          style={{ 
            backgroundColor: "#1890ff",
            marginBottom: collapsed ? "8px" : "12px" 
          }} 
        />
        {!collapsed && (
          <div>
            <Text style={{ color: "#fff", display: "block", fontWeight: "500" }}>
              {user?.username}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>
              {user?.role}
            </Text>
          </div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{ border: "none" }}
      >
        <Menu.Item key="file-manager" icon={<FileOutlined />} onClick={() => navigate("/")}>
          Files
        </Menu.Item>
        <Menu.Item key="compare" icon={<DiffOutlined />} onClick={() => navigate("/compare")}>
          Compare
        </Menu.Item>
        <Menu.Item key="approvals" icon={<AuditOutlined />} onClick={() => navigate("/approvals")}>
          Approvals
        </Menu.Item>
      </Menu>

      <div 
        style={{ 
          position: "absolute", 
          bottom: "20px", 
          width: "100%", 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          padding: '0 16px'
        }}
      >
        <Divider style={{ borderColor: "rgba(255,255,255,0.1)", width: '80%', margin: "16px 0 24px" }} />
        <Button
          type="primary"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{
            width: collapsed ? '50px' : '80%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(255, 77, 79, 0.2)',
          }}
        >
          {!collapsed && "Logout"}
        </Button>
      </div>
    </Sider>
  );
};

export default Sidebar;