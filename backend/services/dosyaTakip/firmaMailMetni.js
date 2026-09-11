// ✉️ BELGE TAKİP → FİRMAYA MAİL METNİ
//
// Müşteri: "Belge takipde zamanlamanın sağ tarafına o firmaya mail göndermek için
// bir kutu yapabilir miyiz, küçük bir modül gibi sadece eksikler ve uzmanların
// paylaştığı notları göndermek için, ama ek gönderebilelim yine. Aşırı komplex
// olmasına gerek yok. örn: 'Sayın …., <istenenler>' vs gibi."
//
// Bu dosya yalnızca METNİ kurar — gönderme işini controller yapar. Ayrı durmasının
// sebebi test edilebilirliği: kullanıcıya ÖNERİLEN metin doğru toplanmazsa, yanlış
// eksik listesi firmaya gider. Metin her zaman düzenlenebilir; burası ilk taslak.

const SELAM = 'Sayın Yetkili,';

// Eksik kalemleri modelin ÜÇ ayrı yerinde duruyor (firmadan / bizden / her ikisi).
// Müşterinin firmaya göndereceği liste doğal olarak FİRMADAN beklenenler.
// Diğer ikisi bilinçli olarak dışarıda: "bizden beklenen" bir eksiği firmaya
// sormak kafa karıştırır.
function firmadanBeklenenler(talep) {
  const k = talep?.muraacatSonrasi?.kurumEksik || {};
  const dogrudan = k.firmadanBeklenen?.beklenenEksikler || [];
  // "Hem firma hem bizden" grubundakiler de firmayı ilgilendiriyor
  const ortak = k.hemFirmaHemBizden?.beklenenEksikler || [];
  return [...dogrudan, ...ortak]
    .map((n) => String(n?.metin || '').trim())
    .filter(Boolean);
}

// Uzman notları: görüşme ve sonuç notları. En yeniden eskiye, çünkü firmaya
// gönderilecek olan güncel durum.
function uzmanNotlari(talep, enFazla = 5) {
  const kaynaklar = [
    talep?.muraacatOncesi?.gorusmeNotlari,
    talep?.muraacatSonrasi?.gorusmeNotlari,
    talep?.kurumSonuclanma?.sonucNotlari
  ];
  return kaynaklar
    .filter(Array.isArray)
    .flat()
    .filter((n) => n && String(n.metin || '').trim())
    .sort((a, b) => new Date(b.tarih || 0) - new Date(a.tarih || 0))
    .slice(0, enFazla)
    .map((n) => String(n.metin).trim());
}

/**
 * Firmaya gönderilecek mailin ÖNERİLEN konusu.
 */
function konuOner(talep) {
  const parcalar = ['Belge Takip'];
  if (talep?.takipId) parcalar.push(talep.takipId);
  if (talep?.firmaUnvan) parcalar.push(talep.firmaUnvan);
  return parcalar.join(' — ');
}

/**
 * Firmaya gönderilecek mailin ÖNERİLEN gövdesi.
 * Eksik ve not yoksa yine de kullanılabilir bir iskelet döner — kullanıcı
 * elle yazabilsin diye boş metin dönmüyoruz.
 */
function govdeOner(talep, { imza = '' } = {}) {
  const satirlar = [SELAM, ''];

  const eksikler = firmadanBeklenenler(talep);
  if (eksikler.length) {
    satirlar.push('Aşağıdaki evrakları tarafımıza iletmenizi rica ederiz:');
    eksikler.forEach((e, i) => satirlar.push(`${i + 1}. ${e}`));
    satirlar.push('');
  }

  const notlar = uzmanNotlari(talep);
  if (notlar.length) {
    satirlar.push('Notlar:');
    notlar.forEach((n) => satirlar.push(`- ${n}`));
    satirlar.push('');
  }

  // Hiç içerik yoksa kullanıcı boş bir kutuya bakmasın
  if (!eksikler.length && !notlar.length) {
    satirlar.push('');
  }

  satirlar.push('Bilginize sunarız.');
  if (imza && imza.trim()) { satirlar.push('', imza.trim()); }

  return satirlar.join('\n');
}

module.exports = { konuOner, govdeOner, firmadanBeklenenler, uzmanNotlari, SELAM };
