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
  if (typeof v === 'object') return v.tamUnvan || v.adSoyad || v.name || v.label || 'detay değişti';
  return String(v);
};

// Uçucu alanları (_id, __v, tarih damgaları) ve boş değerleri ayıklayarak derin karşılaştırma için normalize eder
const ucucuSil = (v) => {
  if (Array.isArray(v)) return v.map(ucucuSil);
  if (v && typeof v === 'object') {
    const temiz = {};
    for (const [k, val] of Object.entries(v)) {
      if (['_id', 'id', '__v', 'createdAt', 'updatedAt'].includes(k)) continue;
      if (val === null || val === undefined || val === '') continue;
      temiz[k] = ucucuSil(val);
    }
    return temiz;
  }
  return v;
};

// Kayıtlı diff gerçek bir değişiklik mi? Geçmişte kaydedilmiş gürültülü satırları ekranda ayıklar:
// boş → boş, firma objesi ↔ aynı firma id'si, sadece _id yenilenmiş listeler ("4 kayıt → 4 kayıt")
export const revGercekDegisiklikMi = (d) => {
  const e = d?.eskiDeger;
  const y = d?.yeniDeger;
  const bos = (v) => v === null || v === undefined || v === '';
  if (bos(e) && bos(y)) return false;
  const idOf = (v) => {
    if (v && typeof v === 'object' && !Array.isArray(v) && (v._id || v.id)) return String(v._id || v.id);
    return (typeof v === 'string' && v) ? v : null;
  };
  if ((typeof e === 'object' || typeof y === 'object') && !Array.isArray(e) && !Array.isArray(y)) {
    const eskiKimlik = idOf(e);
    const yeniKimlik = idOf(y);
    if (eskiKimlik && yeniKimlik && eskiKimlik === yeniKimlik) return false;
  }
  try {
    if (JSON.stringify(ucucuSil(e)) === JSON.stringify(ucucuSil(y))) return false;
  } catch (hata) { /* serileştirilemeyen değer — değişiklik olarak bırak */ }
  return true;
};
