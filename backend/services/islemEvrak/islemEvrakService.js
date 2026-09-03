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

// 🔗 Public yükleme linki — makine/ara-kontrol ile aynı biçim ("<önek>-<kısa kod>")
// Bu modülün firma sayfası /evrak/:token (AppRouter). Teşvik-makine'nin /upload/tesvik
// yolu kullanılırsa firma yanlış sayfaya düşer ve "Bağlantı geçersiz" hatası alır.
const PUBLIC_ROUTE = '/evrak';

async function ensureUploadLink(talep, { days } = {}) {
  const onek = storageService.normalizeSegment(talep.islemTuruAdi || 'islem').slice(0, 12);
  const gecerli = talep.uploadToken && !tokenService.isExpired(talep.uploadTokenExpiresAt);
  if (gecerli && tokenService.isPreferredToken(talep.uploadToken, onek)) {
    return tokenService.buildUploadLink(talep.uploadToken, PUBLIC_ROUTE);
  }
  talep.uploadToken = tokenService.generateToken(onek);
  talep.uploadTokenExpiresAt = tokenService.computeExpiry(days);
  await talep.save();
  return tokenService.buildUploadLink(talep.uploadToken, PUBLIC_ROUTE);
}

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

// ✉️ Mail metnini işlem türü/varyant şablonundan üret (placeholder'lar doldurulur)
function mailOlustur({ talep, sablon, uploadLink, firma }) {
  // Müşteri: "tikleri kaldırınca mailde otomatik silinsin, (opsiyonel) yazmak yerine."
  // İşareti kaldırılan evrak firmadan İSTENMİYOR demektir; maile hiç yazılmaz.
  const secililer = (talep.istenenEvraklar || []).filter((e) => e.zorunlu !== false);
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

  // Motor, değeri boş olan placeholder'ı bilerek yerinde bırakır ("{x}" görünür kalsın
  // ki eksik veri fark edilsin). Ama Google Form opsiyonel: tanımlı değilse mailde
  // "{formLink}" yazması hata gibi durur. Bu yüzden yalnız bu satırı şablondan
  // render ÖNCESİ düşürüyoruz; diğer placeholder'ların uyarı davranışı bozulmuyor.
  // KURAL: {formLink} form tanımlı değilse, o placeholder'ın GEÇTİĞİ SATIRIN TAMAMI
  // düşer — böylece "Formu doldurun: {formLink}" gibi açıklamalı satırlar da temiz
  // kaybolur. Bu yüzden {formLink} kendi satırında yazılmalı; aynı satıra {uploadLink}
  // konursa o da düşer. (Arayüzdeki yardım metni bunu söylüyor.)
  let sablonMetni = sablon.mailGovdesi || VARSAYILAN_GOVDE;
  if (!data.formLink) {
    sablonMetni = String(sablonMetni)
      .split('\n')
      .filter((satir) => !satir.includes('{formLink}'))
      .join('\n');
  }

  const govde = engine
    .render(sablonMetni, data)
    // Düşen satırın bıraktığı çift boşluğu topla
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { konu, govde, data };
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

// 📤 Talebi mail olarak gönder (konu/gövde dışarıdan düzenlenmiş gelebilir)
async function mailGonder(talep, { to, cc = [], subject, body, ekler = [], user }) {
  if (!Array.isArray(to) || to.length === 0) {
    const e = new Error('Gönderim için alıcı e-posta adresi yok.'); e.code = 'NO_RECIPIENT'; throw e;
  }
  if (!String(subject || '').trim() || !String(body || '').trim()) {
    const e = new Error('Konu ve içerik boş olamaz.'); e.code = 'EMPTY_CONTENT'; throw e;
  }

  // Ekler: istenen evrakların örnek dosyaları (nodemailer path ile çeker)
  const attachments = ekler.map((e) => {
    if (storageService.isCloudinaryUrl(e.fileUrl)) {
      return { filename: e.dosyaAdi || 'ek', path: e.fileUrl };
    }
    if (e.filePath) {
      const yerel = path.isAbsolute(e.filePath) ? e.filePath : path.join(storageService.BASE_DIR, e.filePath);
      // Dosya diskte yoksa (ör. geçici disk temizlenmiş) nodemailer ENOENT fırlatıp
      // TÜM gönderimi düşürüyordu. Eksik eki atla, gönderim devam etsin.
      if (!fs.existsSync(yerel)) {
        console.warn(`⚠️ Örnek dosya bulunamadı, ek atlandı: ${yerel}`);
        return null;
      }
      return { filename: e.dosyaAdi || 'ek', path: yerel };
    }
    return e.fileUrl ? { filename: e.dosyaAdi || 'ek', path: e.fileUrl } : null;
  }).filter(Boolean);

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
  return { sent: true, ekSayisi: attachments.length };
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
    orijinalAd: file.originalname || saved.fileName,
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

// 🆕 Firma + işlem türünden talep oluştur (istenen evraklar şablondan kopyalanır)
async function talepOlustur({ firmaId, islemTuruId, varyantKod = '', cevaplar = [], user }) {
  const [firma, tur] = await Promise.all([
    Firma.findById(firmaId).select('tamUnvan firmaEmail yetkiliKisiler').lean(),
    IslemTuru.findById(islemTuruId)
  ]);
  if (!firma) { const e = new Error('Firma bulunamadı.'); e.code = 'FIRMA_NOT_FOUND'; throw e; }
  if (!tur) { const e = new Error('İşlem türü bulunamadı.'); e.code = 'TUR_NOT_FOUND'; throw e; }

  const sablon = tur.varyantCoz(varyantKod);
  const alici = firma.firmaEmail || (firma.yetkiliKisiler || []).map((y) => y.email).find(Boolean) || '';
  // Cevapları soru metniyle birlikte sakla: şablon sonradan değişse de talepte
  // hangi soruya ne cevap verildiği okunabilir kalsın
  const cevapKayitlari = (cevaplar || [])
    .filter((c) => c && c.soruId && ['EVET', 'HAYIR'].includes(String(c.deger || '').toUpperCase()))
    .map((c) => ({
      soruId: String(c.soruId),
      metin: (sablon.sorular || []).find((s) => s.id === c.soruId)?.metin || '',
      deger: String(c.deger).toUpperCase()
    }));

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
    istenenEvraklar: kosullaSuz(sablon.istenenEvraklar, cevapKayitlari).map((e) => ({
      ad: e.ad,
      aciklama: e.aciklama || '',
      zorunlu: e.zorunlu !== false,
      ornekDosya: e.ornekDosya || undefined,
      isteyenKullanici: user ? user._id : undefined,
      isteyenAdi: user ? user.adSoyad : '',
      istenmeTarihi: new Date()
    })),
    mailAlicilar: alici ? [alici] : [],
    olusturanKullanici: user ? user._id : undefined,
    olusturanAdi: user ? user.adSoyad : '',
    durum: 'taslak'
  });

  return talep;
}

module.exports = {
  kosullaSuz,
  talepKlasoru,
  ensureUploadLink,
  resolveByToken,
  mailOlustur,
  formLinkiUret,
  mailGonder,
  dosyaKaydet,
  talepOlustur,
  VARSAYILAN_GOVDE
};
