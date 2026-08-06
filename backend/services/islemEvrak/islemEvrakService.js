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

// ✉️ Mail metnini işlem türü/varyant şablonundan üret (placeholder'lar doldurulur)
function mailOlustur({ talep, sablon, uploadLink }) {
  const evrakListesi = (talep.istenenEvraklar || [])
    .map((e, i) => `${i + 1}. ${e.ad}${e.aciklama ? ` — ${e.aciklama}` : ''}${e.zorunlu ? '' : ' (opsiyonel)'}`)
    .join('\n');

  const data = {
    firmaAdi: talep.firmaAdi || '',
    islemAdi: talep.islemTuruAdi || '',
    varyant: talep.varyantAd || '',
    evrakListesi,
    uploadLink: uploadLink || '',
    imza: getSignature(),
    tarih: new Date().toLocaleDateString('tr-TR')
  };

  const konu = engine.render(sablon.mailKonusu || '{islemAdi} — Evrak Talebi ({firmaAdi})', data);
  const govde = engine.render(sablon.mailGovdesi || VARSAYILAN_GOVDE, data);
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

// 🆕 Firma + işlem türünden talep oluştur (istenen evraklar şablondan kopyalanır)
async function talepOlustur({ firmaId, islemTuruId, varyantKod = '', user }) {
  const [firma, tur] = await Promise.all([
    Firma.findById(firmaId).select('tamUnvan firmaEmail yetkiliKisiler').lean(),
    IslemTuru.findById(islemTuruId)
  ]);
  if (!firma) { const e = new Error('Firma bulunamadı.'); e.code = 'FIRMA_NOT_FOUND'; throw e; }
  if (!tur) { const e = new Error('İşlem türü bulunamadı.'); e.code = 'TUR_NOT_FOUND'; throw e; }

  const sablon = tur.varyantCoz(varyantKod);
  const alici = firma.firmaEmail || (firma.yetkiliKisiler || []).map((y) => y.email).find(Boolean) || '';

  const talep = await IslemTalebi.create({
    firma: firma._id,
    firmaAdi: firma.tamUnvan || '',
    firmaEmail: alici,
    islemTuru: tur._id,
    islemTuruAdi: tur.ad,
    varyantKod: sablon.kod || '',
    varyantAd: sablon.ad || '',
    // Şablondaki evraklar talebe kopyalanır → burada serbestçe düzenlenir
    istenenEvraklar: (sablon.istenenEvraklar || []).map((e) => ({
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
  talepKlasoru,
  ensureUploadLink,
  resolveByToken,
  mailOlustur,
  mailGonder,
  dosyaKaydet,
  talepOlustur,
  VARSAYILAN_GOVDE
};
