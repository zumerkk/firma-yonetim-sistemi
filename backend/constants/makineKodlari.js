// 🏭 Makine kalemi kod yardımcıları
// Bakanlığın "KULLANILMIŞ MAKİNE KODLARI" listesi üç değer içerir:
//   KULLANILMIŞ KOMPLE / HAYIR / KULLANILMIŞ MÜNFERİT
// "HAYIR" da dolu bir string olduğu için "alan dolu ⇒ kullanılmış" varsayımı hatalıdır;
// bu varsayım yüzünden yeni makineler hem mali hesaplamada hem Excel çıktısında
// kullanılmış görünüyordu (müşteri bildirimi, 07.08).

const KULLANILMAMIS_DEGERLER = ['', '0', 'HAYIR', 'HAYİR', 'YOK', 'YENİ', 'YENI'];

function kullanilmisMi(kod) {
  const k = String(kod == null ? '' : kod).trim().toLocaleUpperCase('tr');
  return !KULLANILMAMIS_DEGERLER.includes(k);
}

module.exports = { KULLANILMAMIS_DEGERLER, kullanilmisMi };
