// 🗂️ Belge sekmelerindeki tablolar — Yatırım Cinsi, Ürün Bilgileri, Özel Şartlar, Destek Unsurları.
//
// Eski ve yeni belge sayfaları ile firmaya verilen belge linki (pages/MusteriBelge) AYNI tabloları
// gösterir; üçü bir daha ayrışmasın diye tek yerde (önceden iki sayfada satır satır kopyaydı).
import React from 'react';
import { VeriTablosu } from '../../tasarim';

const sayi = (v) => (Number(v) || 0).toLocaleString('tr-TR');

export const YatirimCinsiTablosu = ({ tesvik }) => (
  <VeriTablosu
    sutunlar={[{ anahtar: 'cins', baslik: 'Yatırım Cinsi' }]}
    satirlar={[
      tesvik.yatirimBilgileri?.sCinsi1,
      tesvik.yatirimBilgileri?.tCinsi2,
      tesvik.yatirimBilgileri?.uCinsi3,
      tesvik.yatirimBilgileri?.vCinsi4
    ].filter(Boolean).map((cins, i) => ({ id: i, cins }))}
    bosMetin="Yatırım cinsi tanımlanmamış"
  />
);

// tur: 'eski' → US97 kodu, 'yeni' → NACE kodu (iki sistemde ürün kodu farklı)
export const UrunTablosu = ({ tesvik, tur = 'eski' }) => (
  <VeriTablosu
    enAzGenislik={600}
    satirlar={tesvik.urunler || []}
    anahtarAl={(u, i) => u?._id || i}
    bosMetin="Ürün bulunamadı"
    sutunlar={[
      tur === 'yeni'
        ? { anahtar: 'nace', baslik: 'NACE Kodu', genislik: 120, bicim: (_, u) => u.naceKodu || u.u97Kodu || u.us97Kodu || '-' }
        : { anahtar: 'us97', baslik: 'US97 Kodu', genislik: 120, bicim: (_, u) => u.u97Kodu || u.us97Kodu || u.naceKodu || '-' },
      { anahtar: 'urunAdi', baslik: 'Ürün Adı', bicim: (v) => v || '-' },
      { anahtar: 'mevcutKapasite', baslik: 'Mevcut Kap.', sayi: true, bicim: sayi },
      { anahtar: 'ilaveKapasite', baslik: 'İlave Kap.', sayi: true, bicim: sayi },
      { anahtar: 'toplamKapasite', baslik: 'Toplam Kap.', sayi: true, bicim: sayi },
      { anahtar: 'kapasiteBirimi', baslik: 'Kap. Birim', genislik: 120, bicim: (v) => v || '-' }
    ]}
  />
);

export const OzelSartTablosu = ({ tesvik }) => (
  <VeriTablosu
    enAzGenislik={600}
    satirlar={tesvik.ozelSartlar || []}
    anahtarAl={(x, i) => x?._id || i}
    bosMetin="Özel şart bulunamadı"
    sutunlar={[
      { anahtar: 'kisaltma', baslik: 'Kısaltma', genislik: '30%',
        bicim: (_, x, i) => x?.koşulMetni || x?.kisaltma || `Şart ${i + 1}` },
      { anahtar: 'aciklama', baslik: 'Açıklama',
        bicim: (_, x) => x?.aciklamaNotu || x?.sart || x?.metin || x?.aciklama || '-', sar: true }
    ]}
  />
);

// Müşteri isteği: Destek Unsurunda Açıklama kolonu kaldırılmıştı — korunuyor
export const DestekUnsuruTablosu = ({ tesvik }) => (
  <VeriTablosu
    enAzGenislik={600}
    satirlar={tesvik.destekUnsurlari || []}
    anahtarAl={(x, i) => x?._id || i}
    bosMetin="Destek unsuru bulunamadı"
    sutunlar={[
      { anahtar: 'destekUnsuru', baslik: 'Destek Unsuru', genislik: '40%', bicim: (v) => v || '-' },
      { anahtar: 'sarti', baslik: 'Şartı', bicim: (_, x) => x.sarti || x.sart || '-', sar: true }
    ]}
  />
);
