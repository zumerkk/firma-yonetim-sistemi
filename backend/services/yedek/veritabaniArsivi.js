// 💾 Veritabanı arşivi — tüm koleksiyonları JSON olarak ZIP'e akıtır
//
// Ayarlar ekranındaki "Sistemi Yedekle" düğmesi de, her gece çalışan otomatik yedek de
// BU modülü kullanır; iki ayrı yedek mantığı olmasın diye controller'dan buraya taşındı.
//
// ⚠️ BELLEK NOTU (2026-08 arızasının sebebi):
// Önceki sürüm her koleksiyonu find({}).lean() ile tümüyle belleğe alıp tek parça dev bir
// string üretiyordu. Canlıda tesviks 874 kayıt ama ~40 MB; Render 512 MB RAM ve taban RSS
// ~147 MB olduğu için süreç ikinci koleksiyonda OOM ile ölüyor, ZIP'in merkezi dizini hiç
// yazılmıyor ve arşiv "bozuk" çıkıyordu. Bu sürüm cursor ile kayıt kayıt akıtır: bellekte
// aynı anda yalnız bir batch ve tek kaydın JSON metni durur.

const archiver = require('archiver');
const mongoose = require('mongoose');
const { Readable } = require('stream');

const BATCH_BOYUTU = 200;
const TAMPON_ESIGI = 64 * 1024;

const Firma = require('../../models/Firma');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const DosyaTakip = require('../../models/DosyaTakip');
const User = require('../../models/User');
const Activity = require('../../models/Activity');
const Notification = require('../../models/Notification');
const { DestekUnsuru, DestekSarti, OzelSart, OzelSartNotu } = require('../../models/DynamicOptions');
const DestekSinifi = require('../../models/DestekSinifi');
const DestekSartEslesmesi = require('../../models/DestekSartEslesmesi');
const NaceCode = require('../../models/NaceCode');
const US97Code = require('../../models/US97Code');
const GTIPCode = require('../../models/GTIPCode');
const OecdKategori = require('../../models/OecdKategori');
const OecdKod4Haneli = require('../../models/OecdKod4Haneli');
const CurrencyCode = require('../../models/CurrencyCode');
const UnitCode = require('../../models/UnitCode');
const MachineTypeCode = require('../../models/MachineTypeCode');
const UsedMachineCode = require('../../models/UsedMachineCode');
// Evrak künyeleri de yedeğe girmeli: dosyanın kendisi Drive'a ayrıca kopyalanıyor ama
// hangi dosyanın hangi makineye/talebe ait olduğu YALNIZ bu kayıtlarda duruyor.
const IslemTuru = require('../../models/IslemTuru');
const IslemTalebi = require('../../models/IslemTalebi');
const MachineProcess = require('../../models/MachineProcess');
const UploadedDocument = require('../../models/UploadedDocument');
const MailLog = require('../../models/MailLog');

