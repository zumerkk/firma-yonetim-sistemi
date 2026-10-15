// Kapasitelerde tek ayıraç ondalıktır: 4.125 MW, 4,125 MW ile aynı değerdir.
// Finansal alanların "1.500 = 1500" kuralı burada kullanılmaz.
export const kapasiteCoz = (deger) => {
  if (deger === null || deger === undefined || deger === '') return '';
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : '';

  let metin = String(deger).trim().replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(metin) || !/\d/.test(metin)) return '';

  const sonVirgul = metin.lastIndexOf(',');
  const sonNokta = metin.lastIndexOf('.');
  if (sonVirgul !== -1 && sonNokta !== -1) {
    // İki ayıraç varsa sondaki ondalık, diğeri binliktir (TR / EN yapıştırma).
    metin = sonVirgul > sonNokta
      ? metin.replace(/\./g, '').replace(',', '.')
      : metin.replace(/,/g, '');
  } else {
    const ayrac = sonVirgul !== -1 ? ',' : '.';
    const adet = metin.split(ayrac).length - 1;
    if (adet > 1) {
      // Birden fazla aynı ayıraç yalnız düzgün binlik gruplarda kabul edilir.
      const gruplar = metin.replace(/^-/, '').split(ayrac);
      if (!/^\d{1,3}$/.test(gruplar[0]) || !gruplar.slice(1).every(g => /^\d{3}$/.test(g))) return '';
      metin = metin.split(ayrac).join('');
    } else if (ayrac === ',') {
      metin = metin.replace(',', '.');
    }
  }

  const sayi = Number(metin);
  return Number.isFinite(sayi) ? sayi : '';
};

/** Kayıtlı sayıyı Türkçe gösterir; düzenleme sırasında binlik gruplama kapatılır. */
export const kapasiteYaz = (deger, { gruplama = true } = {}) => {
  const sayi = kapasiteCoz(deger);
  return sayi === '' ? '' : sayi.toLocaleString('tr-TR', {
    useGrouping: gruplama,
    maximumSignificantDigits: 21
  });
};

const ondalikBasamakSayisi = (sayi) => {
  const [katsayi, us = '0'] = String(sayi).toLowerCase().split('e');
  return Math.max(0, (katsayi.split('.')[1] || '').length - Number(us));
};

/** Küsuratları korur; 0,1 + 0,2 toplamında kayan nokta artığını göstermez. */
export const kapasiteToplami = (mevcut, ilave) => {
  const a = kapasiteCoz(mevcut) || 0;
  const b = kapasiteCoz(ilave) || 0;
  const basamak = Math.max(ondalikBasamakSayisi(a), ondalikBasamakSayisi(b));
  const toplam = a + b;
  // toFixed en fazla 100 basamak kabul eder; daha küçük sayıları sıfıra yuvarlama.
  return basamak > 100 ? toplam : Number(toplam.toFixed(basamak));
};

/** Formdan API'ye geçerken kapasiteyi tam sayıya yuvarlamaz; toplamı yeniler. */
export const urunuKaydaCevir = (urun) => {
  const mevcutKapasite = kapasiteCoz(urun.mevcut) || 0;
  const ilaveKapasite = kapasiteCoz(urun.ilave) || 0;
  return {
    u97Kodu: urun.kod || '',
    urunAdi: urun.aciklama || '',
    mevcutKapasite,
    ilaveKapasite,
    toplamKapasite: kapasiteToplami(mevcutKapasite, ilaveKapasite),
    kapasiteBirimi: urun.kapasite_birimi || ''
  };
};
