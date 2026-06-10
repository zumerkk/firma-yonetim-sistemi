// 🧰 Teşvik Makine - paylaşılan UI yardımcıları
import React from 'react';
import { Chip } from '@mui/material';

// Tarihleri lokal (tr-TR) formatla
export function formatDate(value, withTime = false) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const opts = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Intl.DateTimeFormat('tr-TR', opts).format(d);
}

// Para formatı
export function formatMoney(value, currency = 'TRY') {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY', maximumFractionDigits: 2 }).format(n);
  } catch (_) {
    return `${n.toLocaleString('tr-TR')} ${currency || ''}`.trim();
  }
}

// MUI Chip color adı (backend muiColor döndürür; fallback kategori→renk)
const CATEGORY_COLOR = {
  bekliyor: 'default', islemde: 'info', evrak: 'warning', sorunlu: 'error', tamamlandi: 'success'
};

// Durum badge'i (statusBadge: {label, muiColor, hex} ya da {label, category})
export function StatusChip({ badge, size = 'small' }) {
  if (!badge) return <Chip label="-" size={size} />;
  const color = badge.muiColor || CATEGORY_COLOR[badge.category] || 'default';
  return <Chip label={badge.label} size={size} color={color} variant="filled" />;
}

// Liste türü etiketi
export function listTypeLabel(lt) {
  return lt === 'import' ? 'İthal' : 'Yerli';
}

// 🇹🇷 Sistem kodları → Türkçe etiketler (müşteri geri bildirimi: İngilizce/alt-çizgili kodlar kafa karıştırıyor)
export const MAIL_STATUS_TR = { draft: 'Taslak', sent: 'Gönderildi', failed: 'Başarısız' };
export const REMINDER_STATUS_TR = { pending: 'Bekliyor', sent: 'Gönderildi', skipped: 'Atlandı', failed: 'Başarısız' };
export const UPLOADER_TR = { admin: 'Personel', customer: 'Müşteri', supplier: 'Tedarikçi' };
export const DOC_TYPE_TR = {
  kdv_muafiyet: 'KDV Muafiyet Yazısı', proforma_teklif: 'Proforma / Teklif', fatura_taslak: 'Fatura Taslağı',
  fatura_onayli: 'Onaylı Fatura', sevk_teslimat: 'Sevk / Teslimat', diger: 'Diğer'
};
export const TEMPLATE_TR = {
  supplier_verification_invoice_instruction: 'Tedarikçi Doğrulama / Fatura Yönergesi',
  customer_document_request: 'Müşteri Evrak Talebi',
  supplier_info_request: 'Tedarikçi Bilgi / GTİP Talebi',
  reminder_no_response: 'Hatırlatma (Cevapsız)',
  invoice_draft_approved: 'Fatura Taslağı Onayı'
};
const ACTION_TR = {
  created: 'Süreç başlatıldı', status_change: 'Durum değişti', mail_draft: 'Mail taslağı oluşturuldu',
  mail_sent: 'Mail gönderildi', mail_failed: 'Mail gönderilemedi', reminder_sent: 'Hatırlatma gönderildi',
  reminder_stopped: 'Hatırlatma durduruldu', document_uploaded: 'Evrak yüklendi', folder_created: 'Klasör oluşturuldu',
  upload_link_created: 'Yükleme linki üretildi', note_added: 'Not eklendi', barcode_entered: 'Otomasyon kodu girildi',
  parser_matched: 'Bakanlık maili eşleşti', fields_updated: 'Bilgiler güncellendi'
};
export function actionLabel(a) { return ACTION_TR[a] || a; }
export function mailStatusLabel(s) { return MAIL_STATUS_TR[s] || s; }
export function templateLabel(code) { return TEMPLATE_TR[code] || code; }
export function docTypeLabel(k) { return DOC_TYPE_TR[k] || k; }
export function uploaderLabel(t) { return UPLOADER_TR[t] || t; }
export function reminderStatusLabel(s) { return REMINDER_STATUS_TR[s] || s; }

// 📥 axios blob cevabını dosya olarak indir
export function saveBlobResponse(res, fallbackName = 'dosya') {
  const blob = new Blob([res.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fallbackName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 📤 Basit CSV export (bağımlılıksız, Türkçe/Excel uyumlu — BOM + ; ayraç)
export function exportCsv(filename, columns, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.header)).join(';');
  const body = rows.map((r) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.value])).join(';')).join('\n');
  const csv = '﻿' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
