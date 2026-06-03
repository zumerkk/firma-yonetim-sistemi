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
