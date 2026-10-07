#!/usr/bin/env node
// Varsayılan salt okunur; --apply önce şifreli yedek alır, sonra belge başına taşır.
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');
const { MongoClient, ObjectId } = require('mongoose').mongo;
const {
  BELGE_KOLEKSIYONLARI, kaynaklariOku, ozet, indeksleriSagla, belgeyiTasi, belgeyiGeriAl
} = require('../services/tesvikMakine/revizyonTasima');
const { yedekOlustur, yedektenOku, yedegiDogrula } = require('../services/tesvikMakine/revizyonTasimaYedegi');

function argumanlar(args) {
  const sec = { apply: false, ids: [], modeller: Object.keys(BELGE_KOLEKSIYONLARI) };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') sec.apply = true;
    else if (arg === '--id') sec.ids.push(args[++i]);
    else if (arg === '--model') sec.modeller = [args[++i]];
    else if (arg === '--backup-dir') sec.dizin = args[++i];
    else if (arg === '--env-file') sec.envFile = args[++i];
    else if (arg === '--restore') sec.restore = args[++i];
    else if (arg === '--key') sec.anahtarPath = args[++i];
    else if (arg === '--help') sec.help = true;
    else throw new Error(`Bilinmeyen seçenek: ${arg}`);
  }
  if (sec.ids.some((id) => !ObjectId.isValid(id))) throw new Error('Belge kimliği geçersiz.');
  if (sec.modeller.some((m) => !BELGE_KOLEKSIYONLARI[m])) throw new Error('Belge modeli geçersiz.');
  if (sec.restore && !sec.anahtarPath) throw new Error('Geri alma için --key zorunlu.');
  return sec;
}

async function main(args = process.argv.slice(2)) {
  const sec = argumanlar(args);
  if (sec.help) {
    console.log('node backend/scripts/migrateMakineRevizyonlari.js [--id ID] [--model Tesvik|YeniTesvik] [--apply] [--backup-dir DIZIN] [--env-file DOSYA]\nGeri alma: --restore ARSIV --key ANAHTAR [--apply]\n--apply olmadan yalnız kontrol yapılır. Kimlik bilgileri MONGODB_URI veya backend/.env üzerinden okunur.');
    return;
  }
  const envPath = path.resolve(sec.envFile || path.join(__dirname, '../.env'));
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  const uri = process.env.MONGODB_URI || env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI tanımlı değil.');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, retryWrites: true });
  try {
    await client.connect();
    const db = client.db();
    if (sec.restore) {
      const yedek = { arsivPath: path.resolve(sec.restore), anahtarPath: path.resolve(sec.anahtarPath) };
      const dogrulama = await yedegiDogrula(yedek); // Tam AES/hash kontrolü yazımdan önce.
      console.log(JSON.stringify({ mod: sec.apply ? 'geri_alma' : 'geri_alma_kontrolu', ...dogrulama }));
      for await (const kaynak of yedektenOku(yedek)) {
        console.log(JSON.stringify(await belgeyiGeriAl({ db, client, kaynak, apply: sec.apply })));
      }
      return;
    }
    if (!sec.apply) {
      let count = 0;
      let revizyonAdedi = 0;
      let gecmisByte = 0;
      for await (const kaynak of kaynaklariOku(db, sec)) {
        const belgeOzeti = ozet(kaynak);
        console.log(JSON.stringify(belgeOzeti));
        count++;
        revizyonAdedi += belgeOzeti.revizyonAdedi;
        gecmisByte += belgeOzeti.gecmisByte;
      }
      console.log(JSON.stringify({ mod: 'salt_okunur', count, revizyonAdedi, gecmisByte }));
      return;
    }
    const hello = await db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Transaction destekli replica set/sharded MongoDB gerekli.');
    const yedek = await yedekOlustur({
      kaynaklar: kaynaklariOku(db, sec),
      dizin: path.resolve(sec.dizin || path.join(os.homedir(), '.gmplansis-backups', 'makine-revizyon')),
      secim: { ids: sec.ids, modeller: sec.modeller }
    });
    console.log(JSON.stringify({ mod: 'yedek_dogrulandi', ...yedek }));
    if (!yedek.count) return;
    await indeksleriSagla(db);
    for await (const kaynak of yedektenOku(yedek)) {
      console.log(JSON.stringify(await belgeyiTasi({ db, client, kaynak })));
    }
    console.log(JSON.stringify({ mod: 'tamamlandi', count: yedek.count, revizyonAdedi: yedek.revizyonAdedi }));
  } finally { await client.close(); }
}

if (require.main === module) {
  main().catch((error) => {
    // Sürücü/ağ hatalarında URI veya parolayı günlüğe taşıma.
    console.error(`Taşıma durdu: ${error.name} (${error.code || 'kontrol_hatasi'}). Kaynak kayıtlar ve yedekler korunuyor.`);
    if (error.name === 'Error') console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { argumanlar, main };
