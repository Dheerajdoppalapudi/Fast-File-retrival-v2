import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { Button, Input, Modal, Tag, message, Card, Space, Typography, Spin, Empty, Divider, Row, Col, Tooltip, Badge, Upload } from "antd";
import {
  FolderAddOutlined,
  UploadOutlined,
  FolderOutlined,
  HomeOutlined,
  LockOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import BreadcrumbNav from "../components/BreadcrumbNav";
import SearchBar from "../components/SearchBar";
import FileList from "../components/FileList";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Helper functions
const handleCreateFolder = async (folderName, currentPath, fetchFiles, setIsFolderModalVisible, setFolderName, user) => {
  if (!folderName.trim()) return;
  const fullPath = currentPath.length > 0 ? `${currentPath.join("/")}/${folderName}` : folderName;
  try {
    await axios.post("http://localhost:8000/files/create-directory", 
      { folderPath: fullPath }, 
      { headers: { Authorization: `Bearer ${user.token}` }}
    );
    fetchFiles();
    message.success(`Folder "${folderName}" created successfully`);
    setIsFolderModalVisible(false);
    setFolderName('');
  } catch (error) {
    console.error("Error creating folder:", error);
    message.error(error.response?.data?.message || "Failed to create folder. Please try again.");
  }
};

const handleUpload = async (user, selectedFile, currentPath, description, fetchFiles, setUploading, setFileUploadModalVisible) => {
  if (!selectedFile) return;
  if (!description.trim()) {
    message.error("Description is required");
    return;
  }

  setUploading(true);
  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("folderPath", currentPath.join("/"));
  formData.append("description", description); // Add description to the form data

  try {
    await axios.post("http://localhost:8000/files/upload", 
      formData, 
      { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${user.token}` }}
    );
    fetchFiles();
    message.success("File uploaded successfully");
    setFileUploadModalVisible(false);
  } catch (error) {
    console.error("Error uploading file:", error);
    message.error(error.response?.data?.message || "Failed to upload file. Please try again.");
  } finally {
    setUploading(false);
  }
};

// Sub-components
// Enhanced DirectoryInfo component
const DirectoryInfo = ({ directory, isDarkMode }) => {
  if (!directory) return null;
  
  return (
    <div style={{ 
      marginBottom: 16, 
      padding: '10px 14px', 
      borderLeft: '3px solid #1890ff', 
      background: isDarkMode ? 'rgba(24, 144, 255, 0.03)' : '#f5f7fa', 
      borderRadius: '4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FolderOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
        <Text strong style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' }}>
          {directory.name || 'Root Directory'}
        </Text>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          {directory.isOwner && (
            <Tooltip title="You are the owner of this folder">
              <Tag color="gold" style={{ margin: 0, fontSize: '11px' }}>Owner</Tag>
            </Tooltip>
          )}
          
          {directory.permissionType && (
            <Tooltip title={directory.permissionType === "WRITE" ? "You can modify content in this folder" : "You can view but not modify content"}>
              <Tag 
                color={directory.permissionType === "WRITE" ? "success" : "processing"} 
                style={{ margin: 0, fontSize: '11px' }}
              >
                {directory.permissionType === "WRITE" ? "Write" : "Read"}
              </Tag>
            </Tooltip>
          )}
        </div>
      </div>
      
      {directory.createdBy && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tooltip title="Creator">
            <Text type="secondary" style={{ 
              fontSize: '12px',
              color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <UserOutlined /> {directory.createdBy.username}
            </Text>
          </Tooltip>
          
          {directory.createdAt && (
            <Tooltip title="Creation date">
              <Text type="secondary" style={{ 
                fontSize: '12px',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ClockCircleOutlined /> {new Date(directory.createdAt).toLocaleDateString()}
              </Text>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
};

const FileManagerControls = ({ currentPath, searchQuery, setSearchQuery, setCurrentPath, isDarkMode, fetchFiles }) => (
  <div style={{ marginBottom: '16px' }}>
    <Row gutter={16} align="middle" style={{ marginBottom: '12px' }}>
      <Col flex="auto">
        <BreadcrumbNav
          currentPath={currentPath}
          onNavigate={(index) => setCurrentPath(currentPath.slice(0, index))}
          isDarkMode={isDarkMode}
        />
      </Col>
      <Col>
        <Tooltip title="Refresh">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchFiles}
            size="middle"
            style={{ borderRadius: '2px' }}
          />
        </Tooltip>
      </Col>
    </Row>
    <Row>
      <Col xs={24}>
        <SearchBar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          style={{ width: '100%' }}
          isDarkMode={isDarkMode}
        />
      </Col>
    </Row>
  </div>
);

const FileManagerActions = ({
  setIsFolderModalVisible,
  setFileUploadModalVisible,
  canUpload,
  isDarkMode
}) => {
  const actionTitle = !canUpload ? "You need write permission to upload files" : "";

  return (
    <div className="file-manager-actions" style={{ 
      marginBottom: "16px",
      padding: "0",
    }}>
      <Row gutter={16} justify="space-between" align="middle">
        <Col>
          <Tooltip title={!canUpload ? "You need write permission to create folders" : ""}>
            <Button
              type="primary"
              icon={<FolderAddOutlined />}
              onClick={() => setIsFolderModalVisible(true)}
              disabled={!canUpload}
              style={{ borderRadius: '2px' }}
            >
              Create Folder
            </Button>
          </Tooltip>
        </Col>

        <Col>
          <Tooltip title={actionTitle}>
            <Button
              // type="primary"
              icon={<UploadOutlined />}
              onClick={() => setFileUploadModalVisible(true)}
              disabled={!canUpload}
              style={{ borderRadius: '2px' }}
            >
              Upload File
            </Button>
          </Tooltip>
        </Col>
      </Row>
    </div>
  );
};

const FolderCreationModal = ({ visible, setVisible, folderName, setFolderName, handleCreate, canCreate, isDarkMode }) => (
  <Modal
    title={
      <Space style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' }}>
        <FolderAddOutlined />
        Create New Folder
      </Space>
    }
    open={visible}
    onOk={handleCreate}
    onCancel={() => {
      setVisible(false);
      setFolderName('');
    }}
    okButtonProps={{
      disabled: !folderName.trim() || !canCreate,
      style: { borderRadius: '2px' }
    }}
    cancelButtonProps={{ style: { borderRadius: '2px' } }}
  >
    {canCreate ? (
      <Input
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
        placeholder="Enter folder name"
        prefix={<FolderOutlined style={{ color: isDarkMode ? '#a0a0a0' : '#bfbfbf' }} />}
        autoFocus
        onPressEnter={() => folderName.trim() && handleCreate()}
        style={{ backgroundColor: isDarkMode ? '#202021' : '#fff' }}
      />
    ) : (
      <Typography.Text type="danger">
        You don't have permission to create folders in this directory.
      </Typography.Text>
    )}
  </Modal>
);

// New file upload modal component
const FileUploadModal = ({ 
  visible, 
  setVisible, 
  handleUpload, 
  canUpload, 
  isDarkMode,
  uploading
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setSelectedFile(null);
    setDescription("");
  };

  const onCancel = () => {
    resetForm();
    setVisible(false);
  };

  const onSubmit = () => {
    if (selectedFile && description.trim()) {
      handleUpload(selectedFile, description);
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      setSelectedFile(file);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
    },
    fileList: selectedFile ? [selectedFile] : []
  };

  return (
    <Modal
      title={
        <Space style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' }}>
          <UploadOutlined />
          Upload File
        </Space>
      }
      open={visible}
      onOk={onSubmit}
      onCancel={onCancel}
      okButtonProps={{
        disabled: !selectedFile || !description.trim() || !canUpload,
        loading: uploading,
        style: { borderRadius: '2px' }
      }}
      cancelButtonProps={{ style: { borderRadius: '2px' } }}
      destroyOnClose={true}
    >
      {canUpload ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Upload.Dragger
              {...uploadProps}
              style={{ 
                backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
                borderColor: isDarkMode ? '#333' : '#d9d9d9'
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: isDarkMode ? '#1890ff' : '#40a9ff' }} />
              </p>
              <p className="ant-upload-text" style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' }}>
                Click or drag file to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)' }}>
                Support for a single file upload.
              </p>
            </Upload.Dragger>
          </div>
          
          <div>
            <div style={{ marginBottom: '8px' }}>
              <Text strong style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' }}>
                File Description <span style={{ color: '#ff4d4f' }}>*</span>
              </Text>
            </div>
            <TextArea
              placeholder="Enter a description for this file (required)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ 
                backgroundColor: isDarkMode ? '#202021' : '#fff',
                borderColor: isDarkMode ? '#333' : '#d9d9d9',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'
              }}
            />
            {!description.trim() && selectedFile && (
              <Text type="danger" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                Description is required
              </Text>
            )}
          </div>
        </div>
      ) : (
        <Typography.Text type="danger">
          You don't have permission to upload files in this directory.
        </Typography.Text>
      )}
    </Modal>
  );
};

// Main component
const FileManager = () => {
  const [files, setFiles] = useState({});
  const [currentPath, setCurrentPath] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState("");
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [isFileUploadModalVisible, setFileUploadModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentDirectoryInfo, setCurrentDirectoryInfo] = useState(null);
  const [userAccess, setUserAccess] = useState({
    isAdmin: false,
    hasWritePermission: false
  });
  const [filteredFiles, setFilteredFiles] = useState({});

  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';

  const buildFolderStructure = ({ directories, files }) => {
    const structure = {};

    // Process directories
    if (Array.isArray(directories)) {
      directories.forEach((folder) => {
        structure[folder.name] = {
          isFolder: true,
          directoryId: folder.id,
          path: folder.path,
          createdAt: folder.createdAt,
          createdBy: folder.createdBy,
          permissions: folder.permissions || [],
          permissionType: folder.permissionType,
          isOwner: folder.isOwner
        };
      });
    }

    // Process files
    if (Array.isArray(files)) {
      files.forEach((file) => {
        structure[file.name] = {
          isFolder: false,
          versions: file.versions || [],
          path: file.path,
          description: file.description, // Include description field
          createdAt: file.createdDate || file.createdAt,
          approvedBy: file.approvedBy,
          approvedAt: file.approvedAt,
          approvalStatus: file.approvalStatus,
          uploadedBy: file.uploadedBy,
          fileId: file.id,
          permissions: file.permissions || [],
          permissionType: file.permissionType,
          isOwner: file.isOwner,
          canEdit: file.canEdit
        };
      });
    }

    return structure;
  };

  const fetchFiles = useCallback(async () => {
    if (!user) return; // Ensure user is loaded before fetching files

    setLoading(true);
    try {
      const folderPath = currentPath.length > 0 ? currentPath.join("/") : "";
      const response = await axios.get("http://localhost:8000/files", {
        params: { path: folderPath },
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (response.data) {
        // Store current directory information
        setCurrentDirectoryInfo(response.data.currentDirectory || null);

        // Set user access permissions
        const access = response.data.userAccess || {};
        const directoryPermission = response.data.currentDirectory?.permissionType || null;

        setUserAccess({
          isAdmin: access.isAdmin || user?.role === "ADMIN",
          hasWritePermission:
            access.isAdmin ||
            user?.role === "ADMIN" ||
            user?.role === "EDITOR" ||
            directoryPermission === "WRITE" ||
            response.data.currentDirectory?.isOwner ||
            (access.hasParentPermission === true && response.data.currentDirectory?.permissionType === "WRITE")
        });

        // Build file structure
        const fileStructure = buildFolderStructure(response.data);
        setFiles(fileStructure);
        
        // Reset search when changing directories
        if (searchQuery) {
          filterFiles(fileStructure, searchQuery);
        } else {
          setFilteredFiles(fileStructure);
        }
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      message.error("Failed to load files. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentPath, user, searchQuery]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Function to filter files based on search query
  const filterFiles = useCallback((filesObj, query) => {
    if (!query.trim()) {
      setFilteredFiles(filesObj);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = {};

    Object.entries(filesObj).forEach(([name, data]) => {
      if (name.toLowerCase().includes(lowerQuery) || 
          (data.description && data.description.toLowerCase().includes(lowerQuery))) {
        filtered[name] = data;
      }
    });

    setFilteredFiles(filtered);
  }, []);

  // Update filtered files when search query changes
  useEffect(() => {
    filterFiles(files, searchQuery);
  }, [searchQuery, files, filterFiles]);

  // Handler for search query changes
  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  // Function to handle file upload from the modal
  const handleFileUpload = (file, description) => {
    handleUpload(
      user,
      file,
      currentPath,
      description,
      fetchFiles,
      setUploading,
      setFileUploadModalVisible
    );
  };

  // Check if user has upload permissions
  const canUpload = userAccess.isAdmin || user?.role === "EDITOR" || userAccess.hasWritePermission;

  return (
    <Card 
      className="file-manager" 
      bordered={true}
      style={{ 
        borderRadius: '4px', 
        boxShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.06)',
        backgroundColor: isDarkMode ? '#1f1f1f' : '#fff'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      {/* Improved Header with border and better spacing */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        padding: '0 0 4px 0',
        borderBottom: isDarkMode ? '1px solid #333' : '1px solid #f0f0f0'
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

      <FileManagerControls
        currentPath={currentPath}
        setSearchQuery={handleSearchChange}
        searchQuery={searchQuery}
        setCurrentPath={setCurrentPath}
        isDarkMode={isDarkMode}
        fetchFiles={fetchFiles}
      />

      {currentDirectoryInfo && (
        <DirectoryInfo
          directory={currentDirectoryInfo}
          isDarkMode={isDarkMode}
        />
      )}

      <Divider style={{ 
        margin: '14px 0', 
        borderColor: isDarkMode ? '#333333' : '#f0f0f0',
        opacity: 0.6
      }} />

      <FileManagerActions
        setIsFolderModalVisible={setIsFolderModalVisible}
        setFileUploadModalVisible={setFileUploadModalVisible}
        canUpload={canUpload}
        isDarkMode={isDarkMode}
      />

      <div style={{ 
        marginTop: 0, 
        minHeight: 300,
        backgroundColor: isDarkMode ? '' : '',
        borderRadius: '2px',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Spin size="large" tip="Loading files..." />
          </div>
        ) : Object.keys(filteredFiles).length > 0 ? (
          <FileList
            files={Object.entries(filteredFiles)}
            onNavigate={(folder) => setCurrentPath([...currentPath, folder])}
            currentPath={currentPath}
            isDarkMode={isDarkMode}
          />
        ) : (
          <Empty
            description={
              searchQuery ? (
                <Text style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)' }}>
                  No files found matching "{searchQuery}"
                </Text>
              ) : (
                <Text style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)' }}>
                  No files found in this directory
                </Text>
              )
            }
            style={{ marginTop: 40 }}
          />
        )}
      </div>

      {/* Folder Creation Modal */}
      <FolderCreationModal
        visible={isFolderModalVisible}
        setVisible={setIsFolderModalVisible}
        folderName={folderName}
        setFolderName={setFolderName}
        handleCreate={() => handleCreateFolder(folderName, currentPath, fetchFiles, setIsFolderModalVisible, setFolderName, user)}
        canCreate={canUpload}
        isDarkMode={isDarkMode}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        visible={isFileUploadModalVisible}
        setVisible={setFileUploadModalVisible}
        handleUpload={handleFileUpload}
        canUpload={canUpload}
        isDarkMode={isDarkMode}
        uploading={uploading}
      />
    </Card>
  );
};

export default FileManager;