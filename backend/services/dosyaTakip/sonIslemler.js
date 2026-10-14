// 🕒 Belge Takip — talep başına son işlemler (ana sayfa).
//
// Müşteri (14.10.2026): "Burada sağ alttaki son işlemleri vs kaldırıp onların yerine Belge Takipdeki bütün
// belgelerin son işlemlerini gösterebilir miyiz? 'Firma ismi - Talep türü - Durum - Notlar - Dosyalar'
// şeklinde, detaylarına gerek yok (notta ne yazıyor vs.) sadece değişiklik yapıldığı bilgisi ve ne zaman
// yapıldığı bilgisi görünse yeterli olur. Herkeste görünsün."
//
// Notlar ve dosyalar talebin birçok alt bölümünde ayrı dizilerde (görüşme notları, eksikler, sonuç notları,
// müracaat klasörü, kurum eksiği gelen belgeleri…). Yollar tek tek sayılmaz: kayıt gezilir, tarihli not
// ({ metin, tarih }) ve dosya ({ dosyaAdi, yuklemeTarihi }) biçimindeki her öğe sayılır — sonradan
// eklenen bir not alanı da kendiliğinden girer. Not METNİ ve dosya adı dışarı verilmez.

const zaman = (v) => { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : 0; };

function gez(deger, ziyaret, derinlik = 0) {
  if (!deger || typeof deger !== 'object' || derinlik > 8) return;
  if (deger instanceof Date || Buffer.isBuffer(deger) || (deger._bsontype)) return;
  if (Array.isArray(deger)) { deger.forEach((d) => gez(d, ziyaret, derinlik + 1)); return; }
  ziyaret(deger);
  Object.entries(deger).forEach(([k, v]) => { if (k !== 'durumGecmisi' && k !== 'firmaMailleri') gez(v, ziyaret, derinlik + 1); });
}

/**
 * @param {object} talep  lean DosyaTakip kaydı
 * @returns {{ durum: {zaman, kim}|null, not: {zaman, kim, sayi}|null, dosya: {zaman, kim, sayi}|null, son: number }}
 */
function talepSonIslemleri(talep, evrakTalepleri = []) {
  let not = null; let notSayi = 0;
  let dosya = null; let dosyaSayi = 0;
  gez(talep, (o) => {
    if (typeof o.metin === 'string' && o.tarih) {
      notSayi += 1;
      if (!not || zaman(o.tarih) > not.zaman) not = { zaman: zaman(o.tarih), kim: o.yazanAdi || '' };
    } else if (o.dosyaAdi && o.yuklemeTarihi) {
      dosyaSayi += 1;
      if (!dosya || zaman(o.yuklemeTarihi) > dosya.zaman) dosya = { zaman: zaman(o.yuklemeTarihi), kim: o.yukleyenAdi || '' };
    }
  });
  // Durum açıklaması (listedeki kısa not) da nottur
  if (talep && talep.durumAciklamasiTarihi && (!not || zaman(talep.durumAciklamasiTarihi) > not.zaman)) {
    not = { zaman: zaman(talep.durumAciklamasiTarihi), kim: '' };
  }
  // Durum değişikliği: tarih geriye dönük düzeltilebiliyor; "ne zaman yapıldı" sistemin ilk yazdığı an
  let durum = null;
  ((talep && talep.durumGecmisi) || []).forEach((g) => {
    const z = zaman(g.ilkTarih || g.tarih);
    if (z && (!durum || z > durum.zaman)) durum = { zaman: z, kim: g.degistirenAdi || '' };
  });
  if (not) not.sayi = notSayi;
  if (dosya) dosya.sayi = dosyaSayi;
  // İşlem & Evrak, Belge Takip'in Firma Maili sekmesinde aynı talebe bağlı çalışır.
  for (const e of evrakTalepleri) {
    const dosyalar = e.yuklenenEvraklar || [];
    dosyaSayi += dosyalar.length;
    for (const d of dosyalar) {
      if (!dosya || zaman(d.yuklemeTarihi) > dosya.zaman) dosya = { zaman: zaman(d.yuklemeTarihi), kim: '' };
    }
    for (const ev of e.istenenEvraklar || []) {
      if (!ev.yuklenememeNedeni) continue;
      notSayi += 1;
      if (!not || zaman(ev.nedenBildirimTarihi) > not.zaman) not = { zaman: zaman(ev.nedenBildirimTarihi), kim: '' };
    }
    for (const alan of ['not', 'dosya']) {
      const t = zaman(e.sonDegisiklikler?.[alan]);
      if (alan === 'not' && t > (not?.zaman || 0)) not = { zaman: t, kim: '' };
      if (alan === 'dosya' && t > (dosya?.zaman || 0)) dosya = { zaman: t, kim: '' };
    }
  }
  // Kalan içerikten tarih türetmek silme ve açıklama değişikliğini gösteremez; kalıcı damga kullanılır.
  for (const alan of ['durum', 'not', 'dosya']) {
    const t = zaman(talep?.sonDegisiklikler?.[alan]);
    if (alan === 'durum' && t > (durum?.zaman || 0)) durum = { zaman: t, kim: '' };
    if (alan === 'not' && t > (not?.zaman || 0)) not = { zaman: t, kim: '' };
    if (alan === 'dosya' && t > (dosya?.zaman || 0)) dosya = { zaman: t, kim: '' };
  }
  if (not) not.sayi = notSayi;
  if (dosya) dosya.sayi = dosyaSayi;
  const son = Math.max(durum ? durum.zaman : 0, not ? not.zaman : 0, dosya ? dosya.zaman : 0, zaman(talep && talep.createdAt));
  return { durum, not, dosya, son };
}

module.exports = { talepSonIslemleri };
