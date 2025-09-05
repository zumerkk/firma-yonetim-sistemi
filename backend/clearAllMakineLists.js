// 🧹 Tüm Teşviklerdeki Makine Listelerini Temizleme Script'i
// Kullanım örnekleri:
// 1) Sadece ne olacağını göster (dry-run):
//    node backend/clearAllMakineLists.js
// 2) Üretim veritabanına bağlanıp kalıcı temizleme (force) + revizyonları da sil:
//    MONGODB_URI="<mongo-connection-uri>" node backend/clearAllMakineLists.js --force --include-revisions
// 3) Excel eklerini DB'den sil ve rapor klasöründeki excel dosyalarını kaldır:
//    MONGODB_URI="<uri>" node backend/clearAllMakineLists.js --force --clear-excel-attachments --drop-reports

const mongoose = require('mongoose');
const path = require('path');
// .env dosyasını backend klasöründen oku
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim';
  const start = Date.now();
  const args = process.argv.slice(2);
  const doForce = args.includes('--force');
  const includeRevisions = args.includes('--include-revisions');
  const clearExcelAttachments = args.includes('--clear-excel-attachments');
  const dropReports = args.includes('--drop-reports'); // excel/csv raporlarını siler
  const dropReportsAll = args.includes('--drop-reports-all'); // tüm raporları siler

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB bağlandı: ${conn.connection.host}`);

    const Tesvik = require('./models/Tesvik');
    const fs = require('fs');

    console.log('🔎 Etkilenecek kayıt sayısı hesaplanıyor...');

    // Makine listesi veya revizyon/ek excel içerenleri analiz et
    const nonEmptyMachineFilter = {
      $or: [
        { 'makineListeleri.yerli.0': { $exists: true } },
        { 'makineListeleri.ithal.0': { $exists: true } }
      ]
    };
    const nonEmptyRevisionFilter = { 'makineRevizyonlari.0': { $exists: true } };
    const excelAttachmentFilter = {
      ekBelgeler: {
        $elemMatch: {
          $or: [
            { dosyaTipi: { $regex: /(spreadsheet|excel|csv)/i } },
            { dosyaAdi: { $regex: /\.(xlsx?|csv)$/i } }
          ]
        }
      }
    };

    const [totalDocs, countMachines, countRevisions, countExcelAttach] = await Promise.all([
      Tesvik.countDocuments({}),
      Tesvik.countDocuments(nonEmptyMachineFilter),
      Tesvik.countDocuments(nonEmptyRevisionFilter),
      Tesvik.countDocuments(excelAttachmentFilter)
    ]);

    console.log(`📊 Toplam teşvik sayısı: ${totalDocs}`);
    console.log(`📊 Makine listesi bulunan: ${countMachines}`);
    console.log(`📊 Makine revizyonu (snapshot) bulunan: ${countRevisions}`);
    console.log(`📊 Excel eki (ekBelgeler) bulunan: ${countExcelAttach}`);

    if (!doForce) {
      console.log('ℹ️ Dry-run modundasınız. Her şeyi gerçekten silmek için --force parametresi ekleyin.');
    }

    console.log('🧹 Temizleme planı: makineListeleri boşlanacak, mali toplamlar sıfırlanacak' + (includeRevisions ? ', makineRevizyonlari boşlanacak' : '') + (clearExcelAttachments ? ', excel ekleri kaldırılacak' : '') + '.');

    if (doForce) {
      // Makine listelerini boşalt ve mali hesaplamalardaki ilgili toplamları sıfırla
      const update = {
        $set: {
          'makineListeleri.yerli': [],
          'makineListeleri.ithal': [],
          'maliHesaplamalar.makinaTechizat.ithalMakina': 0,
          'maliHesaplamalar.makinaTechizat.yerliMakina': 0,
          'maliHesaplamalar.makinaTechizat.toplamMakina': 0,
          'maliHesaplamalar.makinaTechizat.yeniMakina': 0,
          'maliHesaplamalar.makinaTechizat.kullanimisMakina': 0,
          'maliHesaplamalar.makinaTechizat.toplamYeniMakina': 0
        }
      };
      if (includeRevisions) {
        update.$set['makineRevizyonlari'] = [];
      }
      if (clearExcelAttachments) {
        update.$pull = {
          ekBelgeler: {
            $or: [
              { dosyaTipi: { $regex: /(spreadsheet|excel|csv)/i } },
              { dosyaAdi: { $regex: /\.(xlsx?|csv)$/i } }
            ]
          }
        };
      }

      const result = await Tesvik.updateMany({}, update, { strict: false });
      console.log(`✅ Güncellenen kayıt sayısı: ${result.modifiedCount ?? result.nModified ?? 0}`);

      // Rapor klasörü temizliği (opsiyonel)
      if (dropReports || dropReportsAll) {
        const reportsDir = path.join(__dirname, 'uploads', 'reports');
        if (fs.existsSync(reportsDir)) {
          const files = fs.readdirSync(reportsDir);
          const patterns = dropReportsAll ? [/./] : [/\.xlsx?$/i, /\.csv$/i];
          let removed = 0;
          for (const f of files) {
            if (patterns.some(r => r.test(f))) {
              try {
                fs.unlinkSync(path.join(reportsDir, f));
                removed += 1;
              } catch (_) {}
            }
          }
          console.log(`🗑️ Rapor klasörü temizliği tamamlandı. Silinen dosya: ${removed}`);
        } else {
          console.log('ℹ️ Rapor klasörü bulunamadı, dosya temizliği atlandı.');
        }
      }
    }

    const ms = Date.now() - start;
    console.log(`⏱️ Tamamlandı: ${ms}ms`);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch (_) {}
  }
}

main();


