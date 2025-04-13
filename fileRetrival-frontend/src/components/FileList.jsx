import React, { useState, useContext, useEffect } from "react";
import { List, Typography, message, Empty } from "antd";
import axios from "axios";
import FolderItem from "./FolderItem";
import FileItem from "./FileItem";
import FileContentModal from "./FileContentModal";
import FileListFilters from "./FileListFilters";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";

const { Text } = Typography;

const FileList = ({ files, onNavigate, onVersionClick, onFileDeleted, isDarkMode }) => {
  const [expandedFiles, setExpandedFiles] = useState({});
  const [fileContentModalVisible, setFileContentModalVisible] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileContentType, setFileContentType] = useState("text/plain");
  const [loading, setLoading] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState({ path: '', isFolder: false });
  const { theme } = useContext(ThemeContext);

  // Sorting and filtering states
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showType, setShowType] = useState("all"); // all, folders, files

  // Use provided isDarkMode prop or get it from context
  const darkMode = isDarkMode !== undefined ? isDarkMode : theme === 'dark';

  // Process files with sorting and filtering
  const processedFiles = React.useMemo(() => {
    if (!files || !files.length) return [];

    // First filter the files
    let filteredFiles = [...files];

    // Filter by type (folder or file)
    if (showType === "folders") {
      filteredFiles = filteredFiles.filter(([_, content]) => !content?.versions);
    } else if (showType === "files") {
      filteredFiles = filteredFiles.filter(([_, content]) => content?.versions);
    }

    // Sort the files
    return filteredFiles.sort((a, b) => {
      const [nameA, contentA] = a;
      const [nameB, contentB] = b;

      // Determine if items are folders
      const isAFolder = !contentA?.versions;
      const isBFolder = !contentB?.versions;

      // Always show folders first if sorting by name
      if (sortField === "name" && isAFolder !== isBFolder) {
        return isAFolder ? -1 : 1;
      }

      let valueA, valueB;

      if (sortField === "name") {
        valueA = nameA.toLowerCase();
        valueB = nameB.toLowerCase();
      } else if (sortField === "type") {
        // Sort by extension first, then name
        const extensionA = nameA.split('.').pop().toLowerCase();
        const extensionB = nameB.split('.').pop().toLowerCase();

        if (extensionA !== extensionB) {
          valueA = extensionA;
          valueB = extensionB;
        } else {
          valueA = nameA.toLowerCase();
          valueB = nameB.toLowerCase();
        }
      } else if (sortField === "date") {
        // Default to current date if no date available
        valueA = contentA?.createdAt ? new Date(contentA.createdAt).getTime() : Date.now();
        valueB = contentB?.createdAt ? new Date(contentB.createdAt).getTime() : Date.now();
      }

      // Apply sort order
      return sortOrder === "asc"
        ? (valueA > valueB ? 1 : -1)
        : (valueA < valueB ? 1 : -1);
    });
  }, [files, sortField, sortOrder, showType]);

  const toggleVersions = (fileName) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [fileName]: !prev[fileName],
    }));
  };

  const openFileContent = async (file, path) => {
    setCurrentFile(file);
    setFileContentModalVisible(true);
    setLoading(true);

    try {
      const fileExtension = file.split('.').pop().toLowerCase();

      // Check if this is a displayable binary file (PDF, Word, Excel, etc.)
      if (isDisplayableBinaryFile(fileExtension)) {
        // Request base64 version for display
        const response = await axios.get("http://localhost:8000/files/content", {
          params: {
            path,
            format: 'base64'
          }
        });

        if (response.data && response.data.content) {
          setFileContent(response.data.content);
          setFileContentType(response.data.contentType);
        } else {
          throw new Error('Invalid response format');
        }
      }
      // For regular binary files that we don't display
      else if (isBinaryFileExtension(fileExtension)) {
        // For binary files, just set a placeholder message
        const contentType = getContentTypeFromFileName(file);
        setFileContentType(contentType);
        setFileContent("Binary content - use Download to view this file");
      }
      // For text files
      else {
        const response = await axios.get("http://localhost:8000/files/content", {
          params: { path },
          responseType: 'json'
        });

        setFileContent(response.data.content);
        setFileContentType(response.data.contentType);
      }
    } catch (error) {
      console.error("Error fetching file content:", error);
      message.error("Failed to load file content. Please try again.");
      setFileContent("Error loading file content.");
      setFileContentType("text/plain");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to identify binary files we can display in the browser
  const isDisplayableBinaryFile = (extension) => {
    const displayableExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
    return displayableExtensions.includes(extension.toLowerCase());
  };

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
  };

  // Helper functions
  const isBinaryFileExtension = (fileName) => {
    const binaryExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'];
    return binaryExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const getContentTypeFromFileName = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const contentTypeMap = {
      'pdf': 'application/pdf',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };

    return contentTypeMap[extension] || 'application/octet-stream';
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(fileContent)
      .then(() => message.success("Content copied to clipboard"))
      .catch(() => message.error("Failed to copy content"));
  };

  const handleDownload = (path) => {
    window.open(`http://localhost:8000/files/download?path=${encodeURIComponent(currentFile)}`, '_blank');
  };

  // Delete handling
  const initiateDelete = (path, isFolder) => {
    console.log("Delete initiated for:", path);
    setDeleteInfo({ path, isFolder });

    // Use browser's built-in confirm dialog instead of Ant Design Modal
    if (window.confirm(`Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}? This action cannot be undone.`)) {
      executeDelete(path, isFolder);
    }
  };

  const executeDelete = async (path, isFolder) => {
    console.log("Executing delete for:", path);
    try {
      await axios.delete("http://localhost:8000/files/delete", {
        params: { path }
      });

      message.success(`${isFolder ? 'Folder' : 'File'} deleted successfully`);

      if (onFileDeleted) {
        onFileDeleted();
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      message.error(`Failed to delete ${isFolder ? 'folder' : 'file'}. Please try again.`);
    }
  };

  // Count folders and files
  const counts = React.useMemo(() => {
    if (!files) return { folders: 0, files: 0 };

    return files.reduce((acc, [_, content]) => {
      if (!content?.versions) {
        acc.folders++;
      } else {
        acc.files++;
      }
      return acc;
    }, { folders: 0, files: 0 });
  }, [files]);

  return (
    <div className="file-list-wrapper">
      {/* Filters Component */}
      <FileListFilters
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        showType={showType}
        setShowType={setShowType}
        counts={counts}
        isDarkMode={darkMode}
      />

      {/* Files and folders list */}
      {processedFiles.length > 0 ? (
        <List
          itemLayout="vertical"
          dataSource={processedFiles}
          className="file-list-container"
          renderItem={([name, content]) => {
            const isFolder = !content?.versions;
            const isExpanded = expandedFiles[name];
            const path = isFolder ? name : content?.path || name;
            return isFolder ? (
              <FolderItem
                name={name}
                onNavigate={onNavigate}
                onDelete={() => initiateDelete(path, true)}
                content={content}
                isDarkMode={darkMode}
              />
            ) : (
              <FileItem
                name={name}
                content={content}
                isExpanded={isExpanded}
                toggleVersions={toggleVersions}
                openFileContent={openFileContent}
                onVersionClick={onVersionClick}
                onDelete={() => initiateDelete(path, false)}
                isDarkMode={darkMode}
              />
            );
          }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text style={{ color: darkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)' }}>
              No files or folders found
            </Text>
          }
        />
      )}

      <FileContentModal
        visible={fileContentModalVisible}
        onClose={() => setFileContentModalVisible(false)}
        currentFile={currentFile}
        fileContent={fileContent}
        fileContentType={fileContentType}
        loading={loading}
        handleCopyContent={handleCopyContent}
        handleDownload={handleDownload}
        isDarkMode={darkMode}
      />
    </div>
  );
};

export default FileList;