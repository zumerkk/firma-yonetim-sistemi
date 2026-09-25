// 🌙 Gece yedeği — veritabanı + evraklar Google Drive'a
//
// Müşteri (25.09.2026): "verilerimizin yedeklenmesi ile ilgili nasıl tedbir alabiliriz,
// oto yedekleme vs?" Elle yedek düğmesi vardı ama kimse basmazsa yedek yoktu, indirilen
// ZIP kullanıcının bilgisayarında kalıyordu ve evrakların kendisi hiç yedeklenmiyordu.
//
// Bu iş her gece çalışır:
//   1. Veritabanının tamamını ZIP olarak Drive'a AKITIR (diske yazmaz, belleğe almaz)
//   2. Evrakların Drive'da olmayanlarını kopyalar (artımlı; bütçe dolunca kalanı ertesi gün)
//   3. Saklama süresi dolan eski veritabanı yedeklerini siler
//   4. Sonucu YedekCalismasi'na yazar — "sessizce durmuş yedek"i fark edebilelim

const path = require('path');
const { Readable } = require('stream');

const drive = require('./driveIstemcisi');
const { yeniArsiv, arsiveYaz } = require('./veritabaniArsivi');
const { envanter } = require('./evrakEnvanteri');
const storageService = require('../tesvikMakine/storageService');
const YedekDosya = require('../../models/YedekDosya');
const YedekCalismasi = require('../../models/YedekCalismasi');

const sayi = (v, varsayilan) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : varsayilan;
};

const SAKLAMA_GUN = () => sayi(process.env.YEDEK_SAKLAMA_GUN, 30);
const EVRAK_SURE_MS = () => sayi(process.env.YEDEK_EVRAK_SURE_SN, 1200) * 1000;  // 20 dk
const EVRAK_ADET = () => sayi(process.env.YEDEK_EVRAK_ADET, 1000);

const damga = (d = new Date()) => d.toISOString().replace(/[:.]/g, '-').slice(0, 19);

/** Veritabanını ZIP olarak Drive'a akıtır */
async function veritabaniniYedekle({ klasorId, baslatan, gunluk, istemci = drive }) {
  const ad = `GM_Veritabani_${damga()}.zip`;
  const arsiv = yeniArsiv();
  arsiv.on('warning', (u) => gunluk(`  ⚠️ arşiv uyarısı: ${u.message}`));
  // Yükleme ile yazma AYNI ANDA yürür: arşiv üretildikçe Drive'a akar, ara dosya yok.
  const yuklemeSozu = istemci.dosyaYukle({ ad, mimeType: 'application/zip', akis: arsiv, klasorId });
  const ustveri = await arsiveYaz(arsiv, { yedekAlan: baslatan, gunluk });
  const dosya = await yuklemeSozu;
  return {
    dosyaAdi: ad,
    driveId: dosya?.id || '',
    boyut: Number(dosya?.size) || 0,
    toplamKayit: ustveri.toplamKayitSayisi || 0,
    eksikler: ustveri.eksikler || []
  };
}

/** Drive'da olmayan evrakları kopyalar (bütçe dolunca durur) */
async function evraklariYedekle({ klasorId, gunluk, istemci = drive, indir = storageService.bulutDosyasiniIndir, liste = envanter, simdi = () => Date.now() }) {
  const hepsi = await liste();
  const kayitli = new Set((await YedekDosya.find({}, { anahtar: 1 }).lean()).map((k) => k.anahtar));
  const eksikler = hepsi.filter((d) => !kayitli.has(d.anahtar));

  const bitis = simdi() + EVRAK_SURE_MS();
  const enFazla = EVRAK_ADET();
  const sonuc = { envanter: hepsi.length, yedekliOnceden: hepsi.length - eksikler.length, yuklenen: 0, hatali: 0, hatalar: [], sureDoldu: false };

  for (const d of eksikler) {
    if (sonuc.yuklenen + sonuc.hatali >= enFazla || simdi() >= bitis) { sonuc.sureDoldu = true; break; }
    try {
      const icerik = await indir(d.anahtar, d.mimeType);
      if (!icerik || !icerik.buffer) throw new Error('dosya indirilemedi');
      const uzanti = path.extname(d.ad) || '';
      const driveAd = `${d.kaynak}_${d.ad}${uzanti ? '' : ''}`.slice(0, 200);
      const yuklenen = await istemci.dosyaYukle({
        ad: driveAd,
        mimeType: icerik.contentType || d.mimeType || 'application/octet-stream',
        akis: Readable.from(icerik.buffer),
        klasorId
      });
      await YedekDosya.create({
        anahtar: d.anahtar, kaynak: d.kaynak, ad: d.ad, boyut: d.boyut || icerik.buffer.length,
        driveId: yuklenen?.id || '', driveAd
      });
      sonuc.yuklenen += 1;
    } catch (hata) {
      sonuc.hatali += 1;
      if (sonuc.hatalar.length < 20) sonuc.hatalar.push(`${d.ad}: ${hata.message}`);
    }
  }
  gunluk(`  📎 evrak: ${sonuc.envanter} dosyanın ${sonuc.yedekliOnceden}'i zaten yedekli, ${sonuc.yuklenen} yeni kopyalandı, ${sonuc.hatali} hata${sonuc.sureDoldu ? ' (bütçe doldu, kalanlar yarın)' : ''}`);
  return sonuc;
}

