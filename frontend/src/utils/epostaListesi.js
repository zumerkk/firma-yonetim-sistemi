// ✉️ Virgülle ayrılmış e-posta listesi yardımcıları (Belge Takip → Firma Maili)
//
// Müşteri (15.09.2026): "İlk defa açarken kayıtlı olan firma bilgilerindeki maili otomatik çekebilir
// mi? Yetkili kişileri çekse olur. Sonrasında bizim yazdığımız mailleri kaydedebilir her seferinde
// tekrardan mail girmek yerine."
//
// Alıcı kutusu serbest metin kalıyor (yapıştırmak ve elle düzeltmek kolay olsun); kayıtlı adres
// çipleri yalnız kısayol. Bu yüzden ekleme sırasında kullanıcının yazdığı metin yeniden biçimlenmez.

/** "A@b.com; c@d.com," → ['a@b.com', 'c@d.com'] */
export const adresleriAyir = (metin) =>
    String(metin || '')
        .split(/[,;]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

/** Adresi metnin sonuna ekler; zaten varsa metni olduğu gibi bırakır */
export const adresEkle = (metin, adres) => {
    const temiz = String(metin || '').trim().replace(/[,;]\s*$/, '');
    const yeni = String(adres || '').trim();
    if (!yeni || adresleriAyir(temiz).includes(yeni.toLowerCase())) return temiz;
    return temiz ? `${temiz}, ${yeni}` : yeni;
};

/** Verilen kutuların (alıcı, CC…) hiçbirinde bulunmayan öneriler */
export const eklenebilirOneriler = (oneriler, ...kutular) => {
    const mevcut = kutular.flatMap(adresleriAyir);
    return (Array.isArray(oneriler) ? oneriler : [])
        .filter((o) => o?.adres && !mevcut.includes(String(o.adres).toLowerCase()));
};
