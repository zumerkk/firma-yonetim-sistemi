// 💾 BACKUP CONTROLLER - Tam Sistem Yedeği
// Tüm MongoDB collection'larını JSON olarak ZIP'e paketler ve stream eder
// Admin-only erişim (route seviyesinde kontrol edilir)
//
// ⚠️ BELLEK NOTU (2026-08 arızasının sebebi):
// Önceki sürüm her collection'ı find({}).lean() ile tümüyle belleğe alıp
// JSON.stringify(data, null, 2) ile tek parça dev bir string üretiyordu.
// Canlıda tesviks collection'ı 858 kayıt ama 48.5 MB JSON (kayıt başına ~38 KB
// iç içe veri) — Render free plan 512 MB RAM ve taban RSS zaten ~147 MB olduğu
// için süreç ikinci collection'da OOM ile ölüyordu. Sonuç: ZIP ilk dosyadan
// sonra kesiliyor, merkezi dizin (End of Central Directory) hiç yazılmıyor,
// WinRAR/7-Zip "bozuk arşiv" diyor, Drive'da içerik boş görünüyordu.
//
// Bu sürüm cursor ile kayıt kayıt akıtıyor: bellekte aynı anda yalnızca bir
// batch (BATCH_BOYUTU kayıt) ve tek bir kaydın JSON metni duruyor.

const archiver = require('archiver');
const mongoose = require('mongoose');
const { Readable } = require('stream');

// Cursor'dan tek seferde çekilecek kayıt sayısı. Teşvik belgeleri ~38 KB
// olduğundan 200 kayıt ≈ 7.6 MB; küçük lookup tablolarında maliyeti ihmal edilebilir.
const BATCH_BOYUTU = 200;

// Stream'e kayıt kayıt yazmak yerine bu eşiğe ulaşana dek tamponluyoruz;
// deflate ve stream katmanının çağrı başına sabit maliyeti 28 bin kayda
// dağıldığında yedekleme süresi belirgin şekilde kısalıyor.
const TAMPON_ESIGI = 64 * 1024;

// Tüm modelleri import et
const Firma = require('../models/Firma');
const Tesvik = require('../models/Tesvik');
const YeniTesvik = require('../models/YeniTesvik');
const DosyaTakip = require('../models/DosyaTakip');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
// DynamicOptions tek bir model değil, 4 modeli birden dışa aktarıyor.
// Eskiden buraya modül nesnesi olarak konulduğu için model.find() patlıyor ve
// dinamik_secenekler.json her yedekte boş dizi olarak yazılıyordu.
const { DestekUnsuru, DestekSarti, OzelSart, OzelSartNotu } = require('../models/DynamicOptions');
const DestekSinifi = require('../models/DestekSinifi');
const DestekSartEslesmesi = require('../models/DestekSartEslesmesi');
const NaceCode = require('../models/NaceCode');
const US97Code = require('../models/US97Code');
const GTIPCode = require('../models/GTIPCode');
const OecdKategori = require('../models/OecdKategori');
const OecdKod4Haneli = require('../models/OecdKod4Haneli');
const CurrencyCode = require('../models/CurrencyCode');
const UnitCode = require('../models/UnitCode');
const MachineTypeCode = require('../models/MachineTypeCode');
const UsedMachineCode = require('../models/UsedMachineCode');

// 📋 Yedeklenecek collection tanımları
const BACKUP_COLLECTIONS = [
  { model: Firma, filename: 'firmalar.json', label: 'Firma Bilgileri', excludeFields: [] },
  { model: Tesvik, filename: 'eski_tesvik_belgeleri.json', label: 'Eski Teşvik Belgeleri', excludeFields: [] },
  { model: YeniTesvik, filename: 'yeni_tesvik_belgeleri.json', label: 'Yeni Teşvik Belgeleri', excludeFields: [] },
  { model: DosyaTakip, filename: 'dosya_takip.json', label: 'Dosya İş Akış Takip', excludeFields: [] },
  { model: User, filename: 'kullanicilar.json', label: 'Kullanıcılar', excludeFields: ['sifre'] },
  { model: Activity, filename: 'aktiviteler.json', label: 'Aktivite Kayıtları', excludeFields: [] },
  { model: Notification, filename: 'bildirimler.json', label: 'Bildirimler', excludeFields: [] },
  { model: DestekUnsuru, filename: 'destek_unsurlari.json', label: 'Destek Unsurları', excludeFields: [] },
  { model: DestekSarti, filename: 'destek_sartlari.json', label: 'Destek Şartları', excludeFields: [] },
  { model: OzelSart, filename: 'ozel_sartlar.json', label: 'Özel Şartlar', excludeFields: [] },
  { model: OzelSartNotu, filename: 'ozel_sart_notlari.json', label: 'Özel Şart Notları', excludeFields: [] },
  { model: DestekSinifi, filename: 'destek_siniflari.json', label: 'Destek Sınıfları', excludeFields: [] },
  { model: DestekSartEslesmesi, filename: 'destek_sart_eslesmeleri.json', label: 'Destek-Şart Eşleşmeleri', excludeFields: [] },
  { model: NaceCode, filename: 'nace_kodlari.json', label: 'NACE Kodları', excludeFields: [] },
  { model: US97Code, filename: 'us97_kodlari.json', label: 'US97 Kodları', excludeFields: [] },
  { model: GTIPCode, filename: 'gtip_kodlari.json', label: 'GTİP Kodları', excludeFields: [] },
  { model: OecdKategori, filename: 'oecd_kategorileri.json', label: 'OECD Kategorileri', excludeFields: [] },
  { model: OecdKod4Haneli, filename: 'oecd_4haneli.json', label: 'OECD 4 Haneli Kodlar', excludeFields: [] },
  { model: CurrencyCode, filename: 'doviz_kodlari.json', label: 'Döviz Kodları', excludeFields: [] },
  { model: UnitCode, filename: 'birim_kodlari.json', label: 'Birim Kodları', excludeFields: [] },
  { model: MachineTypeCode, filename: 'makine_tip_kodlari.json', label: 'Makine Tip Kodları', excludeFields: [] },
  { model: UsedMachineCode, filename: 'kullanilmis_makine_kodlari.json', label: 'Kullanılmış Makine Kodları', excludeFields: [] }
];

