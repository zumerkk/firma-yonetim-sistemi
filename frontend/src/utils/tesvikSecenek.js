// 🏷️ Teşvik formu Autocomplete seçenekleri
//
// Seçenekler iki biçimde geliyor: CSV/şablondan ya da otomatik şart doldurmadan DÜZ METİN,
// "öğrenen sistem"den NESNE ({ value, label, kategori, renk, isDynamic }). Liste çizimi yalnız
// nesne bekleyince düz metinler boş satır olarak görünüyordu
// (müşteri, 15.09.2026: "Destek unsurlarında böyle boşluklar var").

export const secenekEtiketi = (secenek) => {
    if (typeof secenek === 'string') return secenek;
    return (secenek && (secenek.label || secenek.value)) || '';
};

/** Etiketi boş olanları ve aynı etiketin tekrarını atar (ilk görülen kalır). */
export const secenekleriTemizle = (secenekler) => {
    if (!Array.isArray(secenekler)) return [];
    const gorulen = new Set();
    return secenekler.filter((secenek) => {
        const etiket = secenekEtiketi(secenek).trim();
        if (!etiket || gorulen.has(etiket)) return false;
        gorulen.add(etiket);
        return true;
    });
};
