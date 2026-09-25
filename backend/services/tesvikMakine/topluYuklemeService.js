// 🔗 TOPLU YÜKLEME BAĞLANTISI — oluşturma ve çözümleme
// Neden var: models/TopluYuklemeBaglantisi.js

const MachineProcess = require('../../models/MachineProcess');
const TopluYuklemeBaglantisi = require('../../models/TopluYuklemeBaglantisi');
const tokenService = require('./uploadTokenService');
const { publicDocumentTypes } = require('../../constants/tesvikMakineMail');

// Seçim sırasından bağımsız: [B, A] ile [A, B] aynı link
const kapsamAnahtari = (processes) => (processes || []).map((p) => String(p._id)).sort().join(',');

/**
 * Seçilen makine süreçlerini kapsayan public yükleme linki (aynı seçim → aynı link).
 * Süreçlerin hepsi aynı belgeye ait olmalı: link bir belgenin makinelerini kapsar.
 */
async function ensureTopluYuklemeLinki(processes, { user = null, days } = {}) {
  const liste = (processes || []).filter(Boolean);
  if (!liste.length) {
    const e = new Error('Toplu yükleme linki için makine seçilmedi.'); e.code = 'BAD_INPUT'; throw e;
  }
  const ilk = liste[0];
  const baskaBelge = liste.some((p) => p.tesvikModel !== ilk.tesvikModel || String(p.tesvikId) !== String(ilk.tesvikId));
  if (baskaBelge) {
    const e = new Error('Toplu yükleme linki yalnızca aynı belgedeki makineler için üretilebilir.'); e.code = 'BAD_INPUT'; throw e;
  }

  const anahtar = kapsamAnahtari(liste);
  const mevcut = await TopluYuklemeBaglantisi.findOne({ kapsamAnahtari: anahtar }).sort({ createdAt: -1 });
  if (mevcut && tokenService.korunmaliMi(mevcut.token, mevcut.expiresAt)) {
    return { token: mevcut.token, link: tokenService.buildUploadLink(mevcut.token) };
  }

  const kayit = await TopluYuklemeBaglantisi.create({
    token: tokenService.generateToken(ilk.documentNo),
    tesvikModel: ilk.tesvikModel,
    tesvikId: ilk.tesvikId,
    processIds: liste.map((p) => p._id),
    kapsamAnahtari: anahtar,
    expiresAt: tokenService.computeExpiry(days),
    olusturanKullanici: user ? user._id : null
  });
  return { token: kayit.token, link: tokenService.buildUploadLink(kayit.token) };
}

/**
 * Public token → { baglanti, processes } | { expired: true } | null.
 * Süreçler sıra numarasına göre döner; sonradan silinmiş süreçler atlanır.
 */
async function resolveTopluByToken(token) {
  if (!token) return null;
  const baglanti = await TopluYuklemeBaglantisi.findOne({ token });
  if (!baglanti) return null;
  if (tokenService.isExpired(baglanti.expiresAt)) return { expired: true };

  const processes = await MachineProcess.find({ _id: { $in: baglanti.processIds } });
  if (!processes.length) return null;
  processes.sort((a, b) => (Number(a.siraNo) || 0) - (Number(b.siraNo) || 0));
  return { baglanti, processes };
}

/**
 * Kapsanan liste tiplerinin firmaya sunulan evrak türleri — birleşim, sıra korunur.
 * Yerli + ithal karışık seçimde hem fatura türleri hem beyanname sunulur.
 */
function topluBelgeTurleri(listTypes) {
  const tipler = Array.isArray(listTypes) && listTypes.length ? [...new Set(listTypes)] : [undefined];
  const gorulen = new Set();
  const sonuc = [];
  for (const lt of tipler) {
    for (const tur of publicDocumentTypes(lt)) {
      if (gorulen.has(tur.key)) continue;
      gorulen.add(tur.key);
      sonuc.push(tur);
    }
  }
  return sonuc;
}

module.exports = { ensureTopluYuklemeLinki, resolveTopluByToken, topluBelgeTurleri, kapsamAnahtari };
