import React, { useEffect, useRef } from "react";
import { Modal, Space, Button, Tooltip, Spin } from "antd";
import { FileOutlined, CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import Editor from "@monaco-editor/react";
import BinaryFileHandler from "./BinaryFileHandler";

const FileContentModal = ({
  visible,
  onClose,
  currentFile,
  fileContent,
  fileContentType,
  loading,
  handleCopyContent,
  handleDownload,
  isDarkMode
}) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // Determine the appropriate language mode for the editor
  const getLanguageFromContentType = (contentType, fileName) => {
    const contentTypeMap = {
      'text/plain': 'plaintext',
      'text/markdown': 'markdown',
      'application/javascript': 'javascript',
      'application/json': 'json',
      'text/html': 'html',
      'text/css': 'css',
      'text/x-python': 'python'
    };

    // Try to get language from contentType
    const language = contentTypeMap[contentType];
    if (language) return language;

    // If contentType is not helpful, try to determine from file extension
    if (fileName) {
      const extension = fileName.split('.').pop().toLowerCase();
      const extensionMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'jsx': 'javascript',
        'tsx': 'typescript',
        'py': 'python',
        'md': 'markdown',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'txt': 'plaintext',
        'xml': 'xml',
        'sql': 'sql',
        'sh': 'shell',
        'bash': 'shell',
        'yaml': 'yaml',
        'yml': 'yaml',
        'cpp': 'cpp',
        'c': 'c',
        'java': 'java'
      };
      return extensionMap[extension] || 'plaintext';
    }

    return 'plaintext';
  };

  // Check if the file is binary
  const isBinaryContent = () => {
    return fileContentType && !fileContentType.startsWith('text/') && 
           fileContentType !== 'application/javascript' && 
           fileContentType !== 'application/json';
  };

  // Render content based on file type
  const renderContent = () => {
    if (loading) {
      return <div className="file-content-loader"><Spin size="large" /></div>;
    }

    if (isBinaryContent()) {
      return (
        <BinaryFileHandler 
          contentType={fileContentType} 
          fileName={currentFile} 
          fileContent={fileContent}
        />
      );
    }

    return (
      <Editor
        height="70vh"
        language={getLanguageFromContentType(fileContentType, currentFile)}
        value={fileContent || ''}
        theme={isDarkMode ? "vs-dark" : "light"}
        options={{
          readOnly: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on'
        }}
        onMount={handleEditorDidMount}
      />
    );
  };

  return (
    <Modal
      title={
        <Space>
          <FileOutlined />
          <span>{currentFile || 'File Content'}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width="80%"
      style={{ top: 20 }}
      footer={[
        <Tooltip key="copy" title="Copy Content">
          <Button 
            onClick={handleCopyContent} 
            icon={<CopyOutlined />}
            disabled={loading || isBinaryContent()}
          >
            Copy
          </Button>
        </Tooltip>,
        <Tooltip key="download" title="Download File">
          <Button 
            type="primary" 
            onClick={handleDownload} 
            icon={<DownloadOutlined />}
            disabled={loading}
          >
            Download
          </Button>
        </Tooltip>
      ]}
      bodyStyle={{ 
        padding: '12px', 
        backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
        overflow: 'hidden'
      }}
      className={`file-content-modal ${isDarkMode ? 'dark-mode' : ''}`}
    >
      {renderContent()}
    </Modal>
  );
};

export default FileContentModal;