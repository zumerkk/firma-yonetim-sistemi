// 👥 Belge Takip — "Takibi Yapan" birden fazla kişi (müşteri, 13.10.2026). Birincil önce gelir;
// sunucudaki karşılığı backend/services/dosyaTakip/takipEdenler.js
export const takipEdenAdlari = (talep) => {
  const ms = talep?.muraacatSonrasi || {};
  const birincil = ms.takibiYapanPersonel?.adSoyad || ms.takibiYapanAdi || '';
  const ekler = (ms.ekTakipEdenler || []).map((k) => k?.adSoyad || '').filter(Boolean);
  return [...new Set([birincil, ...ekler].filter(Boolean))];
};
