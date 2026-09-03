#!/usr/bin/env node
/**
 * 🛠️ BOZUK FİNANSAL TUTAR ONARIMI
 *
 * ⚠️ VARSAYILAN DAVRANIŞ: KURU ÇALIŞMA. Hiçbir şey yazılmaz, yalnız ne olacağı
 *    gösterilir. Gerçekten yazmak için `--uygula` gerekir.
 *
 * Ne onarır: eski import parser'ının binlik ayıracı ondalık noktaya çevirdiği
 * tutarları. Kaybolan şey bir BİNLİK GRUBU olduğu için ters işlem 1000 ile
 * çarpmaktır — "noktayı silmek" DEĞİL (float sondaki sıfırları yutuyor):
 *
 *     535807.338  →  535.807.338      (×1000)
 *     188.21      →  188.210          (nokta silme 18.821 verirdi — yanlış)
 *
 * Neden güvenli: onarım her kayıtta ÇAPRAZ DOĞRULANIYOR. Bileşenler ve toplam
 * ayrı ayrı saklandığı için, "noktayı sil" dönüşümü doğruysa aritmetik kapanır.
 * Kapanmayan kayda dokunulmaz. Sınıflandırma tarama script'iyle aynı modülden
 * geliyor (scripts/lib/bozukTutar.js) — ikisi ayrışamaz.
 *
 * Geri alma: yazmadan ÖNCE tüm orijinal değerler bir yedek dosyasına kaydedilir.
 * `--geri-al <yedek.json>` ile birebir eski hale döndürülebilir.
 *
 * Kullanım:
 *   node scripts/onar-bozuk-tutarlar.js                    # kuru çalışma (varsayılan)
 *   node scripts/onar-bozuk-tutarlar.js --tam              # tüm kayıtları listele
 *   node scripts/onar-bozuk-tutarlar.js --uygula           # ONARILABILIR sınıfını yaz
 *   node scripts/onar-bozuk-tutarlar.js --uygula --toplam-bozuk-da
 *   node scripts/onar-bozuk-tutarlar.js --geri-al yedek-....json
 */

const path = require('path');
const fs = require('fs');
const mongoose = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mongoose'));
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env')
});

require(path.join(__dirname, '..', 'backend', 'models', 'Firma'));
const Tesvik = require(path.join(__dirname, '..', 'backend', 'models', 'Tesvik'));
const YeniTesvik = require(path.join(__dirname, '..', 'backend', 'models', 'YeniTesvik'));
const { onar, degerlendir } = require(path.join(__dirname, 'lib', 'bozukTutar'));

// ─────────────────────────── ONARILACAK ALANLAR ───────────────────────────
// Yalnız TL TUTARI olan alanlar. Birim fiyatı (maliyetlenen.sm) gibi meşru
// ondalık taşıyabilecek alanlar bilerek DIŞARIDA — onları "bozuk" sanıp
// düzeltmek gerçek kuruş değerlerini 100 katına çıkarırdı.
const TUTAR_ALANLARI = [
  'toplamSabitYatirim',
  'araciArsaBedeli',
  'yatiriminTutari',
  'maliyetlenen.sn',
  'binaInsaatGideri.anaBinaGideri',
  'binaInsaatGideri.yardimciBinaGideri',
  'binaInsaatGideri.toplamBinaGideri',
  'makinaTechizat.ithalMakina',
  'makinaTechizat.yerliMakina',
  'makinaTechizat.toplamMakina',
  'makinaTechizat.yeniMakina',
  'makinaTechizat.kullanimisMakina',
  'makinaTechizat.toplamYeniMakina',
  'yatirimHesaplamalari.et',
  'yatirimHesaplamalari.eu',
  'yatirimHesaplamalari.ev',
  'yatirimHesaplamalari.ew',
  'yatirimHesaplamalari.ex',
  'yatirimHesaplamalari.ey',
  'yatirimHesaplamalari.ez',
  'finansman.yabanciKaynak',
  'finansman.ozKaynak',
  'finansman.toplamFinansman'
];

const oku = (nesne, yol) => yol.split('.').reduce((o, k) => (o == null ? undefined : o[k]), nesne);

// ─────────────────────────── KARDEŞ ALAN GRUPLARI ───────────────────────────
// Bu alanlar aritmetik olarak BAĞLI: iki bileşen + onların toplamı. Biri onarılıp
// kardeşi tavan kuralıyla atlanırsa bağıntı KIRILIR — kayıt onarımdan önce
// tutarlıyken sonra tutarsız hale gelir. Yarım onarım, hiç onarmamaktan kötüdür.
//
// Ölçüldü (3 Eylül 2026, üretim çalışması): tam olarak bu oldu. TES20260106'da
// yeniMakina (2.621.083,88) ve toplamYeniMakina (2.691.475,42) tavanı aştığı için
// korundu, ama kullanimisMakina (70.391,54) tavanın altında kaldığı için geçti ve
// 1000 katına çıktı. "yeni + kullanılmış = toplamYeni" bağıntısı bozuldu. Aynı imza
// 4 kayıtta görüldü (TES20260106/202/214/663) ve elle geri alındı.
//
// Kural: bir gruptan TEK ÜYE bile atlanıyorsa grubun TAMAMI atlanır.
const KARDES_GRUPLARI = [
  ['makinaTechizat.ithalMakina', 'makinaTechizat.yerliMakina', 'makinaTechizat.toplamMakina'],
  ['makinaTechizat.yeniMakina', 'makinaTechizat.kullanimisMakina', 'makinaTechizat.toplamYeniMakina'],
  ['binaInsaatGideri.anaBinaGideri', 'binaInsaatGideri.yardimciBinaGideri', 'binaInsaatGideri.toplamBinaGideri'],
  ['finansman.yabanciKaynak', 'finansman.ozKaynak', 'finansman.toplamFinansman']
];

