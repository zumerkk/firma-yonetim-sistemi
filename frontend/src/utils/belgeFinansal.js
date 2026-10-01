// 💰 FİNANSAL BİLGİLER — E-TUYS "Finansal Bilgiler" ekranının alan listesi
//
// Belge görünümü (eski + yeni) ve müşteri PDF'i aynı tanımı kullanır. E-TUYS düzeni:
// solda Arazi → Bina → Diğer Yatırım Harcamaları → Toplam Sabit Yatırım,
// sağda Makine → İthal Makine ($) → Yabancı Kaynak → Özkaynak → Toplam Finansman.
//
// Bu dosyaya taşınırken düzelen iki okuma hatası:
//  • Diğer yatırım harcamaları kalemleri bir kutu kayık okunuyordu (bkz. digerHarcamalar.js)
//    ve "Yardımcı işletme makine teçhizat" sabit 0 basılıyordu.
//  • İthal makine $ tutarı `makinaTechizat.yeniMakine` adıyla okunuyordu; şemadaki ad
//    `yeniMakina`. Görünümde "Yeni Makine ($)" her belgede $0 çıkıyordu.

import { digerHarcamalariOku } from './digerHarcamalar';

const sayi = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const metin = (v) => {
  const s = String(v ?? '').trim();
  return s || '-';
};

// tur: 'tl' | 'usd' | 'adet' | 'metin' — biçimlendirme ekran ve PDF'te ayrı yapılır
const satir = (etiket, deger, tur = 'tl', hesap = false) => ({ etiket, deger, tur, hesap });

export const finansalDegerYaz = ({ deger, tur }) => {
  if (tur === 'metin') return metin(deger);
  const n = sayi(deger).toLocaleString('tr-TR');
  if (tur === 'usd') return `$${n}`;
  if (tur === 'adet') return n;
  return `₺${n}`;
};

export const finansalBolumleri = (tesvik = {}) => {
  const mali = tesvik.maliHesaplamalar || {};
  const mt = mali.makinaTechizat || {};
  const bina = mali.binaInsaatGideri || {};
  const fin = mali.finansman || {};
  const arsa = mali.maliyetlenen || {};

  const araziBedeli = sayi(mali.araciArsaBedeli) || sayi(arsa.sn);
  const anaBina = sayi(bina.anaBinaGideri);
  const yardimciBina = sayi(bina.yardimciBinaGideri);
  const binaToplam = sayi(bina.toplamBinaGideri) || anaBina + yardimciBina;

  const diger = digerHarcamalariOku(mali.yatirimHesaplamalari);

  const ithalTl = sayi(mt.ithalMakina);
  const yerliTl = sayi(mt.yerliMakina);
  const makineToplam = sayi(mt.toplamMakina) || ithalTl + yerliTl;
  const yeniUsd = sayi(mt.yeniMakina ?? mt.yeniMakine);
  const kullanilmisUsd = sayi(mt.kullanimisMakina);
  const ithalUsdToplam = sayi(mt.toplamYeniMakina) || yeniUsd + kullanilmisUsd;

  const toplamSabit = sayi(mali.toplamSabitYatirim) || araziBedeli + binaToplam + makineToplam + diger.toplam;
  const yabanci = sayi(fin.yabanciKaynak);
  const ozkaynak = sayi(fin.ozKaynak);
  const toplamFinansman = sayi(fin.toplamFinansman) || yabanci + ozkaynak;

  const sol = [
    { baslik: 'Arazi-Arsa Gideri', satirlar: [
      satir('Arazi-Arsa Bedeli Açıklama', arsa.aciklama || mali.araziArsaBedeli?.aciklama, 'metin'),
      satir('Metrekaresi', arsa.sl, 'adet'),
      satir('Birim Fiyatı', arsa.sm),
      satir('Arazi Arsa Bedeli', araziBedeli, 'tl', true)
    ] },
    { baslik: 'Bina İnşaat Gideri', satirlar: [
      satir('Bina-İnşaat Giderleri Açıklama', bina.aciklama, 'metin'),
      satir('Ana bina ve tesisleri', anaBina),
      // Formda tek kutu: "Yardımcı İş. Bina ve İdare Binaları" — ayrı idare binası tutarı tutulmuyor
      satir('Yardımcı işletmeler ve idare binaları', yardimciBina),
      satir('Toplam Bina İnşaat Giderleri', binaToplam, 'tl', true)
    ] },
    { baslik: 'Diğer Yatırım Harcamaları', satirlar: [
      ...diger.kalemler.map((k) => satir(k.etiket, k.tutar)),
      satir('Toplam Diğer Yatırım Harcamaları', diger.toplam, 'tl', true)
    ] },
    { baslik: 'Toplam Sabit Yatırım', satirlar: [
      satir('TOPLAM SABİT YATIRIM TUTARI', toplamSabit, 'tl', true)
    ] }
  ];

  const sag = [
    { baslik: 'Makina ve Teçhizat Giderleri', satirlar: [
      satir('İthal', ithalTl),
      satir('Yerli', yerliTl),
      satir('Toplam Makine Teçhizat', makineToplam, 'tl', true)
    ] },
    { baslik: 'İthal Makine ($)', satirlar: [
      satir('Yeni Makine', yeniUsd, 'usd'),
      satir('Kullanılmış Makine', kullanilmisUsd, 'usd'),
      satir('Top. İthal. Mak. ($)', ithalUsdToplam, 'usd', true)
    ] },
    { baslik: 'Yabancı Kaynaklar', satirlar: [satir('Top. Yabancı Kaynak', yabanci)] },
    { baslik: 'Özkaynaklar', satirlar: [satir('Özkaynaklar', ozkaynak)] },
    { baslik: 'Toplam Finansman', satirlar: [satir('Toplam Finansman', toplamFinansman, 'tl', true)] }
  ];

  return { sol, sag };
};
