export function yerliTutarlariniGuncelle(satir, degisenler = []) {
  const girdilerDegisti = degisenler.includes('miktar') || degisenler.includes('birimFiyatiTl');
  const manuel = !!satir.tlYerliManuel && !girdilerDegisti;
  const toplam = (Number(satir.miktar) || 0) * (Number(satir.birimFiyatiTl) || 0);
  return { ...satir, tlYerliManuel: manuel, toplamTl: manuel ? (satir.toplamTl ?? toplam) : toplam };
}
