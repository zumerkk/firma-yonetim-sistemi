// 🔄 Yeni sürüm uyarısı
//
// Neden gerekli: Backend her deploy'da anında güncelleniyor, arayüz ise ancak kullanıcı
// sayfayı yenilediğinde. Sekmesini saatlerce açık tutan kullanıcı, backend'in dayattığı
// yeni bir kuralı karşılayamayan ESKİ arayüzle baş başa kalıyor.
//
// Gerçek vaka: "dosya açıklaması zorunlu" kuralı yayına alındığında, sekmesi açık kalan
// kullanıcı "açıklama olmadan yüklenemez" hatası aldı ama eski arayüzde açıklama yazacak
// kutu yoktu — çıkmaz sokak.
//
// Çalışma şekli: frontend sunucusunun /health ucu, o an sunulan ana JS paketinin adını
// döndürüyor. Sayfa, kendi yüklediği paketin adıyla karşılaştırıyor; fark varsa yenileme
// öneriyor. Sürüm numarası/etiket yönetimi gerektirmiyor — paket adı her derlemede değişiyor.

import React, { useCallback, useEffect, useState } from 'react';
import { Snackbar, Alert, Button } from '@mui/material';

const KONTROL_ARALIGI_MS = 5 * 60 * 1000;

// Sayfanın şu an çalıştırdığı ana paketin dosya adı (ör. main.c4fb5861.js)
const calisanPaketAdi = () => {
  try {
    const el = document.querySelector('script[src*="/static/js/main."]');
    if (!el) return null;
    return el.src.split('/').pop() || null;
  } catch (_) {
    return null;
  }
};

const SurumUyarisi = () => {
  const [yeniSurumVar, setYeniSurumVar] = useState(false);

  const kontrolEt = useCallback(async () => {
    const kendi = calisanPaketAdi();
    if (!kendi) return; // geliştirme sunucusunda hash'li paket yok
    try {
      const yanit = await fetch('/health', { cache: 'no-store' });
      if (!yanit.ok) return;
      const veri = await yanit.json();
      if (veri?.bundle && veri.bundle !== kendi) setYeniSurumVar(true);
    } catch (_) {
      // Ağ hatası veya /health yok (geliştirme) → sessizce geç
    }
  }, []);

  useEffect(() => {
    kontrolEt();
    const zamanlayici = setInterval(kontrolEt, KONTROL_ARALIGI_MS);
    // Sekmeye geri dönüldüğünde de bak: kullanıcı çoğu zaman uzun süre başka sekmededir
    const gorunurluk = () => { if (document.visibilityState === 'visible') kontrolEt(); };
    document.addEventListener('visibilitychange', gorunurluk);
    return () => {
      clearInterval(zamanlayici);
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, [kontrolEt]);

  if (!yeniSurumVar) return null;

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ zIndex: (t) => t.zIndex.snackbar + 1 }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()} sx={{ fontWeight: 700 }}>
            YENİLE
          </Button>
        }
      >
        Yeni sürüm yayınlandı. Hatalarla karşılaşmamak için sayfayı yenileyin.
      </Alert>
    </Snackbar>
  );
};

export default SurumUyarisi;
