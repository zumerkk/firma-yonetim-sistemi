// 🧩 İşlem & Evrak talep durumları — liste ve Belge Takip'teki özet aynı etiket/rengi kullanır
export const TALEP_DURUMLARI = {
  taslak: { label: 'Taslak', color: '#64748b', bg: '#f1f5f9' },
  mail_gonderildi: { label: 'Mail Gönderildi', color: '#1d4ed8', bg: '#dbeafe' },
  kismi_geldi: { label: 'Kısmi Geldi', color: '#b45309', bg: '#fef3c7' },
  tamamlandi: { label: 'Tamamlandı', color: '#047857', bg: '#d1fae5' },
  iptal: { label: 'İptal', color: '#b91c1c', bg: '#fee2e2' }
};

export const talepDurumu = (durum) => TALEP_DURUMLARI[durum] || TALEP_DURUMLARI.taslak;