const KOLEKSIYONLAR = [
  { model: Firma, dosya: 'firmalar.json', etiket: 'Firma Bilgileri', gizle: [] },
  { model: Tesvik, dosya: 'eski_tesvik_belgeleri.json', etiket: 'Eski Teşvik Belgeleri', gizle: [] },
  { model: YeniTesvik, dosya: 'yeni_tesvik_belgeleri.json', etiket: 'Yeni Teşvik Belgeleri', gizle: [] },
  { model: DosyaTakip, dosya: 'dosya_takip.json', etiket: 'Dosya İş Akış Takip', gizle: [] },
  { model: User, dosya: 'kullanicilar.json', etiket: 'Kullanıcılar', gizle: ['sifre'] },
  { model: Activity, dosya: 'aktiviteler.json', etiket: 'Aktivite Kayıtları', gizle: [] },
  { model: Notification, dosya: 'bildirimler.json', etiket: 'Bildirimler', gizle: [] },
  { model: IslemTuru, dosya: 'islem_turleri.json', etiket: 'İşlem Türleri (şablonlar)', gizle: [] },
  { model: IslemTalebi, dosya: 'islem_talepleri.json', etiket: 'İşlem & Evrak Talepleri', gizle: [] },
  { model: MachineProcess, dosya: 'makine_surecleri.json', etiket: 'Ekipman Takip Süreçleri', gizle: [] },
  { model: UploadedDocument, dosya: 'yuklenen_evraklar.json', etiket: 'Yüklenen Evrak Künyeleri', gizle: [] },
  { model: MailLog, dosya: 'mail_gecmisi.json', etiket: 'Mail Geçmişi', gizle: [] },
  { model: DestekUnsuru, dosya: 'destek_unsurlari.json', etiket: 'Destek Unsurları', gizle: [] },
  { model: DestekSarti, dosya: 'destek_sartlari.json', etiket: 'Destek Şartları', gizle: [] },
  { model: OzelSart, dosya: 'ozel_sartlar.json', etiket: 'Özel Şartlar', gizle: [] },
  { model: OzelSartNotu, dosya: 'ozel_sart_notlari.json', etiket: 'Özel Şart Notları', gizle: [] },
  { model: DestekSinifi, dosya: 'destek_siniflari.json', etiket: 'Destek Sınıfları', gizle: [] },
  { model: DestekSartEslesmesi, dosya: 'destek_sart_eslesmeleri.json', etiket: 'Destek-Şart Eşleşmeleri', gizle: [] },
  { model: NaceCode, dosya: 'nace_kodlari.json', etiket: 'NACE Kodları', gizle: [] },
  { model: US97Code, dosya: 'us97_kodlari.json', etiket: 'US97 Kodları', gizle: [] },
  { model: GTIPCode, dosya: 'gtip_kodlari.json', etiket: 'GTİP Kodları', gizle: [] },
  { model: OecdKategori, dosya: 'oecd_kategorileri.json', etiket: 'OECD Kategorileri', gizle: [] },
  { model: OecdKod4Haneli, dosya: 'oecd_4haneli.json', etiket: 'OECD 4 Haneli Kodlar', gizle: [] },
  { model: CurrencyCode, dosya: 'doviz_kodlari.json', etiket: 'Döviz Kodları', gizle: [] },
  { model: UnitCode, dosya: 'birim_kodlari.json', etiket: 'Birim Kodları', gizle: [] },
  { model: MachineTypeCode, dosya: 'makine_tip_kodlari.json', etiket: 'Makine Tip Kodları', gizle: [] },
  { model: UsedMachineCode, dosya: 'kullanilmis_makine_kodlari.json', etiket: 'Kullanılmış Makine Kodları', gizle: [] }
];

/**
 * 🚿 Bir koleksiyonu JSON dizisi olarak akıtan Readable.
 * Çıktı geçerli bir JSON dizisidir; her kayıt kendi satırında durur.
 */
const koleksiyonAkisi = (model, gizle = []) => {
  const projeksiyon = {};
  gizle.forEach((f) => { projeksiyon[f] = 0; });
  const cursor = model.find({}, projeksiyon).lean().cursor({ batchSize: BATCH_BOYUTU });

  let sayac = 0;
  let ilk = true;
  let bitti = false;
  let okuyor = false;   // read() yeniden girişini engeller
  let hata = null;

  const akis = new Readable({
    highWaterMark: 256 * 1024,
    async read() {
      if (okuyor || bitti) return;
      okuyor = true;
      let tampon = '';
      try {
        let devam = true;
        while (devam) {
          const doc = await cursor.next();
          if (!doc) {
            bitti = true;
            akis.push(tampon + (ilk ? '[]\n' : '\n]\n'));
            akis.push(null);
            break;
          }
          sayac++;
          tampon += (ilk ? '[\n' : ',\n') + JSON.stringify(doc);
          ilk = false;
          if (tampon.length >= TAMPON_ESIGI) {
            // push() false dönerse tüketici doymuştur; duruyoruz. Node drain olunca
            // read() yeniden çağrılır — backpressure MongoDB cursor'una kadar iletilir.
            devam = akis.push(tampon);
            tampon = '';
          }
        }
      } catch (err) {
        // Tek koleksiyonun patlaması yedeğin tamamını çöpe atmasın: JSON'ı geçerli
        // biçimde kapatıp devam ediyoruz, hatayı üstveriye yazıyoruz.
        hata = err.message;
        bitti = true;
        akis.push(tampon + (ilk ? '[]\n' : '\n]\n'));
        akis.push(null);
      } finally {
        okuyor = false;
        if (bitti) cursor.close().catch(() => {});
      }
    },
    destroy(err, cb) { cursor.close().catch(() => {}); cb(err); }
  });

  akis.kayitSayisi = () => sayac;
  akis.hataMesaji = () => hata;
  return akis;
};

