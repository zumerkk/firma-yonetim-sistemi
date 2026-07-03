// ✉️ TEŞVİK MAKİNE MAİL SABİTLERİ - TEK MERKEZ
// Mail şablon kodları, varsayılan şablon içerikleri, evrak türleri,
// yükleyici tipleri ve süreç-log aksiyon tipleri burada tanımlıdır.

// 📬 Şablon kodları (MailTemplate.code ile birebir eşleşir)
const MAIL_TEMPLATE_CODE = Object.freeze({
  SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION: 'supplier_verification_invoice_instruction',
  CUSTOMER_DOCUMENT_REQUEST: 'customer_document_request',
  SUPPLIER_INFO_REQUEST: 'supplier_info_request',
  REMINDER_NO_RESPONSE: 'reminder_no_response',
  INVOICE_DRAFT_APPROVED: 'invoice_draft_approved'
});

// ✒️ Varsayılan mail imzası (Admin panelden override edilebilir → app ayarı)
const DEFAULT_SIGNATURE = [
  'Genel Müşavirlik ve İşletmecilik Ltd. Şti.',
  'GM Planlama Yatırım Danışmanlık San. ve Tic. Ltd. Şti.'
].join('\n');

// 🧩 Varsayılan şablonlar — DB boşsa seed edilir (seedMailTemplates.js).
// Placeholder formatı: {anahtar}. Mevcut placeholder'lar:
//   {firmaAdi} {makineAdi} {belgeNo} {belgeId} {belgeTarihi} {makineId}
//   {siraNo} {tedarikciMail} {tedarikciVergiNo} {uploadLink} {mailTarihi} {imza}
const DEFAULT_TEMPLATES = [
  {
    code: MAIL_TEMPLATE_CODE.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION,
    name: 'Tedarikçiye Bakanlık Doğrulama ve Fatura Yönergesi',
    // v2: ({tedarikciMail}) parantezi kaldırıldı + mail sonuna taslak yükleme linki eklendi
    // v3 (müşteri talebi): firma ismi kaldırıldı → "işbu firma" (konudan ve gövdeden)
    // v4 (müşteri talebi): "Öncelikle suret fatura hazırlanıp onay için tarafımıza gönderilmesi
    //    gerekmektedir." paragrafı eklendi + "Faturaya" → "Faturanın taslak haline" ifadesi
    version: 4,
    subjectTemplate: '{makineAdi} - YTB {belgeNo} Kapsamında Fatura Kesimi Hk.',
    bodyTemplate: [
      'Merhabalar,',
      '',
      'Bakanlıktan doğrulama maili tarafınıza iletilmiştir. Doğrulama işleminin tamamlanmasının ardından fatura kesim işlemine başlanabilir.',
      '',
      'Öncelikle suret fatura hazırlanıp onay için tarafımıza gönderilmesi gerekmektedir.',
      '',
      'Faturanın taslak haline yazılması gereken açıklama aşağıdaki gibidir:',
      '',
      'AÇIKLAMA:',
      '3065 sayılı KDV Kanunu’nun 13/d maddesi gereğince, işbu fatura, işbu firmanın {belgeTarihi} tarihli ve {belgeNo} no’lu Yatırım Teşvik Belgesi kapsamında, {makineId} makine ID numaralı {siraNo}. kalemin teslimatı olduğundan ilgili kanun gereğince KDV hesaplanmamıştır.',
      '',
      'Faturanın taslak halini kontrol amacıyla aşağıdaki bağlantı üzerinden yüklemenizi rica ederiz:',
      '',
      '{uploadLink}',
      '',
      'İyi çalışmalar dileriz.',
      '',
      '{imza}'
    ].join('\n')
  },
  {
    code: MAIL_TEMPLATE_CODE.REMINDER_NO_RESPONSE,
    name: '7 Gün Cevap Gelmeyenlere Hatırlatma Maili',
    // v2 (müşteri talebi): firma ismi kaldırıldı → "işbu firma"
    version: 2,
    subjectTemplate: 'Hatırlatma - {makineAdi} Teşvik Süreci Hk.',
    bodyTemplate: [
      'Merhabalar,',
      '',
      '{mailTarihi} tarihinde işbu firmanın {belgeNo} no’lu yatırım teşvik belgesi kapsamında {makineAdi} için tarafınıza bilgi/evrak talebi iletilmişti.',
      '',
      'Sürecin aksamaması adına gerekli dönüşün ve varsa ilgili belgelerin tarafımıza iletilmesini rica ederiz.',
      '',
      'Evrak yükleme bağlantısı:',
      '{uploadLink}',
      '',
      'İyi çalışmalar dileriz.',
      '',
      '{imza}'
    ].join('\n')
  },
  {
    code: MAIL_TEMPLATE_CODE.INVOICE_DRAFT_APPROVED,
    name: 'Fatura Taslağı Kontrol Sonrası Onay Maili',
    // v2: KDV istisna cümlesi yerine fatura kesimi sonrası XML+PDF yükleme bağlantısı
    // v3 (müşteri talebi): firma ismi kaldırıldı → "işbu firma"
    version: 3,
    subjectTemplate: '{makineAdi} - Fatura Taslağı Onayı',
    bodyTemplate: [
      'Merhabalar,',
      '',
      'İletmiş olduğunuz fatura taslağı kontrol edilmiştir.',
      '',
      'İşbu firmanın {belgeNo} no’lu yatırım teşvik belgesi kapsamında {siraNo}. sırada yer alan {makineAdi} için fatura kesim işlemine geçebilirsiniz.',
      '',
      'Fatura kesildikten sonra XML ve PDF formatında aşağıdaki bağlantıya yüklemenizi rica ederiz:',
      '',
      '{uploadLink}',
      '',
      'İyi çalışmalar.',
      '',
      '{imza}'
    ].join('\n')
  }
];

