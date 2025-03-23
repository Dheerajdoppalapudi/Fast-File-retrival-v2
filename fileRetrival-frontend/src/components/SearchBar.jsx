import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Search } = Input;

const SearchBar = ({ searchQuery, onSearch, style, isDarkMode }) => {
  return (
    <Search
      placeholder="Search files and folders..."
      allowClear
      enterButton={<SearchOutlined />}
      size="middle"
      value={searchQuery}
      onChange={(e) => onSearch(e.target.value)}
      onSearch={(value) => onSearch(value)} // Add this to handle search button clicks
      style={{ 
        ...style,
        backgroundColor: isDarkMode ? '#202021' : '#fff'
      }}
    />
  );
};

export default SearchBar;