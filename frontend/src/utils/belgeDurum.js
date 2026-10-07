// 📑 Belge (Teşvik / Yeni Teşvik) durum yardımcıları
// Backend: backend/constants/belgeDurumlari.js ile birebir aynı sıra/değerler/renkler.
//
// Müşteri (07.10.2026): "Bu kısma Kapama Talepli ve Pasife alındı ekleyebilir miyiz?" — firma
// pasife alınınca belgeleri de kendiliğinden "Pasife Alındı" olur, firma aktif olunca geri döner.

export const BELGE_DURUM_SECENEKLERI = [
  { value: 'taslak', label: 'Taslak', renk: '#6B7280' },
  { value: 'hazirlaniyor', label: 'Hazırlanıyor', renk: '#F59E0B' },
  { value: 'başvuru_yapildi', label: 'Başvuru Yapıldı', renk: '#3B82F6' },
  { value: 'inceleniyor', label: 'İnceleniyor', renk: '#F97316' },
  { value: 'ek_belge_istendi', label: 'Ek Belge İstendi', renk: '#F59E0B' },
  { value: 'revize_talep_edildi', label: 'Revize Talep Edildi', renk: '#EF4444' },
  { value: 'onay_bekliyor', label: 'Onay Bekliyor', renk: '#F97316' },
  { value: 'onaylandi', label: 'Onaylandı', renk: '#10B981' },
  { value: 'reddedildi', label: 'Reddedildi', renk: '#EF4444' },
  { value: 'iptal_edildi', label: 'İptal Edildi', renk: '#6B7280' },
  { value: 'kapama_talepli', label: 'Kapama Talepli', renk: '#7C3AED' },
  { value: 'kapandi', label: 'Kapandı', renk: '#6B7280' },
  { value: 'pasife_alindi', label: 'Pasife Alındı', renk: '#94A3B8' }
];

// Durum değerini okunabilir Türkçe etikete çevir
export const belgeDurumLabel = (deger) => {
  const bulunan = BELGE_DURUM_SECENEKLERI.find((o) => o.value === deger);
  if (bulunan) return bulunan.label;
  return deger ? String(deger).replace(/_/g, ' ') : 'Bilinmiyor';
};

// Durumun ekran rengi (bilinmeyen durum gri)
export const belgeDurumRengi = (deger) =>
  BELGE_DURUM_SECENEKLERI.find((o) => o.value === deger)?.renk || '#6B7280';