const GRUP_INDEKSI = new Map();
KARDES_GRUPLARI.forEach((g, i) => g.forEach((a) => GRUP_INDEKSI.set(a, i)));

// ─────────────────────────── ONARIM PLANI ───────────────────────────
/**
 * Bir kayıt için değişecek alanları çıkarır. Hiçbir şey yazmaz.
 * @returns {{degisiklikler: {alan,eski,yeni}[], atlanan: {alan,deger,onarilmis,sebep?}[]}}
 */
function onarimPlani(mali, onarilmisToplam) {
  // Değişmez: hiçbir mali kalem, toplam sabit yatırımı aşamaz. Beş çekirdek alan
  // (arazi/bina/makine/diğer/toplam) zaten degerlendir() tarafından aritmetikle
  // doğrulanıyor; geri kalanlar doğrulanmıyor, bu yüzden onlara bu tavanı
  // uyguluyoruz. Tavanı aşan değer büyük olasılıkla ZATEN DOĞRUYDU (kuruşlu bir
  // tutar) ve çarpılsaydı 1000 kat şişerdi — dokunmuyor, elle incelemeye bırakıyoruz.
  // Ölçüldü: bu kural olmadan 4 alan 100 milyar TL'yi aşıyordu.
  const tavan = onarilmisToplam > 0 ? onarilmisToplam * 1.001 : Infinity;

  // 1. geçiş — adayları çıkar, tavanı aşanları işaretle
  const adaylar = [];
  const atlanan = [];
  const kirliGruplar = new Set();

  for (const alan of TUTAR_ALANLARI) {
    const deger = oku(mali, alan);
    if (typeof deger !== 'number' || !Number.isFinite(deger)) continue;
    if (Number.isInteger(deger)) continue;          // zaten sağlam — dokunma
    const onarilmis = onar(deger);
    if (onarilmis === deger || !Number.isFinite(onarilmis)) continue;

    if (alan !== 'toplamSabitYatirim' && onarilmis > tavan) {
      atlanan.push({ alan, deger, onarilmis, sebep: 'tavanı aşıyor' });
      if (GRUP_INDEKSI.has(alan)) kirliGruplar.add(GRUP_INDEKSI.get(alan));
      continue;
    }
    adaylar.push({ alan, eski: deger, yeni: onarilmis });
  }

  // 2. geçiş — atlanan kardeşi olan grubun tamamını geri çek
  const degisiklikler = [];
  for (const d of adaylar) {
    const grup = GRUP_INDEKSI.get(d.alan);
    if (grup !== undefined && kirliGruplar.has(grup)) {
      atlanan.push({ alan: d.alan, deger: d.eski, onarilmis: d.yeni, sebep: 'kardeş alan atlandı' });
      continue;
    }
    degisiklikler.push(d);
  }
  return { degisiklikler, atlanan };
}

module.exports.onarimPlani = onarimPlani;   // test edilebilsin diye

const tl = (n) => Number(n).toLocaleString('tr-TR');

// ─────────────────────────── GERİ ALMA ───────────────────────────
async function geriAl(dosya) {
  const yedek = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  console.log(`↩️  Geri alınıyor: ${yedek.kayitlar.length} kayıt (yedek tarihi: ${yedek.tarih})`);
  let n = 0;
  for (const k of yedek.kayitlar) {
    const Model = k.model === 'YeniTesvik' ? YeniTesvik : Tesvik;
    const set = {};
    for (const d of k.degisiklikler) set[`maliHesaplamalar.${d.alan}`] = d.eski;
    await Model.updateOne({ _id: k.id }, { $set: set });
    n++;
  }
  console.log(`✅ ${n} kayıt eski haline döndürüldü.`);
}

