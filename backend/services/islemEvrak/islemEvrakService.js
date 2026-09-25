// 🧩 İŞLEM VE EVRAK YÖNETİMİ SERVİSİ
// Mevcut teşvik-makine altyapısını yeniden kullanır: upload token, dosya deposu, SMTP.
// Buradaki fark: kapsam BELGE değil, FİRMA + İŞLEM TÜRÜ (ör. ETUYS yetkilendirme).

const path = require('path');
const fs = require('fs');
const IslemTalebi = require('../../models/IslemTalebi');
const IslemTuru = require('../../models/IslemTuru');
const Firma = require('../../models/Firma');
const tokenService = require('../tesvikMakine/uploadTokenService');
const storageService = require('../tesvikMakine/storageService');
const { dosyaAdiDuzelt } = require('../../utils/dosyaAdiKodlama');
const mailService = require('../tesvikMakine/mailService');
const engine = require('../tesvikMakine/mailTemplateEngine');
const { DEFAULT_SIGNATURE } = require('../../constants/tesvikMakineMail');

const KLASOR_KOKU = 'Islem_Evrak';

function getSignature() {
  const s = process.env.MAIL_SIGNATURE;
  if (s && s.trim()) return s.replace(/\\n/g, '\n');
  return DEFAULT_SIGNATURE;
}

// Talebin evrak klasörü: Islem_Evrak/<Firma>/<İşlem>-<talepId>
function talepKlasoru(talep) {
  const firma = storageService.normalizeSegment(talep.firmaAdi || 'Firma');
  const islem = storageService.normalizeSegment(talep.islemTuruAdi || 'Islem');
  return [KLASOR_KOKU, firma, `${islem}-${String(talep._id).slice(-6)}`].join('/');
}

// Şablon (işlem türü) örnek dosyalarının klasörü: Islem_Evrak/_Sablonlar/<İşlem>
// Talep klasöründen AYRI: bu dosyalar tek bir talebe değil türe ait, her yeni
// talebe kopyalanıp firmaya gönderiliyorlar.
function sablonKlasoru(turAd) {
  return [KLASOR_KOKU, '_Sablonlar', storageService.normalizeSegment(turAd || 'Islem')].join('/');
}

// 🔗 Public yükleme linki — makine/ara-kontrol ile aynı biçim ("<önek>-<kısa kod>")
// Bu modülün firma sayfası /evrak/:token (AppRouter). Teşvik-makine'nin /upload/tesvik
// yolu kullanılırsa firma yanlış sayfaya düşer ve "Bağlantı geçersiz" hatası alır.
const PUBLIC_ROUTE = '/evrak';

async function ensureUploadLink(talep, { days } = {}) {
  const onek = storageService.normalizeSegment(talep.islemTuruAdi || 'islem').slice(0, 12);
  // Geçerli token aynen kullanılır: işlem türü adı sonradan düzenlense de gitmiş link yaşamalı.
  if (tokenService.korunmaliMi(talep.uploadToken, talep.uploadTokenExpiresAt)) {
    return tokenService.buildUploadLink(talep.uploadToken, PUBLIC_ROUTE);
  }
  talep.uploadToken = tokenService.generateToken(onek);
  talep.uploadTokenExpiresAt = tokenService.computeExpiry(days);
  await talep.save();
  return tokenService.buildUploadLink(talep.uploadToken, PUBLIC_ROUTE);
}

// Evrak adı karşılaştırma anahtarı: büyük/küçük harf, boşluk ve noktalama farkını yok sayar
// ("İmza Sirküleri" ≡ "imza sirkuleri"). Varyant/şablon değişiminde aynı evrakı tanımak için.
const evrakAnahtari = (ad) => String(ad || '')
  .toLocaleUpperCase('tr-TR')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]/g, '');

// 🔎 Public yükleme: token → talep
async function resolveByToken(token) {
  if (!token) return null;
  const talep = await IslemTalebi.findOne({ uploadToken: token, aktif: true });
  if (!talep) return null;
  if (tokenService.isExpired(talep.uploadTokenExpiresAt)) return { expired: true };
  return { talep };
}

