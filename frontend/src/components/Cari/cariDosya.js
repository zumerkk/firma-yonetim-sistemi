// 💳 Cari hareket belgesini (dekont, makbuz, fatura) aç / indir
//
// Dosya sunucu üzerinden blob olarak çekiliyor: Cloudinary PDF teslimatı hesap
// ayarıyla kısıtlı, doğrudan bağlantı 401 verebiliyor (Belge Takip'teki gibi).

import cariService from '../../services/cariService';

export async function hareketDosyasiAc(hareket, indir) {
    // Pencere tıklamayla EŞZAMANLI açılmalı: istek bittikten sonra açılırsa
    // tarayıcının açılır pencere engelleyicisi keser.
    const pencere = indir ? null : window.open('', '_blank');
    try {
        const blob = await cariService.dosyaBlob(hareket._id, indir);
        const url = URL.createObjectURL(blob);
        if (pencere) {
            pencere.location.href = url;
        } else {
            // İndirme istendi ya da pencere engellendi → dosya olarak indir
            const a = document.createElement('a');
            a.href = url;
            a.download = hareket.dosya?.dosyaAdi || 'belge';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (err) {
        if (pencere) pencere.close();
        throw err;
    }
}