// ─────────────────────────── ANA AKIŞ ───────────────────────────
async function main() {
  const argv = process.argv;
  const uygula = argv.includes('--uygula');
  const toplamBozukDa = argv.includes('--toplam-bozuk-da');
  const tam = argv.includes('--tam');
  const geriAlIdx = argv.indexOf('--geri-al');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/firma-yonetim';
  console.log('🔌 Bağlanılıyor:', uri.replace(/\/\/[^@]+@/, '//***@'));
  await mongoose.connect(uri);
  console.log('✅ Bağlandı\n');

  if (geriAlIdx !== -1 && argv[geriAlIdx + 1]) {
    await geriAl(argv[geriAlIdx + 1]);
    await mongoose.disconnect();
    return;
  }

  const hedefSiniflar = toplamBozukDa ? ['ONARILABILIR', 'TOPLAM_BOZUK'] : ['ONARILABILIR'];

  const isler = [];
  const atlananlar = [];
  for (const [Model, ad] of [[Tesvik, 'Tesvik'], [YeniTesvik, 'YeniTesvik']]) {
    const kayitlar = await Model.find({}, { tesvikId: 1, yatirimciUnvan: 1, maliHesaplamalar: 1 }).lean();
    for (const k of kayitlar) {
      const sonuc = degerlendir(k.maliHesaplamalar);
      if (!sonuc || !hedefSiniflar.includes(sonuc.sinif)) continue;
      const { degisiklikler, atlanan } = onarimPlani(k.maliHesaplamalar, sonuc.onarilmis?.toplam);
      if (atlanan.length) atlananlar.push({ tesvikId: k.tesvikId || '-', model: ad, atlanan });
      if (!degisiklikler.length) continue;
      isler.push({
        model: ad, id: String(k._id), tesvikId: k.tesvikId || '-',
        firma: k.yatirimciUnvan || '-', sinif: sonuc.sinif, degisiklikler
      });
    }
  }

  console.log('═'.repeat(96));
  console.log(uygula ? '🛠️  ONARIM — GERÇEK YAZMA' : '🔍 KURU ÇALIŞMA — hiçbir şey yazılmayacak');
  console.log(`   Hedef sınıf(lar): ${hedefSiniflar.join(', ')}`);
  console.log(`   Onarılacak kayıt: ${isler.length}`);
  console.log(`   Değişecek alan  : ${isler.reduce((t, i) => t + i.degisiklikler.length, 0)}`);
  console.log('═'.repeat(96));

  const gosterilecek = tam ? isler : isler.slice(0, 10);
  for (const i of gosterilecek) {
    console.log(`\n[${i.sinif}] ${i.model} ${i.tesvikId} — ${i.firma.slice(0, 50)}`);
    for (const d of i.degisiklikler) {
      console.log(`   ${d.alan.padEnd(38)} ${String(d.eski).padStart(16)}  →  ${tl(d.yeni).padStart(18)} ₺`);
    }
  }
  if (!tam && isler.length > gosterilecek.length) {
    console.log(`\n… ve ${isler.length - gosterilecek.length} kayıt daha. Tamamı için: --tam`);
  }

  if (atlananlar.length) {
    const n = atlananlar.reduce((t, a) => t + a.atlanan.length, 0);
    console.log(`\n⚠️  ${n} alan (${atlananlar.length} kayıtta) ATLANDI — onarılsa toplam sabit`);
    console.log('   yatırımı aşardı, yani büyük olasılıkla zaten doğru bir kuruşlu tutar.');
    console.log('   Elle incelenmeli:');
    for (const a of atlananlar.slice(0, 8)) {
      for (const d of a.atlanan) {
        console.log(`     ${a.model} ${a.tesvikId}  ${d.alan} = ${d.deger}`);
      }
    }
    if (atlananlar.length > 8) console.log(`     … ve ${atlananlar.length - 8} kayıt daha`);
  }

  if (!uygula) {
    console.log('\nℹ️  Hiçbir kayıt DEĞİŞTİRİLMEDİ. Yazmak için: --uygula\n');
    await mongoose.disconnect();
    return;
  }

  // ── Yedek: yazmadan önce, geri dönülebilsin diye ──
  const damga = new Date().toISOString().replace(/[:.]/g, '-');
  const yedekDosya = path.join(__dirname, '..', `yedek-tutar-onarim-${damga}.json`);
  fs.writeFileSync(yedekDosya, JSON.stringify({ tarih: new Date().toISOString(), kayitlar: isler }, null, 2), 'utf8');
  console.log(`\n💾 Yedek yazıldı: ${yedekDosya}`);
  console.log('   Geri almak için: node scripts/onar-bozuk-tutarlar.js --geri-al <yedek dosyası>');

  let yazilan = 0;
  for (const i of isler) {
    const Model = i.model === 'YeniTesvik' ? YeniTesvik : Tesvik;
    const set = {};
    for (const d of i.degisiklikler) set[`maliHesaplamalar.${d.alan}`] = d.yeni;
    await Model.updateOne({ _id: i.id }, { $set: set });
    yazilan++;
  }
  console.log(`\n✅ ${yazilan} kayıt onarıldı.\n`);

  await mongoose.disconnect();
}

// Yalnız doğrudan çalıştırıldığında ana akışı başlat. `require` edildiğinde
// (regresyon testi onarimPlani'yi içe aktarıyor) veritabanına bağlanmasın.
if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Hata:', e.message);
    process.exit(1);
  });
}
