// 🕓 <input type="datetime-local"> yardımcıları
//
// datetime-local değeri SAAT DİLİMSİZDİR ("2026-09-09T09:29"). Sunucuya bu haliyle gönderilirse
// Render'da (UTC) 3 saat kayar; bu yüzden gönderirken tarayıcının yerel saatiyle ISO'ya çevrilir.

const iki = (n) => String(n).padStart(2, '0');

/** Date/ISO → "YYYY-MM-DDTHH:mm" (kullanıcının yerel saatiyle); geçersizse '' */
export const tarihSaatGirdisi = (deger) => {
    if (!deger) return '';
    const t = new Date(deger);
    if (Number.isNaN(t.getTime())) return '';
    return `${t.getFullYear()}-${iki(t.getMonth() + 1)}-${iki(t.getDate())}T${iki(t.getHours())}:${iki(t.getMinutes())}`;
};

/** "YYYY-MM-DDTHH:mm" (yerel) → ISO (UTC); geçersizse null */
export const tarihSaatIso = (girdi) => {
    if (!girdi || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(girdi)) return null;
    const t = new Date(girdi); // saat dilimsiz → tarayıcı yerel saat olarak yorumlar
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

/**
 * Yapıştırılan metni datetime-local değerine çevirir. Müşteri tarihleri ETUYS'tan ve Excel'den
 * "09.09.2026 09:29:05" biçiminde kopyalıyor; <input> bunu kabul etmeyip sessizce yutuyor.
 * Saat yoksa mevcut değerin saati korunur.
 * @returns {string|null} "YYYY-MM-DDTHH:mm" ya da anlaşılamadıysa null
 */
export const tarihSaatYapistir = (metin, mevcut = '') => {
    const s = String(metin || '').trim();
    let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T]+(\d{1,2})[:.](\d{2})(?::\d{2})?)?$/);
    let gun; let ay; let yil; let saat; let dakika;
    if (m) [, gun, ay, yil, saat, dakika] = m;
    else {
        m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
        if (!m) return null;
        [, yil, ay, gun, saat, dakika] = m;
    }
    const g = Number(gun); const a = Number(ay);
    if (a < 1 || a > 12 || g < 1 || g > 31) return null;
    if (saat === undefined) {
        const eski = String(mevcut || '').match(/T(\d{2}):(\d{2})/);
        [saat, dakika] = eski ? [eski[1], eski[2]] : ['00', '00'];
    }
    if (Number(saat) > 23 || Number(dakika) > 59) return null;
    return `${yil}-${iki(a)}-${iki(g)}T${iki(saat)}:${iki(dakika)}`;
};
