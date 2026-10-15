const ondalikBasamakSayisi = (sayi) => {
  const [katsayi, us = '0'] = String(sayi).toLowerCase().split('e');
  return Math.max(0, (katsayi.split('.')[1] || '').length - Number(us));
};

// frontend/src/utils/urunKapasite.js ile aynı toplam kuralı. Sabit iki haneye
// yuvarlamak yerine girdilerin ondalık basamaklarını korur; 0.1 + 0.2 artığını
// kaldırır. Depolama hâlâ Number olduğundan JavaScript sayı hassasiyeti geçerlidir.
const kapasiteToplami = (mevcut, ilave) => {
  const a = Number.isFinite(mevcut) ? mevcut : 0;
  const b = Number.isFinite(ilave) ? ilave : 0;
  const basamak = Math.max(ondalikBasamakSayisi(a), ondalikBasamakSayisi(b));
  const toplam = a + b;
  // toFixed en çok 100 basamak alır; daha küçük sayıları sıfıra yuvarlama.
  return basamak > 100 ? toplam : Number(toplam.toFixed(basamak));
};

// frontend/src/utils/urunKapasite.js ile aynı çözümleme kuralı. Kapasitelerde
// tek ayıraç ondalıktır: 4.125 MW, 4,125 MW ile aynı değerdir.
const kapasiteCoz = (deger) => {
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

module.exports = { kapasiteCoz, kapasiteToplami };
