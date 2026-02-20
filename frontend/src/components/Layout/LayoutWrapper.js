// 🎨 LAYOUT WRAPPER - RESPONSIVE UI PROBLEM SOLVER
// Bu component tüm sidebar ve layout problemlerini çözer

import React, { useState, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

const LayoutWrapper = ({ children, title, description }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg')); // 1024px breakpoint
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // 📱 Responsive handling
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative'
    }}>
      {/* 📱 Header - Always visible */}
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* 📂 Sidebar */}
      <Sidebar
        open={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 📄 Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0, // Critical for flex children to shrink below content size
          minHeight: '100vh',
          paddingTop: '64px', // Header height
          marginLeft: {
            xs: 0,
            lg: sidebarOpen ? '280px' : 0
          },
          transition: 'margin-left 0.3s ease-in-out',
          backgroundColor: '#f8fafc',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 🎯 Page Content */}
        <Box sx={{
          width: '100%',
          minWidth: 0,
          height: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}>
          {/* 📋 Page Header */}
          {(title || description) && (
            <Box sx={{ mb: 4 }}>
              {title && (
                <h1 style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>
                  {title}
                </h1>
              )}
              {description && (
                <p style={{
                  margin: 0,
                  color: '#6b7280',
                  fontSize: '1rem'
                }}>
                  {description}
                </p>
              )}
            </Box>
          )}

          {/* 🎨 Page Content */}
          <Box sx={{
            width: '100%',
            maxWidth: '100%',
            position: 'relative'
          }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LayoutWrapper; 