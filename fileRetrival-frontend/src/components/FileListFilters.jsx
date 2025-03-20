import React from "react";
import { Select, Radio, Tooltip, Space, Divider, Badge } from "antd";
import {
  SortAscendingOutlined,
  SortDescendingOutlined,
  FolderOutlined,
  FileTextOutlined,
  AppstoreOutlined
} from "@ant-design/icons";

const { Option } = Select;

const FileListFilters = ({ 
  sortField, 
  setSortField, 
  sortOrder, 
  setSortOrder, 
  showType, 
  setShowType, 
  counts,
  isDarkMode 
}) => {
  return (
    <div 
      style={{ 
        position: "sticky",
        top: "100px", // Adjust based on your header height
        zIndex: 5,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "8px 0",
        borderRadius: "4px",
        marginBottom: "16px",
        backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
      }}
    >
      {/* Filter by Type */}
      <Space>
        <Radio.Group 
          value={showType} 
          onChange={e => setShowType(e.target.value)}
          buttonStyle="solid"
          size="small"
        >
          <Tooltip title="Show all items">
            <Radio.Button value="all">
              <Space>
                <AppstoreOutlined />
                <span>All</span>
                <Badge 
                  count={counts.folders + counts.files} 
                  size="small" 
                  style={{ 
                    backgroundColor: isDarkMode ? '#1890ff' : '#1890ff',
                    marginLeft: '4px'
                  }} 
                />
              </Space>
            </Radio.Button>
          </Tooltip>
          <Tooltip title="Show folders only">
            <Radio.Button value="folders">
              <Space>
                <FolderOutlined />
                <span>Folders</span>
                <Badge 
                  count={counts.folders} 
                  size="small" 
                  style={{ 
                    backgroundColor: isDarkMode ? '#faad14' : '#faad14',
                    marginLeft: '4px'
                  }} 
                />
              </Space>
            </Radio.Button>
          </Tooltip>
          <Tooltip title="Show files only">
            <Radio.Button value="files">
              <Space>
                <FileTextOutlined />
                <span>Files</span>
                <Badge 
                  count={counts.files} 
                  size="small" 
                  style={{ 
                    backgroundColor: isDarkMode ? '#52c41a' : '#52c41a',
                    marginLeft: '4px'
                  }} 
                />
              </Space>
            </Radio.Button>
          </Tooltip>
        </Radio.Group>
      </Space>

      <Divider type="vertical" style={{ height: '20px' }} />
      
      {/* Sort Controls */}
      <Space size="small">
        <span style={{ 
          color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
          fontSize: '13px'
        }}>
          Sort:
        </span>
        
        <Select 
          value={sortField} 
          onChange={setSortField}
          size="small"
          style={{ width: '90px' }}
          bordered={true}
          dropdownMatchSelectWidth={false}
        >
          <Option value="name">Name</Option>
          <Option value="type">Type</Option>
          <Option value="date">Date</Option>
        </Select>
        
        <Radio.Group 
          value={sortOrder} 
          onChange={e => setSortOrder(e.target.value)}
          buttonStyle="solid"
          size="small"
        >
          <Tooltip title="Ascending">
            <Radio.Button value="asc">
              <SortAscendingOutlined />
            </Radio.Button>
          </Tooltip>
          <Tooltip title="Descending">
            <Radio.Button value="desc">
              <SortDescendingOutlined />
            </Radio.Button>
          </Tooltip>
        </Radio.Group>
      </Space>
    </div>
  );
};

export default FileListFilters;