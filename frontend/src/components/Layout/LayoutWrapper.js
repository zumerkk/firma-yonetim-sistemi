// 🎨 LAYOUT WRAPPER - CSS GRID BASED (matches Dashboard.js pattern)
// Bu component tüm sayfa düzenini (üst bar + menü + içerik) tek yerden kurar

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { UST_MENU_KIRILIMI } from './UstMenu';

// Üst menü ve kenar çubuğu sayfa içeriğinden bağımsız. Sarılmadıklarında sayfadaki her durum
// değişikliği — ör. bir metin kutusundaki her tuş vuruşu — 1300 satırlık kenar çubuğunu ve üst
// menüyü de baştan çiziyordu (müşteri, İşlem & Evrak: "Maili düzenlerken donmalar yaşıyoruz").
// Oturum ve konum gibi kendi verileri değişince kendi kancalarıyla yine güncellenirler.
const SabitHeader = memo(Header);
const SabitSidebar = memo(Sidebar);

// Müşteri (23.10.2026): menü E-TUYS'taki gibi üstte. Masaüstünde (≥1024px) ana menü Header'ın
// içindeki yatay çubuktur; dar ekranda Header'daki düğme aynı menüyü çekmece olarak açar.
// Başlık satırı "auto": üst menü sarsa da içerik hiçbir zaman altında kalmaz.
const LayoutWrapper = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < UST_MENU_KIRILIMI);

  // 📱 Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < UST_MENU_KIRILIMI;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
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
      gridTemplateRows: 'auto 1fr',
      gridTemplateColumns: '1fr',
      gridTemplateAreas: '"header" "content"',
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header + üst menü */}
      <Box sx={{ gridArea: 'header', zIndex: 1201, minWidth: 0 }}>
        <SabitHeader onSidebarToggle={sidebarToggle} />
      </Box>

      {/* Menü - Mobil çekmece */}
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