/** Saklama süresi dolan veritabanı yedeklerini siler */
async function eskileriTemizle({ klasorId, gunluk, istemci = drive }) {
  const sinir = Date.now() - SAKLAMA_GUN() * 86400000;
  const dosyalar = await istemci.listele(klasorId, { adOneki: 'GM_Veritabani_' });
  let silinen = 0;
  for (const d of dosyalar) {
    const t = d.createdTime ? new Date(d.createdTime).getTime() : NaN;
    if (Number.isNaN(t) || t >= sinir) continue;
    try { await istemci.sil(d.id); silinen += 1; } catch (hata) { gunluk(`  ⚠️ eski yedek silinemedi (${d.name}): ${hata.message}`); }
  }
  if (silinen) gunluk(`  🧹 ${silinen} eski veritabanı yedeği silindi (${SAKLAMA_GUN()} günden eski)`);
  return { silinen };
}

/**
 * Tam yedek turu.
 * @param {{ tur?: 'otomatik'|'elle', baslatan?: string, istemci?: object, gunluk?: Function }} sec
 */
async function calistir({ tur = 'otomatik', baslatan = 'Sistem', istemci = drive, gunluk = console.log, ...digerleri } = {}) {
  if (!istemci.yapilandirildiMi()) {
    const e = new Error('Drive yedeği yapılandırılmamış (GOOGLE_OAUTH_* / GOOGLE_SERVICE_ACCOUNT_JSON ve YEDEK_DRIVE_KLASOR_ID gerekli).');
    e.code = 'YEDEK_YAPILANDIRILMAMIS';
    throw e;
  }
  const calisma = await YedekCalismasi.create({ tur, baslatan, basladi: new Date() });
  gunluk(`\n🌙 [${new Date().toLocaleString('tr-TR')}] Yedek başlıyor (${tur})`);
  try {
    const kok = process.env.YEDEK_DRIVE_KLASOR_ID;
    const vtKlasor = await istemci.klasorSagla('veritabani', kok);
    const evrakKlasor = await istemci.klasorSagla('evraklar', kok);

    calisma.veritabani = await veritabaniniYedekle({ klasorId: vtKlasor, baslatan, gunluk, istemci });
    gunluk(`  💾 veritabanı: ${calisma.veritabani.dosyaAdi} (${(calisma.veritabani.boyut / 1048576).toFixed(1)} MB, ${calisma.veritabani.toplamKayit} kayıt)`);

    calisma.evrak = await evraklariYedekle({ klasorId: evrakKlasor, gunluk, istemci, ...digerleri });
    calisma.temizlik = await eskileriTemizle({ klasorId: vtKlasor, gunluk, istemci });

    calisma.basarili = true;
    calisma.bitti = new Date();
    await calisma.save();
    gunluk(`✅ Yedek tamamlandı (${Math.round((calisma.bitti - calisma.basladi) / 1000)} sn)`);
    return calisma.toObject();
  } catch (hata) {
    calisma.basarili = false;
    calisma.bitti = new Date();
    calisma.hata = hata.message;
    await calisma.save().catch(() => {});
    gunluk(`❌ Yedek başarısız: ${hata.message}`);
    throw hata;
  }
}

module.exports = { calistir, veritabaniniYedekle, evraklariYedekle, eskileriTemizle, SAKLAMA_GUN };