// 📁 Evrak türleri — klasör alt-dizinleri ile eşleşir (storageService).
// key: sistem değeri · label: UI etiketi · folder: klasör adı
const DOCUMENT_TYPES = Object.freeze([
  { key: 'kdv_muafiyet', label: 'KDV Muafiyet Yazısı', folder: 'KDV_Muafiyet' },
  { key: 'proforma_teklif', label: 'Proforma / Teklif', folder: 'Proforma_Teklif' },
  { key: 'fatura_taslak', label: 'Fatura Taslağı', folder: 'Fatura_Taslak' },
  { key: 'fatura_onayli', label: 'Onaylı Fatura', folder: 'Fatura_Onayli' },
  { key: 'sevk_teslimat', label: 'Sevk / Teslimat Belgesi', folder: 'Sevk_Teslimat' },
  { key: 'diger', label: 'Diğer', folder: 'Diger' }
]);

const DOCUMENT_TYPE_KEYS = Object.freeze(DOCUMENT_TYPES.map((d) => d.key));

function getDocumentTypeFolder(key) {
  const found = DOCUMENT_TYPES.find((d) => d.key === key);
  return (found && found.folder) || 'Diger';
}

// 👤 Yükleyici tipleri
const UPLOADER_TYPE = Object.freeze({
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier'
});

// 🧾 Süreç-log aksiyon tipleri (MachineProcessLog.actionType)
const PROCESS_ACTION = Object.freeze({
  CREATED: 'created',
  STATUS_CHANGE: 'status_change',
  MAIL_DRAFT: 'mail_draft',
  MAIL_SENT: 'mail_sent',
  MAIL_FAILED: 'mail_failed',
  REMINDER_SENT: 'reminder_sent',
  REMINDER_STOPPED: 'reminder_stopped',
  DOCUMENT_UPLOADED: 'document_uploaded',
  FOLDER_CREATED: 'folder_created',
  UPLOAD_LINK_CREATED: 'upload_link_created',
  NOTE_ADDED: 'note_added',
  BARCODE_ENTERED: 'barcode_entered',
  PARSER_MATCHED: 'parser_matched',
  FIELDS_UPDATED: 'fields_updated'
});

// 📨 Mail gönderim/taslak/başarısız durumları (MailLog.status)
const MAIL_STATUS = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  FAILED: 'failed'
});

// ⏰ Hatırlatma türleri (ReminderJob.reminderType)
const REMINDER_TYPE = Object.freeze({
  NO_RESPONSE: 'no_response'
});

// ⛔ Kullanımdan kaldırılan şablonlar (müşteri talebi #1) — seed sırasında pasifleştirilir,
// arayüz dropdown'ında görünmez. Kod sabitleri (MAIL_TEMPLATE_CODE) referanslar için korunur.
const DEPRECATED_TEMPLATE_CODES = Object.freeze([
  MAIL_TEMPLATE_CODE.CUSTOMER_DOCUMENT_REQUEST,
  MAIL_TEMPLATE_CODE.SUPPLIER_INFO_REQUEST
]);

module.exports = {
  MAIL_TEMPLATE_CODE,
  DEFAULT_SIGNATURE,
  DEFAULT_TEMPLATES,
  DEPRECATED_TEMPLATE_CODES,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_KEYS,
  getDocumentTypeFolder,
  UPLOADER_TYPE,
  PROCESS_ACTION,
  MAIL_STATUS,
  REMINDER_TYPE
};
