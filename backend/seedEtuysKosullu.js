#!/usr/bin/env node
/**
 * 🌱 ETUYS Yetkilendirme (Koşullu) şablonunu kurar veya kaldırır.
 *
 * Müşterinin "gm modüller" Excel'indeki ETUYS listesi, iki EVET/HAYIR sorusuyla
 * birlikte YENİ bir işlem türü olarak eklenir. Mevcut "ETUYS Yetkilendirme"
 * şablonuna DOKUNULMAZ — ekip ikisini karşılaştırıp eskisini kendi kaldırabilsin.
 *
 * Kullanım (backend klasöründen):
 *   node seedEtuysKosullu.js          # kurar / günceller (idempotent)
 *   node seedEtuysKosullu.js --sil    # geri alır (yalnızca bu şablonu siler)
 *
 * GERİ ALMA: --sil bu türü kaldırır. Bu türden AÇILMIŞ talepler silinmez; onlar
 * kendi evrak listelerinin kopyasını taşıdığı için çalışmaya devam eder.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const IslemTuru = require('./models/IslemTuru');
const IslemTalebi = require('./models/IslemTalebi');
const sablon = require('./services/islemEvrak/etuysKosulluSablon.json');

const KOD = 'etuys_yetkilendirme_kosullu';
const AD = 'ETUYS Yetkilendirme (Koşullu)';

const MAIL_GOVDESI = [
  'Sayın {firmaAdi} Yetkilisi,',
  '',
  '{islemAdi} işlemi için aşağıdaki evraklara ihtiyaç duyulmaktadır:',
  '',
  '{evrakListesi}',
  '',
  'Evrakları aşağıdaki bağlantı üzerinden tarafımıza iletmenizi rica ederiz:',
  '',
  '{uploadLink}',
  '',
  'İyi çalışmalar dileriz.',
  '',
  '{imza}'
].join('\n');

async function baglan() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI tanımlı değil.');
  await mongoose.connect(uri);
}

async function kur() {
  const govde = {
    kod: KOD,
    ad: AD,
    aciklama: "Müşteri Excel'inden aktarıldı. İki EVET/HAYIR sorusu evrak listesini daraltır.",
    mailKonusu: '{islemAdi} — Evrak Talebi ({firmaAdi})',
    mailGovdesi: MAIL_GOVDESI,
    sorular: sablon.sorular,
    istenenEvraklar: sablon.istenenEvraklar,
    varyantlar: [],
    aktif: true,
    siraNo: 10
  };
  const mevcut = await IslemTuru.findOne({ kod: KOD });
  if (mevcut) {
    await IslemTuru.updateOne({ _id: mevcut._id }, { $set: govde });
    console.log(`♻️  Güncellendi: ${AD}`);
  } else {
    await IslemTuru.create(govde);
    console.log(`✅ Eklendi: ${AD}`);
  }
  const kosulsuz = sablon.istenenEvraklar.filter((e) => !e.kosulSoruId).length;
  console.log(`   • Toplam evrak: ${sablon.istenenEvraklar.length}`);
  console.log(`   • Her zaman istenen: ${kosulsuz}`);
  for (const s of sablon.sorular) {
    const n = sablon.istenenEvraklar.filter((e) => e.kosulSoruId === s.id).length;
    console.log(`   • "${s.metin.slice(0, 55)}…" EVET → ${n} evrak`);
  }
}

async function sil() {
  const tur = await IslemTuru.findOne({ kod: KOD });
  if (!tur) { console.log('ℹ️  Şablon zaten yok, yapılacak bir şey kalmadı.'); return; }
  const talepSayisi = await IslemTalebi.countDocuments({ islemTuru: tur._id });
  await IslemTuru.deleteOne({ _id: tur._id });
  console.log(`🗑️  Silindi: ${AD}`);
  if (talepSayisi) {
    console.log(`   ⚠️  Bu türden ${talepSayisi} talep var; SİLİNMEDİ. Kendi evrak listelerinin`);
    console.log('      kopyasını taşıdıkları için çalışmaya devam ederler.');
  }
}

(async () => {
  try {
    await baglan();
    if (process.argv.includes('--sil')) await sil();
    else await kur();
  } catch (err) {
    console.error('❌ Hata:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