/**
 * 🚿 collectionStream - Bir collection'ı JSON dizisi olarak akıtan Readable
 *
 * Tüm kayıtları belleğe almak yerine cursor'dan batch batch okur ve her kaydı
 * kendi satırında yazar. Çıktı geçerli bir JSON dizisidir:
 *   [
 *   {"_id":"...","ad":"..."},
 *   {"_id":"...","ad":"..."}
 *   ]
 * (Eski sürümdeki 2 boşluklu girinti kaldırıldı: dosyayı ~%40 şişiriyordu,
 * satır başına bir kayıt zaten yeterince okunabilir.)
 *
 * @param {import('mongoose').Model} model
 * @param {string[]} excludeFields yedeğe girmeyecek alanlar (ör. 'sifre')
 * @returns {Readable & { kayitSayisi: () => number, hataMesaji: () => string|null }}
 */
const collectionStream = (model, excludeFields = []) => {
  const projection = {};
  excludeFields.forEach((f) => { projection[f] = 0; });

  const cursor = model.find({}, projection).lean().cursor({ batchSize: BATCH_BOYUTU });

  let sayac = 0;
  let ilk = true;
  let bitti = false;
  let okuyor = false;      // read() yeniden girişini engeller
  let hata = null;

  const stream = new Readable({
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
            stream.push(tampon + (ilk ? '[]\n' : '\n]\n'));
            stream.push(null);
            break;
          }
          sayac++;
          tampon += (ilk ? '[\n' : ',\n') + JSON.stringify(doc);
          ilk = false;
          if (tampon.length >= TAMPON_ESIGI) {
            // push() false dönerse tüketici (archiver→res) doymuş demektir; duruyoruz.
            // Node drain olunca read()'i yeniden çağırıyor. Backpressure böylece
            // MongoDB cursor'una kadar iletiliyor.
            devam = stream.push(tampon);
            tampon = '';
          }
        }
      } catch (err) {
        // Tek bir collection'ın patlaması yedeğin tamamını çöpe atmasın:
        // JSON'ı geçerli biçimde kapatıp devam ediyoruz, hatayı metadata'ya yazıyoruz.
        hata = err.message;
        bitti = true;
        stream.push(tampon + (ilk ? '[]\n' : '\n]\n'));
        stream.push(null);
      } finally {
        okuyor = false;
        if (bitti) cursor.close().catch(() => {});
      }
    },
    destroy(err, cb) {
      cursor.close().catch(() => {});
      cb(err);
    }
  });

  stream.kayitSayisi = () => sayac;
  stream.hataMesaji = () => hata;
  return stream;
};

/**
 * 📎 arsiveEkleVeBekle - Stream'i arşive ekler ve tamamen yutulmasını bekler
 *
 * Sıralı beklemek şart: archiver append edilen stream'leri kuyruğa alır, biz de
 * aynı anda yalnızca tek collection'ın bellekte olmasını istiyoruz.
 */
const arsiveEkleVeBekle = (archive, stream, name) => new Promise((resolve, reject) => {
  const entryHandler = (entry) => {
    if (entry.name !== name) return;
    archive.removeListener('entry', entryHandler);
    resolve();
  };
  archive.on('entry', entryHandler);
  stream.once('error', (err) => {
    archive.removeListener('entry', entryHandler);
    reject(err);
  });
  archive.append(stream, { name });
});

/**
 * 💾 fullBackup - Tüm sistemi ZIP olarak yedekle
 * GET /api/backup/full
 * Admin-only (route middleware ile kontrol edilir)
 */
