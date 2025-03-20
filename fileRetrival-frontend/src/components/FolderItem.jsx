import React, { useContext, useState } from "react";
import { Card, Typography, Space, Tooltip, Tag, Dropdown, Avatar } from "antd";
import { 
  FolderOutlined, 
  FolderOpenOutlined, 
  DeleteOutlined, 
  ArrowRightOutlined, 
  ShareAltOutlined, 
  EditOutlined, 
  MoreOutlined 
} from "@ant-design/icons";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import ShareModal from "./ShareModal";

const { Text } = Typography;

const FolderItem = ({ name, onNavigate, onDelete, content, isDarkMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  
  // Use provided isDarkMode prop or get it from context
  const darkMode = isDarkMode !== undefined ? isDarkMode : theme === 'dark';
  
  const isAdmin = user?.role === 'ADMIN';

  // Handle menu item clicks with proper event handling
  const handleMenuClick = (e, action) => {
    e.domEvent.stopPropagation(); // This is important to stop propagation correctly
    
    if (action === 'share') {
      setShareModalVisible(true);
    } else if (action === 'rename') {
      console.log("Rename clicked for:", name);
      // Open rename modal here
    }
  };

  const moreMenuItems = {
    items: [
      {
        key: 'share',
        icon: <ShareAltOutlined />,
        label: 'Share',
        onClick: (e) => handleMenuClick(e, 'share')
      },
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: 'Rename',
        onClick: (e) => handleMenuClick(e, 'rename')
      },
      ...(isAdmin && onDelete ? [{
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        onClick: (e) => {
          e.domEvent.stopPropagation();
          onDelete();
        }
      }] : [])
    ]
  };

  return (
    <>
      <Card
        className="folder-item-card"
        bordered={false}
        style={{
          marginBottom: "10px",
          borderRadius: "4px",
          background: "transparent",
          transition: "all 0.2s ease",
          cursor: "pointer",
          borderBottom: darkMode ? '1px solid #1f1f1f' : '1px solid #f5f5f5',
          boxShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
        }}
        bodyStyle={{ padding: "12px 16px" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onNavigate(name)}
        hoverable
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Avatar 
              icon={isHovered ? <FolderOpenOutlined /> : <FolderOutlined />}
              shape="square" 
              size={32} 
              style={{ 
                backgroundColor: darkMode ? 'rgba(250, 173, 20, 0.1)' : 'rgba(250, 173, 20, 0.08)',
                color: "#faad14",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }} 
            />
            <Text strong style={{ 
              fontSize: "15px", 
              color: darkMode ? 'rgba(255, 255, 255, 0.85)' : '#262626' 
            }}>
              {name}
            </Text>
          </Space>

          <Space onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Open folder">
              <Tag
                color="gold"
                icon={<ArrowRightOutlined />}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 8px",
                  borderRadius: "3px",
                  fontSize: "12px",
                  lineHeight: "1.5"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(name);
                }}
              >
                Open
              </Tag>
            </Tooltip>

            {isAdmin && onDelete && (
              <Tooltip title="Delete folder">
                <Tag
                  color="error"
                  icon={<DeleteOutlined />}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontSize: "12px",
                    lineHeight: "1.2"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  Del
                </Tag>
              </Tooltip>
            )}

            {/* Three dots menu */}
            <Dropdown 
              menu={moreMenuItems} 
              trigger={['click']} 
              placement="bottomRight"
            >
              <Tag
                color="default"
                icon={<MoreOutlined />}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "3px 8px",
                  borderRadius: "3px",
                  fontSize: "12px",
                  lineHeight: "1.5"
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </Space>
        </div>
      </Card>

      {/* ShareModal component */}
      {shareModalVisible && (
        <ShareModal
          visible={shareModalVisible}
          onCancel={() => setShareModalVisible(false)}
          folderName={name}
          path={content?.path || name}
          content={content}
          isDarkMode={darkMode}
        />
      )}
    </>
  );
};

export default FolderItem;