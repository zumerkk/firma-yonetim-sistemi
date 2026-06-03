// 🏗️ TEŞVİK MAKİNE SÜREÇ DURUMLARI - TEK MERKEZ
// Makine teçhizat süreç durumlarının (status) tek doğruluk kaynağı.
// Backend + Frontend bu sabitleri kullanır; durum, etiket, badge rengi ve
// geçiş kuralları yalnızca burada tanımlanır. (Spec: "Status enumlarını tek merkezden yönet.")

// 📌 Durum anahtarları (enum değerleri)
const MACHINE_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  INQUIRY_SENT: 'inquiry_sent',
  SUPPLIER_CONFIRMED: 'supplier_confirmed',
  ORDERED: 'ordered',
  MINISTRY_CODE_RECEIVED: 'ministry_code_received',
  VERIFICATION_MAIL_SENT: 'verification_mail_sent',
  WAITING_CUSTOMER_DOCUMENTS: 'waiting_customer_documents',
  WAITING_KDV_EXEMPTION: 'waiting_kdv_exemption',
  KDV_EXEMPTION_UPLOADED: 'kdv_exemption_uploaded',
  WAITING_INVOICE_DRAFT: 'waiting_invoice_draft',
  INVOICE_DRAFT_RECEIVED: 'invoice_draft_received',
  INVOICE_APPROVED: 'invoice_approved',
  DELIVERY_WAITING: 'delivery_waiting',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  BLOCKED: 'blocked'
});

// 🎨 Badge kategorileri → renk (UI/UX spec'i: gri/mavi/turuncu/kırmızı/yeşil)
// hex: tablo/badge için ham renk · muiColor: MUI <Chip color="..."> için
const STATUS_CATEGORY = Object.freeze({
  bekliyor: { label: 'Bekliyor', hex: '#9e9e9e', muiColor: 'default' },
  islemde: { label: 'İşlemde', hex: '#1976d2', muiColor: 'info' },
  evrak: { label: 'Evrak Bekliyor', hex: '#ed6c02', muiColor: 'warning' },
  sorunlu: { label: 'Sorunlu', hex: '#d32f2f', muiColor: 'error' },
  tamamlandi: { label: 'Tamamlandı', hex: '#2e7d32', muiColor: 'success' }
});

// 📋 Durum meta verisi: etiket (TR) + kategori (renk)
// Sıralama, akışın doğal ilerleyişini yansıtır (timeline/grid sıralaması için).
const STATUS_META = Object.freeze({
  [MACHINE_STATUS.NOT_STARTED]: { order: 0, label: 'İşlem Başlamadı', category: 'bekliyor' },
  [MACHINE_STATUS.INQUIRY_SENT]: { order: 1, label: 'Bilgi / GTİP Talebi Gönderildi', category: 'islemde' },
  [MACHINE_STATUS.SUPPLIER_CONFIRMED]: { order: 2, label: 'Tedarikçi Bilgisi Onaylandı', category: 'islemde' },
  [MACHINE_STATUS.ORDERED]: { order: 3, label: 'Sipariş Geçildi', category: 'islemde' },
  [MACHINE_STATUS.MINISTRY_CODE_RECEIVED]: { order: 4, label: 'Bakanlık / Teşvik Otomasyon Kodu Geldi', category: 'islemde' },
  [MACHINE_STATUS.VERIFICATION_MAIL_SENT]: { order: 5, label: 'Doğrulama Maili Gönderildi', category: 'islemde' },
  [MACHINE_STATUS.WAITING_CUSTOMER_DOCUMENTS]: { order: 6, label: 'Müşteri Evrakı Bekleniyor', category: 'evrak' },
  [MACHINE_STATUS.WAITING_KDV_EXEMPTION]: { order: 7, label: 'KDV Muafiyet Yazısı Bekleniyor', category: 'evrak' },
  [MACHINE_STATUS.KDV_EXEMPTION_UPLOADED]: { order: 8, label: 'KDV Muafiyet Yazısı Yüklendi', category: 'islemde' },
  [MACHINE_STATUS.WAITING_INVOICE_DRAFT]: { order: 9, label: 'Fatura Taslağı Bekleniyor', category: 'evrak' },
  [MACHINE_STATUS.INVOICE_DRAFT_RECEIVED]: { order: 10, label: 'Fatura Taslağı Geldi', category: 'islemde' },
  [MACHINE_STATUS.INVOICE_APPROVED]: { order: 11, label: 'Fatura Onaylandı', category: 'tamamlandi' },
  [MACHINE_STATUS.DELIVERY_WAITING]: { order: 12, label: 'Sevk / Teslimat Bekleniyor', category: 'evrak' },
  [MACHINE_STATUS.DELIVERED]: { order: 13, label: 'Teslim Edildi', category: 'islemde' },
  [MACHINE_STATUS.COMPLETED]: { order: 14, label: 'Tamamlandı', category: 'tamamlandi' },
  [MACHINE_STATUS.CANCELLED]: { order: 15, label: 'İptal', category: 'bekliyor' },
  [MACHINE_STATUS.BLOCKED]: { order: 16, label: 'Sorunlu / Askıda', category: 'sorunlu' }
});

