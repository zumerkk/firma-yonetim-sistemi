// 💾 YEDEK CONTROLLER
//
// Üç uç:
//   GET  /api/backup/info    → yedekten önce kayıt sayıları
//   GET  /api/backup/full    → ZIP indir (Ayarlar'daki "Sistemi Yedekle" düğmesi)
//   GET  /api/backup/durum   → otomatik yedeğin son durumu
//   POST /api/backup/drive   → otomatik yedeği elle şimdi çalıştır
//
// Arşiv üretimi services/yedek/veritabaniArsivi'ne taşındı: aynı mantığı gece çalışan
// otomatik yedek de kullanıyor (bkz. services/yedek/yedekIsi). Bellek notu ve akış
// ayrıntıları o modülde.

const { KOLEKSIYONLAR, yeniArsiv, arsiveYaz } = require('../services/yedek/veritabaniArsivi');
const yedekIsi = require('../services/yedek/yedekIsi');
const drive = require('../services/yedek/driveIstemcisi');
const YedekCalismasi = require('../models/YedekCalismasi');
const YedekDosya = require('../models/YedekDosya');

/**
 * 💾 Tam sistem yedeği — ZIP olarak indirir
 * GET /api/backup/full  (admin)
 */
const fullBackup = async (req, res) => {
  console.log(`\n💾 [${new Date().toLocaleString('tr-TR')}] Tam sistem yedeği başlatılıyor...`);
  console.log(`👤 Yedek alan: ${req.user?.adSoyad || req.user?.ad || 'Bilinmiyor'} (${req.user?.email || '-'})`);

  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(2 * 60 * 1000, () => res.destroy(new Error('Yedekleme veri akışı zaman aşımına uğradı.')));

  const arsiv = yeniArsiv();
  try {
    const dosyaAdi = `GM_Yedek_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${dosyaAdi}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Accel-Buffering', 'no');

    arsiv.on('error', (err) => {
      console.error('❌ Arşiv hatası:', err);
      arsiv.destroy();
      if (!res.headersSent) {
        res.removeHeader('Content-Disposition');
        res.removeHeader('Content-Type');
        res.status(500).json({ success: false, message: 'Yedekleme sırasında hata oluştu: ' + err.message });
      } else res.destroy(err);
    });
    arsiv.on('end', () => console.log(`✅ Yedekleme tamamlandı: ${(arsiv.pointer() / 1048576).toFixed(2)} MB`));
    arsiv.pipe(res);

    // Kullanıcı indirmeyi iptal ederse cursor'lar boşta kalmasın
    res.on('close', () => {
      if (!res.writableEnded) {
        console.warn('⚠️ Yedek indirmesi yarıda kesildi.');
        arsiv.abort();
        arsiv.destroy();
      }
    });

    await arsiveYaz(arsiv, {
      yedekAlan: req.user?.adSoyad || req.user?.ad || 'Admin',
      yedekAlanEmail: req.user?.email || '-',
      gunluk: (m) => console.log(m)
    });
  } catch (error) {
    console.error('❌ Yedekleme hatası:', error);
    arsiv.abort();
    arsiv.destroy();
    if (!res.headersSent) {
      res.removeHeader('Content-Disposition');
      res.removeHeader('Content-Type');
      res.status(500).json({ success: false, message: 'Yedekleme başarısız: ' + error.message });
    } else if (!res.destroyed) res.destroy(error);
  }
};

/**
 * 📊 Yedekten önce kayıt sayıları
 * GET /api/backup/info  (admin)
 */
const backupInfo = async (req, res) => {
  try {
    const detay = {};
    let toplam = 0;
    for (const kol of KOLEKSIYONLAR) {
      try {
        const adet = await kol.model.countDocuments();
        detay[kol.etiket] = adet;
        toplam += adet;
      } catch (_) { detay[kol.etiket] = 'Hata'; }
    }
    res.json({
      success: true,
      data: {
        collectionSayisi: KOLEKSIYONLAR.length,
        toplamKayit: toplam,
        detay,
        tahminiSure: toplam < 1000 ? '~10 saniye' : toplam < 10000 ? '~30 saniye' : '~1-2 dakika'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Yedek bilgisi alınamadı: ' + error.message });
  }
};

/**
 * 📡 Otomatik yedeğin durumu — "en son ne zaman yedeklendi?"
 * GET /api/backup/durum  (admin)
 */
const yedekDurumu = async (req, res) => {
  try {
    const [son, yedekliDosya] = await Promise.all([
      YedekCalismasi.find({}).sort({ basladi: -1 }).limit(10).lean(),
      YedekDosya.countDocuments()
    ]);
    const sonBasarili = son.find((c) => c.basarili);
    res.json({
      success: true,
      data: {
        yapilandirildi: drive.yapilandirildiMi(),
        kimlikYolu: drive.kimlikYolu(),
        saklamaGun: yedekIsi.SAKLAMA_GUN(),
        sonBasariliTarih: sonBasarili?.bitti || null,
        yedekliEvrakSayisi: yedekliDosya,
        calismalar: son
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Yedek durumu okunamadı: ' + error.message });
  }
};

/**
 * ▶️ Otomatik yedeği elle çalıştır (ilk kurulumda ve kontrol için)
 * POST /api/backup/drive  (admin)
 */
const yedegiCalistir = async (req, res) => {
  try {
    const sonuc = await yedekIsi.calistir({ tur: 'elle', baslatan: req.user?.adSoyad || req.user?.email || 'Admin' });
    res.json({ success: true, message: 'Yedek tamamlandı', data: sonuc });
  } catch (error) {
    const kod = error.code === 'YEDEK_YAPILANDIRILMAMIS' ? 400 : 500;
    res.status(kod).json({ success: false, message: error.message });
  }
};

module.exports = { fullBackup, backupInfo, yedekDurumu, yedegiCalistir };
