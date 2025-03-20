// CompareModal.jsx
import React, { useEffect, useState } from 'react';
import { Modal, Button, Card, Row, Col, Divider, List, Typography, Spin, Tabs } from 'antd';
import { UserOutlined, FileOutlined, DiffOutlined } from '@ant-design/icons';
import axios from 'axios';
import { diffLines, diffWords } from 'diff';

const { Text } = Typography;
const { TabPane } = Tabs;

const CompareModal = ({ 
  visible, 
  onClose, 
  compareData, 
  user 
}) => {
  const [currentFileContent, setCurrentFileContent] = useState('');
  const [latestVersionContent, setLatestVersionContent] = useState('');
  const [selectedVersionContent, setSelectedVersionContent] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (visible && compareData) {
      fetchFileContents(compareData.currentPath, compareData.latestVersionPath);
    }

    // Reset selected version when modal closes or compareData changes
    return () => {
      setSelectedVersion(null);
      setSelectedVersionContent('');
    };
  }, [visible, compareData]);
  
  const fetchFileContents = async (currentPath, latestPath) => {
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
      
      setCurrentFileContent(currentResponse.data.content);
      setLatestVersionContent(latestResponse.data.content);
    } catch (error) {
      console.error('Error fetching file contents:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewVersion = async (version) => {
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
  };

  // Generate diff between two content strings
  const renderDiff = (oldContent, newContent) => {
    const differences = diffLines(oldContent, newContent);
    
    return (
      <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}>
        {differences.map((part, index) => {
          const style = part.added 
            ? { backgroundColor: '#e6ffed', color: '#24292e' }
            : part.removed 
              ? { backgroundColor: '#ffeef0', color: '#24292e', textDecoration: 'line-through' }
              : { color: '#24292e' };
          
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
  };

  // Render inline word-level diff
  const renderInlineDiff = (oldContent, newContent) => {
    const differences = diffWords(oldContent, newContent);
    
    return (
      <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {differences.map((part, index) => {
          const style = part.added 
            ? { backgroundColor: '#e6ffed', color: '#24292e' }
            : part.removed 
              ? { backgroundColor: '#ffeef0', color: '#24292e' }
              : { color: '#24292e' };
          
          return (
            <span key={index} style={style}>
              {part.value}
            </span>
          );
        })}
      </div>
    );
  };
  
  return (
    <Modal
      title={<span><UserOutlined /> Compare Versions - {compareData?.fileName}</span>}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
    >
      {compareData && (
        <Spin spinning={isLoading} tip="Loading file contents...">
          <Card title="Current File vs Latest Version" bordered={false}>
            <Tabs defaultActiveKey="sideBySide">
              <TabPane tab="Side by Side" key="sideBySide">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card
                      type="inner"
                      title="Current File"
                      size="small"
                      style={{ height: 300, overflow: 'auto' }}
                      bordered
                    >
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                        {currentFileContent}
                      </pre>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card
                      type="inner"
                      title={`Latest Version (v${compareData.versionNumber})`}
                      size="small"
                      style={{ height: 300, overflow: 'auto' }}
                      bordered
                    >
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                        {latestVersionContent}
                      </pre>
                    </Card>
                  </Col>
                </Row>
              </TabPane>
              <TabPane tab={<span><DiffOutlined /> Line Diff</span>} key="lineDiff">
                <Card
                  type="inner"
                  title="Differences (Line by Line)"
                  size="small"
                  style={{ height: 300, overflow: 'auto' }}
                  bordered
                >
                  {renderDiff(currentFileContent, latestVersionContent)}
                </Card>
              </TabPane>
              <TabPane tab={<span><DiffOutlined /> Inline Diff</span>} key="inlineDiff">
                <Card
                  type="inner"
                  title="Differences (Inline)"
                  size="small"
                  style={{ height: 300, overflow: 'auto' }}
                  bordered
                >
                  {renderInlineDiff(currentFileContent, latestVersionContent)}
                </Card>
              </TabPane>
            </Tabs>
          </Card>

          {selectedVersion && (
            <>
              <Divider>Selected Version Comparison</Divider>
              <Card title={`Comparing Current vs v${selectedVersion.versionNumber}`} bordered={false}>
                <Tabs defaultActiveKey="sideBySide">
                  <TabPane tab="Side by Side" key="sideBySide">
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Card
                          type="inner"
                          title="Current File"
                          size="small"
                          style={{ height: 300, overflow: 'auto' }}
                          bordered
                        >
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                            {currentFileContent}
                          </pre>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card
                          type="inner"
                          title={`v${selectedVersion.versionNumber}`}
                          size="small"
                          style={{ height: 300, overflow: 'auto' }}
                          bordered
                        >
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                            {selectedVersionContent}
                          </pre>
                        </Card>
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tab={<span><DiffOutlined /> Line Diff</span>} key="lineDiff">
                    <Card
                      type="inner"
                      title="Differences (Line by Line)"
                      size="small"
                      style={{ height: 300, overflow: 'auto' }}
                      bordered
                    >
                      {renderDiff(currentFileContent, selectedVersionContent)}
                    </Card>
                  </TabPane>
                  <TabPane tab={<span><DiffOutlined /> Inline Diff</span>} key="inlineDiff">
                    <Card
                      type="inner"
                      title="Differences (Inline)"
                      size="small"
                      style={{ height: 300, overflow: 'auto' }}
                      bordered
                    >
                      {renderInlineDiff(currentFileContent, selectedVersionContent)}
                    </Card>
                  </TabPane>
                </Tabs>
              </Card>
            </>
          )}

          <Divider>Version History</Divider>

          <List
            size="small"
            bordered
            dataSource={compareData.allVersions}
            renderItem={version => (
              <List.Item>
                <List.Item.Meta
                  avatar={<FileOutlined />}
                  title={`v${version.versionNumber} - ${new Date(version.createdAt).toLocaleString()}`}
                  description={
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => handleViewVersion(version)}
                    >
                      View This Version
                    </Button>
                  }
                />
              </List.Item>
            )}
          />
        </Spin>
      )}
    </Modal>
  );
};

export default CompareModal;