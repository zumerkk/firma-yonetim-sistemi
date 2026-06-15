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
    subjectTemplate: '{firmaAdi} - {makineAdi} - YTB {belgeNo} Kapsamında Fatura Kesimi Hk.',
    bodyTemplate: [
      'Merhabalar,',
      '',
      'Bakanlıktan doğrulama maili tarafınıza ({tedarikciMail}) iletilmiştir. Doğrulama işleminin tamamlanmasının ardından fatura kesim işlemine başlanabilir.',
      '',
      'Faturaya yazılması gereken açıklama aşağıdaki gibidir:',
      '',
      'AÇIKLAMA:',
      '3065 sayılı KDV Kanunu’nun 13/d maddesi gereğince, işbu fatura {firmaAdi} firmasının {belgeTarihi} tarihli ve {belgeNo} no’lu Yatırım Teşvik Belgesi kapsamında, {makineId} makine ID numaralı {siraNo}. kalemin teslimatı olduğundan ilgili kanun gereğince KDV hesaplanmamıştır.',
      '',
      'Faturanın taslak halinin kontrol amacıyla tarafımıza iletilmesini rica ederiz.',
      '',
      'İyi çalışmalar dileriz.',
      '',
      '{imza}'
    ].join('\n')
  },
  {
    code: MAIL_TEMPLATE_CODE.CUSTOMER_DOCUMENT_REQUEST,
    name: 'Müşteriden KDV Muafiyet / Evrak Talep Maili',
    subjectTemplate: '{firmaAdi} - {makineAdi} - Teşvik Evrak Yükleme Talebi',
    bodyTemplate: [
      'Merhabalar,',
      '',
      '{belgeNo} no’lu yatırım teşvik belgeniz kapsamında {siraNo}. sırada yer alan {makineAdi} için işlem başlatılmıştır.',
      '',
      'Sürecin ilerleyebilmesi için ilgili evrakları aşağıdaki bağlantı üzerinden yüklemenizi rica ederiz:',
      '',
      'Evrak Yükleme Linki:',
      '{uploadLink}',
      '',
      'Gerekli evraklar:',
      '- KDV muafiyet yazısı',
      '- Proforma / teklif',
      '- Fatura taslağı',
      '- Varsa sevk / teslimat belgeleri',
      '',
      'Belgeler yüklendikten sonra tarafımızca kontrol edilerek süreç devam ettirilecektir.',
      '',
      'Saygılarımızla.',
      '',
      '{imza}'
    ].join('\n')
  },
  {
    code: MAIL_TEMPLATE_CODE.SUPPLIER_INFO_REQUEST,
    name: 'Tedarikçi Bilgi / GTİP / Proforma Talep Maili',
    subjectTemplate: '{firmaAdi} - {makineAdi} - GTİP ve Teşvik Bilgileri Hk.',
    bodyTemplate: [
      'Merhabalar,',
      '',
      '{firmaAdi} firmamız, yatırım teşvik belgesi kapsamında listenin {siraNo}. sırasında yer alan {makineAdi} için satın alma süreci başlatacaktır.',
      '',
      'Bu kapsamda aşağıdaki bilgilerin tarafımıza iletilmesini rica ederiz:',
      '',
      '- Makine / ekipman tam adı',
      '- GTİP numarası',
      '- Vergi numarası',
      '- Fatura kesilecek unvan',
      '- Proforma / teklif',
      '- Termin bilgisi',
      '- Varsa teknik doküman',
      '',
      'Mail: {tedarikciMail}',
      'Vergi No: {tedarikciVergiNo}',
      '',
      'Bilgilerinize sunar, iyi çalışmalar dileriz.',
      '',
      '{imza}'
    ].join('\n')
  },
  {
    code: MAIL_TEMPLATE_CODE.REMINDER_NO_RESPONSE,
    name: '7 Gün Cevap Gelmeyenlere Hatırlatma Maili',
    subjectTemplate: 'Hatırlatma - {firmaAdi} - {makineAdi} Teşvik Süreci Hk.',
    bodyTemplate: [
      'Merhabalar,',
      '',
      '{mailTarihi} tarihinde {firmaAdi} firmasının {belgeNo} no’lu yatırım teşvik belgesi kapsamında {makineAdi} için tarafınıza bilgi/evrak talebi iletilmişti.',
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
    // v2 (müşteri talebi): KDV istisna cümlesi yerine fatura kesimi sonrası XML+PDF yükleme bağlantısı
    version: 2,
    subjectTemplate: '{firmaAdi} - {makineAdi} - Fatura Taslağı Onayı',
    bodyTemplate: [
      'Merhabalar,',
      '',
      'İletmiş olduğunuz fatura taslağı kontrol edilmiştir.',
      '',
      '{firmaAdi} firmasının {belgeNo} no’lu yatırım teşvik belgesi kapsamında {siraNo}. sırada yer alan {makineAdi} için fatura kesim işlemine geçebilirsiniz.',
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

module.exports = {
  MAIL_TEMPLATE_CODE,
  DEFAULT_SIGNATURE,
  DEFAULT_TEMPLATES,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_KEYS,
  getDocumentTypeFolder,
  UPLOADER_TYPE,
  PROCESS_ACTION,
  MAIL_STATUS,
  REMINDER_TYPE
};
