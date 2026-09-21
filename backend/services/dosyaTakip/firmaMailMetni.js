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
  // "Hem firma hem bizden" grubundakiler de firmayı ilgilendiriyor. Şemadaki adı
  // `herIkisindenBeklenen` — burada eskiden şemada hiç olmayan bir ad okunuyordu ve bu gruptaki
  // eksikler firmaya giden taslağa hiç girmiyordu (21.09.2026'da fark edildi).
  const ortak = k.herIkisindenBeklenen?.beklenenEksikler || [];
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

// Firmaya gösterilen belge numarası: yalnız ytbNo (ekrandaki "Belge No"). belgeId sistemin iç
// kimliği — canlıda (15.09.2026) ikisi de dolu 165 talebin 164'ünde farklı değer taşıyordu.
function belgeNoAl(talep) {
  return String(talep?.ytbNo || '').trim();
}

/**
 * Firmaya gönderilecek mailin ÖNERİLEN konusu.
 *
 * Müşteri (15.09.2026): "Firma maili gönderirken Konu kısmına belge no ve talep türü de ekleyebilir
 * miyiz? bu - DT2026253- kısmını kaldırabiliriz firmanın görmesine gerek yok."
 * Takip no (DT…) iç kimliğimiz olduğu için konuya girmez.
 */
function konuOner(talep) {
  const belgeNo = belgeNoAl(talep);
  const parcalar = [
    belgeNo ? `Belge No: ${belgeNo}` : '',
    String(talep?.talepTuru || '').trim(),
    String(talep?.firmaUnvan || '').trim()
  ].filter(Boolean);
  return parcalar.length ? parcalar.join(' — ') : 'Belge Takip';
}

/**
 * Firmaya gönderilecek mailin ÖNERİLEN gövdesi.
 * Eksik ve not yoksa yine de kullanılabilir bir iskelet döner — kullanıcı
 * elle yazabilsin diye boş metin dönmüyoruz.
 */
function govdeOner(talep, { imza = '', yuklemeLinki = '' } = {}) {
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

  // Müşteri (15.09.2026): "firma mailine yükleme linki koyabilir miyiz"
  if (yuklemeLinki) {
    satirlar.push('Evrakları aşağıdaki bağlantıdan yükleyebilirsiniz:', yuklemeLinki, '');
  }

  // Hiç içerik yoksa kullanıcı boş bir kutuya bakmasın
  if (!eksikler.length && !notlar.length && !yuklemeLinki) {
    satirlar.push('');
  }

  satirlar.push('Bilginize sunarız.');
  if (imza && imza.trim()) { satirlar.push('', imza.trim()); }

  return satirlar.join('\n');
}

/**
 * İşlem & Evrak şablonunun {evrakListesi} yerine geçecek metin: firmadan beklenen eksikler
 * (numaralı, İşlem & Evrak'taki listeyle aynı biçim) ve altında uzman notları.
 */
function evrakListesiMetni(talep) {
  const parcalar = [];
  const eksikler = firmadanBeklenenler(talep);
  if (eksikler.length) parcalar.push(eksikler.map((e, i) => `${i + 1}. ${e}`).join('\n'));
  const notlar = uzmanNotlari(talep);
  if (notlar.length) parcalar.push(['Notlar:', ...notlar.map((n) => `- ${n}`)].join('\n'));
  // Boş liste sessizce gitmesin: maili düzenleyen kişi yazması gerektiğini görsün
  return parcalar.length
    ? parcalar.join('\n\n')
    : '(Firmadan beklenen eksik kaydı yok — istenecek evrakları buraya yazın.)';
}

/**
 * İşlem & Evrak mail şablonunu Belge Takip talebiyle doldurmak için veri.
 *
 * Müşteri (21.09.2026): "'İşlem & Evrak' modülündeki yeni takip mail şablonunu, doğrudan 'Belge Takip'
 * modülündeki mail gönderme kısmına da ekleyebilir miyiz? İki alanda da birebir aynı şablonun
 * kullanılması isteniyor." Şablon metni İşlem & Evrak'taki kayıttan okunur ve aynı işlevle
 * (islemEvrakService.sablonMetniniIsle) doldurulur; yer tutucuların Belge Takip karşılıkları burada.
 * Google Form bu modülde yok: {formLink} satırı İşlem & Evrak'taki kuralla düşer.
 */
