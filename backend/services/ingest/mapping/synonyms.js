const normalizeHeader = (h) =>
  String(h || '')
    .trim()
    // Aksan temizleme + stabil küçük harf (Türkçe locale, "ID" -> "ıd" gibi sorunlar yaratıyor)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // combining marks
    .replace(/ı/g, 'i') // dotless i -> i (eşleştirme stabil olsun)
    .replace(/\s+/g, ' ')
    .replace(/[._-]+/g, ' ');

// Phase-1/2 scope (Firma + DosyaTakip + Teşvik/Yeni Teşvik temel alanlar)
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

  // Not: Ingest katmanı normalize ederken nested alanları düz (flat) alanlara map eder.
  // Örn: "Yatırım Konusu" -> "yatirimKonusu" (sonra ingestor bunu yatirimBilgileri.yatirimKonusu içine taşır)
  TESVIK: {
    tesvikId: ['tesvik id', 'tesvikid', 'teşvik id', 'teşvikid'],
    gmId: ['gm id', 'gmid', 'gm no', 'gmno'],
    firmaId: ['firma id', 'firmaid'],
    yatirimciUnvan: ['yatırımcı ünvan', 'yatirimci unvan', 'yatırımcı unvan', 'yatirimciunvan', 'yatirimci'],
    yatirimKonusu: ['yatırım konusu', 'yatirim konusu', 'yatirimkonusu'],
    destekSinifi: ['destek sınıfı', 'destek sinifi', 'desteksinifi'],
    yerinIl: ['yerin il', 'yerinil', 'yatırım yeri il', 'yatirim yeri il'],
    yerinIlce: ['yerin ilçe', 'yerin ilce', 'yerinilce', 'yatırım yeri ilçe', 'yatirim yeri ilce'],
    belgeId: ['belge id', 'belgeid'],
    belgeNo: ['belge no', 'belgeno', 'ytb no', 'ytbno'],
    belgeTarihi: ['belge tarihi', 'belgetarihi'],
  },

  YENI_TESVIK: {
    // Yeni teşvikte belge alanları taslak için opsiyonel olsa da mapping aynı tutulur
    tesvikId: ['tesvik id', 'tesvikid', 'teşvik id', 'teşvikid'],
    gmId: ['gm id', 'gmid', 'gm no', 'gmno'],
    firmaId: ['firma id', 'firmaid'],
    yatirimciUnvan: ['yatırımcı ünvan', 'yatirimci unvan', 'yatırımcı unvan', 'yatirimciunvan', 'yatirimci'],
    yatirimKonusu: ['yatırım konusu', 'yatirim konusu', 'yatirimkonusu'],
    destekSinifi: ['destek sınıfı', 'destek sinifi', 'desteksinifi'],
    yerinIl: ['yerin il', 'yerinil', 'yatırım yeri il', 'yatirim yeri il'],
    yerinIlce: ['yerin ilçe', 'yerin ilce', 'yerinilce', 'yatırım yeri ilçe', 'yatirim yeri ilce'],
    // Bonus sinyalleri (sınıflandırmaya da yardımcı olur; commit Phase-2'de opsiyonel)
    bonusOrani: ['bonus oranı', 'bonus orani', 'bonusorani'],
    bonusTutari: ['bonus tutarı', 'bonus tutari', 'bonustutari'],
  },
};

module.exports = { SYNONYMS, normalizeHeader };
