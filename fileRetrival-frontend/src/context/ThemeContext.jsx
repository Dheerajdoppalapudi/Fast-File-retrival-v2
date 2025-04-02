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

  // Ant Design theme configurations - simplified for minimalist UI
  const lightTheme = {
    token: {
      colorPrimary: '#1890ff',
      colorBgContainer: '#ffffff',
      colorTextBase: 'rgba(0, 0, 0, 0.85)',
      borderRadius: 4,
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      // Reduced border width for minimalist look
      lineWidth: 1,
      // Softer colors for secondary elements
      colorBgElevated: '#ffffff',
      colorBorder: '#f0f0f0',
    },
    components: {
      Menu: {
        itemSelectedBg: 'rgba(24, 144, 255, 0.1)',
        itemHoverBg: 'rgba(0, 0, 0, 0.03)',
      },
      Button: {
        borderRadiusBase: 4,
      }
    }
  };

  const darkTheme = {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      colorBgContainer: '#1f1f1f',
      colorBgElevated: '#272727',
      colorTextBase: 'rgba(255, 255, 255, 0.85)',
      borderRadius: 4,
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      // Reduced border width for minimalist look
      lineWidth: 1,
      // Darker borders for dark mode
      colorBorder: '#303030',
    },
    components: {
      Menu: {
        // Custom selected and hover states for dark mode
        itemSelectedBg: 'rgba(24, 144, 255, 0.2)',
        itemHoverBg: 'rgba(255, 255, 255, 0.04)',
      },
      Button: {
        borderRadiusBase: 4,
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ConfigProvider theme={theme === 'light' ? lightTheme : darkTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};