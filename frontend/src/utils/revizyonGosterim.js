// 📜 Revizyon geçmişi gösterim yardımcıları
// Müşteri isteği: revizyonlarda değişen alanlar "Finansal Bilgiler, Bina inşaat gideri 0 → 1.000.000"
// gibi insan-okur biçimde, eski değer kırmızı / yeni değer yeşil olarak gösterilsin.

const REV_ALAN_GRUBU = {
  maliHesaplamalar: 'Finansal Bilgiler',
  belgeYonetimi: 'Belge Bilgileri',
  yatirimBilgileri: 'Yatırım Bilgileri',
  kunyeBilgileri: 'Künye Bilgileri',
  firmaBilgileri: 'Firma Bilgileri',
  istihdam: 'İstihdam',
  durumBilgileri: 'Durum',
  makineListeleri: 'Makine Listesi',
  urunler: 'Ürün Bilgileri',
  destekUnsurlari: 'Destek Unsurları',
  ozelSartlar: 'Özel Şartlar',
  firma: 'Firma'
};

// Alan adı: kayıtlı insan-okur label varsa onu, yoksa yol adından türetilmiş adı kullan
export const revAlanEtiketi = (d) => {
  const alan = String(d?.alan || '');
  const grup = REV_ALAN_GRUBU[alan.split('.')[0]];
  if (d?.label) return grup ? `${grup}, ${d.label}` : d.label;
  const son = alan.split('.').pop() || alan;
  const okunur = son.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
  return grup ? `${grup}, ${okunur}` : (okunur || 'Alan');
};

// Değerleri kısa, okunur metne çevir (tarih/sayı/boolean/array/obje)
export const revDegerYaz = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('tr-TR');
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır';
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:/.test(v)) {
      const t = new Date(v);
      if (!Number.isNaN(t.getTime())) return t.toLocaleDateString('tr-TR');
    }
    return v.length > 80 ? v.slice(0, 77) + '…' : v;
  }
  if (Array.isArray(v)) return `${v.length} kayıt`;
  if (typeof v === 'object') return 'detay değişti';
  return String(v);
};
