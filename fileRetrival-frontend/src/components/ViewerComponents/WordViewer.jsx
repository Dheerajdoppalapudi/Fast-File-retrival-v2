import React, { useState, useEffect, useContext } from 'react';
import { Spin, Result, Typography } from 'antd';
import mammoth from 'mammoth';
import { ThemeContext } from '../../context/ThemeContext'; 

const { Text } = Typography;

const WordViewer = ({ fileContent, fileName }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const convertWordToHtml = async () => {
      try {
        // Convert base64 to array buffer
        const binaryString = window.atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert Word to HTML using mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        setHtmlContent(result.value);
        
        // Handle any warnings
        if (result.messages.length > 0) {
          console.warn('Warnings during Word conversion:', result.messages);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error converting Word document:', err);
        setError('Failed to convert Word document. The file may be corrupted or in an unsupported format.');
        setLoading(false);
      }
    };

    convertWordToHtml();
  }, [fileContent]);

  // Apply Word document styles based on current theme
  const isDarkMode = theme === 'dark';
  
  const documentStyles = `
    .word-viewer-content {
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.5;
      padding: 20px;
      background-color: ${isDarkMode ? '#202021' : 'white'};
      color: ${isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'};
      box-shadow: 0 2px 8px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
      border-radius: 4px;
    }
    .word-viewer-content h1, .word-viewer-content h2, .word-viewer-content h3, 
    .word-viewer-content h4, .word-viewer-content h5, .word-viewer-content h6 {
      margin-top: 16px;
      margin-bottom: 8px;
      font-weight: 500;
      color: ${isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'inherit'};
    }
    .word-viewer-content p {
      margin-bottom: 8px;
    }
    .word-viewer-content table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }
    .word-viewer-content table, .word-viewer-content th, .word-viewer-content td {
      border: 1px solid ${isDarkMode ? '#424242' : '#d9d9d9'};
    }
    .word-viewer-content th, .word-viewer-content td {
      padding: 8px;
      text-align: left;
    }
    .word-viewer-content ul, .word-viewer-content ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }
    .word-viewer-content img {
      max-width: 100%;
    }
    .word-viewer-content a {
      color: ${isDarkMode ? '#1890ff' : '#1890ff'};
    }
  `;

  if (error) {
    return (
      <Result
        status="error"
        title="Error Loading Word Document"
        subTitle={error}
      />
    );
  }

  return (
    <div className="word-viewer">
      <style>{documentStyles}</style>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '10px' }}>
            <Text type="secondary">Converting Word document...</Text>
          </div>
        </div>
      ) : (
        <div 
          className="word-viewer-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          style={{ 
            maxHeight: '65vh', 
            overflowY: 'auto',
            border: `1px solid ${isDarkMode ? '#424242' : '#e8e8e8'}`
          }}
        />
      )}
    </div>
  );
};

export default WordViewer;