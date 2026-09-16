// 🎨 LAYOUT WRAPPER - CSS GRID BASED (matches Dashboard.js pattern)
// Bu component tüm sidebar ve layout problemlerini çözer

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

// Üst menü ve kenar çubuğu sayfa içeriğinden bağımsız. Sarılmadıklarında sayfadaki her durum
// değişikliği — ör. bir metin kutusundaki her tuş vuruşu — 1300 satırlık kenar çubuğunu ve üst
// menüyü de baştan çiziyordu (müşteri, İşlem & Evrak: "Maili düzenlerken donmalar yaşıyoruz").
// Oturum ve konum gibi kendi verileri değişince kendi kancalarıyla yine güncellenirler.
const SabitHeader = memo(Header);
const SabitSidebar = memo(Sidebar);

const LayoutWrapper = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // 📱 Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Kimliği sabit işleyiciler: satır içi ok fonksiyonu her render'da memo'yu bozardı
  const sidebarToggle = useCallback(() => setSidebarOpen((acik) => !acik), []);
  const sidebarKapat = useCallback(() => setSidebarOpen(false), []);

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateRows: '64px 1fr',
      gridTemplateColumns: {
        xs: '1fr',
        lg: sidebarOpen ? '280px 1fr' : '1fr'
      },
      gridTemplateAreas: {
        xs: '"header" "content"',
        lg: sidebarOpen ? '"header header" "sidebar content"' : '"header" "content"'
      },
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <Box sx={{ gridArea: 'header', zIndex: 1201 }}>
        <SabitHeader onSidebarToggle={sidebarToggle} />
      </Box>

      {/* Sidebar - Desktop */}
      {!isMobile && sidebarOpen && (
        <Box sx={{ gridArea: 'sidebar', zIndex: 1200 }}>
          <SabitSidebar open={sidebarOpen} onClose={sidebarKapat} variant="persistent" />
        </Box>
      )}

      {/* Sidebar - Mobile */}
      {isMobile && (
        <SabitSidebar open={sidebarOpen} onClose={sidebarKapat} variant="temporary" />
      )}

      {/* Main Content */}
      <Box component="main" sx={{
        gridArea: 'content',
        overflow: 'auto',
        minWidth: 0
      }}>
        {children}
      </Box>
    </Box>
  );
};

export default LayoutWrapper;
