const normalizeHeader = (h) =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[._-]+/g, ' ');

// Phase-1 scope (Firma + DosyaTakip)
const SYNONYMS = {
  FIRMA: {
    vergiNoTC: ['vergi no', 'vergi no/tc', 'vkn', 'tckn', 'vergino', 'vergi no tc'],
    tamUnvan: ['tam ünvan', 'unvan', 'ünvan', 'firma ünvanı', 'firma unvani'],
    adres: ['adres', 'açık adres', 'acik adres'],
    firmaIl: ['il', 'şehir', 'sehir', 'firma il'],
    firmaIlce: ['ilçe', 'ilce', 'firma ilçe', 'firma ilce'],
    kepAdresi: ['kep', 'kep adresi', 'kepadresi'],
    ilkIrtibatKisi: [
      'ilk irtibat kişisi',
      'ilk irtibat',
      'irtibat',
      'irtibat kişisi',
      'irtibat kisisi',
    ],
    etuysYetkiBitisTarihi: [
      'etuys bitiş',
      'etuys bitis',
      'etuys yetki bitiş',
      'etuys yetki bitis',
      'etuysYetkiBitisTarihi',
    ],
    dysYetkiBitisTarihi: [
      'dys bitiş',
      'dys bitis',
      'dys yetki bitiş',
      'dys yetki bitis',
      'dysYetkiBitisTarihi',
    ],
  },
  DOSYA_TAKIP: {
    takipId: ['takipid', 'takip id', 'id'],
    firmaId: ['firma id', 'firmaid'],
    vergiNoTC: ['vergi no', 'vkn', 'tckn', 'vergino'],
    talepTuru: ['talepturu', 'talep türü', 'talep turu'],
    durum: ['durum', 'durum kodu', 'state'],
    anaAsama: ['ana aşama', 'ana asama', 'asama'],
    firmaUnvan: ['firma unvan', 'firma ünvan', 'unvan', 'ünvan'],
    ytbNo: ['ytb no', 'ytbno', 'belge no'],
    belgeId: ['belge id', 'belgeid'],
  },
};

module.exports = { SYNONYMS, normalizeHeader };
