// 💳 Cari firma listesi — fatura durumu süzgeci ve sütun sıralaması (saf)
//
// Müşteri (07.10.2026): "Bu firmaları fatura durumu kesildi (avansı da bunun içine dahil edelim ama
// avans olduğu belli olsun) - kesilmedi olarak filtreleyebilirsek veya sıralayabilirsek çok iyi olur"
// + "Genel olarak bütün sütunları sıralayabilirsek iyi olur ödemelere, bakiyeye göre vs."
//
// Firma satırı birden çok talebin sayımını taşır (faturaDurumlari: { kesildi, kesilmedi, avans, bos }).
// Bir firmanın hem kesilmiş hem kesilmemiş talebi olabilir; o firma iki süzgeçte de görünür.
// Liste sunucudan tek seferde (~200+ firma) geldiği için süzme/sıralama tarayıcıda yapılır.

export const FATURA_SUZGECLERI = [
    { deger: '', etiket: 'Tümü' },
    { deger: 'kesildi', etiket: 'Kesildi (avans dahil)' },
    { deger: 'avans', etiket: 'Avans' },
    { deger: 'kesilmedi', etiket: 'Kesilmedi' },
    { deger: 'girilmemis', etiket: 'Girilmemiş' }
];

const sayi = (f, k) => Number(f?.faturaDurumlari?.[k]) || 0;

export function faturaSuzgecindenGecer(firma, deger) {
    switch (deger) {
        case 'kesildi': return sayi(firma, 'kesildi') + sayi(firma, 'avans') > 0;
        case 'avans': return sayi(firma, 'avans') > 0;
        case 'kesilmedi': return sayi(firma, 'kesilmedi') > 0;
        case 'girilmemis': return sayi(firma, 'bos') > 0;
        default: return true;
    }
}

/** Süzgeç düğmelerindeki sayılar */
export const suzgecSayilari = (liste = []) => Object.fromEntries(
    FATURA_SUZGECLERI.map(({ deger }) => [deger, liste.filter((f) => faturaSuzgecindenGecer(f, deger)).length])
);

/**
 * Fatura durumu sıralama değeri: firmanın işaretli talepleri içinde KESİLMEMİŞ oranı.
 * 0 → hepsi kesildi/avans, 1 → hiçbiri kesilmedi. Hiç işaretli talebi yoksa değer yok (sona).
 * Eşitlikte avansı olan, kesilmişlerden sonra gelir (avans henüz tam fatura değil).
 */
export function faturaSiraDegeri(firma) {
    const kesildi = sayi(firma, 'kesildi');
    const avans = sayi(firma, 'avans');
    const kesilmedi = sayi(firma, 'kesilmedi');
    const isaretli = kesildi + avans + kesilmedi;
    if (!isaretli) return null;
    return kesilmedi / isaretli + (avans / isaretli) / 1000;
}

const tarihDegeri = (v) => {
    if (!v) return null;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
};

export const SIRALANABILIR = {
    firmaUnvan: { deger: (f) => String(f.firmaUnvan || '').trim() || null, ilkYon: 'asc' },
    toplamFatura: { deger: (f) => Number(f.toplamFatura) || 0, ilkYon: 'desc' },
    faturaDurumu: { deger: faturaSiraDegeri, ilkYon: 'desc' },
    toplamOdenen: { deger: (f) => Number(f.toplamOdenen) || 0, ilkYon: 'desc' },
    toplamGelen: { deger: (f) => Number(f.toplamGelen) || 0, ilkYon: 'desc' },
    bakiye: { deger: (f) => Number(f.bakiye) || 0, ilkYon: 'desc' },
    sonHareketTarihi: { deger: (f) => tarihDegeri(f.sonHareketTarihi), ilkYon: 'desc' }
};

const adaGore = (a, b) => String(a.firmaUnvan || '').localeCompare(String(b.firmaUnvan || ''), 'tr');

/** Değeri olmayanlar (tarihsiz, faturası girilmemiş) yön ne olursa olsun sona; eşitlikte firma adı. */
export function firmalariSirala(liste = [], { alan, yon } = {}) {
    const tanim = SIRALANABILIR[alan];
    if (!tanim) return liste;
    const carpan = yon === 'desc' ? -1 : 1;
    return [...liste].sort((a, b) => {
        const x = tanim.deger(a);
        const y = tanim.deger(b);
        const xBos = x === null || x === undefined;
        const yBos = y === null || y === undefined;
        if (xBos || yBos) return xBos === yBos ? adaGore(a, b) : (xBos ? 1 : -1);
        const fark = typeof x === 'string' ? x.localeCompare(y, 'tr') : x - y;
        return fark !== 0 ? fark * carpan : adaGore(a, b);
    });
}

/** Başlığa tıklama: aynı sütunda yön değişir, yeni sütunda o sütunun anlamlı ilk yönü */
export const siralamaDegistir = (onceki, alan) => (
    onceki?.alan === alan
        ? { alan, yon: onceki.yon === 'asc' ? 'desc' : 'asc' }
        : { alan, yon: SIRALANABILIR[alan]?.ilkYon || 'asc' }
);