/** Akışı arşive ekler ve tamamen yutulmasını bekler (aynı anda tek koleksiyon bellekte olsun) */
const arsiveEkleVeBekle = (arsiv, akis, ad) => new Promise((resolve, reject) => {
  const kayitli = (girdi) => {
    if (girdi.name !== ad) return;
    arsiv.removeListener('entry', kayitli);
    resolve();
  };
  arsiv.on('entry', kayitli);
  akis.once('error', (err) => { arsiv.removeListener('entry', kayitli); reject(err); });
  arsiv.append(akis, { name: ad });
});

const yeniArsiv = () => archiver('zip', { zlib: { level: 6 } });

/**
 * Bütün koleksiyonları arşive yazar ve arşivi kapatır.
 * Arşivi nereye akıtacağı (HTTP yanıtı / Drive yüklemesi) çağırana aittir.
 *
 * @param {import('archiver').Archiver} arsiv  pipe'ı ÖNCEDEN bağlanmış arşiv
 * @param {{ yedekAlan?: string, yedekAlanEmail?: string, gunluk?: Function }} secenekler
 * @returns {Promise<object>} üstveri (kayıt sayıları, hatalar)
 */
async function arsiveYaz(arsiv, { yedekAlan = 'Otomatik yedek', yedekAlanEmail = '-', gunluk = () => {} } = {}) {
  const simdi = new Date();
  const ustveri = {
    yedekTarihi: simdi.toISOString(),
    yedekTarihiTR: simdi.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
    sistemVersiyon: '1.0.0',
    yedekAlan,
    yedekAlanEmail,
    mongoDBBaglantisi: mongoose.connection.host || 'bilinmiyor',
    nodeVersiyon: process.version,
    collectionSayisi: KOLEKSIYONLAR.length,
    kayitSayilari: {},
    eksikler: []
  };

  // SIRAYLA: her koleksiyonun arşive tamamen yazılmasını bekliyoruz (bellek notu)
  for (const kol of KOLEKSIYONLAR) {
    try {
      const akis = koleksiyonAkisi(kol.model, kol.gizle);
      await arsiveEkleVeBekle(arsiv, akis, kol.dosya);
      const adet = akis.kayitSayisi();
      const hata = akis.hataMesaji();
      if (hata) {
        // Eksik yedeği gizlemek en tehlikelisi: üstveriye açıkça yazılır.
        ustveri.kayitSayilari[kol.etiket] = `EKSİK: ${adet} kayıt yazıldı, hata: ${hata}`;
        ustveri.eksikler.push(`${kol.etiket}: ${hata}`);
        gunluk(`  ⚠️ ${kol.etiket} yarıda kesildi (${adet} kayıt): ${hata}`);
      } else {
        ustveri.kayitSayilari[kol.etiket] = adet;
        gunluk(`  ✅ ${kol.etiket}: ${adet} kayıt`);
      }
    } catch (hata) {
      ustveri.kayitSayilari[kol.etiket] = `HATA: ${hata.message}`;
      ustveri.eksikler.push(`${kol.etiket}: ${hata.message}`);
      gunluk(`  ⚠️ ${kol.etiket} yedeklenemedi: ${hata.message}`);
      arsiv.append(JSON.stringify([]), { name: kol.dosya });
    }
  }

  ustveri.toplamKayitSayisi = Object.values(ustveri.kayitSayilari)
    .filter((v) => typeof v === 'number').reduce((t, n) => t + n, 0);

  arsiv.append(JSON.stringify(ustveri, null, 2), { name: 'metadata.json' });
  await arsiv.finalize();
  return ustveri;
}

module.exports = { KOLEKSIYONLAR, koleksiyonAkisi, arsiveEkleVeBekle, yeniArsiv, arsiveYaz };
