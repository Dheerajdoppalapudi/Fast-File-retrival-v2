// CompareModal.jsx - With Fixed Word Document Comparison Support
import React, { useEffect, useState, useCallback, useMemo, useContext } from 'react';
import { Modal, Button, Card, Row, Col, Divider, List, Typography, Spin, Tabs, Tag, Tooltip, Space, Empty } from 'antd';
import {
  UserOutlined,
  FileOutlined,
  DiffOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  DownloadOutlined,
  CheckOutlined,
  FileWordOutlined  // Added for Word documents
} from '@ant-design/icons';
import axios from 'axios';
import { diffLines, diffWords } from 'diff';
import { ThemeContext } from '../context/ThemeContext'; 
import WordViewer from '../components/ViewerComponents/WordViewer'; // Import the WordViewer component

const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const CompareModal = ({
  visible,
  onClose,
  compareData,
  user,
  onApprove
}) => {
  const [currentFileContent, setCurrentFileContent] = useState('');
  const [latestVersionContent, setLatestVersionContent] = useState('');
  const [selectedVersionContent, setSelectedVersionContent] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contentType, setContentType] = useState('text'); // 'text', 'binary', 'image', 'word'
  const [fileExtension, setFileExtension] = useState(''); // Track file extension
  const { theme } = useContext(ThemeContext); // Get current theme
  
  // Compute theme-dependent styles
  const isDarkMode = theme === 'dark';
  const themeStyles = {
    cardBackground: isDarkMode ? '#1f1f1f' : 'white',
    cardBorder: isDarkMode ? '#303030' : '#f0f0f0',
    selectedItemBg: isDarkMode ? '#111b26' : '#f0f7ff',
    textColor: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#24292e',
    secondaryTextColor: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
    diffAddedBg: isDarkMode ? '#10281a' : '#e6ffed',
    diffRemovedBg: isDarkMode ? '#31161b' : '#ffeef0',
    cardBorderSelected: isDarkMode ? '#177ddc' : '#1890ff',
    codeBackground: isDarkMode ? '#141414' : 'inherit',
    headerBackground: isDarkMode ? '#262626' : '#fafafa',
    versionItemBorder: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
  };

  // Helper function to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = useCallback((buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedVersion(null);
      setSelectedVersionContent('');
      setLatestVersionContent('');
      setCurrentFileContent('');
      setContentType('text');
      setFileExtension('');
    }
  }, [visible]);

  // Fetch file contents when modal becomes visible or compareData changes
  useEffect(() => {
    if (visible && compareData) {
      // Set the initially selected version if provided
      if (compareData.selectedVersion && !selectedVersion) {
        setSelectedVersion(compareData.selectedVersion);
      }
      
      // Extract file extension
      if (compareData.currentPath) {
        const ext = compareData.currentPath.split('.').pop().toLowerCase();
        setFileExtension(ext);
      }
      
      fetchFileContents(compareData.currentPath, compareData.latestVersionPath);
    }
  }, [visible, compareData, selectedVersion]);

  // When selectedVersion changes, fetch its content
  useEffect(() => {
    if (selectedVersion && visible) {
      fetchVersionContent(selectedVersion);
    }
  }, [selectedVersion, visible]);

  // Fetch selected version content with improved Word doc handling
  const fetchVersionContent = useCallback(async (version) => {
    if (!version || !version.path) return;
    
    setIsLoading(true);
    try {
      // Get file extension
      const docExtension = version.path.split('.').pop().toLowerCase();
      const isWordDoc = ['doc', 'docx'].includes(docExtension);
      
      const response = await axios.get('http://localhost:8000/files/content', {
        params: { path: version.path },
        headers: { Authorization: `Bearer ${user?.token}` },
        responseType: isWordDoc ? 'arraybuffer' : 'json'
      });

      if (isWordDoc) {
        const base64Content = arrayBufferToBase64(response.data);
        setSelectedVersionContent(base64Content);
      } else {
        setSelectedVersionContent(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching version content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, arrayBufferToBase64]);

  // Improved fetch file contents with proper handling for Word docs
  const fetchFileContents = useCallback(async (currentPath, latestPath) => {
    if (!currentPath || !latestPath) return;

    setIsLoading(true);
    try {
      // Determine content type from file extension
      const ext = currentPath.split('.').pop().toLowerCase();
      setFileExtension(ext);
      
      // Set content type based on file extension
      let currentContentType = 'text';
      if (['doc', 'docx'].includes(ext)) {
        currentContentType = 'word';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
        currentContentType = 'image';
      } else if (['pdf', 'xls', 'xlsx', 'zip', 'exe'].includes(ext)) {
        currentContentType = 'binary';
      }
      
      setContentType(currentContentType);
      
      // Use appropriate response type based on content type
      const isWordDoc = currentContentType === 'word';
      
      // Fetch current file content
      const currentResponse = await axios.get('http://localhost:8000/files/content', {
        params: { path: currentPath },
        headers: { Authorization: `Bearer ${user?.token}` },
        responseType: isWordDoc ? 'arraybuffer' : 'json',
      });
      
      if (isWordDoc) {
        const base64Content = arrayBufferToBase64(currentResponse.data);
        setCurrentFileContent(base64Content);
      } else {
        setCurrentFileContent(currentResponse.data.content);
      }

      // Fetch latest version content (if no selected version)
      if (!selectedVersion) {
        const latestResponse = await axios.get('http://localhost:8000/files/content', {
          params: { path: latestPath },
          headers: { Authorization: `Bearer ${user?.token}` },
          responseType: isWordDoc ? 'arraybuffer' : 'json',
        });
        
        if (isWordDoc) {
          const latestBase64Content = arrayBufferToBase64(latestResponse.data);
          setLatestVersionContent(latestBase64Content);
        } else {
          setLatestVersionContent(latestResponse.data.content);
        }
      }
    } catch (error) {
      console.error('Error fetching file contents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedVersion, arrayBufferToBase64]);

  // Handle version selection
  const handleViewVersion = useCallback(async (version) => {
    setSelectedVersion(version);
  }, []);

  // File download handler
  const handleDownloadFile = useCallback((filePath) => {
    if (!filePath) return;
    
    // Get filename from path
    const fileName = filePath.split('/').pop();
    
    // Use Axios for the download with proper authorization
    axios({
      url: `http://localhost:8000/files/content?path=${encodeURIComponent(filePath)}`,
      method: 'GET',
      responseType: 'blob', // Important for binary files
      headers: { Authorization: `Bearer ${user?.token}` }
    })
    .then((response) => {
      // Create a Blob URL for the downloaded file
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const tempLink = document.createElement('a');
      tempLink.href = url;
      tempLink.setAttribute('download', fileName);
      document.body.appendChild(tempLink);
      
      // Trigger the download
      tempLink.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(tempLink);
    })
    .catch((error) => {
      console.error('Error downloading file:', error);
      Modal.error({
        title: 'Download Failed',
        content: 'There was an error downloading the file. Please try again.'
      });
    });
  }, [user]);

  // Generate line-by-line diff between two content strings
  const renderDiff = useCallback((oldContent, newContent) => {
    // Handle binary or non-text content
    if (contentType !== 'text') {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <InfoCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <Paragraph style={{ marginTop: '10px' }}>
            Diff comparison not available for this file type.
          </Paragraph>
        </div>
      );
    }

    try {
      // Compare version against current
      const differences = diffLines(newContent || '', oldContent || '');

      return (
        <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5', backgroundColor: themeStyles.codeBackground }}>
          {differences.map((part, index) => {
            const style = part.added
              ? { backgroundColor: themeStyles.diffRemovedBg, color: themeStyles.textColor, textDecoration: 'line-through' }
              : part.removed
                ? { backgroundColor: themeStyles.diffAddedBg, color: themeStyles.textColor }
                : { color: themeStyles.textColor };

            const prefix = part.added ? '- ' : part.removed ? '+ ' : '  ';

            return (
              <div key={index} style={style}>
                {part.value.split('\n').map((line, lineIndex) => (
                  line && <div key={`${index}-${lineIndex}`}>{prefix}{line}</div>
                ))}
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error('Error rendering diff:', error);
      return (
        <div>Error comparing files. The content might be too large or in an incompatible format.</div>
      );
    }
  }, [contentType, themeStyles]);

  // Render inline word-level diff
  const renderInlineDiff = useCallback((oldContent, newContent) => {
    // Handle binary or non-text content
    if (contentType !== 'text') {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <InfoCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <Paragraph style={{ marginTop: '10px' }}>
            Diff comparison not available for this file type.
          </Paragraph>
        </div>
      );
    }

    try {
      // Compare version against current
      const differences = diffWords(newContent || '', oldContent || '');

      return (
        <div style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          lineHeight: '1.5', 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word', 
          backgroundColor: themeStyles.codeBackground 
        }}>
          {differences.map((part, index) => {
            const style = part.added
              ? { backgroundColor: themeStyles.diffRemovedBg, color: themeStyles.textColor }
              : part.removed
                ? { backgroundColor: themeStyles.diffAddedBg, color: themeStyles.textColor }
                : { color: themeStyles.textColor };

            return (
              <span key={index} style={style}>
                {part.value}
              </span>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error('Error rendering inline diff:', error);
      return (
        <div>Error comparing files. The content might be too large or in an incompatible format.</div>
      );
    }
  }, [contentType, themeStyles]);

  // Enhanced render content function with improved Word doc handling
  const renderContent = useCallback((content, title, filePath) => {
    if (contentType === 'word') {
      // For Word documents, use the WordViewer component with error handling
      return (
        <div>
          {content ? (
            <>
              <div style={{ 
                padding: '10px', 
                backgroundColor: themeStyles.cardBackground, 
                border: `1px solid ${themeStyles.cardBorder}`,
                borderRadius: '4px'
              }}>
                <WordViewer 
                  fileContent={content} 
                  fileName={filePath ? filePath.split('/').pop() : title} 
                />
              </div>
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <Button 
                  icon={<DownloadOutlined />} 
                  size="small"
                  onClick={() => handleDownloadFile(filePath)}
                >
                  Download Document
                </Button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <FileWordOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
              <Paragraph style={{ marginTop: '10px' }}>
                Error loading Word document
              </Paragraph>
              <Button 
                icon={<DownloadOutlined />} 
                size="small"
                onClick={() => handleDownloadFile(filePath)}
              >
                Download Document
              </Button>
            </div>
          )}
        </div>
      );
    } else if (contentType === 'image') {
      // For images, render a data URL with download button
      return (
        <div style={{ textAlign: 'center' }}>
          <img
            src={`data:image/*;base64,${content}`}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '500px' }}
          />
          <div style={{ marginTop: '10px' }}>
            <Button 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => handleDownloadFile(filePath)}
            >
              Download Image
            </Button>
          </div>
        </div>
      );
    } else if (contentType === 'binary') {
      // For binary files, show a placeholder with download button
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <FileOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
          <Paragraph style={{ marginTop: '10px' }}>
            Binary file preview not available
          </Paragraph>
          <Button 
            icon={<DownloadOutlined />} 
            size="small"
            onClick={() => handleDownloadFile(filePath)}
          >
            Download File
          </Button>
        </div>
      );
    } else {
      // For text files, show the content with download button
      return (
        <div>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word', 
            fontSize: '12px', 
            color: themeStyles.textColor,
            backgroundColor: themeStyles.codeBackground
          }}>
            {content}
          </pre>
          <div style={{ marginTop: '10px', textAlign: 'right' }}>
            <Button 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => handleDownloadFile(filePath)}
            >
              Download Text
            </Button>
          </div>
        </div>
      );
    }
  }, [contentType, themeStyles, handleDownloadFile]);

  // Improved version history rendering with dark theme support
  const renderVersionHistory = useMemo(() => {
    if (!compareData?.allVersions) return null;

    return (
      <List
        dataSource={compareData.allVersions}
        split={false}
        renderItem={(version, index) => (
          <List.Item
            key={version.id}
            style={{
              padding: '4px 0',
              borderBottom: index < compareData.allVersions.length - 1 ? themeStyles.versionItemBorder : 'none',
            }}
          >
            <Card
              size="small"
              style={{
                width: '100%',
                marginBottom: '0',
                borderLeft: selectedVersion?.id === version.id ? `3px solid ${themeStyles.cardBorderSelected}` : 'none',
                backgroundColor: selectedVersion?.id === version.id ? themeStyles.selectedItemBg : themeStyles.cardBackground,
              }}
              bodyStyle={{ padding: '8px' }}
            >
              <Row align="middle" gutter={[8, 0]}>
                <Col span={5}>
                  <Tag color={selectedVersion?.id === version.id ? 'blue' : 'default'} style={{ marginRight: '0' }}>
                    v{version.versionNumber}
                  </Tag>
                </Col>
                <Col span={13}>
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Text style={{ fontSize: '12px', color: themeStyles.textColor }}>
                      {new Date(version.createdAt).toLocaleDateString()}
                    </Text>
                    {version.approverName && (
                      <Tag color="success" icon={<CheckOutlined />} style={{ marginLeft: 0 }}>
                        Approved
                      </Tag>
                    )}
                  </Space>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Button
                    type={selectedVersion?.id === version.id ? "primary" : "default"}
                    size="small"
                    onClick={() => handleViewVersion(version)}
                  >
                    {selectedVersion?.id === version.id ? "Selected" : "View"}
                  </Button>
                </Col>
              </Row>

              {/* Version details in a more compact format */}
              <Row gutter={[8, 2]} style={{ marginTop: '6px', fontSize: '12px' }}>
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: '11px', color: themeStyles.secondaryTextColor }}>
                    Created: {new Date(version.createdAt).toLocaleString()}
                  </Text>
                </Col>

                {version.approvedAt && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: '11px', color: themeStyles.secondaryTextColor }}>
                      Approved: {new Date(version.approvedAt).toLocaleString()}
                      {version.approverName && ` by ${version.approverName}`}
                    </Text>
                  </Col>
                )}
              </Row>
            </Card>
          </List.Item>
        )}
      />
    );
  }, [compareData, selectedVersion, handleViewVersion, themeStyles]);

  // Modal footer buttons with approval action if eligible
  const modalFooter = useMemo(() => {
    const buttons = [
      <Button key="close" onClick={onClose}>
        Close
      </Button>
    ];

    // Add approve button if file is pending and user is provided
    if (compareData?.approvalStatus === 'PENDING' && onApprove && user?.role === 'ADMIN') {
      buttons.unshift(
        <Button
          key="approve"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => onApprove(compareData.fileId)}
        >
          Approve File
        </Button>
      );
    }

    return buttons;
  }, [compareData, user, onClose, onApprove]);

  // Get the content to display in the version panel
  const versionContentToDisplay = selectedVersion ? selectedVersionContent : latestVersionContent;
  const versionPathToDisplay = selectedVersion ? selectedVersion.path : compareData?.latestVersionPath;
  const versionTitleToDisplay = selectedVersion 
    ? `Version ${selectedVersion.versionNumber}` 
    : compareData?.versionNumber ? `Latest Version (v${compareData.versionNumber})` : 'Latest Version';

  // Determine tabs to show based on content type
  const renderTabsBasedOnContentType = () => {
    const sideBySideTab = (
      <TabPane tab="Side by Side" key="sideBySide">
        <Row gutter={[12, 0]}>
          <Col span={12}>
            <Card
              type="inner"
              title={
                <Space size={4}>
                  {contentType === 'word' ? <FileWordOutlined /> : <FileOutlined />}
                  {versionTitleToDisplay}
                  {(selectedVersion?.approverName || compareData.allVersions?.[0]?.approverName) && (
                    <Tooltip title={`Approved by ${selectedVersion?.approverName || compareData.allVersions[0].approverName}`}>
                      <Tag color="success" icon={<CheckOutlined />}>Approved</Tag>
                    </Tooltip>
                  )}
                </Space>
              }
              size="small"
              style={{
                height: 'calc(95vh - 300px)',
                overflow: 'auto',
                backgroundColor: themeStyles.cardBackground
              }}
              headStyle={{ 
                padding: '0 8px',
                backgroundColor: themeStyles.headerBackground
              }}
              bodyStyle={{ 
                padding: '8px',
                backgroundColor: themeStyles.cardBackground
              }}
              bordered
            >
              {renderContent(
                versionContentToDisplay,
                versionTitleToDisplay,
                versionPathToDisplay
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card
              type="inner"
              title={
                <Space size={4}>
                  {contentType === 'word' ? <FileWordOutlined /> : <FileOutlined />}
                  Current File
                </Space>
              }
              size="small"
              style={{
                height: 'calc(95vh - 300px)',
                overflow: 'auto',
                backgroundColor: themeStyles.cardBackground
              }}
              headStyle={{ 
                padding: '0 8px',
                backgroundColor: themeStyles.headerBackground
              }}
              bodyStyle={{ 
                padding: '8px',
                backgroundColor: themeStyles.cardBackground
              }}
              bordered
            >
              {renderContent(currentFileContent, 'Current File', compareData?.currentPath)}
            </Card>
          </Col>
        </Row>
      </TabPane>
    );

    // Only show diff tabs for text files
    if (contentType === 'text') {
      return (
        <Tabs defaultActiveKey="sideBySide" size="small">
          {sideBySideTab}
          <TabPane tab={<span><DiffOutlined /> Line Diff</span>} key="lineDiff">
            <Card
              type="inner"
              title={
                <div>
                  <span>Differences (Line by Line) - {selectedVersion ? `v${selectedVersion.versionNumber} vs Current` : 'Latest vs Current'}</span>
                  <div style={{ float: 'right' }}>
                    <Space>
                      <Button 
                        icon={<DownloadOutlined />} 
                        size="small"
                        onClick={() => handleDownloadFile(versionPathToDisplay)}
                      >
                        Download Version
                      </Button>
                      <Button 
                        icon={<DownloadOutlined />} 
                        size="small"
                        onClick={() => handleDownloadFile(compareData?.currentPath)}
                      >
                        Download Current
                      </Button>
                    </Space>
                  </div>
                </div>
              }
              size="small"
              style={{
                height: 'calc(95vh - 300px)',
                overflow: 'auto',
                backgroundColor: themeStyles.cardBackground
              }}
              headStyle={{ 
                padding: '0 8px',
                backgroundColor: themeStyles.headerBackground
              }}
              bodyStyle={{ 
                padding: '8px',
                backgroundColor: themeStyles.cardBackground
              }}
              bordered
            >
              {renderDiff(
                versionContentToDisplay,
                currentFileContent
              )}
            </Card>
          </TabPane>
          <TabPane tab={<span><DiffOutlined /> Inline Diff</span>} key="inlineDiff">
            <Card
              type="inner"
              title={
                <div>
                  <span>Differences (Inline) - {selectedVersion ? `v${selectedVersion.versionNumber} vs Current` : 'Latest vs Current'}</span>
                  <div style={{ float: 'right' }}>
                    <Space>
                      <Button 
                        icon={<DownloadOutlined />} 
                        size="small"
                        onClick={() => handleDownloadFile(versionPathToDisplay)}
                      >
                        Download Version
                      </Button>
                      <Button 
                        icon={<DownloadOutlined />} 
                        size="small"
                        onClick={() => handleDownloadFile(compareData?.currentPath)}
                      >
                        Download Current
                      </Button>
                    </Space>
                  </div>
                </div>
              }
              size="small"
              style={{
                height: 'calc(95vh - 300px)',
                overflow: 'auto',
                backgroundColor: themeStyles.cardBackground
              }}
              headStyle={{ 
                padding: '0 8px',
                backgroundColor: themeStyles.headerBackground
              }}
              bodyStyle={{ 
                padding: '8px',
                backgroundColor: themeStyles.cardBackground
              }}
              bordered
            >
              {renderInlineDiff(
                versionContentToDisplay,
                currentFileContent
              )}
            </Card>
          </TabPane>
        </Tabs>
      );
    }
    
    // For word documents, images, binary files - only show side by side view
    return (
      <Tabs defaultActiveKey="sideBySide" size="small">
        {sideBySideTab}
      </Tabs>
    );
  };

  return (
    <Modal
      title={
        <Space>
          {contentType === 'word' ? <FileWordOutlined /> : <FileOutlined />}
          <span>Compare Versions - {compareData?.fileName}</span>
          {compareData?.approvalStatus && (
            <Tag color={
              compareData.approvalStatus === 'APPROVED' ? 'success' :
                compareData.approvalStatus === 'REJECTED' ? 'error' :
                  'warning'
            }>
              {compareData.approvalStatus}
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: 'calc(95vh - 130px)', overflow: 'auto', padding: '4px' }}
      footer={modalFooter}
    >
      {compareData ? (
        <Spin spinning={isLoading} tip={contentType === 'word' ? "Converting Word document..." : "Loading file contents..."}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card
                title={
                  <Space size={4}>
                    <HistoryOutlined />
                    Version History
                  </Space>
                }
                style={{ 
                  height: '100%',
                  backgroundColor: themeStyles.cardBackground
                }}
                headStyle={{ 
                  backgroundColor: themeStyles.headerBackground
                }}
                bodyStyle={{
                  height: 'calc(95vh - 230px)',
                  overflow: 'auto',
                  padding: '8px',
                  backgroundColor: themeStyles.cardBackground
                }}
                bordered={true}
                size="small"
              >
                {compareData.allVersions && compareData.allVersions.length > 0 ? (
                  renderVersionHistory
                ) : (
                  <Empty description="No version history available" />
                )}
              </Card>
            </Col>

            <Col span={18}>
              <Card
                title={
                  <Space>
                    {contentType === 'word' ? (
                      <>
                        <FileWordOutlined />
                        <span>Word Document Comparison</span>
                      </>
                    ) : (
                      <>
                        <FileOutlined />
                        <span>File Comparison</span>
                      </>
                    )}
                  </Space>
                }
                bordered={true}
                size="small"
                bodyStyle={{ 
                  padding: '8px',
                  backgroundColor: themeStyles.cardBackground
                }}
                headStyle={{ 
                  backgroundColor: themeStyles.headerBackground
                }}
              >
                {renderTabsBasedOnContentType()}
              </Card>
            </Col>
          </Row>
        </Spin>
      ) : (
        <Empty description="No data to display" />
      )}
    </Modal>
  );
};

export default CompareModal;