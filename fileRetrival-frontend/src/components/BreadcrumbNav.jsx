import React, { useContext } from 'react';
import { HomeOutlined, FolderOutlined } from '@ant-design/icons';
import { ThemeContext } from '../context/ThemeContext'; // Adjust this import path as needed

const BreadcrumbNav = ({ currentPath, onNavigate }) => {
  // Get current theme from context
  const { theme } = useContext(ThemeContext);
  const isDarkTheme = theme === 'dark';

  return (
    <nav className="breadcrumb-container">
      <ul className="breadcrumb">
        <li className="breadcrumb-item">
          <button 
            onClick={() => onNavigate(0)}
            className={`breadcrumb-link home ${isDarkTheme ? 'dark' : ''}`}
          >
            <HomeOutlined />
            <span>Home</span>
          </button>
        </li>
        
        {currentPath.map((folder, index) => (
          <li className="breadcrumb-item" key={index}>
            <span className={`separator ${isDarkTheme ? 'dark' : ''}`}>/</span>
            <button
              onClick={() => onNavigate(index + 1)}
              className={`breadcrumb-link ${index === currentPath.length - 1 ? 'active' : ''} ${isDarkTheme ? 'dark' : ''}`}
            >
              <FolderOutlined />
              <span>{folder}</span>
            </button>
          </li>
        ))}
      </ul>
      
      <style jsx>{`
        .breadcrumb-container {
          padding: 8px 0;
        }
        
        .breadcrumb {
          display: flex;
          align-items: center;
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 14px;
          color: ${isDarkTheme ? 'rgba(255, 255, 255, 0.85)' : '#666'};
        }
        
        .breadcrumb-item {
          display: flex;
          align-items: center;
        }
        
        .separator {
          margin: 0 8px;
          color: #d9d9d9;
          font-weight: 300;
        }

        .separator.dark {
          color: #414140;
        }
        
        .breadcrumb-link {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          color: #666;
          transition: all 0.2s ease;
        }
        
        .breadcrumb-link.dark {
          color: rgba(255, 255, 255, 0.65);
        }
        
        .breadcrumb-link:hover {
          background-color: ${isDarkTheme ? '#313130' : '#f5f5f5'};
          color: #1890ff;
        }
        
        .breadcrumb-link.active {
          font-weight: 500;
          color: ${isDarkTheme ? 'rgba(255, 255, 255, 0.85)' : '#262626'};
        }
        
        .breadcrumb-link.home {
          color: ${isDarkTheme ? 'rgba(255, 255, 255, 0.45)' : '#8c8c8c'};
        }
        
        .breadcrumb-link.home:hover {
          color: #1890ff;
        }
      `}</style>
    </nav>
  );
};

export default BreadcrumbNav;