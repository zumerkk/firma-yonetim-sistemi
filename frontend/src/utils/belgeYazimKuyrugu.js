// Aynı belgenin büyük makine listeleri paralel yazılırsa eski bir kayıt daha
// sonra tamamlanıp yeni veriyi ezebilir. Bekleyen listeleri birleştirirken
// revize başlat/bitir/geri dön işlemlerinin sırasını korur.
export function belgeYazimKuyruguOlustur(kaydet) {
  const belgeler = new Map();

  const calistir = async (id, belge) => {
    if (belge.calisiyor) return;
    belge.calisiyor = true;
    try {
      while (belge.isler.length) {
        const is = belge.isler.shift();
        try {
          const sonuc = await (is.tur === 'kayit' ? kaydet(id, is.veri) : is.islem());
          is.bekleyenler.forEach(({ resolve }) => resolve(sonuc));
        } catch (hata) {
          is.bekleyenler.forEach(({ reject }) => reject(hata));
        }
      }
    } finally {
      belge.calisiyor = false;
      if (belgeler.get(id) === belge) belgeler.delete(id);
    }
  };

  const ekle = (id, is) => new Promise((resolve, reject) => {
    let belge = belgeler.get(id);
    if (!belge) {
      belge = { calisiyor: false, isler: [] };
      belgeler.set(id, belge);
    }
    const sonIs = belge.isler[belge.isler.length - 1];
    if (is.tur === 'kayit' && sonIs?.tur === 'kayit') {
      sonIs.veri = is.veri;
      sonIs.bekleyenler.push({ resolve, reject });
    } else {
      belge.isler.push({ ...is, bekleyenler: [{ resolve, reject }] });
    }
    void calistir(id, belge);
  });

  return {
    kaydet: (id, veri) => ekle(id, { tur: 'kayit', veri }),
    sirayla: (id, islem) => ekle(id, { tur: 'islem', islem })
  };
}