// 🔗 Firmaya özel Google Form bağlantısı
// Müşteri: "Google Forms linkini koyabilirsek ek gibi çok iyi olur ... otomatik
// olarak ilişkin firmaya ait olsun."
// Google Forms'ta firma başına ayrı form açmak yerine TEK form kullanılır ve link
// her firma için ön-doldurulmuş üretilir (Forms'un "pp_url" ön-dolgu biçimi). Böylece
// e-tabloya düşen her yanıt satırında firma bilgisi hazır gelir, elle eşleştirme
// gerekmez. Form tanımlı değilse boş string döner ve mail gövdesindeki satır düşer.
function formLinkiUret(sablon, talep, firma) {
  const temel = String(sablon?.googleFormUrl || '').trim();
  if (!temel) return '';

  const alanlar = sablon?.googleFormAlanlari || [];
  if (!alanlar.length) return temel;

  const kaynaklar = {
    firmaAdi: talep?.firmaAdi || firma?.tamUnvan || '',
    vergiNoTC: firma?.vergiNoTC || '',
    firmaEmail: talep?.firmaEmail || firma?.firmaEmail || '',
    islemAdi: talep?.islemTuruAdi || ''
  };

  const parcalar = [];
  for (const alan of alanlar) {
    const anahtar = String(alan?.entryId || '').trim();
    const deger = kaynaklar[alan?.kaynak];
    if (!anahtar || !deger) continue;
    parcalar.push(`${encodeURIComponent(anahtar)}=${encodeURIComponent(deger)}`);
  }
  if (!parcalar.length) return temel;

  // Forms paylaşım linkleri çoğu zaman ?usp=sf_link taşır. Kendi usp=pp_url'imizi
  // eklemeden önce onu ayıklıyoruz; iki usp parametresi bırakmak çalışır ama kirli.
  const [yol, sorgu = ''] = temel.split('?');
  const kalanSorgu = sorgu
    .split('&')
    .filter((p) => p && !p.startsWith('usp='))
    .join('&');
  const onek = kalanSorgu ? `${yol}?${kalanSorgu}&` : `${yol}?`;
  return `${onek}usp=pp_url&${parcalar.join('&')}`;
}

// "Mailde iste" işaretli evraklar. İşareti kaldırılan evrak firmadan İSTENMİYOR demektir: maile yazılmaz,
// örneği eklenmez, listedeki "gelen/istenen" sayacına girmez.
function maildeIstenenler(evraklar) {
  return (evraklar || []).filter((e) => e && e.zorunlu !== false);
}

// Maile eklenebilecek örnek dosyalar: yalnız mailde istenen evrakların örnekleri.
// Müşteri (21.09.2026): "Sisteme örneği yüklenmiş bir evrağı mailde istemesek bile, o örnek dosya maile
// ek olarak gitmeye devam ediyor. İstenmeyen evrakların örnekleri maile eklenmemeli."
function ekliOrnekler(evraklar) {
  return maildeIstenenler(evraklar)
    .filter((e) => e.ornekDosya && (e.ornekDosya.fileUrl || e.ornekDosya.filePath));
}

// ✉️ Mail metnini işlem türü/varyant şablonundan üret (placeholder'lar doldurulur)
function mailOlustur({ talep, sablon, uploadLink, firma, dosyaTakip }) {
  // Müşteri: "tikleri kaldırınca mailde otomatik silinsin, (opsiyonel) yazmak yerine."
  // İşareti kaldırılan evrak firmadan İSTENMİYOR demektir; maile hiç yazılmaz.
  const secililer = maildeIstenenler(talep.istenenEvraklar);
  const evrakListesi = secililer.length
    ? secililer
      .map((e, i) => `${i + 1}. ${e.ad}${e.aciklama ? ` — ${e.aciklama}` : ''}`)
      .join('\n')
    // Boş liste sessizce gitmesin: maili düzenleyen kişi durumu görsün
    : '(İşaretli evrak yok — evrak listesinden istenecekleri işaretleyin.)';

  const data = {
    firmaAdi: talep.firmaAdi || '',
    islemAdi: talep.islemTuruAdi || '',
    varyant: talep.varyantAd || '',
    evrakListesi,
    uploadLink: uploadLink || '',
    formLink: formLinkiUret(sablon, talep, firma),
    imza: getSignature(),
    tarih: new Date().toLocaleDateString('tr-TR')
  };

  const konu = engine.render(sablon.mailKonusu || '{islemAdi} — Evrak Talebi ({firmaAdi})', data);
  if (talep.dosyaTakip) {
    const referans = [dosyaTakip?.ytbNo, dosyaTakip?.takipId].filter(Boolean).join(' / ');
    const govde = [
      `Sayın ${talep.firmaAdi || ''} Yetkilisi,`,
      `Teşvik Belgesi${referans ? ` ${referans}` : ''} Talebi ile ilgili olarak talep edilen evraklar aşağıdaki gibidir.`,
      talep.talepMetni || '',
      'Hazırlanan evrakların taramalarını aşağıdaki bağlantı üzerinden (farklı zamanlarda yükleme yapabilirsiniz) tarafımıza iletmenizi rica ederiz:',
      uploadLink || '', evrakListesi, 'İyi çalışmalar dileriz.',
      'Genel Müşavirlik ve İşletmecilik Ltd. Şti.\nGM Planlama Yatırım Danışmanlık San. ve Tic. Ltd. Şti.'
    ].filter(Boolean).join('\n\n');
    return { konu, govde, data };
  }
  const sablonGovdesi = sablonMetniniIsle(sablon.mailGovdesi || VARSAYILAN_GOVDE, data);
  const govde = talep.talepMetni ? `${talep.talepMetni}\n\n${sablonGovdesi}` : sablonGovdesi;
  return { konu, govde, data };
}

/**
 * Şablon gövdesini veriyle doldurur. Belge Takip › Firma Maili de AYNI işlevi kullanır
 * (müşteri, 21.09.2026: "İki alanda da birebir aynı şablonun kullanılması isteniyor").
 *
 * Motor, değeri boş olan placeholder'ı bilerek yerinde bırakır ("{x}" görünür kalsın
 * ki eksik veri fark edilsin). Ama Google Form opsiyonel: tanımlı değilse mailde
 * "{formLink}" yazması hata gibi durur. Bu yüzden yalnız bu satırı şablondan
 * render ÖNCESİ düşürüyoruz; diğer placeholder'ların uyarı davranışı bozulmuyor.
 * KURAL: {formLink} form tanımlı değilse, o placeholder'ın GEÇTİĞİ SATIRIN TAMAMI
 * düşer — böylece "Formu doldurun: {formLink}" gibi açıklamalı satırlar da temiz
 * kaybolur. Bu yüzden {formLink} kendi satırında yazılmalı; aynı satıra {uploadLink}
 * konursa o da düşer. (Arayüzdeki yardım metni bunu söylüyor.)
 */
