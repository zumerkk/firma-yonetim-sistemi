function ornekDosyalari(evrak) {
  const adaylar = Array.isArray(evrak?.ornekDosyalar)
    ? evrak.ornekDosyalar : [evrak?.ornekDosya];
  return adaylar.filter((o) => o && (o.fileUrl || o.filePath));
}

// Yalnız kayıtlı örnekler seçilir; istemci dosya yolu belirleyemez.
function ornekDosyayiSec(evrak, indeks = 0) {
  const i = Number(indeks);
  return Number.isInteger(i) && i >= 0 ? ornekDosyalari(evrak)[i] : undefined;
}

module.exports = { ornekDosyalari, ornekDosyayiSec };
