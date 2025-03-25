import React, { useState, useEffect, useCallback } from 'react';
import { Table, Spin, Result, Typography, Select, Input, theme, notification } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Text } = Typography;
const { Option } = Select;

const ExcelViewer = ({ fileContent, fileName }) => {
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [originalData, setOriginalData] = useState([]); // Store original data for filtering
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Get theme token to use theme-aware colors
  const { token } = theme.useToken();

  // Safely escape special regex characters in search text
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Parse Excel data on component mount
  useEffect(() => {
    let isMounted = true;
    
    const parseExcel = async () => {
      try {
        // For large files, use a more efficient approach
        let bytes;
        
        try {
          // Convert base64 to array buffer
          const binaryString = window.atob(fileContent);
          bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
        } catch (e) {
          throw new Error('Invalid file format or encoding. The file must be a valid base64-encoded Excel file.');
        }
        
        // Parse the workbook
        const wb = XLSX.read(bytes, { 
          type: 'array',
          cellStyles: true,
          cellDates: true,
          cellNF: true
        });
        
        if (!isMounted) return;
        
        setWorkbook(wb);
        
        // Get sheet names
        const sheetNames = wb.SheetNames;
        
        if (sheetNames.length === 0) {
          throw new Error('No sheets found in this Excel file');
        }
        
        setSheets(sheetNames);
        
        // Set active sheet to first sheet by default
        setActiveSheet(sheetNames[0]);
        await loadSheetData(wb, sheetNames[0]);
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        if (isMounted) {
          setError(err.message || 'Failed to parse Excel file. The file may be corrupted or in an unsupported format.');
          setLoading(false);
        }
      }
    };
    
    parseExcel();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [fileContent]);
  
  // Load data from a specific sheet
  const loadSheetData = useCallback(async (wb, sheetName) => {
    try {
      // Convert sheet to JSON with merged cells handling
      const sheet = wb.Sheets[sheetName];
      
      // Get merge cell info
      const merges = sheet['!merges'] || [];
      
      // Pre-process merged cells
      const mergeMap = {};
      
      merges.forEach(merge => {
        const { s, e } = merge; // start and end cells
        
        // Process each cell in the merged range
        for (let r = s.r; r <= e.r; r++) {
          for (let c = s.c; c <= e.c; c++) {
            // Skip the top-left cell (that's the one with actual content)
            if (r === s.r && c === s.c) continue;
            
            // Mark other cells as merged and point to the top-left cell
            const cellRef = XLSX.utils.encode_cell({ r, c });
            const masterCellRef = XLSX.utils.encode_cell({ r: s.r, c: s.c });
            mergeMap[cellRef] = masterCellRef;
          }
        }
      });
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      if (jsonData.length === 0) {
        setTableData([]);
        setOriginalData([]);
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
          if (searchText && text && text.toString().toLowerCase().includes(searchText.toLowerCase())) {
            try {
              const escapedSearchText = escapeRegExp(searchText);
              const regex = new RegExp(`(${escapedSearchText})`, 'gi');
              const parts = text.toString().split(regex);
              
              return (
                <span>
                  {parts.map((part, i) => 
                    part.toLowerCase() === searchText.toLowerCase() 
                      ? <span key={i} style={{ backgroundColor: token.colorWarning, color: token.colorTextLightSolid }}>{part}</span> 
                      : part
                  )}
                </span>
              );
            } catch (e) {
              // Fallback if regex fails
              return text;
            }
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
      
      setColumns(tableColumns);
      setOriginalData(tableDataSource);
      setTableData(tableDataSource);
      setLoading(false);
    } catch (err) {
      console.error('Error loading sheet data:', err);
      notification.error({
        message: 'Error loading sheet',
        description: `Failed to load data from sheet "${sheetName}": ${err.message}`,
        duration: 5
      });
      setError(`Failed to load data from sheet "${sheetName}": ${err.message}`);
      setLoading(false);
    }
  }, [searchText, token.colorWarning, token.colorTextLightSolid]);
  
  // Handle sheet change
  const handleSheetChange = (sheetName) => {
    setLoading(true);
    setActiveSheet(sheetName);
    setSearchText(''); // Reset search when changing sheets
    loadSheetData(workbook, sheetName);
  };
  
  // Handle search - use existing data instead of reloading
  const handleSearch = useCallback((value) => {
    setSearchText(value);
    
    if (originalData.length > 0) {
      if (!value) {
        // If search is cleared, show all data
        setTableData(originalData);
        return;
      }
      
      // Filter the existing data without reloading the sheet
      const filteredData = originalData.filter(row => 
        Object.values(row).some(val => 
          val && val.toString().toLowerCase().includes(value.toLowerCase())
        )
      );
      
      setTableData(filteredData);
    }
  }, [originalData]);
  
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
          <div style={{ 
            padding: '10px', 
            background: token.colorBgElevated, 
            borderRadius: '4px', 
            marginBottom: '10px',
            border: `1px solid ${token.colorBorderSecondary}`
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '10px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
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
            locale={{ emptyText: tableData.length === 0 ? 'No data found' : (searchText ? 'No matching results' : 'No data') }}
            onChange={(pagination, filters, sorter) => {
              // Keep track of sorted/filtered state if needed
            }}
          />
          
          {tableData.length === 0 && originalData.length > 0 && searchText && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Text type="secondary">No matches found for "{searchText}"</Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelViewer;