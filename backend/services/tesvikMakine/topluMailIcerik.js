// 📧 TOPLU MAİL İÇERİĞİ - birden fazla makineyi TEK mailde birleştirir
//
// Müşteri: "Ekipman takip'de toplu işlem yaparken maili düzenleyebilelim ve tek
// bir ortak mail gitsin, toplu işlemi kullanma amacımız birden fazla kalem
// makinayı tek mailde göndermek sadece makine id leri ve sıra numalarını
// alacağız örn: ST TURKUAZ'ın çok makinesi var 'AÇIKLAMA: 3065 sayılı KDV
// Kanunu'nun 13/d maddesi gereğince, ... 4743905, 4743906, ... makine ID
// numaralı 913, 917, ... sıra no'lu kalemlerinin teslimatı olduğundan ilgili
// kanun gereğince KDV hesaplanmamıştır.'"
//
// ESKİ DAVRANIŞ: toplu mail seçilen her makine için AYRI mail gönderiyordu
// (bulk → action 'send_mail' → her hedef için sendProcessMail). Tedarikçi 10
// kalemlik teslimat için 10 ayrı mail alıyordu; müşterinin istediği tam tersi.
//
// Bu dosya yalnız METNİ kurar. Gönderme işini controller yapıyor ve tek bir
// sendProcessMail çağrısıyla TEK mail atıyor.

// Makine kimliklerini mail metnine uygun biçimde birleştirir.
// Sıralama siraNo'ya göre: müşterinin örneğindeki liste de sıra numarası
// düzeninde ("913, 917, 1156, ...").
function makineListeleri(processes) {
  const sirali = [...(processes || [])].sort(
    (a, b) => (Number(a?.siraNo) || 0) - (Number(b?.siraNo) || 0)
  );
  const makineIdler = sirali
    .map((p) => String(p?.makineId ?? '').trim())
    .filter(Boolean);
  const siraNolar = sirali
    .map((p) => (p?.siraNo === 0 || p?.siraNo ? String(p.siraNo) : ''))
    .filter((s) => s && s !== '0');
  return {
    makineIdListesi: makineIdler.join(', '),
    siraNoListesi: siraNolar.join(', '),
    adet: sirali.length
  };
}

/**
 * Tek makinelik şablon verisini TOPLU hale getirir.
 *
 * Şablonlar tek makine için yazılmış ve {makineId} / {siraNo} gibi TEKİL
 * yer tutucular kullanıyor. Toplu gönderimde bunların yerine listeyi koyuyoruz;
 * böylece mevcut şablonlar değiştirilmeden toplu modda da doğru metni üretiyor.
 *
 * Ayrıca {makineIdListesi} / {siraNoListesi} / {makineAdedi} anahtarları da
 * ekleniyor — yeni şablonlar bunları doğrudan kullanabilsin.
 */
function topluPlaceholderVerisi(tekilVeri, processes) {
  const { makineIdListesi, siraNoListesi, adet } = makineListeleri(processes);
  return {
    ...tekilVeri,
    // Tekil anahtarların üzerine listeyi yazıyoruz — şablon {makineId} diyorsa
    // toplu gönderimde tüm ID'leri görmeli, yalnız ilkini değil.
    makineId: makineIdListesi || tekilVeri?.makineId || '',
    siraNo: siraNoListesi || tekilVeri?.siraNo || '',
    makineIdListesi,
    siraNoListesi,
    makineAdedi: String(adet)
  };
}

module.exports = { makineListeleri, topluPlaceholderVerisi };
