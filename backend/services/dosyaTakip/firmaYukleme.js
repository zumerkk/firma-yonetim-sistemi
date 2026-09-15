// 📤 BELGE TAKİP → FİRMA YÜKLEME BAĞLANTISI
//
// Müşteri (15.09.2026): "Birde firma mailine yükleme linki koyabilir miyiz, yüklenen belgeler belge
// takipde firma maili- gelen gibi bir alt kısımda görünebilir"
//
// Talep başına TEK bağlantı var: firmaya giden her mailde aynı link olur, firma eski bir maildeki
// linki kullansa da dosya doğru talebe düşer. Gelen dosyalar talebin `dosyalar` dizisine
// `firmaYukledi: true` işaretiyle eklenir; açma, indirme, silme, açıklama ve maile ek yapma gibi
// mevcut dosya işlemleri bu dosyalarda da aynen çalışır.
//
// Bağlantı herkese açık olduğundan firmaya yalnız firma unvanı, talep türü, belge no, firmadan
// beklenen evraklar ve kendi yüklediği dosyaların adı gösterilir.

const tokenService = require('../tesvikMakine/uploadTokenService');
const { belgeNoAl, firmadanBeklenenler } = require('./firmaMailMetni');

// Firmanın açtığı frontend sayfası (AppRouter: /belge-yukle/:token)
const PUBLIC_ROUTE = '/belge-yukle';
const EN_FAZLA_DOSYA = Number(process.env.MAX_UPLOAD_FILES) || 10;

const baglanti = (token) => tokenService.buildUploadLink(token, PUBLIC_ROUTE);

/**
 * Talebin firma yükleme bağlantısı; yoksa (ya da süresi dolduysa) üretir.
 *
 * save() yerine koşullu updateOne: taslak açmak eski bir kayıttaki geçersiz bir alan yüzünden
 * düşmesin, aynı anda açılan iki taslak da birbirinin bağlantısını ezmesin.
 */
async function yuklemeLinkiHazirla(Model, talep) {
  const mevcut = talep?.firmaYukleme?.token;
  if (mevcut && !tokenService.isExpired(talep.firmaYukleme.sonKullanma)) return baglanti(mevcut);

  const token = tokenService.generateToken(belgeNoAl(talep));
  const sonuc = await Model.updateOne(
    { _id: talep._id, 'firmaYukleme.token': mevcut || { $in: [null, ''] } },
    {
      $set: {
        'firmaYukleme.token': token,
        'firmaYukleme.olusturmaTarihi': new Date(),
        'firmaYukleme.sonKullanma': tokenService.computeExpiry()
      }
    }
  );
  if (sonuc.modifiedCount) return baglanti(token);

  // Araya başka bir istek girip bağlantıyı üretmiş: onunkini kullan
  const guncel = await Model.findById(talep._id).select('firmaYukleme').lean();
  return guncel?.firmaYukleme?.token ? baglanti(guncel.firmaYukleme.token) : '';
}

/** Token → { talep } | { suresiDoldu: true } | null */
async function talebiBul(Model, token) {
  const t = String(token || '').trim();
  if (!t || t.length > 100 || !/^[A-Za-z0-9-]+$/.test(t)) return null;
  const talep = await Model.findOne({ 'firmaYukleme.token': t, aktif: { $ne: false } });
  if (!talep) return null;
  if (tokenService.isExpired(talep.firmaYukleme?.sonKullanma)) return { suresiDoldu: true };
  return { talep };
}

/** Firmanın gördüğü sayfa verisi — takip no, iç notlar, personel ve e-posta bilgisi yok */
function publicBilgi(talep) {
  return {
    firmaUnvan: talep?.firmaUnvan || '',
    talepTuru: talep?.talepTuru || '',
    belgeNo: belgeNoAl(talep),
    beklenenler: firmadanBeklenenler(talep),
    yuklenenler: (talep?.dosyalar || [])
      .filter((d) => d.firmaYukledi)
      .map((d) => ({ ad: d.dosyaAdi, tarih: d.yuklemeTarihi })),
    maxUploadMB: Number(process.env.MAX_UPLOAD_MB) || 100,
    enFazlaDosya: EN_FAZLA_DOSYA
  };
}

/** multer (Cloudinary depolaması) dosyası → talep.dosyalar kaydı */
function gelenDosyaKaydi(file, { yukleyenAdi = '', aciklama = '' } = {}) {
  // multer dosya adını latin1 olarak çözüyor → Türkçe karakterler için utf8'e çevir (dosyaEkle ile aynı)
  let ad = file?.originalname || 'dosya';
  try { ad = Buffer.from(ad, 'latin1').toString('utf8'); } catch (_) { /* yoksay */ }
  const kisi = String(yukleyenAdi || '').trim().slice(0, 100);
  return {
    dosyaAdi: ad,
    dosyaYolu: file?.path,
    dosyaTipi: file?.mimetype,
    kategori: '',
    // Belge takipte açıklama zorunlu; firma yazmadıysa kaynağı yazılır ki liste "açıklama eksik" demesin
    aciklama: (String(aciklama || '').trim() || 'Firma yükleme bağlantısından gönderildi').slice(0, 300),
    dosyaBoyutu: file?.size,
    cloudinaryPublicId: file?.filename,
    yukleyenAdi: kisi ? `Firma — ${kisi}` : 'Firma (yükleme bağlantısı)',
    firmaYukledi: true,
    yuklemeTarihi: new Date()
  };
}

/** Firmadan dosya gelince haber verilecek personel: firmaya mail gönderenler + takibi yapan */
function bildirimHedefleri(talep) {
  const kimlik = (v) => (v ? String(v._id || v) : '');
  const idler = [
    ...(talep?.firmaMailleri || []).map((m) => kimlik(m.gonderen)),
    kimlik(talep?.muraacatSonrasi?.takibiYapanPersonel)
  ].filter(Boolean);
  const tekil = [...new Set(idler)];
  if (!tekil.length && kimlik(talep?.olusturanKullanici)) tekil.push(kimlik(talep.olusturanKullanici));
  return tekil;
}

module.exports = {
  PUBLIC_ROUTE,
  EN_FAZLA_DOSYA,
  yuklemeLinkiHazirla,
  talebiBul,
  publicBilgi,
  gelenDosyaKaydi,
  bildirimHedefleri
};
