// Açık talepler aynı firma/tür/belge numarası için tektir. Sonuçlananlar yeniden talep açmayı engellemez.
const talepAcik = (t) => t?.aktif !== false && t?.anaAsama !== 'TAMAMLANDI'
  && !(String(t?.durum || '').startsWith('2.3') && t.durum !== '2.3.2_SONUC_BEKLETILECEK');

function acikTalepAnahtari(t) {
  const firma = String(t?.firma?._id || t?.firma || '');
  const belgeNo = String(t?.ytbNo || t?.belgeId || '').trim();
  if (!talepAcik(t) || !firma || !t?.talepTuru || !belgeNo) return undefined;
  return JSON.stringify([firma, t.talepTuru, belgeNo]);
}

module.exports = { talepAcik, acikTalepAnahtari };
