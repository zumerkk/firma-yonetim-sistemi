// 🛡️ Page Refresh Handler Hook - F5 Basınca Not Found Engelleyici
// Bu hook sayfa yenilendiğinde otomatik olarak uygun sayfaya yönlendirir

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const usePageRefreshHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 🔄 Window beforeunload event listener - Sayfa yenilendiğinde çalışır
    const handleBeforeUnload = () => {
      // Store current path in sessionStorage
      sessionStorage.setItem('lastVisitedPath', location.pathname);
      console.log(`📍 Sayfa yenileniyor, path kaydedildi: ${location.pathname}`);
    };

    // 🎯 Window load event listener - Sayfa yüklendikinde çalışır  
    const handleLoad = () => {
      const lastPath = sessionStorage.getItem('lastVisitedPath');
      
      if (lastPath && lastPath !== location.pathname) {
        console.log(`🔄 Sayfa yenilendi, otomatik yönlendiriliyor: ${lastPath}`);
        
        // Clear the stored path
        sessionStorage.removeItem('lastVisitedPath');
        
        // Navigate to the stored path
        navigate(lastPath, { replace: true });
      }
    };

    // 🚨 Error handler - 404 durumlarında çalışır
    const handleError = (event) => {
      if (event.target && event.target.tagName === 'LINK') {
        console.log('🚨 Resource loading error, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    };

    // Event listeners ekle
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);
    window.addEventListener('error', handleError, true);

    // 🧹 Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('error', handleError, true);
    };
  }, [navigate, location.pathname]);

  // 🛡️ Manual refresh handler function
  const handleManualRefresh = () => {
    sessionStorage.setItem('lastVisitedPath', location.pathname);
    window.location.reload();
  };

  return { handleManualRefresh };
};

// 🎯 Route validator - Geçersiz route'lar için fallback
export const validateAndRedirect = (path, navigate) => {
  const validRoutes = [
    '/dashboard',
    '/firmalar',
    '/tesvik',
    '/son-islemler',
    '/istatistikler',
    '/ayarlar',
    '/profil',
    '/bildirimler',
    '/admin',
    '/raporlar',
    '/dosyalar'
  ];

  const isValidRoute = validRoutes.some(route => path.startsWith(route));
  
  if (!isValidRoute) {
    console.log(`🚫 Geçersiz route tespit edildi: ${path}, dashboard'a yönlendiriliyor`);
    navigate('/dashboard', { replace: true });
    return false;
  }

  return true;
};