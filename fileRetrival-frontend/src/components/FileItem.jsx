import React, { useContext, useState } from "react";
import { List, Typography, Space, Tag, Tooltip, Row, Col, Dropdown, Avatar } from "antd";
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileMarkdownOutlined,
  FileUnknownOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  CodeOutlined,
  HistoryOutlined,
  DeleteOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ShareAltOutlined,
  EditOutlined
} from "@ant-design/icons";
import VersionsList from "./VersionsList";
import CompareModal from "./CompareModal";
import ShareModal from "./ShareModal";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";

const { Text } = Typography;

// Helper function to get appropriate icon for file extension
const getFileIcon = (fileName) => {
  if (!fileName) return <FileUnknownOutlined />;
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: "#ff4d4f" }} />;
    case 'doc':
    case 'docx':
      return <FileWordOutlined style={{ color: "#2f54eb" }} />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileExcelOutlined style={{ color: "#52c41a" }} />;
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined style={{ color: "#fa8c16" }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImageOutlined style={{ color: "#13c2c2" }} />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <FileZipOutlined style={{ color: "#722ed1" }} />;
    case 'md':
      return <FileMarkdownOutlined style={{ color: "#1890ff" }} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return <AudioOutlined style={{ color: "#eb2f96" }} />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
    case 'webm':
      return <VideoCameraOutlined style={{ color: "#f5222d" }} />;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'py':
    case 'java':
    case 'php':
    case 'rb':
    case 'go':
    case 'json':
    case 'xml':
      return <CodeOutlined style={{ color: "#faad14" }} />;
    case 'txt':
    default:
      return <FileTextOutlined style={{ color: "#1890ff" }} />;
  }
};

