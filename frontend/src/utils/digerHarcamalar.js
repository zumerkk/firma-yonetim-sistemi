// 📊 DİĞER YATIRIM HARCAMALARI — tek eşleme tablosu
//
// Veritabanında bu altı kalem, eski Excel şablonunun sütun harfleriyle saklanıyor:
// maliHesaplamalar.yatirimHesaplamalari.{et, eu, ev, ew, ex, ey} ve toplam ez.
// Harfler E-TUYS "Finansal Bilgiler" ekranındaki sırayı izler:
//     ET Yardımcı işletme mak. · EU İthalat ve gümrükleme · EV Taşıma ve sigorta
//     EW Montaj · EX Etüd ve proje · EY Diğer
//
// Müşteri (01.10.2026): "Finansal bilgilerde diğer harcamalar sola kayıyor galiba ya da
// montaj giderlerine girdiğimiz sayılar yardımcı işl. mak. teç. kısmında görünüyor."
// KÖK SEBEP: Excel içe aktarma, eski belge içe aktarma ve ekran görüntüsünden aktarma
// yukarıdaki sırayla YAZIYORDU (canlıda 857 eski belgenin 717'si bu yolla dolu). "Montaj"
// sonradan eklenirken form onu ET'ye koyup yardımcıyı EU'ya kaydırmış; belge görünümü,
// PDF ve Excel çıktısı da formun sırasıyla OKUYORDU. Sonuç: aktarılan belgelerde ithalat
// "yardımcı"da, taşıma "ithalat"ta, montaj "taşıma"da görünüyordu — bir kutu sola kayma.
// Formdan elle girilen montaj ise ET'ye yazılıp revizyon Excel'inde "yardımcı" sütununa
// düşüyordu. Artık herkes bu tabloyu kullanıyor; sıra bir daha ayrışamaz.

export const DIGER_HARCAMA_KALEMLERI = [
  { kod: 'et', formAlani: 'yardimciIslMakTeçGid', etiket: 'Yardımcı işletme makine teçhizat giderleri' },
  { kod: 'eu', formAlani: 'ithalatVeGumGiderleri', etiket: 'İthalat ve gümrükleme giderleri' },
  { kod: 'ev', formAlani: 'tasimaVeSigortaGiderleri', etiket: 'Taşıma ve sigorta giderleri' },
  { kod: 'ew', formAlani: 'montajGiderleri', etiket: 'Montaj giderleri' },
  { kod: 'ex', formAlani: 'etudVeProjeGiderleri', etiket: 'Etüd ve proje giderleri' },
  { kod: 'ey', formAlani: 'digerGiderleri', etiket: 'Diğer giderler' }
];

const sayi = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Kayıttaki yatirimHesaplamalari → [{ ...kalem, tutar }] ve toplam.
// Toplam her zaman kalemlerden hesaplanır: kayıttaki ez eski eşlemeyle yazılmış olabilir.
export const digerHarcamalariOku = (yatirimHesaplamalari) => {
  const yh = yatirimHesaplamalari || {};
  const kalemler = DIGER_HARCAMA_KALEMLERI.map((k) => ({ ...k, tutar: sayi(yh[k.kod]) }));
  const toplam = kalemler.reduce((t, k) => t + k.tutar, 0);
  return { kalemler, toplam };
};

// Kayıt → form (finansalBilgiler.digerYatirimHarcamalari)
export const digerHarcamalariForma = (yatirimHesaplamalari) => {
  const { kalemler, toplam } = digerHarcamalariOku(yatirimHesaplamalari);
  const form = { toplamDigerYatirimHarcamalari: toplam };
  kalemler.forEach((k) => { form[k.formAlani] = k.tutar; });
  return form;
};

// Form → kayıt (maliHesaplamalar.yatirimHesaplamalari)
export const digerHarcamalariKayda = (digerYatirimHarcamalari) => {
  const d = digerYatirimHarcamalari || {};
  const kayit = {};
  let toplam = 0;
  DIGER_HARCAMA_KALEMLERI.forEach((k) => {
    kayit[k.kod] = sayi(d[k.formAlani]);
    toplam += kayit[k.kod];
  });
  kayit.ez = toplam;
  return kayit;
};
