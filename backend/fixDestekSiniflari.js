// 🔧 DESTEK SINIFI DÜZELTME SCRIPT
// Mevcut veritabanındaki destek sınıfı hatalarını düzeltir:
// 1. "HEDEEF YATIRIMLAR" -> "HEDEF YATIRIMLAR" (yazım hatası)
// 2. "HEDEEF YATIRIMLAR-Alt Bölge" -> "HEDEF YATIRIMLAR-Alt Bölge" (yazım hatası)
// 3. Eksik "BÖLGESEL-Alt Bölge" eklenir
// 4. Mükerrer GENEL ve BÖLGESEL kayıtları temizlenir

const mongoose = require('mongoose');
const DestekSinifi = require('./models/DestekSinifi');
require('dotenv').config();

async function fixDestekSiniflari(skipConnect = false) {
  try {
    if (!skipConnect) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim-sistemi');
      console.log('✅ MongoDB bağlantısı başarılı');
    }

    // Mevcut tüm kayıtları listele
    const mevcutKayitlar = await DestekSinifi.find({}).sort({ kategori: 1, kod: 1 });
    console.log('\n📋 Mevcut Destek Sınıfları:');
    mevcutKayitlar.forEach(s => {
      console.log(`  [${s.kategori}] ${s.kod}: "${s.aciklama}" (aktif: ${s.aktif})`);
    });

    // ─── FIX 1: HEDEEF -> HEDEF yazım hatası düzelt ───
    console.log('\n🔧 FIX 1: HEDEEF -> HEDEF yazım hatası düzeltiliyor...');
    
    // "HEDEEF YATIRIMLAR" -> "HEDEF YATIRIMLAR"
    const fix1a = await DestekSinifi.updateMany(
      { aciklama: /^HEDEEF YATIRIMLAR$/i },
      { $set: { aciklama: 'HEDEF YATIRIMLAR', kod: 'HEDEF_YATIRIMLAR' } }
    );
    console.log(`  HEDEEF YATIRIMLAR -> HEDEF YATIRIMLAR: ${fix1a.modifiedCount} kayıt güncellendi`);

    // "HEDEEF YATIRIMLAR-Alt Bölge" -> "HEDEF YATIRIMLAR-Alt Bölge"
    const fix1b = await DestekSinifi.updateMany(
      { aciklama: /^HEDEEF YATIRIMLAR.?Alt/i },
      { $set: { aciklama: 'HEDEF YATIRIMLAR-Alt Bölge', kod: 'HEDEF_YATIRIMLAR_ALT_BOLGE' } }
    );
    console.log(`  HEDEEF YATIRIMLAR-Alt Bölge -> HEDEF YATIRIMLAR-Alt Bölge: ${fix1b.modifiedCount} kayıt güncellendi`);

    // ─── FIX 2: Eksik "BÖLGESEL-Alt Bölge" ekle ───
    console.log('\n🔧 FIX 2: Eksik "BÖLGESEL-Alt Bölge" kontrol ediliyor...');
    const bolgeselAlt = await DestekSinifi.findOne({ kod: 'BOLGESEL_ALT_BOLGE' });
    if (!bolgeselAlt) {
      // İkinci BÖLGESEL kaydını BÖLGESEL-Alt Bölge'ye dönüştür
      const bolgeseller = await DestekSinifi.find({ kod: 'BOLGESEL', aktif: true }).sort({ _id: 1 });
      if (bolgeseller.length > 1) {
        // İkinci BÖLGESEL'i güncelle
        await DestekSinifi.updateOne(
          { _id: bolgeseller[1]._id },
          { $set: { kod: 'BOLGESEL_ALT_BOLGE', aciklama: 'BÖLGESEL-Alt Bölge' } }
        );
        console.log('  ✅ İkinci BÖLGESEL kaydı "BÖLGESEL-Alt Bölge" olarak güncellendi');
      } else {
        // Yoksa yeni ekle
        const yeni = new DestekSinifi({
          kod: 'BOLGESEL_ALT_BOLGE',
          aciklama: 'BÖLGESEL-Alt Bölge',
          kategori: 'Bölgesel',
          aktif: true
        });
        await yeni.save();
        console.log('  ✅ "BÖLGESEL-Alt Bölge" yeni kayıt olarak eklendi');
      }
    } else {
      console.log('  ℹ️ "BÖLGESEL-Alt Bölge" zaten mevcut');
    }

    // ─── FIX 3: Mükerrer GENEL ve BÖLGESEL kayıtlarını temizle ───
    console.log('\n🔧 FIX 3: Mükerrer kayıtlar temizleniyor...');
    
    // Mükerrer GENEL kayıtlarını temizle (sadece birini bırak)
    const geneller = await DestekSinifi.find({ kod: 'GENEL' }).sort({ _id: 1 });
    if (geneller.length > 1) {
      const silinecekIds = geneller.slice(1).map(g => g._id);
      await DestekSinifi.deleteMany({ _id: { $in: silinecekIds } });
      console.log(`  ✅ ${silinecekIds.length} mükerrer GENEL kaydı silindi`);
    } else {
      console.log('  ℹ️ GENEL mükerrer yok');
    }

    // Mükerrer BÖLGESEL kayıtlarını temizle (sadece birini bırak)
    const bolgeseller2 = await DestekSinifi.find({ kod: 'BOLGESEL' }).sort({ _id: 1 });
    if (bolgeseller2.length > 1) {
      const silinecekIds = bolgeseller2.slice(1).map(b => b._id);
      await DestekSinifi.deleteMany({ _id: { $in: silinecekIds } });
      console.log(`  ✅ ${silinecekIds.length} mükerrer BÖLGESEL kaydı silindi`);
    } else {
      console.log('  ℹ️ BÖLGESEL mükerrer yok');
    }

    // ─── FIX 4: Eksik kayıtları ekle (GENEL ve BÖLGESEL yoksa) ───
    console.log('\n🔧 FIX 4: Eksik temel kayıtlar kontrol ediliyor...');
    
    const gerekliKayitlar = [
      { kod: 'GENEL', aciklama: 'GENEL', kategori: 'Genel' },
      { kod: 'BOLGESEL', aciklama: 'BÖLGESEL', kategori: 'Bölgesel' },
      { kod: 'BOLGESEL_ALT_BOLGE', aciklama: 'BÖLGESEL-Alt Bölge', kategori: 'Bölgesel' },
      { kod: 'BOLGESEL_ONCELIKLI_YATIRIM', aciklama: 'BÖLGESEL - ÖNCELİKLİ YATIRIM', kategori: 'Bölgesel' },
      { kod: 'HEDEF_YATIRIMLAR', aciklama: 'HEDEF YATIRIMLAR', kategori: 'Hedef' },
      { kod: 'HEDEF_YATIRIMLAR_ALT_BOLGE', aciklama: 'HEDEF YATIRIMLAR-Alt Bölge', kategori: 'Hedef' },
      { kod: 'STRATEJIK_HAMLE', aciklama: 'STRATEJİK HAMLE', kategori: 'Stratejik' },
      { kod: 'STRATEJIK_HAMLE_ALT_BOLGE', aciklama: 'STRATEJİK HAMLE-Alt Bölge', kategori: 'Stratejik' },
      { kod: 'ONCELIKLI_YATIRIMLAR', aciklama: 'ÖNCELİKLİ YATIRIMLAR', kategori: 'Öncelikli' },
      { kod: 'ONCELIKLI_YATIRIMLAR_ALT_BOLGE', aciklama: 'ÖNCELİKLİ YATIRIMLAR-Alt Bölge', kategori: 'Öncelikli' }
    ];

    for (const kayit of gerekliKayitlar) {
      const mevcut = await DestekSinifi.findOne({ kod: kayit.kod });
      if (!mevcut) {
        const yeni = new DestekSinifi({ ...kayit, aktif: true });
        await yeni.save();
        console.log(`  ✅ Eksik "${kayit.aciklama}" eklendi`);
      }
    }

    // ─── SONUÇ ───
    const sonucKayitlar = await DestekSinifi.find({ aktif: true }).sort({ kategori: 1, kod: 1 });
    console.log(`\n✅ Düzeltme tamamlandı! Toplam ${sonucKayitlar.length} aktif destek sınıfı:`);
    sonucKayitlar.forEach(s => {
      console.log(`  [${s.kategori}] ${s.kod}: "${s.aciklama}"`);
    });

    console.log('\n🎉 İşlem tamamlandı!');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    if (!skipConnect) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB bağlantısı kapatıldı');
    }
  }
}

// Script doğrudan çalıştırılırsa kendi bağlantısını yönetir
if (require.main === module) {
  fixDestekSiniflari(false);
}

module.exports = { fixDestekSiniflari };
