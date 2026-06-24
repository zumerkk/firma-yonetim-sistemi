// 📑 Belge (Teşvik / Yeni Teşvik) durum yardımcıları
// Backend: durumBilgileri.genelDurum enum'u ile birebir aynı sıra/değerler.

export const BELGE_DURUM_SECENEKLERI = [
  { value: 'taslak', label: 'Taslak' },
  { value: 'hazirlaniyor', label: 'Hazırlanıyor' },
  { value: 'başvuru_yapildi', label: 'Başvuru Yapıldı' },
  { value: 'inceleniyor', label: 'İnceleniyor' },
  { value: 'ek_belge_istendi', label: 'Ek Belge İstendi' },
  { value: 'revize_talep_edildi', label: 'Revize Talep Edildi' },
  { value: 'onay_bekliyor', label: 'Onay Bekliyor' },
  { value: 'onaylandi', label: 'Onaylandı' },
  { value: 'reddedildi', label: 'Reddedildi' },
  { value: 'iptal_edildi', label: 'İptal Edildi' }
];

// Durum değerini okunabilir Türkçe etikete çevir
export const belgeDurumLabel = (deger) => {
  const bulunan = BELGE_DURUM_SECENEKLERI.find((o) => o.value === deger);
  if (bulunan) return bulunan.label;
  return deger ? String(deger).replace(/_/g, ' ') : 'Bilinmiyor';
};
