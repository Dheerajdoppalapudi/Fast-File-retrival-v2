// CompareModal.jsx - With Dark Theme Support
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
  CheckOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { diffLines, diffWords } from 'diff';
import { ThemeContext } from '../context/ThemeContext'; 

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
  const [contentType, setContentType] = useState('text'); // 'text', 'binary', 'image'
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

  // Fetch file contents when modal becomes visible or compareData changes
  useEffect(() => {
    if (visible && compareData) {
      fetchFileContents(compareData.currentPath, compareData.latestVersionPath);
    }

    // Reset selected version when modal closes or compareData changes
    return () => {
      setSelectedVersion(null);
      setSelectedVersionContent('');
      setContentType('text');
    };
  }, [visible, compareData]);

  // Fetch file contents with error handling
  const fetchFileContents = useCallback(async (currentPath, latestPath) => {
    if (!currentPath || !latestPath) return;

    setIsLoading(true);
    try {
      // Fetch current file content
      const currentResponse = await axios.get('http://localhost:8000/files/content', {
        params: { path: currentPath },
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      // Fetch latest version content
      const latestResponse = await axios.get('http://localhost:8000/files/content', {
        params: { path: latestPath },
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      // Determine content type from file extension or content
      const fileExtension = currentPath.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileExtension)) {
        setContentType('image');
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'exe'].includes(fileExtension)) {
        setContentType('binary');
      } else {
        setContentType('text');
      }

      setCurrentFileContent(currentResponse.data.content);
      setLatestVersionContent(latestResponse.data.content);
    } catch (error) {
      console.error('Error fetching file contents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handle version selection
  const handleViewVersion = useCallback(async (version) => {
    setSelectedVersion(version);
    setIsLoading(true);

    try {
      const response = await axios.get('http://localhost:8000/files/content', {
        params: { path: version.path },
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      setSelectedVersionContent(response.data.content);
    } catch (error) {
      console.error('Error fetching version content:', error);
    } finally {
      setIsLoading(false);
    }
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
      const differences = diffLines(oldContent || '', newContent || '');

      return (
        <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5', backgroundColor: themeStyles.codeBackground }}>
          {differences.map((part, index) => {
            const style = part.added
              ? { backgroundColor: themeStyles.diffAddedBg, color: themeStyles.textColor }
              : part.removed
                ? { backgroundColor: themeStyles.diffRemovedBg, color: themeStyles.textColor, textDecoration: 'line-through' }
                : { color: themeStyles.textColor };

            const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';

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
      const differences = diffWords(oldContent || '', newContent || '');

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
              ? { backgroundColor: themeStyles.diffAddedBg, color: themeStyles.textColor }
              : part.removed
                ? { backgroundColor: themeStyles.diffRemovedBg, color: themeStyles.textColor }
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

  // Render content based on content type
  const renderContent = useCallback((content, title) => {
    if (contentType === 'image') {
      // For images, render a data URL
      return (
        <div style={{ textAlign: 'center' }}>
          <img
            src={`data:image/*;base64,${content}`}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '500px' }}
          />
        </div>
      );
    } else if (contentType === 'binary') {
      // For binary files, just show a placeholder
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <FileOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
          <Paragraph style={{ marginTop: '10px' }}>
            Binary file preview not available
          </Paragraph>
          <Button icon={<DownloadOutlined />} size="small">
            Download File
          </Button>
        </div>
      );
    } else {
      // For text files, show the content
      return (
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word', 
          fontSize: '12px', 
          color: themeStyles.textColor,
          backgroundColor: themeStyles.codeBackground
        }}>
          {content}
        </pre>
      );
    }
  }, [contentType, themeStyles]);

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

  return (
    <Modal
      title={
        <Space>
          <FileOutlined />
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
        <Spin spinning={isLoading} tip="Loading file contents...">
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
                title="File Comparison"
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
                <Tabs defaultActiveKey="sideBySide" size="small">
                  <TabPane tab="Side by Side" key="sideBySide">
                    <Row gutter={[12, 0]}>
                      <Col span={12}>
                        <Card
                          type="inner"
                          title={
                            <Space size={4}>
                              <FileOutlined />
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
                          {renderContent(currentFileContent, 'Current File')}
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card
                          type="inner"
                          title={
                            <Space size={4}>
                              <FileOutlined />
                              {selectedVersion ?
                                `v${selectedVersion.versionNumber}` :
                                `Latest Version (v${compareData.versionNumber})`
                              }
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
                            selectedVersion ? selectedVersionContent : latestVersionContent,
                            selectedVersion ? `Version ${selectedVersion.versionNumber}` : 'Latest Version'
                          )}
                        </Card>
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tab={<span><DiffOutlined /> Line Diff</span>} key="lineDiff">
                    <Card
                      type="inner"
                      title={`Differences (Line by Line) - ${selectedVersion ? `Current vs v${selectedVersion.versionNumber}` : 'Current vs Latest'}`}
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
                        currentFileContent,
                        selectedVersion ? selectedVersionContent : latestVersionContent
                      )}
                    </Card>
                  </TabPane>
                  <TabPane tab={<span><DiffOutlined /> Inline Diff</span>} key="inlineDiff">
                    <Card
                      type="inner"
                      title={`Differences (Inline) - ${selectedVersion ? `Current vs v${selectedVersion.versionNumber}` : 'Current vs Latest'}`}
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
                        currentFileContent,
                        selectedVersion ? selectedVersionContent : latestVersionContent
                      )}
                    </Card>
                  </TabPane>
                </Tabs>
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