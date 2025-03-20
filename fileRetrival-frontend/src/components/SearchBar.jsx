import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Search } = Input;

const SearchBar = ({ searchQuery, onSearch, style }) => {
  return (
    <Search
      placeholder="Search files and folders..."
      allowClear
      enterButton={<SearchOutlined />}
      size="middle"
      value={searchQuery}
      onChange={(e) => onSearch(e.target.value)}
      style={{ ...style }}
    />
  );
};

export default SearchBar;