// 💳 Belge Takip arşivi — cari süzgeçleri
//
// Müşteri (27.10.2026): "cari çekemedikleri için ödeme talep edemiyoruz". Arşivde "carisi henüz
// yazılmamış" ya da "carisi açık" talepleri ayırabilmek için iki süzgeç:
//   cariKaydi  → talebin kendi alanı (DosyaTakip.odeme.cariKaydi): bos | yazildi | kesildi
//   cariDurumu → talebin kendi alanı (DosyaTakip.odeme.cariDurumu): acik | kapandi. Alanı olmayan eski
//                talep "açık" sayılır (ekranda da öyle görünüyor). 03.11.2026'ya kadar firmadan okunuyordu;
//                müşteri: "cari kapandı seçince o firmanın tüm işlemlerini kapatıyor".
// Bu dosyada DB yok: sorgu koşulu döner.

const CARI_KAYDI = ['bos', 'yazildi', 'kesildi'];
const CARI_DURUMU = ['acik', 'kapandi'];

/** Tanınmayan değer süzgeç sayılmaz (URL'den elle yazılmış bir değer boş liste döndürmesin) */
const cariSuzgecleriniCoz = ({ cariKaydi, cariDurumu } = {}) => ({
  cariKaydi: CARI_KAYDI.includes(cariKaydi) ? cariKaydi : '',
  cariDurumu: CARI_DURUMU.includes(cariDurumu) ? cariDurumu : ''
});

/**
 * @param {{cariKaydi: string, cariDurumu: string}} suzgec  cariSuzgecleriniCoz çıktısı
 * @returns {object[]} filter.$and'e eklenecek koşullar
 */
function cariKosullari(suzgec) {
  const kosullar = [];
  if (suzgec.cariKaydi === 'bos') {
    // Eski talepte alan (hatta odeme nesnesi) hiç yok: null eksik alanı da kapsar
    kosullar.push({ 'odeme.cariKaydi': { $in: ['', null] } });
  } else if (suzgec.cariKaydi) {
    kosullar.push({ 'odeme.cariKaydi': suzgec.cariKaydi });
  }
  if (suzgec.cariDurumu === 'kapandi') {
    kosullar.push({ 'odeme.cariDurumu': 'kapandi' });
  } else if (suzgec.cariDurumu === 'acik') {
    // Alanı (hatta odeme nesnesi) olmayan eski talep de açık
    kosullar.push({ 'odeme.cariDurumu': { $ne: 'kapandi' } });
  }
  return kosullar;
}

module.exports = { cariSuzgecleriniCoz, cariKosullari, CARI_KAYDI, CARI_DURUMU };