function sablonMetniniIsle(sablonMetni, data = {}) {
  let metin = String(sablonMetni || '');
  if (!data.formLink) {
    metin = metin
      .split('\n')
      .filter((satir) => !satir.includes('{formLink}'))
      .join('\n');
  }
  return engine
    .render(metin, data)
    // Düşen satırın bıraktığı çift boşluğu topla
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// İşlem türünde metin tanımlı değilse kullanılan iskelet
const VARSAYILAN_GOVDE = [
  'Sayın {firmaAdi} Yetkilisi,',
  '',
  '{islemAdi} işlemi için aşağıdaki evraklara ihtiyaç duyulmaktadır:',
  '',
  '{evrakListesi}',
  '',
  'Evrakları aşağıdaki bağlantı üzerinden tarafımıza iletmenizi rica ederiz:',
  '',
  '{uploadLink}',
  '',
  // Form tanımlı değilse bu satırın tamamı düşer (bkz. mailOlustur içindeki kural)
  'Ayrıca bilgi formumuzu doldurmanızı rica ederiz: {formLink}',
  '',
  'İyi çalışmalar dileriz.',
  '',
  '{imza}'
].join('\n');

// 📎 Mail eklerini hazırla.
//
// Bulut (Cloudinary) dosyası sunucuda indirilip İÇERİK olarak eklenir. Eskiden adres nodemailer'a
// `path` olarak veriliyordu; PDF teslimatı kısıtlı olduğundan indirme 401 dönüyor ve gönderimin
// TAMAMI "Mail gönderilemedi. Lütfen SMTP ayarlarını ..." hatasıyla düşüyordu (müşteri, 15.09.2026).
// Alınamayan ek atlanır, gönderim sürer; atlananların adı çağırana döner ki kullanıcı görsün.
async function ekleriHazirla(ekler = [], {
  buluttanIndir = storageService.bulutDosyasiniIndir,
  dosyaVarMi = fs.existsSync
} = {}) {
  const attachments = [];
  const atlananEkler = [];
  for (const e of ekler || []) {
    if (!e) continue;
    const ad = e.dosyaAdi || 'ek';
    if (storageService.isCloudinaryUrl(e.fileUrl)) {
      const icerik = await buluttanIndir(e.fileUrl, e.mimeType);
      if (icerik && icerik.buffer) {
        attachments.push({ filename: ad, content: icerik.buffer, contentType: e.mimeType || icerik.contentType });
      } else {
        console.warn(`⚠️ Örnek dosya buluttan alınamadı, ek atlandı: ${ad}`);
        atlananEkler.push(ad);
      }
      continue;
    }
    if (e.filePath) {
      const yerel = path.isAbsolute(e.filePath) ? e.filePath : path.join(storageService.BASE_DIR, e.filePath);
      // Dosya diskte yoksa (ör. geçici disk temizlenmiş) nodemailer ENOENT fırlatıp
      // TÜM gönderimi düşürüyordu. Eksik eki atla, gönderim devam etsin.
      if (!dosyaVarMi(yerel)) {
        console.warn(`⚠️ Örnek dosya bulunamadı, ek atlandı: ${yerel}`);
        atlananEkler.push(ad);
        continue;
      }
      attachments.push({ filename: ad, path: yerel });
      continue;
    }
    if (e.fileUrl) attachments.push({ filename: ad, path: e.fileUrl });
  }
  return { attachments, atlananEkler };
}

// 📦 Firmanın yüklediği evrakları ZIP olarak akıt (müşteri, 21.09.2026: "toplu indirebilme").
// Dosyalar istenen evrak adına göre klasörlenir; aynı ad çakışırsa "(2)" eklenir. Alınamayan dosya
// ZIP'i düşürmez: ALINAMAYAN_DOSYALAR.txt'ye yazılır. Buluttan indirme sırayla yapılır (bellek bir
// dosyayla sınırlı kalsın diye paralel değil).
const zipAdiTemizle = (ad, yedek) => {
  const temiz = String(ad || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  return temiz || yedek;
};

async function zipDosyaIcerigi(y, { buluttanIndir = storageService.bulutDosyasiniIndir } = {}) {
  if (storageService.isCloudinaryUrl(y.fileUrl)) {
    const r = await buluttanIndir(y.fileUrl, y.mimeType);
    return r?.buffer || null;
  }
  if (!y.filePath) return null;
  const yerel = path.isAbsolute(y.filePath) ? y.filePath : path.join(storageService.BASE_DIR, y.filePath);
  if (!path.resolve(yerel).startsWith(path.resolve(storageService.BASE_DIR)) || !fs.existsSync(yerel)) return null;
  return fs.promises.readFile(yerel);
}

async function topluZipYaz(talep, res, { icerikAl = zipDosyaIcerigi } = {}) {
  const archiver = require('archiver');
  const zipAdi = `${zipAdiTemizle(talep.firmaAdi, 'Firma')} - ${zipAdiTemizle(talep.islemTuruAdi, 'Islem')} - Evraklar.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipAdi)}`);

  const zip = archiver('zip', { zlib: { level: 6 } });
  zip.on('warning', (e) => console.warn('⚠️ [islemEvrak] zip uyarısı:', e && e.message));
  zip.on('error', (e) => { console.error('🚨 [islemEvrak] zip hatası:', e && e.message); res.destroy(e); });
  zip.pipe(res);

  const kullanilan = new Set();
  const alinamayan = [];
  for (const y of talep.yuklenenEvraklar || []) {
    const gorunenAd = dosyaAdiDuzelt(y.orijinalAd || y.dosyaAdi || 'dosya');
    const klasor = zipAdiTemizle(y.istenenEvrakAdi, 'Diger');
    let ad = `${klasor}/${zipAdiTemizle(gorunenAd, 'dosya')}`;
    for (let n = 2; kullanilan.has(ad.toLocaleLowerCase('tr')); n += 1) {
      const nokta = gorunenAd.lastIndexOf('.');
      const govde = nokta > 0 ? gorunenAd.slice(0, nokta) : gorunenAd;
      const uzanti = nokta > 0 ? gorunenAd.slice(nokta) : '';
      ad = `${klasor}/${zipAdiTemizle(`${govde} (${n})${uzanti}`, 'dosya')}`;
    }
    kullanilan.add(ad.toLocaleLowerCase('tr'));

    let icerik = null;
    try { icerik = await icerikAl(y); } catch (e) { console.warn('⚠️ [islemEvrak] zip dosyası alınamadı:', e && e.message); }
    if (icerik) zip.append(icerik, { name: ad, date: y.yuklemeTarihi ? new Date(y.yuklemeTarihi) : new Date() });
    else alinamayan.push(ad);
  }
  if (alinamayan.length) {
    zip.append(
      `Aşağıdaki dosyalar depodan alınamadı. Talep ekranından tek tek açmayı deneyin; açılmıyorsa firmadan yeniden isteyin.\n\n${alinamayan.join('\n')}\n`,
      { name: 'ALINAMAYAN_DOSYALAR.txt' }
    );
  }
  await zip.finalize();
  return { dosyaSayisi: (talep.yuklenenEvraklar || []).length - alinamayan.length, alinamayan };
}

// 📤 Talebi mail olarak gönder (konu/gövde dışarıdan düzenlenmiş gelebilir)
async function mailGonder(talep, { to, cc = [], subject, body, ekler = [], user }) {
  if (!Array.isArray(to) || to.length === 0) {
    const e = new Error('Gönderim için alıcı e-posta adresi yok.'); e.code = 'NO_RECIPIENT'; throw e;
  }
  if (!String(subject || '').trim() || !String(body || '').trim()) {
    const e = new Error('Konu ve içerik boş olamaz.'); e.code = 'EMPTY_CONTENT'; throw e;
  }

  // Ekler: istenen evrakların örnek dosyaları (bkz. ekleriHazirla)
  const { attachments, atlananEkler } = await ekleriHazirla(ekler);

  await mailService.sendMail({ to, cc, subject, text: body, attachments });

  talep.mailKonusu = subject;
  talep.mailGovdesi = body;
  talep.mailAlicilar = to;
  talep.mailCc = cc;
  talep.sonMailTarihi = new Date();
  talep.mailGonderimSayisi = (talep.mailGonderimSayisi || 0) + 1;
  talep.sonGuncelleyen = user ? user._id : talep.sonGuncelleyen;
  talep.durumTazele();
  await talep.save();
  return { sent: true, ekSayisi: attachments.length, atlananEkler };
}

// 📎 Dosyayı talebin klasörüne kaydet (örnek şablon veya firma yüklemesi)
async function dosyaKaydet(talep, file, altKlasor = 'Gelen') {
  const saved = await storageService.saveBuffer({
    folderRel: talepKlasoru(talep),
    documentTypeFolder: altKlasor,
    originalName: file.originalname,
    buffer: file.buffer
  });
  return {
    dosyaAdi: saved.fileName,
    // multer adı latin1 çözüyor; listede görünen ad onarılmış hâliyle saklanır
    // (müşteri, 16.09.2026: "GÃ¼ncel Ä°mza SirkÃ¼leri.pdf") — utils/dosyaAdiKodlama.js
    orijinalAd: dosyaAdiDuzelt(file.originalname) || saved.fileName,
    fileUrl: saved.fileUrl || '',
    filePath: saved.relPath || '',
    mimeType: file.mimetype || '',
    fileSize: file.size || 0
  };
}

// 📎 Şablon örnek dosyası kaydet — TÜRE ait, henüz talep yok.
//
// Müşteri: "örnekleri de işlem türleri kısmından yükleyip kaydedebilelim".
// Eskiden örnek dosya yalnız talep ekranından yüklenebiliyordu; yani aynı örneği
// her yeni talepte tekrar yüklemek gerekiyordu.
//
// Bilinçli olarak DURUMSUZ: türü değiştirmez, sadece dosyayı depoya koyup künyeyi
// döner. Çağıran arayüz künyeyi düzenlediği satıra yazar, kaydete basınca normal
// tür güncellemesiyle kalıcılaşır. Böylece kaydedilmemiş türlerde de çalışır ve
// satır sırası değişse bile örnek doğru satırla birlikte taşınır.
// Bedeli: kullanıcı yükleyip kaydetmezse depoda sahipsiz bir dosya kalır.
async function sablonDosyaKaydet(turAd, file) {
  const saved = await storageService.saveBuffer({
    folderRel: sablonKlasoru(turAd),
    documentTypeFolder: 'Ornek_Sablonlar',
    originalName: file.originalname,
    buffer: file.buffer
  });
  return {
    dosyaAdi: dosyaAdiDuzelt(file.originalname) || saved.fileName,
    fileUrl: saved.fileUrl || '',
    filePath: saved.relPath || '',
    mimeType: file.mimetype || '',
    fileSize: file.size || 0
  };
}

/**
 * 🔀 Şablon evraklarını verilen EVET/HAYIR cevaplarına göre süzer.
 *
 * Kural: `kosulSoruId` boş olan evrak HER ZAMAN listeye girer. Doluysa, ilgili
 * sorunun cevabı `kosulDeger` ile birebir eşleşmelidir. Cevaplanmamış bir soruya
 * bağlı evrak listeye GİRMEZ — "sorulmadıysa istenmez" tarafında kalmak, yanlışlıkla
 * 55 kalemlik enerji/madencilik listesini firmaya göndermekten iyidir.
 *
 * Sorusu olmayan şablonlarda cevaplar boş gelir ve liste olduğu gibi döner:
 * özelliği kapatmanın en hafif yolu şablondan soruları silmektir.
 */
function kosullaSuz(evraklar, cevaplar = []) {
  const harita = new Map((cevaplar || []).map((c) => [String(c.soruId), String(c.deger || '').toUpperCase()]));
  return (evraklar || []).filter((e) => {
    const soruId = String(e.kosulSoruId || '').trim();
    if (!soruId) return true;
    const beklenen = String(e.kosulDeger || '').toUpperCase();
    if (!beklenen) return true;      // koşul yarım tanımlanmışsa evrakı gizleme
    return harita.get(soruId) === beklenen;
  });
}

/**
 * ☑️ Koşul süzgeci + kullanıcının talep açarken yaptığı seçimi birleştirir.
 *
 * İki aşama art arda uygulanır: önce koşullar (soru cevaplarına göre), sonra
 * işaretlenen satırlar. Sıra önemli — kullanıcı koşul yüzünden zaten elenmiş bir
 * satırı indeksle geri getiremesin.
 *
 * `secilenIndeksler` dizi DEĞİLSE seçim yapılmamış sayılır ve yalnız koşul süzgeci
 * çalışır; bu alanı göndermeyen eski çağrılar böylece aynen çalışmaya devam eder.
 * Boş dizi ise ayrı bir durumdur: kullanıcı hepsini kaldırmış demektir, sessizce
 * evraksız talep üretmek yerine hata veriyoruz (neredeyse her zaman arayüz hatası).
 *
 * İndeksler ŞABLONUN kendi dizisine göredir (IslemTuru.varyantCoz çıktısı).
 * Arayüz de aynı diziyi listelediği için numaralar örtüşür.
 */
function secimUygula(evraklar, cevaplar = [], secilenIndeksler = null) {
  const tumu = evraklar || [];
  // kosullaSuz aynı diziyi süzdüğü için nesne kimliği korunur; koşul sonucunu
  // indeksli seçimle bu sayede tek geçişte kesiştirebiliyoruz.
  const izinli = new Set(kosullaSuz(tumu, cevaplar));
  if (!Array.isArray(secilenIndeksler)) return tumu.filter((e) => izinli.has(e));

  const secilen = new Set(
    secilenIndeksler.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < tumu.length)
  );
  if (secilen.size === 0) {
    const e = new Error('En az bir evrak seçmelisiniz.'); e.code = 'BAD_INPUT'; throw e;
  }
  return tumu.filter((e, i) => izinli.has(e) && secilen.has(i));
}

