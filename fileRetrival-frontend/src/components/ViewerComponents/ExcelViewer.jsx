import React, { useState, useEffect } from 'react';
import { Table, Tabs, Spin, Result, Typography, Select, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { TabPane } = Tabs;
const { Text } = Typography;
const { Option } = Select;

const ExcelViewer = ({ fileContent, fileName }) => {
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Parse Excel data on component mount
  useEffect(() => {
    try {
      // Convert base64 to array buffer
      const binaryString = window.atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Parse the workbook
      const wb = XLSX.read(bytes, { type: 'array' });
      setWorkbook(wb);
      
      // Get sheet names
      const sheetNames = wb.SheetNames;
      setSheets(sheetNames);
      
      // Set active sheet to first sheet by default
      if (sheetNames.length > 0) {
        setActiveSheet(sheetNames[0]);
        loadSheetData(wb, sheetNames[0]);
      } else {
        setError('No sheets found in this Excel file');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error parsing Excel file:', err);
      setError('Failed to parse Excel file. The file may be corrupted or in an unsupported format.');
      setLoading(false);
    }
  }, [fileContent]);
  
  // Load data from a specific sheet
  const loadSheetData = (wb, sheetName) => {
    try {
      // Convert sheet to JSON
      const sheet = wb.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      if (jsonData.length === 0) {
        setTableData([]);
        setColumns([]);
        setLoading(false);
        return;
      }
      
      // Get headers from first row
      const headers = jsonData[0];
      
      // Create columns for ant design table
      const tableColumns = headers.map((header, index) => ({
        title: header || `Column ${index + 1}`,
        dataIndex: `col${index}`,
        key: `col${index}`,
        sorter: (a, b) => {
          const valA = a[`col${index}`];
          const valB = b[`col${index}`];
          
          // Handle numeric values
          if (!isNaN(valA) && !isNaN(valB)) {
            return Number(valA) - Number(valB);
          }
          
          // Handle string values
          return String(valA).localeCompare(String(valB));
        },
        sortDirections: ['ascend', 'descend'],
        render: (text) => {
          if (searchText && text && text.toString().includes(searchText)) {
            const parts = text.toString().split(new RegExp(`(${searchText})`, 'gi'));
            return (
              <span>
                {parts.map((part, i) => 
                  part.toLowerCase() === searchText.toLowerCase() 
                    ? <span key={i} style={{ backgroundColor: '#ffcf40' }}>{part}</span> 
                    : part
                )}
              </span>
            );
          }
          return text;
        }
      }));
      
      // Create data source for ant design table
      const tableDataSource = jsonData.slice(1).map((row, rowIndex) => {
        const dataObj = { key: rowIndex };
        row.forEach((cell, cellIndex) => {
          dataObj[`col${cellIndex}`] = cell;
        });
        return dataObj;
      });
      
      // Filter by search text if provided
      const filteredData = searchText 
        ? tableDataSource.filter(row => 
            Object.values(row).some(val => 
              val && val.toString().toLowerCase().includes(searchText.toLowerCase())
            )
          )
        : tableDataSource;
      
      setColumns(tableColumns);
      setTableData(filteredData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading sheet data:', err);
      setError(`Failed to load data from sheet "${sheetName}"`);
      setLoading(false);
    }
  };
  
  // Handle sheet change
  const handleSheetChange = (sheetName) => {
    setLoading(true);
    setActiveSheet(sheetName);
    setSearchText(''); // Reset search when changing sheets
    loadSheetData(workbook, sheetName);
  };
  
  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    
    if (workbook && activeSheet) {
      loadSheetData(workbook, activeSheet);
    }
  };
  
  // Display error if any
  if (error) {
    return (
      <Result
        status="error"
        title="Error Loading Excel File"
        subTitle={error}
      />
    );
  }
  
  return (
    <div className="excel-viewer">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '10px' }}>
            <Text type="secondary">Loading Excel data...</Text>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ padding: '10px', background: '#f0f2f5', borderRadius: '4px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <Text strong>Sheet: </Text>
                <Select 
                  value={activeSheet} 
                  onChange={handleSheetChange}
                  style={{ width: 200 }}
                >
                  {sheets.map(sheet => (
                    <Option key={sheet} value={sheet}>{sheet}</Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text strong>Rows per page: </Text>
                <Select 
                  value={rowsPerPage} 
                  onChange={setRowsPerPage}
                  style={{ width: 100 }}
                >
                  <Option value={10}>10</Option>
                  <Option value={50}>50</Option>
                  <Option value={100}>100</Option>
                  <Option value={500}>500</Option>
                </Select>
              </div>
              
              <div>
                <Input
                  placeholder="Search data..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ width: 200 }}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </div>
            </div>
          </div>
          
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={{ 
              pageSize: rowsPerPage,
              showSizeChanger: false
            }}
            size="small"
            scroll={{ x: 'max-content', y: 400 }}
            bordered
          />
        </div>
      )}
    </div>
  );
};

export default ExcelViewer;