// Enum değer listesi (Mongoose enum + validasyon için)
const STATUS_VALUES = Object.freeze(Object.values(MACHINE_STATUS));

// 🛑 Terminal durumlar — bu durumlardayken hatırlatma gönderilmez
//    (Spec: completed, invoice_approved, cancelled durumlarında hatırlatma yok)
const REMINDER_SUPPRESSED_STATUSES = Object.freeze([
  MACHINE_STATUS.COMPLETED,
  MACHINE_STATUS.INVOICE_APPROVED,
  MACHINE_STATUS.CANCELLED
]);

// Süreci fiilen kapatan durumlar (açık işlem sayımından düşülür)
const CLOSED_STATUSES = Object.freeze([
  MACHINE_STATUS.COMPLETED,
  MACHINE_STATUS.CANCELLED
]);

// 📎 Müşteri/tedarikçi evrak beklenen durumlar (dashboard sayacı için)
const DOCUMENT_WAITING_STATUSES = Object.freeze([
  MACHINE_STATUS.WAITING_CUSTOMER_DOCUMENTS,
  MACHINE_STATUS.WAITING_KDV_EXEMPTION,
  MACHINE_STATUS.WAITING_INVOICE_DRAFT,
  MACHINE_STATUS.DELIVERY_WAITING
]);

// 🔧 Yardımcılar
function isValidStatus(status) {
  return STATUS_VALUES.includes(status);
}

function getStatusMeta(status) {
  const meta = STATUS_META[status];
  if (!meta) return { order: -1, label: status || '-', category: 'bekliyor' };
  return meta;
}

function getStatusLabel(status) {
  return getStatusMeta(status).label;
}

// Badge için {label, hex, muiColor} döndürür
function getStatusBadge(status) {
  const { category, label } = getStatusMeta(status);
  const cat = STATUS_CATEGORY[category] || STATUS_CATEGORY.bekliyor;
  return { label, category, hex: cat.hex, muiColor: cat.muiColor };
}

function isReminderSuppressed(status) {
  return REMINDER_SUPPRESSED_STATUSES.includes(status);
}

// Frontend select / filtre için hazır liste
function statusOptions() {
  return STATUS_VALUES
    .map((value) => ({ value, ...getStatusBadge(value), order: getStatusMeta(value).order }))
    .sort((a, b) => a.order - b.order);
}

module.exports = {
  MACHINE_STATUS,
  STATUS_VALUES,
  STATUS_META,
  STATUS_CATEGORY,
  REMINDER_SUPPRESSED_STATUSES,
  CLOSED_STATUSES,
  DOCUMENT_WAITING_STATUSES,
  isValidStatus,
  getStatusMeta,
  getStatusLabel,
  getStatusBadge,
  isReminderSuppressed,
  statusOptions
};
