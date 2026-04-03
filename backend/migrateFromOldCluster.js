// 🔄 ESKİ CLUSTER → YENİ CLUSTER VERİ TAŞIMA SCRIPTI
// AWS Bahrain cluster düzeldiğinde bu scripti çalıştır:
// node migrateFromOldCluster.js
//
// Tüm collection'ları eski cluster'dan yeni cluster'a kopyalar.
// Mevcut veriler üzerinde yazılmaz (upsert kullanır).

const { MongoClient } = require('mongodb');

// ESKİ CLUSTER (Bahrain - Degraded)
const OLD_URI = 'mongodb+srv://Cahit:lNgT5Rmx2T6vLw5E@cahit.xlpgcar.mongodb.net/firma-yonetim?retryWrites=true&w=majority&appName=Cahit&connectTimeoutMS=30000&serverSelectionTimeoutMS=30000';

// YENİ CLUSTER (Frankfurt - Active)
const NEW_URI = 'mongodb+srv://zmkagency:NPKSBaRaix8mkFVv@firma-yonetim.3ng7rnp.mongodb.net/firma-yonetim?retryWrites=true&w=majority&appName=Firma-Yonetim';

// Taşınacak collection'lar (tüm business data)
const COLLECTIONS_TO_MIGRATE = [
  'tesviks',         // Eski teşvik belgeleri
  'yenitesviks',     // Yeni teşvik belgeleri
  'makinetechizats', // Makine teçhizat kayıtları
  'dosyatakips',     // Dosya takip sistemi
  'activitylogs',    // Activity log kayıtları
  'notifications',   // Bildirimler
  'talepler',        // Talepler (dosya takip)
];

async function migrate() {
  let oldClient, newClient;
  
  try {
    // 1. ESKİ CLUSTER'A BAĞLAN
    console.log('🔄 Eski cluster\'a bağlanılıyor (Bahrain)...');
    oldClient = new MongoClient(OLD_URI);
    await oldClient.connect();
    const oldDb = oldClient.db('firma-yonetim');
    console.log('✅ Eski cluster bağlantısı başarılı!');

    // 2. YENİ CLUSTER'A BAĞLAN
    console.log('🔄 Yeni cluster\'a bağlanılıyor (Frankfurt)...');
    newClient = new MongoClient(NEW_URI);
    await newClient.connect();
    const newDb = newClient.db('firma-yonetim');
    console.log('✅ Yeni cluster bağlantısı başarılı!');

    // 3. Eski cluster'daki tüm collection'ları listele
    const allCollections = await oldDb.listCollections().toArray();
    console.log('\n📋 Eski cluster\'daki collection\'lar:');
    for (const col of allCollections) {
      const count = await oldDb.collection(col.name).countDocuments();
      console.log(`   📊 ${col.name}: ${count} kayıt`);
    }

    // 4. Her collection'ı taşı
    console.log('\n🚀 VERİ TAŞIMA BAŞLIYOR...\n');
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const collName of COLLECTIONS_TO_MIGRATE) {
      try {
        const oldCollection = oldDb.collection(collName);
        const newCollection = newDb.collection(collName);
        
        const oldCount = await oldCollection.countDocuments();
        const newCount = await newCollection.countDocuments();
        
        if (oldCount === 0) {
          console.log(`⏭️  ${collName}: Eski cluster'da 0 kayıt, atlanıyor`);
          continue;
        }

        console.log(`📦 ${collName}: ${oldCount} kayıt taşınıyor (yeni cluster'da mevcut: ${newCount})...`);

        // Tüm dokümanları getir
        const docs = await oldCollection.find({}).toArray();
        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const doc of docs) {
          try {
            // _id ile upsert - mevcut veriyi ezmez, yeni ekler
            const result = await newCollection.updateOne(
              { _id: doc._id },
              { $setOnInsert: doc },
              { upsert: true }
            );
            
            if (result.upsertedCount > 0) {
              migrated++;
            } else {
              skipped++;
            }
          } catch (err) {
            errors++;
            if (errors <= 3) {
              console.log(`   ❌ Hata: ${err.message.substring(0, 80)}`);
            }
          }
        }

        console.log(`   ✅ Taşınan: ${migrated} | ⏭️ Mevcut: ${skipped} | ❌ Hata: ${errors}`);
        totalMigrated += migrated;
        totalSkipped += skipped;
        totalErrors += errors;

      } catch (err) {
        console.log(`❌ ${collName} taşıma hatası: ${err.message}`);
        totalErrors++;
      }
    }

    // 5. Ayrıca listelenmeyen collection'ları da kontrol et
    console.log('\n🔍 Ek collection\'lar kontrol ediliyor...');
    for (const col of allCollections) {
      if (!COLLECTIONS_TO_MIGRATE.includes(col.name) && 
          !['users', 'firmas', 'us97codes', 'oecdkategorileris', 'oecdkod4hanelis',
            'nacecodes', 'gtipcodes', 'desteksinifis', 'currencycodes', 'unitcodes',
            'desteksarteslesmeS', 'system.views'].includes(col.name)) {
        
        const count = await oldDb.collection(col.name).countDocuments();
        if (count > 0) {
          console.log(`   📦 Ek collection bulundu: ${col.name} (${count} kayıt)`);
          
          // Bu collection'ı da taşı
          const docs = await oldDb.collection(col.name).find({}).toArray();
          const newCol = newDb.collection(col.name);
          let migrated = 0;
          
          for (const doc of docs) {
            try {
              const result = await newCol.updateOne(
                { _id: doc._id },
                { $setOnInsert: doc },
                { upsert: true }
              );
              if (result.upsertedCount > 0) migrated++;
            } catch (e) {}
          }
          
          console.log(`   ✅ ${col.name}: ${migrated} kayıt taşındı`);
          totalMigrated += migrated;
        }
      }
    }

    // 6. SONUÇ
    console.log('\n' + '='.repeat(50));
    console.log('📊 TAŞIMA SONUCU:');
    console.log(`   ✅ Toplam taşınan: ${totalMigrated}`);
    console.log(`   ⏭️ Toplam atlanan (mevcut): ${totalSkipped}`);
    console.log(`   ❌ Toplam hata: ${totalErrors}`);
    console.log('='.repeat(50));
    console.log('\n🎉 VERİ TAŞIMA TAMAMLANDI!');

  } catch (err) {
    console.error('\n💀 BAĞLANTI HATASI:', err.message);
    console.log('\n⚠️  Eski cluster hâlâ erişilemez. Daha sonra tekrar deneyin.');
    console.log('   Komut: node migrateFromOldCluster.js');
  } finally {
    if (oldClient) await oldClient.close();
    if (newClient) await newClient.close();
    process.exit(0);
  }
}

// Çalıştır
console.log('═══════════════════════════════════════════════════');
console.log('  🔄 MongoDB Cluster Veri Taşıma Aracı');
console.log('  📍 Kaynak: Bahrain (eski) → Hedef: Frankfurt (yeni)');
console.log('═══════════════════════════════════════════════════\n');
migrate();