// 🆕 Firma + işlem türünden talep oluştur (istenen evraklar şablondan kopyalanır)
//
// `secilenIndeksler`: şablonun istenenEvraklar dizisindeki konum numaraları.
// Müşteri: "Belge içinde İstenen evrakları seçebilelim, seçtiklerimiz maile
// eklensin — şimdilik sadece işlem türü yönetiminde görünüyor." Yani hangi
// evrakların isteneceği artık talep açarken de belirlenebiliyor.
//
// Verilmezse (undefined/null) ESKİ davranış: koşul süzgecinden geçen her evrak
// listeye girer. Böylece bu alanı göndermeyen eski çağrılar aynen çalışır.
// Firmaya en son gönderilen mailin alıcıları (Belge Takip firma mailleri + İşlem & Evrak talepleri),
// yoksa firma e-postası + yetkili kişilerin e-postaları. Belge Takip'in firma mailiyle AYNI kural
// (dosyaTakip/firmaMailMetni.alicilariOner). Eskiden yalnız firma e-postası ve yetkili kişilerde hiç
// olmayan `email` alanı okunuyordu: adresi yalnız yetkili kişilerde duran firmalarda "Kime" boş geliyordu.
async function varsayilanAlicilar(firma) {
  const DosyaTakip = require('../../models/DosyaTakip');
  const { alicilariOner } = require('../dosyaTakip/firmaMailMetni');
  const [belgeTakipMailleri, evrakTalepleri] = await Promise.all([
    DosyaTakip.find({ firma: firma._id, 'firmaMailleri.0': { $exists: true } })
      .select('firmaMailleri.alicilar firmaMailleri.cc firmaMailleri.tarih').lean(),
    IslemTalebi.find({ firma: firma._id, mailGonderimSayisi: { $gt: 0 } })
      .select('mailAlicilar mailCc sonMailTarihi').lean()
  ]);
  const gecmis = [
    ...belgeTakipMailleri.flatMap((t) => t.firmaMailleri || []),
    ...evrakTalepleri.map((t) => ({ alicilar: t.mailAlicilar, cc: t.mailCc, tarih: t.sonMailTarihi }))
  ];
  const { alici, cc } = alicilariOner({ firma, gecmis });
  const liste = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
  return { alicilar: liste(alici), cc: liste(cc) };
}

