// 🔄 DOSYA TAKİP ANA AŞAMA MIGRASYONU
// Yeni iş akışı (müşteri Excel'i): 3 ana aşama → 4 ana aşama.
//   1. Müracaat Öncesi (değişmedi)
//   2. Kurum Değerlendirme (eski "Müracaat Sonrası"nın eksik-dışı durumları)
//   3. Kurum Eksik (artık kendi ana aşaması)
//   4. Sonuçlanma
// Bu script mevcut kayıtların anaAsama alanını durum kodundan yeniden türetir.
// Çalıştırma (Render Shell): node migrateDosyaTakipAsamalar.js

const mongoose = require('mongoose');
const DosyaTakip = require('./models/DosyaTakip');
require('dotenv').config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB bağlandı');

    const talepler = await DosyaTakip.find({}).select('takipId durum anaAsama');
    let guncellenen = 0;

    for (const talep of talepler) {
      const yeniAsama = DosyaTakip.durumToAnaAsama(talep.durum || '');
      if (talep.anaAsama !== yeniAsama) {
        await DosyaTakip.updateOne({ _id: talep._id }, { $set: { anaAsama: yeniAsama } });
        console.log(`  ${talep.takipId}: ${talep.anaAsama} → ${yeniAsama} (durum: ${talep.durum})`);
        guncellenen += 1;
      }
    }

    console.log(`\n🎉 Tamamlandı: ${talepler.length} kayıt tarandı, ${guncellenen} kayıt güncellendi.`);
    process.exit(0);
  } catch (err) {
    console.error('💥 Migration hatası:', err);
    process.exit(1);
  }
}

migrate();
