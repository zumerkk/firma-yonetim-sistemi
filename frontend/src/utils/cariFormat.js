// 💳 Cari hesap — arayüz biçim ve ayrıştırma yardımcıları
//
// Bakiye kuralları sunucuda (backend/services/cari/cariHesap.js); burada yalnızca
// kullanıcının yazdığı tutarı anlamak ve tutarları okunur göstermek var.
// tutarCoz sunucudakiyle AYNI kuralı izler: arayüz "anladım" deyip sunucu reddetseydi
// kullanıcı kaydın neden olmadığını anlamazdı. İki taraf aynı örneklerle sınanıyor.

export const BANKALAR = ['Enpara', 'Garanti', 'Vakıf', 'Ziraat', 'Diğer'];

// Müşteri: "gelen(banka tutar)-gideni(ödenen tutar) yeşil/kırmızı"
export const HAREKET_TURU = {
    fatura: { etiket: 'Fatura', renk: '#b45309', zemin: '#fffbeb', kenar: '#fcd34d' },
    odenen: { etiket: 'Ödenen', renk: '#dc2626', zemin: '#fef2f2', kenar: '#fca5a5' },
    gelen: { etiket: 'Gelen', renk: '#16a34a', zemin: '#f0fdf4', kenar: '#86efac' }
};

const yuvarla = (n) => Math.round(n * 100) / 100;

// "1.234.567" → "1234567"; gruplar 3'lü değilse null
const binlikCoz = (s, ayrac) => {
    const [bas, ...digerleri] = s.split(ayrac);
    if (!digerleri.length) return s;
    const gecerli = /^-?\d{1,3}$/.test(bas) && digerleri.every((g) => /^\d{3}$/.test(g));
    return gecerli ? [bas, ...digerleri].join('') : null;
};

/**
 * Yazılan tutarı sayıya çevirir; anlaşılamıyorsa null.
 *   "24.000" → 24000 · "24.000,50" → 24000.5 · "1,234.56" → 1234.56 · "12,5" → 12.5
 * Belirsiz yazım ("1234.567") tahmin edilmez: bin kat yanlış tutar kaydetmektense reddet.
 */
export function tutarCoz(deger) {
    if (deger === null || deger === undefined || deger === '') return null;
    if (typeof deger === 'number') return Number.isFinite(deger) ? yuvarla(deger) : null;

    const s = String(deger).replace(/[^0-9.,-]/g, '');
    if (!/\d/.test(s)) return null;

    let normal;
    const sonVirgul = s.lastIndexOf(',');
    const sonNokta = s.lastIndexOf('.');
    if (sonVirgul >= 0 && sonNokta >= 0) {
        // İki ayraç birden: SONDAKİ ondalıktır — "1.234,56" (TR) · "1,234.56" (EN)
        const ondalik = sonVirgul > sonNokta ? ',' : '.';
        const i = s.lastIndexOf(ondalik);
        const tam = binlikCoz(s.slice(0, i), ondalik === ',' ? '.' : ',');
        const kusurat = s.slice(i + 1);
        normal = tam !== null && /^\d{1,2}$/.test(kusurat) ? `${tam}.${kusurat}` : null;
    } else if (sonVirgul >= 0 || sonNokta >= 0) {
        const ayrac = sonVirgul >= 0 ? ',' : '.';
        const parcalar = s.split(ayrac);
        // Tek ayraç + 1-2 hane → ondalık ("12,5"); 3'lü gruplar → binlik ("24.000")
        normal = parcalar.length === 2 && /^\d{1,2}$/.test(parcalar[1])
            ? `${parcalar[0]}.${parcalar[1]}`
            : binlikCoz(s, ayrac);
    } else {
        normal = s;
    }

    if (normal === null || !/^-?\d+(\.\d{1,2})?$/.test(normal)) return null;
    return yuvarla(Number(normal));
}

const SAYI = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 24000.5 → "24.000,50" */
export const tutarYaz = (n) => SAYI.format(Number(n) || 0);
/** 24000.5 → "24.000,50 ₺" */
export const paraYaz = (n) => `${tutarYaz(n)} ₺`;

// Tarihler sunucuda UTC gece yarısı saklanıyor → gösterimde de UTC: gün kaymasın
export const tarihYaz = (d) => {
    if (!d) return '—';
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('tr-TR', { timeZone: 'UTC' });
};

/** Düzenleme formundaki tarih kutusu için "YYYY-MM-DD" */
export const isoGun = (d) => {
    if (!d) return '';
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? '' : t.toISOString().slice(0, 10);
};

/** Kullanıcının yerel günü, "YYYY-MM-DD" */
export const bugun = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/** Defterdeki açıklama sütunu */
export const hareketBasligi = (h) => {
    if (!h) return '';
    if (h.tur === 'gelen') return h.banka || 'Gelen ödeme';
    if (h.tur === 'fatura') return h.faturaNo ? `Fatura No: ${h.faturaNo}` : 'Fatura';
    return h.belgeAdi || 'Ödenen belge';
};

/** Hareketin bağlı olduğu belge takip talebi (populate edilmiş) */
export const talepEtiketi = (t) => {
    if (!t || typeof t !== 'object') return '';
    const belge = t.ytbNo || t.belgeId;
    return [t.takipId, belge && `Belge ${belge}`, t.talepTuru].filter(Boolean).join(' · ');
};

// Firma bakiyesi: artı → firmadan alacak (kırmızı), eksi → fazla ödeme (yeşil)
export const bakiyeRengi = (n) => (n > 0 ? '#dc2626' : n < 0 ? '#16a34a' : '#475569');
// Talep farkı (gelen − giden): artı yeşil, eksi kırmızı
export const farkRengi = (n) => (n > 0 ? '#16a34a' : n < 0 ? '#dc2626' : '#475569');
