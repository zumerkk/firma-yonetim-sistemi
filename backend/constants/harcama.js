const ortakKategoriler = {
  faizKarPayi: 'Faiz veya Kar Payı Giderleri',
  kurFarki: 'Kur Farkı Giderleri',
  maddiOlmayanVarlik: 'Maddi Olmayan Varlık Giderleri'
};

const kategori = (etiket, altKategoriler) => ({
  etiket,
  altKategoriler: Object.entries(altKategoriler).map(([id, ad]) => ({ id, etiket: ad }))
});

const HARCAMA_KATEGORILERI = {
  diger: kategori('Diğer Harcamalar', {
    diger: 'Diğer Giderler',
    etutProje: 'Etüt ve Proje Giderleri',
    faizKarPayi: ortakKategoriler.faizKarPayi,
    ithalatGumrukleme: 'İthalat ve Gümrükleme Giderleri',
    kurFarki: ortakKategoriler.kurFarki,
    maddiOlmayanVarlik: ortakKategoriler.maddiOlmayanVarlik,
    montaj: 'Montaj Giderleri',
    tasimaSigorta: 'Taşıma ve Sigorta Giderleri',
    yardimciMakine: 'Yardımcı Makine Teçhizat Giderleri',
    harcamaBelgesi: 'Harcama Belgesi'
  }),
  bina: kategori('Bina İnşaat Giderleri', {
    anaBina: 'Ana Bina ve Tesisleri',
    faizKarPayi: ortakKategoriler.faizKarPayi,
    idareBinalari: 'İdare Binaları',
    kurFarki: ortakKategoriler.kurFarki,
    maddiOlmayanVarlik: ortakKategoriler.maddiOlmayanVarlik,
    yardimciIsletmeler: 'Yardımcı İşletmeler Bina ve Tesisleri',
    yerAltiGalerileri: 'Yeraltı Galerileri'
  }),
  arazi: kategori('Arazi - Arsa', {
    arazi: 'Arazi Giderleri',
    ...ortakKategoriler
  })
};

module.exports = { HARCAMA_KATEGORILERI };
