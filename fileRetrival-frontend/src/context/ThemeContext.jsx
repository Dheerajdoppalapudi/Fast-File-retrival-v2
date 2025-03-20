import React, { createContext, useState, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

// Create a ThemeContext
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check if there's a theme preference in localStorage, default to 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Update body class for global styling if needed
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, [theme]);

  // Toggle between light and dark
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Ant Design theme configurations
  const lightTheme = {
    token: {
      colorPrimary: '#1890ff',
      colorBgContainer: '#ffffff',
      colorTextBase: 'rgba(0, 0, 0, 0.85)',
    },
  };

  const darkTheme = {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      colorBgContainer: '#202021',
      colorBgElevated: '#313130',
      colorTextBase: 'rgba(255, 255, 255, 0.85)',
    },
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ConfigProvider theme={theme === 'light' ? lightTheme : darkTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};