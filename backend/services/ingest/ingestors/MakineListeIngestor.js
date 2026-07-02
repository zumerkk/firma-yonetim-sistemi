// 🔧 MAKİNE LİSTESİ INGESTOR - ETUYS ham/düzenlenmiş + sistem export'unu
// var olan bir teşvik belgesinin makineListeleri.yerli/ithal alt-listesine
// isim bazlı eşleştirerek aktarır (yeni ekler, eşleşeni günceller, dokunulmayana dokunmaz).

const normalizeKey = (h) =>
  String(h || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();

// Satırın orijinal Excel key'lerini normalize edilmiş bir haritaya çevirir.
function buildLookup(row) {
  const map = new Map();
  for (const [k, v] of Object.entries(row || {})) {
    map.set(normalizeKey(k), v);
  }
  return map;
}

// candidates sırayla denenir: önce tam eşleşme, sonra "içerir" eşleşmesi.
function pick(lookup, candidates, fallback = '') {
  for (const c of candidates) {
    if (lookup.has(c)) return lookup.get(c);
  }
  const keys = Array.from(lookup.keys());
  for (const c of candidates) {
    const found = keys.find((k) => k.includes(c));
    if (found) return lookup.get(found);
  }
  return fallback;
}

// Kaynaklar farklı sayı biçimleri kullanır: ETUYS ham → düz noktalı ondalık
// ("1866962.03"), sistem export'u (Excel biçimlendirmesi) → İngilizce
// ("66,430.00", virgül=binlik/nokta=ondalık), elle giriş → TR ("1.866.962,03",
// nokta=binlik/virgül=ondalık) olabilir. Hangi ayracın SONDA geçtiğine bakarak
// ayrımı doğru yapıyoruz — tek bir formatı varsaymak veri bozulmasına yol açar
// (ör. "66,430.00"ı TR sanıp virgülü silmek 6643000 üretir, "1866962.03"ü TR
// sanıp noktayı silmek 186696203 üretir — ikisi de yanlış).
const toNumber = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (s === '') return 0;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    s = lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.') // TR: nokta binlik, virgül ondalık
      : s.replace(/,/g, ''); // İngilizce: virgül binlik, nokta ondalık
  } else if (lastComma !== -1) {
    s = s.replace(',', '.'); // yalnız virgül → TR ondalık ayracı
  }
  // yalnız nokta (veya ayraçsız): JS varsayılanı (nokta=ondalık) zaten doğru
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
};

const toEvetHayir = (v) => {
  const s = normalizeKey(v);
  if (s === 'evet' || s === 'true' || s === '1') return 'EVET';
  if (s === 'hayir' || s === 'false' || s === '0') return 'HAYIR';
  return '';
};

// Satırı hedef şemaya normalize eder. Ortak + yerli/ithal'e özel alanlar.
function normalizeMakineKalemi(row, liste) {
  const lk = buildLookup(row);

  const ortak = {
    siraNo: toNumber(pick(lk, ['sira no'])),
    makineId: String(pick(lk, ['makine id'])).trim(),
    gtipKodu: String(pick(lk, ['gtip no'])).trim(),
    gtipAciklamasi: String(pick(lk, ['gtip aciklama'])).trim(),
    adiVeOzelligi: String(pick(lk, ['adi ve ozelligi'])).trim(),
    miktar: toNumber(pick(lk, ['miktari'])),
    birim: String(pick(lk, ['birimi']) || pick(lk, ['birim'])).trim(),
    birimAciklamasi: String(pick(lk, ['birim aciklamasi'])).trim(),
  };

  if (liste === 'ithal') {
    const birimFiyatiFob = toNumber(pick(lk, ['birim fiyati (fob)', 'mense ulke doviz birim fiyati']));
    // Bazı kaynaklarda (sistem export'unun kendi Excel çıktısı) toplam hücresi boş
    // bırakılıyor — birim fiyatı × miktar ile telafi edilir, veri kaybı önlenir.
    const toplamTutarFobUsd = toNumber(pick(lk, ['toplam tutar (fob$)', 'toplam ($)'])) || (birimFiyatiFob * ortak.miktar);
    return {
      ...ortak,
      birimFiyatiFob,
      gumrukDovizKodu: String(pick(lk, ['doviz cinsi', 'doviz'])).trim().toUpperCase(),
      toplamTutarFobUsd,
      toplamTutarFobTl: toNumber(pick(lk, ['toplam tutar (fobtl)', 'toplam (tl)'])),
      kullanilmisMakine: toEvetHayir(pick(lk, ['kullanilmis mi', 'kullanilmis'])),
    };
  }

  const birimFiyatiTl = toNumber(pick(lk, ['birim fiyati (tl)', 'birim fiyati']));
  const toplamTutariTl = toNumber(pick(lk, ['toplam tutar (tl)', 'toplam tutari'])) || (birimFiyatiTl * ortak.miktar);
  return {
    ...ortak,
    birimFiyatiTl,
    toplamTutariTl,
    kdvIstisnasi: toEvetHayir(pick(lk, ['kdv istisnasi', 'kdv muafiyeti'])),
  };
}

