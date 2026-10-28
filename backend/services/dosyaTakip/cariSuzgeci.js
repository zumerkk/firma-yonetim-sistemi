// 💳 Belge Takip arşivi — cari süzgeçleri
//
// Müşteri (27.10.2026): "cari çekemedikleri için ödeme talep edemiyoruz". Arşivde "carisi henüz
// yazılmamış" ya da "carisi açık" talepleri ayırabilmek için iki süzgeç:
//   cariKaydi  → talebin kendi alanı (DosyaTakip.odeme.cariKaydi): bos | yazildi | kesildi
//   cariDurumu → FİRMA bazında (Firma.cariDurumu): acik | kapandi. Alanı olmayan eski firma "açık"
//                sayılır (ekranda da öyle görünüyor); firması olmayan talebin cari durumu yoktur.
// Bu dosyada DB yok: kapalı firmaların kimlikleri dışarıdan verilir, sorgu koşulu döner.

const CARI_KAYDI = ['bos', 'yazildi', 'kesildi'];
const CARI_DURUMU = ['acik', 'kapandi'];

/** Tanınmayan değer süzgeç sayılmaz (URL'den elle yazılmış bir değer boş liste döndürmesin) */
const cariSuzgecleriniCoz = ({ cariKaydi, cariDurumu } = {}) => ({
  cariKaydi: CARI_KAYDI.includes(cariKaydi) ? cariKaydi : '',
  cariDurumu: CARI_DURUMU.includes(cariDurumu) ? cariDurumu : ''
});

/**
 * @param {{cariKaydi: string, cariDurumu: string}} suzgec  cariSuzgecleriniCoz çıktısı
 * @param {Array} kapaliFirmalar  cariDurumu 'kapandi' olan firma kimlikleri (cariDurumu süzgeci varsa)
 * @returns {object[]} filter.$and'e eklenecek koşullar
 */
function cariKosullari(suzgec, kapaliFirmalar = []) {
  const kosullar = [];
  if (suzgec.cariKaydi === 'bos') {
    // Eski talepte alan (hatta odeme nesnesi) hiç yok: null eksik alanı da kapsar
    kosullar.push({ 'odeme.cariKaydi': { $in: ['', null] } });
  } else if (suzgec.cariKaydi) {
    kosullar.push({ 'odeme.cariKaydi': suzgec.cariKaydi });
  }
  if (suzgec.cariDurumu === 'kapandi') {
    kosullar.push({ firma: { $in: kapaliFirmalar } });
  } else if (suzgec.cariDurumu === 'acik') {
    kosullar.push({ firma: { $nin: [...kapaliFirmalar, null] } });
  }
  return kosullar;
}

module.exports = { cariSuzgecleriniCoz, cariKosullari, CARI_KAYDI, CARI_DURUMU };
