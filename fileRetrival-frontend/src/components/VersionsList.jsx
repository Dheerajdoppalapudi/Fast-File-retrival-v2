import React, { useState, useContext } from "react";
import { Typography, Badge, Space, Divider, Button, message } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import CompareModal from "./CompareModal";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import axios from "axios";

const { Text } = Typography;

const VersionsList = ({ versions, onVersionClick, contentData, openFileContent, isDarkMode }) => {
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  
  // Use provided isDarkMode prop or get it from context
  const darkMode = isDarkMode !== undefined ? isDarkMode : theme === 'dark';

  const handleCompare = async (clickedVersion) => {
    try {
      // Get current file data from contentData
      const currentPath = contentData?.path;
      const fileName = getFileName(clickedVersion);
      const fileId = contentData?.id || clickedVersion.fileId;
      
      if (!currentPath) {
        message.error("Current file path not found");
        return;
      }

      // Get all versions for the file
      let allVersions = versions;
      
      // If versions aren't provided fully, you might need to fetch them
      if (!allVersions || allVersions.length === 0) {
        // You could fetch versions here if needed
        message.info("No versions available to compare");
        return;
      }

      // Map all versions to the expected format for the modal
      const formattedVersions = allVersions.map(v => ({
        id: v.id,
        path: v.path || v.filePath,
        versionNumber: v.version || v.versionNumber,
        createdAt: v.createdAt,
        approverName: v.approvedBy,
        approvedAt: v.approvedAt
      }));

      // Find the clicked version in the formatted versions
      const selectedVersion = formattedVersions.find(v => v.id === clickedVersion.id);
      if (!selectedVersion) {
        message.error("Selected version not found");
        return;
      }

      // Prepare data for the CompareModal
      const compareModalData = {
        fileName: fileName,
        fileId: fileId,
        currentPath: currentPath,
        latestVersionPath: selectedVersion.path, // Use the selected version path as the latest
        versionNumber: selectedVersion.versionNumber,
        selectedVersion: selectedVersion, // Pass the selected version
        allVersions: formattedVersions,
        approvalStatus: contentData?.approvalStatus || "PENDING"
      };
      
      setCompareData(compareModalData);
      setCompareModalVisible(true);
    } catch (error) {
      console.error("Error preparing compare data:", error);
      message.error("Failed to prepare comparison");
    }
  };

  // Handle file approval if user has admin rights
  const handleApproveFile = async (fileId) => {
    try {
      if (!fileId) {
        message.error("File ID not found");
        return;
      }

      await axios.post(
        `http://localhost:8000/files/approve/${fileId}`,
        {},
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      message.success("File approved successfully");
      setCompareModalVisible(false);
      
      // Refresh data if needed
      // You might want to call a refresh function here provided by the parent component
    } catch (error) {
      console.error("Error approving file:", error);
      message.error("Failed to approve file");
    }
  };

  // Extract the filename from the parent contentData or from the path
  const getFileName = (version) => {
    // First try to get the filename from contentData
    if (contentData && contentData.name) {
      return contentData.name;
    }
    
    // If contentData.name is not available, try to extract from path
    if (version.path || version.filePath) {
      const path = version.path || version.filePath;
      const pathParts = path.split('/');
      return pathParts[pathParts.length - 1];
    }
    
    // Fallback to a generic name
    return "version_file";
  };

  return (
    <div style={{
      paddingLeft: 38,
      width: "100%",
      background: darkMode ? '#202021' : "#f9f9f9",
      borderRadius: "4px",
      padding: "8px",
      marginTop: "12px"
    }}>
      <Text 
        type="secondary" 
        style={{ 
          display: "block", 
          marginBottom: "8px", 
          fontSize: "13px",
          color: darkMode ? 'rgba(255, 255, 255, 0.45)' : undefined
        }}
      >
        Version History
      </Text>
      <Divider style={{ 
        margin: "8px 0",
        borderColor: darkMode ? '#414140' : '#e8e8e8' 
      }} />
      
      {versions.map((version, index) => (
        <div
          key={version.id}
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            padding: "8px 0",
            borderBottom: index !== versions.length - 1 
              ? darkMode
                ? "1px dashed #414140"
                : "1px dashed #e8e8e8" 
              : "none",
            transition: "background 0.2s",
            borderRadius: "4px",
            paddingLeft: "4px",
          }}
          className="version-item"
          onClick={(e) => {
            e.stopPropagation();
            onVersionClick(version);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkMode ? '#313130' : '#f0f5ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Badge
            status={index === 0 ? "processing" : "default"}
            style={{ marginRight: 8 }}
          />
          <ArrowRightOutlined style={{ color: "#1890ff", marginRight: 8 }} />
          <Space size="large" style={{ flex: 1 }}>
            <Text 
              strong={index === 0}
              style={{ color: darkMode ? 'rgba(255, 255, 255, 0.85)' : undefined }}
            >
              Version {version.version}
            </Text>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: "13px",
                color: darkMode ? 'rgba(255, 255, 255, 0.45)' : undefined
              }}
            >
              Modified: {new Date(version.createdAt).toLocaleString()}
            </Text>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: "13px",
                color: darkMode ? 'rgba(255, 255, 255, 0.45)' : undefined
              }}
            >
              Created By: {version.createdBy}
            </Text>
          </Space>
          <Space>
            <Button
              size="small"
              style={{
                backgroundColor: darkMode ? '#2b2b2b' : undefined,
                borderColor: darkMode ? '#414140' : undefined,
                color: darkMode ? 'rgba(255, 255, 255, 0.85)' : undefined
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Use the path property that actually exists on the version object
                const path = version.path || version.filePath;
                if (path) {
                  // Get filename to display
                  const fileName = getFileName(version);
                  // Pass the filename and path to the openFileContent function
                  openFileContent(fileName, path);
                } else {
                  message.error("File path not found for this version");
                }
              }}
            >
              View
            </Button>
            <Button
              size="small"
              style={{
                backgroundColor: darkMode ? '#2b2b2b' : undefined,
                borderColor: darkMode ? '#414140' : undefined,
                color: darkMode ? 'rgba(255, 255, 255, 0.85)' : undefined
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCompare(version);
              }}
            >
              Compare
            </Button>
          </Space>
        </div>
      ))}
      
      {/* Updated CompareModal with onApprove prop */}
      <CompareModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
        compareData={compareData}
        user={user}
        onApprove={handleApproveFile}
      />
    </div>
  );
};

export default VersionsList;