// En az isim + miktar dolu olmalı; tamamen boş/başlık-benzeri satırları ele.
function validateMakineKalemi(n) {
  const issues = [];
  if (!n.adiVeOzelligi) issues.push('Adı ve Özelliği boş olamaz');
  if (!n.miktar || n.miktar <= 0) issues.push('Miktar 0’dan büyük olmalı');
  return issues;
}

// Var olan liste (mongoose subdoc array, .toObject() ile düz obje) ile yeni
// gelen kalemleri "adiVeOzelligi" (normalize, trim) üzerinden eşleştirir.
// Eşleşen: sayısal/GTIP alanları günceller (rowId/talep/karar/etuysSecili KORUNUR).
// Eşleşmeyen: yeni kalem olarak eklenir (siraNo devam ettirilir).
// Dosyada olmayan mevcut kalemlere DOKUNULMAZ.
function mergeMakineListesi(existingList, yeniKalemler) {
  const existing = (existingList || []).map((e) => (e.toObject ? e.toObject() : { ...e }));
  const keyOf = (adi) => normalizeKey(adi);
  const byName = new Map(existing.map((e) => [keyOf(e.adiVeOzelligi), e]));

  let created = 0;
  let updated = 0;
  let maxSiraNo = existing.reduce((m, e) => Math.max(m, e.siraNo || 0), 0);

  // Dosyada AYNI İSİMLİ birden çok makine olabilir — her mevcut kalem en fazla BİR
  // import satırıyla eşleşir; sonraki aynı isimliler yeni kalem olarak eklenir
  // (aksi halde "güncelleme" sanılıp yutulur → makine kaybı).
  const consumed = new Set();
  for (const yeni of yeniKalemler) {
    const key = keyOf(yeni.adiVeOzelligi);
    const aday = byName.get(key);
    const mevcut = aday && !consumed.has(aday) ? aday : null;
    if (mevcut) {
      consumed.add(mevcut);
      Object.assign(mevcut, yeni, {
        rowId: mevcut.rowId,
        talep: mevcut.talep,
        karar: mevcut.karar,
        etuysSecili: mevcut.etuysSecili,
        siraNo: mevcut.siraNo || yeni.siraNo,
      });
      updated += 1;
    } else {
      // Dosyanın kendi "Sıra No"su mevcut listenin sırasıyla hizalı değildir (her ikisi
      // de bağımsız 1'den başlar) — kullanmak çakışmaya yol açar. Her zaman kendi
      // ardışık sıramızı üretiyoruz.
      maxSiraNo += 1;
      existing.push({ ...yeni, siraNo: maxSiraNo });
      created += 1;
    }
  }

  return { list: existing, created, updated };
}

module.exports = { normalizeMakineKalemi, validateMakineKalemi, mergeMakineListesi };