function sablonVerisi(talep, { imza = '', yuklemeLinki = '', tarih = new Date() } = {}) {
  return {
    firmaAdi: String(talep?.firmaUnvan || talep?.firma?.tamUnvan || '').trim(),
    islemAdi: String(talep?.talepTuru || '').trim(),
    varyant: '',
    evrakListesi: evrakListesiMetni(talep),
    uploadLink: yuklemeLinki || '',
    formLink: '',
    imza: String(imza || '').trim(),
    tarih: new Date(tarih).toLocaleDateString('tr-TR')
  };
}

const EPOSTA_BICIMI = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const adresNormalle = (v) => String(v || '').trim().toLowerCase();
const adresleriTemizle = (liste) =>
  [...new Set((Array.isArray(liste) ? liste : []).map(adresNormalle).filter((a) => EPOSTA_BICIMI.test(a)))];

/**
 * Alıcı önerisi.
 *
 * Müşteri (15.09.2026): "İlk defa açarken kayıtlı olan firma bilgilerindeki maili otomatik çekebilir
 * mi? Yetkili kişileri çekse olur. Sonrasında bizim yazdığımız mailleri kaydedebilir her seferinde
 * tekrardan mail girmek yerine."
 *
 * Canlı ölçüm (15.09.2026): 1259 firmanın yalnız 463'ünde firma e-postası dolu, 588'inde adres yalnız
 * yetkili kişilerde duruyor. Eski taslak yalnız firma e-postasını okuduğu için kutu çoğu firmada boş
 * geliyordu.
 *
 * Öncelik: bu firmaya en son gönderilen maildeki alıcılar (hangi talepten gönderildiği fark etmez,
 * elle yazılan adresler dahil) → firma e-postası + yetkili kişilerin e-postaları. CC yalnız geçmişten.
 *
 * @param firma  { firmaEmail, yetkiliKisiler: [{ adSoyad, eposta1, eposta2 }] }
 * @param gecmis Bu firmaya gönderilmiş mailler [{ alicilar, cc, tarih }] — sırası önemsiz
 * @returns {{ alici: string, cc: string, oneriler: Array<{ adres: string, etiket: string }> }}
 */
function alicilariOner({ firma, gecmis = [] } = {}) {
  const oneriler = [];
  const ekle = (adres, etiket) => {
    const a = adresNormalle(adres);
    if (!EPOSTA_BICIMI.test(a) || oneriler.some((o) => o.adres === a)) return;
    oneriler.push({ adres: a, etiket });
  };

  ekle(firma?.firmaEmail, 'Firma e-postası');
  (Array.isArray(firma?.yetkiliKisiler) ? firma.yetkiliKisiler : []).forEach((k) => {
    const ad = String(k?.adSoyad || '').trim() || 'Yetkili kişi';
    ekle(k?.eposta1, ad);
    ekle(k?.eposta2, ad);
  });
  const kayitliAdresler = oneriler.map((o) => o.adres);

  const sirali = (Array.isArray(gecmis) ? gecmis : [])
    .filter(Boolean)
    .sort((x, y) => new Date(y.tarih || 0) - new Date(x.tarih || 0));
  sirali.forEach((m) => [...(m.alicilar || []), ...(m.cc || [])].forEach((a) => ekle(a, 'Daha önce kullanıldı')));

  const sonAlicilar = adresleriTemizle(sirali[0]?.alicilar);
  return {
    alici: (sonAlicilar.length ? sonAlicilar : kayitliAdresler).join(', '),
    cc: sonAlicilar.length ? adresleriTemizle(sirali[0].cc).join(', ') : '',
    oneriler
  };
}

module.exports = {
  konuOner, govdeOner, alicilariOner, belgeNoAl, firmadanBeklenenler, uzmanNotlari, sablonVerisi,
  evrakListesiMetni, SELAM
};
