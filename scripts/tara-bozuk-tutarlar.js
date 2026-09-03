#!/usr/bin/env node
/**
 * 🔍 BOZUK FİNANSAL TUTAR TARAYICI — SALT OKUNUR
 *
 * Neden var: Excel import parser'ı (tesvikImportController / eskiTesvikImportController)
 * Türkçe formatlı sayılarda "en az iki nokta varsa binlik ayıraçtır" varsayıyordu:
 *
 *     "250.000"    → 250        (1000 kat küçük)
 *     "1.500"      → 1.5        (1000 kat küçük)
 *     "18,000,000" → 0          (sıfırlandı)
 *
 * Parser düzeltildi ama DAHA ÖNCE import edilmiş kayıtlarda bozuk tutarlar kalmış
 * olabilir. Bu script onları bulur ve raporlar. HİÇBİR KAYDA YAZMAZ.
 *
 * Kullanım:
 *   node scripts/tara-bozuk-tutarlar.js
 *   node scripts/tara-bozuk-tutarlar.js --csv rapor.csv
 *   MONGODB_URI="mongodb+srv://..." node scripts/tara-bozuk-tutarlar.js
 */

const path = require('path');
const fs = require('fs');
const mongoose = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env')
});

// populate('firma') için Firma şemasının kayıtlı olması gerekiyor
require(path.join(__dirname, '..', 'backend', 'models', 'Firma'));
const Tesvik = require(path.join(__dirname, '..', 'backend', 'models', 'Tesvik'));
const YeniTesvik = require(path.join(__dirname, '..', 'backend', 'models', 'YeniTesvik'));

// Sınıflandırma mantığı ortak modülde — onarım script'i de aynısını kullanıyor
const { MAKUL_ALT_SINIR_TL, degerlendir } = require(path.join(__dirname, 'lib', 'bozukTutar'));

// ─────────────────────────── TARAMA ───────────────────────────
async function tara(Model, etiket) {
  const kayitlar = await Model.find({}, {
    tesvikId: 1, belgeNo: 1, firma: 1, yatirimciUnvan: 1,
    maliHesaplamalar: 1, createdAt: 1
  }).populate('firma', 'tam_unvan firmaId').lean();

  const bulgular = [];
  for (const k of kayitlar) {
    const sonuc = degerlendir(k.maliHesaplamalar);
    if (!sonuc) continue;
    bulgular.push({
      tip: etiket,
      id: String(k._id),
      tesvikId: k.tesvikId || '-',
      belgeNo: k.belgeNo || '-',
      firma: k.firma?.tam_unvan || k.yatirimciUnvan || '-',
      olusturma: k.createdAt ? new Date(k.createdAt).toLocaleDateString('tr-TR') : '-',
      ...sonuc
    });
  }
  return { toplamKayit: kayitlar.length, bulgular };
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim';
  console.log('🔌 Bağlanılıyor:', uri.replace(/\/\/[^@]+@/, '//***@'));
  await mongoose.connect(uri);
  console.log('✅ Bağlandı\n');

  const eski = await tara(Tesvik, 'Eski Teşvik');
  const yeni = await tara(YeniTesvik, 'Yeni Teşvik');

  const SIRA = { ONARILABILIR: 0, TOPLAM_BOZUK: 1, ELLE_INCELE: 2 };
  const hepsi = [...eski.bulgular, ...yeni.bulgular]
    .sort((a, b) => (SIRA[a.sinif] - SIRA[b.sinif]) || (b.onarilmis.toplam - a.onarilmis.toplam));

  const sayim = hepsi.reduce((acc, b) => ({ ...acc, [b.sinif]: (acc[b.sinif] || 0) + 1 }), {});

  console.log('═'.repeat(100));
  console.log(`📊 TARAMA  —  Eski Teşvik: ${eski.toplamKayit} kayıt, Yeni Teşvik: ${yeni.toplamKayit} kayıt`);
  console.log(`   Bozulma şüphesi: ${hepsi.length} kayıt`);
  console.log(`     ✅ ONARILABILIR : ${sayim.ONARILABILIR || 0}  (onarım sonrası bileşenler toplamla birebir tutuyor)`);
  console.log(`     ⚠️  TOPLAM_BOZUK : ${sayim.TOPLAM_BOZUK || 0}  (bileşenler sağlam, toplam yeniden hesaplanmalı)`);
  console.log(`     🔍 ELLE_INCELE  : ${sayim.ELLE_INCELE || 0}  (kaynak Excel ile karşılaştırılmalı)`);
  console.log('═'.repeat(100));

  const tam = process.argv.includes('--tam');
  const gosterilecek = tam ? hepsi : hepsi.slice(0, 15);

  const ALAN_ADI = { arazi: 'Arazi-Arsa', bina: 'Bina İnşaat', makine: 'Makine Teçhizat', diger: 'Diğer Giderler', toplam: 'TOPLAM' };

  for (const b of gosterilecek) {
    const rozet = { ONARILABILIR: '✅', TOPLAM_BOZUK: '⚠️ ', ELLE_INCELE: '🔍' }[b.sinif];
    console.log(`\n${rozet} [${b.sinif}] ${b.tip} ${b.tesvikId}  (${b.olusturma})`);
    console.log(`   ${b.firma}`);
    // Yalnızca gerçekten değişen alanları göster: bozulma çoğu kayıtta tek bir
    // bileşende; sağlam alanları da listelemek raporu okunmaz hale getiriyor.
    for (const alan of ['arazi', 'bina', 'makine', 'diger', 'toplam']) {
      const oncesi = b.ham[alan];
      const sonrasi = b.onarilmis[alan];
      if (oncesi === sonrasi || (!oncesi && !sonrasi)) continue;
      console.log(`     ${ALAN_ADI[alan].padEnd(16)} ${String(oncesi).padStart(18)}  →  ${sonrasi.toLocaleString('tr-TR').padStart(20)} ₺`);
    }
    console.log(`     ↳ ${b.aciklama}`);
  }
  if (!tam && hepsi.length > gosterilecek.length) {
    console.log(`\n… ve ${hepsi.length - gosterilecek.length} kayıt daha. Tamamı için: --tam, dosyaya için: --csv rapor.csv`);
  }
  console.log();

  // İsteğe bağlı CSV çıktısı
  const csvIdx = process.argv.indexOf('--csv');
  if (csvIdx !== -1 && process.argv[csvIdx + 1]) {
    const dosya = process.argv[csvIdx + 1];
    const tirnak = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const satirlar = ['sinif;tip;tesvikId;belgeNo;firma;olusturma;mevcutToplam;onarilmisToplam;bilesenToplami;arazi;bina;makine;diger;aciklama'];
    for (const b of hepsi) {
      satirlar.push([
        b.sinif, b.tip, b.tesvikId, b.belgeNo, tirnak(b.firma), b.olusturma,
        b.ham.toplam, b.onarilmis.toplam, b.bilesenToplami,
        b.onarilmis.arazi, b.onarilmis.bina, b.onarilmis.makine, b.onarilmis.diger,
        tirnak(b.aciklama)
      ].join(';'));
    }
    fs.writeFileSync(dosya, '\ufeff' + satirlar.join('\n'), 'utf8');
    console.log(`💾 CSV yazıldı: ${dosya} (${hepsi.length} satır) — Excel'de doğrudan açılır.`);
  }

  console.log('\nℹ️  Bu script hiçbir kaydı DEĞİŞTİRMEDİ. Düzeltme kararı size ait.\n');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Hata:', e.message);
  process.exit(1);
});