const fullBackup = async (req, res) => {
  console.log(`\n💾 [${new Date().toLocaleString('tr-TR')}] Tam sistem yedeği başlatılıyor...`);
  console.log(`👤 Yedek alan kullanıcı: ${req.user?.ad || 'Bilinmiyor'} (${req.user?.email || '-'})`);

  // Response timeout'u artır (büyük veri setleri için)
  req.setTimeout(5 * 60 * 1000); // 5 dakika
  res.setTimeout(5 * 60 * 1000);

  try {
    // 📅 Dosya adı oluştur
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipFilename = `GM_Yedek_${dateStr}.zip`;

    // 📦 ZIP stream oluştur
    const archive = archiver('zip', {
      zlib: { level: 6 } // Orta seviye sıkıştırma (hız/boyut dengesi)
    });

    // Response header'ları ayarla
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Archive hata yönetimi
    archive.on('error', (err) => {
      console.error('❌ Archive hatası:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Yedekleme sırasında hata oluştu: ' + err.message
        });
      }
    });

    archive.on('end', () => {
      const totalBytes = archive.pointer();
      const sizeMB = (totalBytes / (1024 * 1024)).toFixed(2);
      console.log(`✅ Yedekleme tamamlandı! Toplam boyut: ${sizeMB} MB`);
    });

    // Archive'ı response'a pipe et (streaming)
    archive.pipe(res);

    // 🔌 Kullanıcı indirmeyi iptal ederse cursor'lar ve arşiv boşta kalmasın
    res.on('close', () => {
      if (!res.writableEnded) {
        console.warn('⚠️ Yedek indirmesi istemci tarafından yarıda kesildi.');
        archive.abort();
      }
    });

    // 📊 Metadata bilgisi topla
    const metadata = {
      yedekTarihi: now.toISOString(),
      yedekTarihiTR: now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
      sistemVersiyon: '1.0.0',
      yedekAlan: req.user?.ad || 'Admin',
      yedekAlanEmail: req.user?.email || '-',
      mongoDBBaglantisi: mongoose.connection.host || 'bilinmiyor',
      nodeVersiyon: process.version,
      collectionSayisi: BACKUP_COLLECTIONS.length,
      kayitSayilari: {}
    };

    // 🔄 Her collection'ı SIRAYLA akıt. Sıralı olması kritik: aynı anda tek
    // collection bellekte olsun diye her birinin arşive tamamen yazılmasını
    // bekliyoruz (bkz. dosya başındaki BELLEK NOTU).
    for (const col of BACKUP_COLLECTIONS) {
      try {
        console.log(`  📦 ${col.label} yedekleniyor...`);

        const stream = collectionStream(col.model, col.excludeFields);
        await arsiveEkleVeBekle(archive, stream, col.filename);

        const count = stream.kayitSayisi();
        const streamHatasi = stream.hataMesaji();

        if (streamHatasi) {
          // Kayıtların bir kısmı yazıldı ama okuma yarıda kaldı — bunu gizlemek
          // yedeği sessizce eksik bırakır, o yüzden metadata'ya açıkça yazılıyor.
          metadata.kayitSayilari[col.label] = `EKSİK: ${count} kayıt yazıldı, hata: ${streamHatasi}`;
          console.error(`  ⚠️ ${col.label} yarıda kesildi (${count} kayıt):`, streamHatasi);
        } else {
          metadata.kayitSayilari[col.label] = count;
          console.log(`  ✅ ${col.label}: ${count} kayıt`);
        }

        const heapMB = (process.memoryUsage().heapUsed / 1048576).toFixed(0);
        console.log(`     ↳ heap: ${heapMB} MB`);

      } catch (colError) {
        console.error(`  ⚠️ ${col.label} yedeklenirken hata:`, colError.message);
        metadata.kayitSayilari[col.label] = `HATA: ${colError.message}`;
        archive.append(JSON.stringify([]), { name: col.filename });
      }
    }

    // 📋 Metadata dosyasını ekle
    metadata.toplamKayitSayisi = Object.values(metadata.kayitSayilari)
      .filter(v => typeof v === 'number')
      .reduce((sum, n) => sum + n, 0);

    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    console.log(`\n📊 Toplam ${metadata.toplamKayitSayisi} kayıt yedeklendi.`);

    // 🏁 ZIP'i finalize et
    await archive.finalize();

  } catch (error) {
    console.error('❌ Yedekleme hatası:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Yedekleme başarısız: ' + error.message
      });
    }
  }
};

/**
 * 📊 backupInfo - Yedekleme öncesi bilgi (kayıt sayıları)
 * GET /api/backup/info
 */
const backupInfo = async (req, res) => {
  try {
    const counts = {};
    let totalRecords = 0;

    for (const col of BACKUP_COLLECTIONS) {
      try {
        const count = await col.model.countDocuments();
        counts[col.label] = count;
        totalRecords += count;
      } catch (err) {
        counts[col.label] = 'Hata';
      }
    }

    res.json({
      success: true,
      data: {
        collectionSayisi: BACKUP_COLLECTIONS.length,
        toplamKayit: totalRecords,
        detay: counts,
        tahminiSure: totalRecords < 1000 ? '~10 saniye' : totalRecords < 10000 ? '~30 saniye' : '~1-2 dakika'
      }
    });
  } catch (error) {
    console.error('❌ Backup info hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yedek bilgisi alınamadı: ' + error.message
    });
  }
};

module.exports = {
  fullBackup,
  backupInfo
};
