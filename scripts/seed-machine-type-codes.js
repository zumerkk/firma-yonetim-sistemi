// 🌱 Machine Type Codes Seed Script
try { require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') }); } catch {}
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch {}
const path = require('path');
const mongoose = require('mongoose');
// backend node_modules erişimi (dotenv vs.)
module.paths.push(path.join(process.cwd(), 'backend', 'node_modules'));
const MachineTypeCode = require('../backend/models/MachineTypeCode');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim';

async function run() {
  const conn = await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB bağlandı');
  try {
    const data = [
      { kod: 'Ana Makine', aciklama: 'Ana Makine' },
      { kod: 'Yardımcı Makine', aciklama: 'Yardımcı Makine' }
    ];
    for (const it of data) {
      await MachineTypeCode.updateOne({ kod: it.kod }, { $set: it }, { upsert: true });
    }
    console.log('🎉 Makine tipi kodları seed tamam');
  } catch (e) {
    console.error('❌ Seed hatası:', e.message);
  } finally {
    await conn.connection.close();
  }
}

if (require.main === module) run();


