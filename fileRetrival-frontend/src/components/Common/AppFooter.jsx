import React, { useContext } from 'react';
import { Layout, Typography } from 'antd';
import { ThemeContext } from '../../context/ThemeContext';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter = () => {
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';

  return (
    <Footer 
      style={{ 
        textAlign: 'center',
        backgroundColor: isDarkMode ? '#1f1f1f' : '#f0f2f5',
        color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
        borderTop: isDarkMode ? '1px solid #303030' : '1px solid #e8e8e8',
        padding: '12px'
      }}
    >
      <Text 
        style={{ 
          color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)'
        }}
      >
        DocHub POC ©{new Date().getFullYear()} Created by Bionics India
      </Text>
    </Footer>
  );
};

export default AppFooter;