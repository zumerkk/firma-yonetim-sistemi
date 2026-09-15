// 🧾 MAKİNE TALEP / KARAR — satır bulma ve durum kuralları
//
// Toplu uçlar (setMakineTalepToplu / setMakineKararToplu) müşterinin iki şikâyeti için var
// (15.09.2026, makine listesi):
//   "Toplu işlem yapmak aşırı yavaş oluyor, 10 tane makineye talep tarihinin dolması bile 1dk
//    sürüyor neredeyse, tek tek doluyor tarihler."
//   "Toplu işlem yapınca otomatik olarak revizeyi bitiriyor."
// Ekran her satır için ayrı istek atıyordu; her istek belgeyi okuyup kaydediyor ve yanıtta belgenin
// tamamını dönüyordu. Toplu uç seçilen satırları tek okuma + tek kayıtla uygular.
//
// Kurallar tekil uçlarla (setMakineTalepDurumu / setMakineKararDurumu) birebir aynı; farkı test
// dosyası koruyor.

const mongoose = require('mongoose');

const LISTELER = ['yerli', 'ithal'];
const EN_FAZLA_ISLEM = 2000;

const istekHatasi = (mesaj) => {
  const e = new Error(mesaj);
  e.durum = 400;
  return e;
};

/** rowId ile, bulunamazsa eşleşme alanlarıyla (gtip, ad, miktar, birim) satır indeksi; yoksa -1 */
function satirIndeksiBul(satirlar, { rowId, match } = {}) {
  const arr = Array.isArray(satirlar) ? satirlar : [];
  let idx = rowId ? arr.findIndex((r) => r.rowId === rowId) : -1;
  if (idx === -1 && match) {
    idx = arr.findIndex((r) =>
      (match.gtipKodu ? String(r.gtipKodu || '') === String(match.gtipKodu || '') : true) &&
      (match.adiVeOzelligi ? String(r.adiVeOzelligi || '') === String(match.adiVeOzelligi || '') : true) &&
      (match.miktar != null ? Number(r.miktar || 0) === Number(match.miktar || 0) : true) &&
      (match.birim ? String(r.birim || '') === String(match.birim || '') : true)
    );
  }
  return idx;
}

/** Talep: durum taslaktan başka bir duruma değişiyor ve tarih verilmediyse tarih "şimdi" olur */
function yeniTalep(mevcut, talep, simdi = new Date()) {
  const eskiDurum = mevcut?.durum || 'taslak';
  const yeniDurum = talep?.durum || eskiDurum;
  let tarih = mevcut?.talepTarihi;
  if (yeniDurum !== eskiDurum && yeniDurum !== 'taslak' && !talep?.talepTarihi) tarih = simdi;
  return {
    durum: yeniDurum,
    istenenAdet: talep?.istenenAdet ?? mevcut?.istenenAdet ?? 0,
    talepTarihi: talep?.talepTarihi || tarih || undefined,
    talepNotu: talep?.talepNotu || ''
  };
}

/** Karar: durum beklemededen başka bir duruma değişiyor ve tarih verilmediyse tarih "şimdi" olur */
function yeniKarar(mevcut, karar, simdi = new Date()) {
  const eskiDurum = mevcut?.kararDurumu || 'beklemede';
  const yeniDurum = karar?.kararDurumu || eskiDurum;
  let tarih = mevcut?.kararTarihi;
  if (yeniDurum !== eskiDurum && yeniDurum !== 'beklemede' && !karar?.kararTarihi) tarih = simdi;
  return {
    kararDurumu: yeniDurum,
    onaylananAdet: karar?.onaylananAdet ?? mevcut?.onaylananAdet ?? 0,
    kararTarihi: karar?.kararTarihi || tarih || undefined,
    kararNotu: karar?.kararNotu || ''
  };
}

/**
 * Belgenin makine listesine toplu talep/karar uygular. Belgeyi KAYDETMEZ.
 * @param belge    Tesvik / YeniTesvik belgesi
 * @param liste    'yerli' | 'ithal'
 * @param alan     'talep' | 'karar'
 * @param islemler [{ rowId, talep | karar, match? }]
 * @returns {{ guncellenen: string[], bulunamayan: Array<string|null> }}
 */
function topluUygula(belge, { liste, alan, islemler, simdi = new Date() } = {}) {
  if (!LISTELER.includes(liste)) throw istekHatasi('Geçersiz liste');
  if (!['talep', 'karar'].includes(alan)) throw istekHatasi('Geçersiz alan');
  if (!Array.isArray(islemler) || islemler.length === 0) throw istekHatasi('Uygulanacak satır yok');
  if (islemler.length > EN_FAZLA_ISLEM) throw istekHatasi(`Tek seferde en fazla ${EN_FAZLA_ISLEM} satır güncellenebilir`);

  const satirlar = belge?.makineListeleri?.[liste] || [];
  const guncellenen = [];
  const bulunamayan = [];
  for (const islem of islemler) {
    const idx = satirIndeksiBul(satirlar, islem || {});
    if (idx === -1) {
      bulunamayan.push(islem?.rowId || null);
      continue;
    }
    const satir = satirlar[idx];
    if (alan === 'talep') satir.talep = yeniTalep(satir.talep, islem.talep, simdi);
    else satir.karar = yeniKarar(satir.karar, islem.karar, simdi);
    if (!satir.rowId) satir.rowId = new mongoose.Types.ObjectId().toString();
    guncellenen.push(satir.rowId);
  }
  if (guncellenen.length && typeof belge.markModified === 'function') belge.markModified('makineListeleri');
  return { guncellenen, bulunamayan };
}

/** Kullanıcıya dönen özet cümle */
function ozetMesaji(alan, { guncellenen, bulunamayan }) {
  const adSozcugu = alan === 'talep' ? 'talep' : 'karar';
  const parcalar = [`${guncellenen.length} makinenin ${adSozcugu} durumu güncellendi`];
  if (bulunamayan.length) parcalar.push(`${bulunamayan.length} satır bulunamadı`);
  return parcalar.join(' · ');
}

module.exports = { LISTELER, satirIndeksiBul, yeniTalep, yeniKarar, topluUygula, ozetMesaji };
