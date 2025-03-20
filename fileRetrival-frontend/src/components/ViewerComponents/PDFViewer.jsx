import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button, Space, Spin, Typography, Result } from 'antd';
import { LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs`;

const { Text } = Typography;

const PDFViewer = ({ fileContent, fileName }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Prepare PDF data URL from binary content
  const pdfDataUrl = `data:application/pdf;base64,${fileContent}`;

  // Document load success handler
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Document load error handler
  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF document');
    setLoading(false);
  };

  // Page navigation
  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  // Zoom controls
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  if (error) {
    return (
      <Result
        status="error"
        title="Error Loading PDF"
        subTitle={error}
      />
    );
  }

  return (
    <div className="pdf-viewer" style={{ textAlign: 'center', padding: '10px' }}>
      <div className="pdf-controls" style={{ marginBottom: '15px' }}>
        <Space>
          <Button 
            onClick={goToPrevPage} 
            disabled={pageNumber <= 1 || loading} 
            icon={<LeftOutlined />}
          >
            Previous
          </Button>
          <Text>
            Page {pageNumber} of {numPages || '-'}
          </Text>
          <Button 
            onClick={goToNextPage} 
            disabled={pageNumber >= numPages || loading} 
            icon={<RightOutlined />}
          >
            Next
          </Button>
          <Button 
            onClick={zoomOut} 
            disabled={loading} 
            icon={<ZoomOutOutlined />}
          >
            Zoom Out
          </Button>
          <Button 
            onClick={zoomIn} 
            disabled={loading} 
            icon={<ZoomInOutlined />}
          >
            Zoom In
          </Button>
        </Space>
      </div>
      
      <div className="pdf-container" style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid #e8e8e8', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
        {loading && <Spin size="large" />}
        
        <Document
          file={pdfDataUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<Spin size="large" />}
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;