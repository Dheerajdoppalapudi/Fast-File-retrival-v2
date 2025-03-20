import React from "react";
import { Typography, Space, Row, Col } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import BreadcrumbNav from "./BreadcrumbNav";

const { Title } = Typography;

const FileManagerHeader = ({ currentPath, setCurrentPath, isDarkMode }) => {
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 10,
      backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
      padding: '0 0 12px 0',
      marginBottom: '16px',
      borderBottom: isDarkMode ? '1px solid #333' : '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
      }}>
        <HomeOutlined style={{ 
          fontSize: '18px', 
          marginRight: '10px',
          color: '#1890ff'
        }} />
        <Title level={4} style={{ 
          margin: 0, 
          fontSize: '16px',
          fontWeight: 600,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' 
        }}>
          File Manager
        </Title>
      </div>
      
      {/* Breadcrumb Navigation */}
      <Row>
        <Col xs={24}>
          <BreadcrumbNav
            currentPath={currentPath}
            onNavigate={(index) => setCurrentPath(currentPath.slice(0, index))}
            isDarkMode={isDarkMode}
          />
        </Col>
      </Row>
    </div>
  );
};

export default FileManagerHeader;