const FileItem = ({
  name,
  content,
  isExpanded,
  toggleVersions,
  openFileContent,
  onVersionClick,
  onDelete,
  isDarkMode
}) => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  
  // Use provided isDarkMode prop or get it from context
  const darkMode = isDarkMode !== undefined ? isDarkMode : theme === 'dark';
  
  const isAdmin = user?.role === 'ADMIN';
  const hasVersions = content?.versions && content.versions.length > 0;
  const [showDetails, setShowDetails] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Determine if file should be displayed based on approval status
  const isApproved = content?.approvalStatus === "APPROVED";
  const shouldDisplay = isAdmin || isApproved;

  // If file shouldn't be displayed, return null (don't render anything)
  if (!shouldDisplay) {
    return null;
  }

  const toggleDetails = (e) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusTag = () => {
    const status = content?.approvalStatus;

    if (status === "APPROVED") {
      return (
        <Tag color="success" style={{ fontSize: '11px', padding: '0 6px', marginLeft: '4px' }}>
          <CheckCircleOutlined style={{ fontSize: '10px', marginRight: '4px' }} />
          Approved
        </Tag>
      );
    } else if (status === "REJECTED") {
      return <Tag color="error" style={{ fontSize: '11px', padding: '0 6px', marginLeft: '4px' }}>Rejected</Tag>;
    } else if (status === "PENDING") {
      return <Tag color="warning" style={{ fontSize: '11px', padding: '0 6px', marginLeft: '4px' }}>Pending</Tag>;
    }
    return null;
  };

  // Dropdown menu items for the three dots
  const moreMenuItems = {
    items: [
      {
        key: 'share',
        icon: <ShareAltOutlined />,
        label: 'Share',
        onClick: () => {
          setShareModalVisible(true);
        }
      },
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: 'Rename',
        onClick: () => {
          console.log("Rename clicked for:", name);
          // Open rename modal here
        }
      },
      ...(isAdmin ? [{
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        onClick: () => {
          onDelete();
        }
      }] : [])
    ]
  };

  const fileIcon = getFileIcon(name);

  return (
    <>
      <List.Item
        style={{
          padding: "10px 14px",
          transition: "all 0.2s ease",
          cursor: "pointer",
          borderRadius: "4px",
          background: "transparent",
          flexDirection: "column",
          alignItems: "flex-start",
          marginBottom: "8px",
          borderBottom: darkMode ? '1px solid #1f1f1f' : '1px solid #f5f5f5',
          boxShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
        }}
        className="file-item"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(24, 144, 255, 0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (content.path) {
            openFileContent(name, content.path);
          }
        }}
      >
        {/* File Row */}
        <Space size="middle" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Space align="center">
            <Avatar 
              icon={fileIcon}
              shape="square" 
              size={32} 
              style={{ 
                backgroundColor: darkMode ? 'rgba(24, 144, 255, 0.1)' : 'rgba(24, 144, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }} 
            />
            <Text
              strong
              style={{
                fontSize: "15px",
                color: darkMode ? 'rgba(255, 255, 255, 0.85)' : '#333'
              }}
            >
              {name}
            </Text>
            {/* Show status tag for admins */}
            {isAdmin && getStatusTag()}
          </Space>

          <Space>
            {/* Tag for Number of Versions */}
            {hasVersions && (
              <Tooltip title={isExpanded ? "Hide versions" : "Show versions"}>
                <Tag
                  color="blue"
                  icon={<HistoryOutlined />}
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
                    toggleVersions(name);
                  }}
                >
                  {content.versions.length} {content.versions.length === 1 ? "Version" : "Versions"}
                </Tag>
              </Tooltip>
            )}

            {/* Info Tag for File Details */}
            <Tooltip title={showDetails ? "Hide details" : "Show details"}>
              <Tag
                color="green"
                icon={<InfoCircleOutlined />}
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
                  toggleDetails(e);
                }}
              >
                Details
              </Tag>
            </Tooltip>

            {/* Delete Button for Admins */}
            {isAdmin && (
              <Tooltip title="Delete file">
                <Tag
                  color="red"
                  icon={<DeleteOutlined />}
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
                    onDelete();
                  }}
                >
                  Del
                </Tag>
              </Tooltip>
            )}

            {/* Three dots menu */}
            <Dropdown menu={moreMenuItems} trigger={['click']} placement="bottomRight">
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
        </Space>

        {/* File Details Section */}
        {showDetails && (
          <div style={{
            width: "100%",
            padding: "12px 8px",
            marginTop: "12px",
            background: darkMode ? '#202021' : "#f9f9f9",
            borderRadius: "3px",
            border: `1px dashed ${darkMode ? '#414140' : '#d9d9d9'}`
          }}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={8}>
                <Space size={4}>
                  <ClockCircleOutlined style={{ color: "#1890ff", fontSize: "14px" }} />
                  <Text type="secondary" style={{ 
                    color: darkMode ? 'rgba(255, 255, 255, 0.45)' : undefined,
                    fontSize: "13px" 
                  }}>
                    Created:
                  </Text>
                  <Text style={{ 
                    color: darkMode ? 'rgba(255, 255, 255, 0.85)' : undefined,
                    fontSize: "13px" 
                  }}>
                    {formatDate(content.createdAt)}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space size={4}>
                  <UserOutlined style={{ color: "#52c41a", fontSize: "14px" }} />
                  <Text type="secondary" style={{ 
                    color: darkMode ? 'rgba(255, 255, 255, 0.45)' : undefined,
                    fontSize: "13px" 
                  }}>
                    Approved By:
                  </Text>
                  <Text style={{ 
                    color: darkMode ? 'rgba(255, 255, 255, 0.85)' : undefined,
                    fontSize: "13px" 
                  }}>
                    {content.approvedBy ? content.approvedBy.username : "—"}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space size={4}>
                  <CheckCircleOutlined style={{ color: "#52c41a", fontSize: "14px" }} />
                  <Text type="secondary" style={{ 
                    color: darkMode ? 'rgba(255, 255, 255, 0.45)' : undefined,
                    fontSize: "13px" 
                  }}>
                    Approved At:
                  </Text>
                  <Text style={{ 
                    color: darkMode ? 'rgba(255, 255, 255, 0.85)' : undefined,
                    fontSize: "13px" 
                  }}>
                    {formatDate(content.approvedAt)}
                  </Text>
                </Space>
              </Col>
            </Row>
          </div>
        )}

        {/* Versions List */}
        {isExpanded && hasVersions && (
          <div style={{ width: "100%", marginTop: "12px" }}>
            <VersionsList 
              versions={content.versions} 
              onVersionClick={onVersionClick} 
              contentData={content} 
              openFileContent={openFileContent}
              isDarkMode={darkMode}
            />
          </div>
        )}
      </List.Item>

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        folderName={name}
        path={content?.path || name}
        content={content}
        isDarkMode={darkMode}
      />
    </>
  );
};

export default FileItem;