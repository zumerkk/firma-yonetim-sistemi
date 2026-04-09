// 💾 BACKUP CONTROLLER - Tam Sistem Yedeği
// Tüm MongoDB collection'larını JSON olarak ZIP'e paketler ve stream eder
// Admin-only erişim (route seviyesinde kontrol edilir)

const archiver = require('archiver');
const mongoose = require('mongoose');

// Tüm modelleri import et
const Firma = require('../models/Firma');
const Tesvik = require('../models/Tesvik');
const YeniTesvik = require('../models/YeniTesvik');
const DosyaTakip = require('../models/DosyaTakip');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const DynamicOptions = require('../models/DynamicOptions');
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
  { model: DynamicOptions, filename: 'dinamik_secenekler.json', label: 'Dinamik Seçenekler', excludeFields: [] },
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

    // 🔄 Her collection'ı sırayla yedekle
    for (const col of BACKUP_COLLECTIONS) {
      try {
        console.log(`  📦 ${col.label} yedekleniyor...`);

        // Verileryi çek
        let query = col.model.find({}).lean();

        // Şifre gibi hassas alanları hariç tut
        if (col.excludeFields.length > 0) {
          const excludeProjection = {};
          col.excludeFields.forEach(f => { excludeProjection[f] = 0; });
          query = col.model.find({}, excludeProjection).lean();
        }

        const data = await query;
        const count = data.length;

        // Metadata'ya kayıt sayısını ekle
        metadata.kayitSayilari[col.label] = count;

        // JSON'ı ZIP'e ekle
        const jsonStr = JSON.stringify(data, null, 2);
        archive.append(jsonStr, { name: col.filename });

        console.log(`  ✅ ${col.label}: ${count} kayıt`);

      } catch (colError) {
        console.error(`  ⚠️ ${col.label} yedeklenirken hata:`, colError.message);
        // Hata olan collection'u kayıt sayısına "HATA" olarak ekle ama devam et
        metadata.kayitSayilari[col.label] = `HATA: ${colError.message}`;

        // Boş JSON ekle hata durumunda
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
