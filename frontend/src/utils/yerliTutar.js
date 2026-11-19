// Miktar veya birim fiyat değişince toplamı yenile; diğer alanlar kayıtlı tutarı korur.
export function yerliTutarlariniGuncelle(satir, degisenler) {
  const girdilerDegisti = (degisenler || []).some((alan) => alan === 'miktar' || alan === 'birimFiyatiTl');
  const manuel = !!satir.tlYerliManuel && !girdilerDegisti;
  const toplam = (Number(satir.miktar) || 0) * (Number(satir.birimFiyatiTl) || 0);
  const kayitliTutariKoru = manuel || (Array.isArray(degisenler) && !girdilerDegisti);
  return { ...satir, tlYerliManuel: manuel, toplamTl: kayitliTutariKoru ? (satir.toplamTl ?? toplam) : toplam };
}
