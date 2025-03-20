import React from "react";
import { Result, Typography, Space } from "antd";
import { 
  FileImageOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined, 
  FileWordOutlined, 
  FilePptOutlined, 
  FileUnknownOutlined 
} from "@ant-design/icons";
import PDFViewer from "./ViewerComponents/PDFViewer";
import ExcelViewer from "./ViewerComponents/ExcelViewer";
import WordViewer from "./ViewerComponents/WordViewer";

const { Text, Title } = Typography;

const BinaryFileHandler = ({ contentType, fileName, fileContent }) => {
  // Function to get the appropriate icon based on content type
  const getFileIcon = () => {
    if (contentType.startsWith('image/')) {
      return <FileImageOutlined style={{ fontSize: 64 }} />;
    } else if (contentType === 'application/pdf') {
      return <FilePdfOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />;
    } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return <FileExcelOutlined style={{ fontSize: 64, color: '#52c41a' }} />;
    } else if (contentType.includes('word') || contentType.includes('document')) {
      return <FileWordOutlined style={{ fontSize: 64, color: '#1890ff' }} />;
    } else if (contentType.includes('powerpoint') || contentType.includes('presentation')) {
      return <FilePptOutlined style={{ fontSize: 64, color: '#fa8c16' }} />;
    } else {
      return <FileUnknownOutlined style={{ fontSize: 64 }} />;
    }
  };

  // Get extension from file name
  const getFileExtension = () => {
    if (!fileName) return '';
    return fileName.split('.').pop().toLowerCase();
  };

  const getFriendlyFileTypeName = () => {
    if (contentType.startsWith('image/')) return 'Image';
    if (contentType === 'application/pdf') return 'PDF Document';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'Excel Spreadsheet';
    if (contentType.includes('word') || contentType.includes('document')) return 'Word Document';
    if (contentType.includes('powerpoint') || contentType.includes('presentation')) return 'PowerPoint Presentation';
    return `${getFileExtension().toUpperCase()} File`;
  };

  // Show appropriate viewer based on file type
  
  // For images, we could try to display them if we have base64 data
  if (contentType.startsWith('image/') && fileContent && typeof fileContent === 'string') {
    // Check if fileContent looks like base64 data
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(fileContent.trim());
    
    if (isBase64) {
      return (
        <div className="binary-file-container" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <Text type="secondary">Preview of {fileName}</Text>
          </div>
          <div className="image-preview" style={{ maxHeight: '60vh', overflow: 'auto' }}>
            <img 
              src={`data:${contentType};base64,${fileContent}`} 
              alt={fileName}
              style={{ maxWidth: '100%' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                const errorEl = document.getElementById('image-error-message');
                if (errorEl) errorEl.style.display = 'block';
              }}
            />
            <div id="image-error-message" style={{ display: 'none', marginTop: '20px' }}>
              <Result
                icon={<FileImageOutlined />}
                title="Unable to preview this image"
                subTitle="This image cannot be displayed in the browser preview"
              />
            </div>
          </div>
        </div>
      );
    }
  }
  
  // For PDF files, use the PDF viewer
  if (contentType === 'application/pdf' && fileContent && typeof fileContent === 'string') {
    return <PDFViewer fileContent={fileContent} fileName={fileName} />;
  }
  
  // For Excel files
  const excelExtensions = ['xlsx', 'xls', 'csv'];
  if ((contentType.includes('excel') || contentType.includes('spreadsheet') || 
       excelExtensions.includes(getFileExtension())) && 
      fileContent && typeof fileContent === 'string') {
    return <ExcelViewer fileContent={fileContent} fileName={fileName} />;
  }
  
  // For Word documents
  const wordExtensions = ['docx', 'doc'];
  if ((contentType.includes('word') || contentType.includes('document') || 
       wordExtensions.includes(getFileExtension())) && 
      fileContent && typeof fileContent === 'string') {
    return <WordViewer fileContent={fileContent} fileName={fileName} />;
  }

  // Generic handler for all other binary files
  return (
    <div className="binary-file-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {getFileIcon()}
        <Title level={4}>{getFriendlyFileTypeName()}</Title>
        <Text>{fileName}</Text>
        <Text type="secondary">
          This file type cannot be previewed in the browser.
          Please use the download button to view this file.
        </Text>
      </Space>
    </div>
  );
};

export default BinaryFileHandler;