async function talepOlustur({ firmaId, islemTuruId, varyantKod = '', cevaplar = [], secilenIndeksler = null, dosyaTakipId = null, user }) {
  // 📎 Belge Takip'ten açılan evrak talebi: firma, Belge Takip talebinin firmasıdır
  let dosyaTakip = null;
  if (dosyaTakipId) {
    const DosyaTakip = require('../../models/DosyaTakip');
    dosyaTakip = await DosyaTakip.findById(dosyaTakipId).select('firma').lean().catch(() => null);
    if (!dosyaTakip) { const e = new Error('Belge Takip talebi bulunamadı.'); e.code = 'TALEP_NOT_FOUND'; throw e; }
    if (!dosyaTakip.firma) { const e = new Error('Bu Belge Takip talebine bağlı firma yok.'); e.code = 'BAD_INPUT'; throw e; }
    if (firmaId && String(firmaId) !== String(dosyaTakip.firma)) {
      const e = new Error('Evrak talebinin firması Belge Takip talebinin firmasıyla aynı olmalı.'); e.code = 'BAD_INPUT'; throw e;
    }
    firmaId = dosyaTakip.firma;
  }

  if (dosyaTakipId && !islemTuruId) {
    const varsayilan = await IslemTuru.findOne({ aktif: true, ad: 'Yeni Belge Talebi' });
    if (!varsayilan) { const e = new Error('Yeni Belge Talebi şablonu bulunamadı. İşlem türlerinden bu şablonu tanımlayın.'); e.code = 'BAD_INPUT'; throw e; }
    islemTuruId = varsayilan._id;
  }

  const [firma, tur] = await Promise.all([
    Firma.findById(firmaId).select('tamUnvan firmaEmail yetkiliKisiler').lean(),
    IslemTuru.findById(islemTuruId)
  ]);
  if (!firma) { const e = new Error('Firma bulunamadı.'); e.code = 'FIRMA_NOT_FOUND'; throw e; }
  if (!tur) { const e = new Error('İşlem türü bulunamadı.'); e.code = 'TUR_NOT_FOUND'; throw e; }

  const sablon = tur.varyantCoz(varyantKod);
  const { alicilar, cc } = await varsayilanAlicilar(firma);
  const alici = alicilar[0] || '';
  // Cevapları soru metniyle birlikte sakla: şablon sonradan değişse de talepte
  // hangi soruya ne cevap verildiği okunabilir kalsın
  const cevapKayitlari = (cevaplar || [])
    .filter((c) => c && c.soruId && ['EVET', 'HAYIR'].includes(String(c.deger || '').toUpperCase()))
    .map((c) => ({
      soruId: String(c.soruId),
      metin: (sablon.sorular || []).find((s) => s.id === c.soruId)?.metin || '',
      deger: String(c.deger).toUpperCase()
    }));

  const secilenEvraklar = secimUygula(sablon.istenenEvraklar, cevapKayitlari, secilenIndeksler);

  const talep = await IslemTalebi.create({
    firma: firma._id,
    firmaAdi: firma.tamUnvan || '',
    firmaEmail: alici,
    islemTuru: tur._id,
    islemTuruAdi: tur.ad,
    varyantKod: sablon.kod || '',
    varyantAd: sablon.ad || '',
    cevaplar: cevapKayitlari,
    // Şablondaki evraklar talebe kopyalanır → burada serbestçe düzenlenir
    istenenEvraklar: secilenEvraklar.map((e) => ({
      ad: e.ad,
      aciklama: e.aciklama || '',
      zorunlu: e.zorunlu !== false,
      ornekDosya: e.ornekDosya || undefined,
      isteyenKullanici: user ? user._id : undefined,
      isteyenAdi: user ? user.adSoyad : '',
      istenmeTarihi: new Date()
    })),
    mailAlicilar: alicilar,
    mailCc: cc,
    dosyaTakip: dosyaTakip ? dosyaTakip._id : null,
    olusturanKullanici: user ? user._id : undefined,
    olusturanAdi: user ? user.adSoyad : '',
    durum: 'taslak'
  });

  return talep;
}

module.exports = {
  kosullaSuz,
  secimUygula,
  talepKlasoru,
  sablonKlasoru,
  sablonDosyaKaydet,
  sablonMetniniIsle,
  getSignature,
  maildeIstenenler,
  ekliOrnekler,
  topluZipYaz,
  zipDosyaIcerigi,
  ensureUploadLink,
  evrakAnahtari,
  resolveByToken,
  mailOlustur,
  formLinkiUret,
  mailGonder,
  ekleriHazirla,
  dosyaKaydet,
  talepOlustur,
  VARSAYILAN_GOVDE
};
