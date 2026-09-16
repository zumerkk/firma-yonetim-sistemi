// 💾 İşlem & Evrak — istenen evrak listesinin kaydı
//
// Müşteri (15.09.2026): "Mail gönderirken istenen evrakları kaydet kısmını sağ alt tarafa da
// ekleyebilir miyiz her seferinde mailde iste dedikten sonra yukarı çıkmak zor oluyor, ya da mailde
// iste diyince otomatik kaydedebilir yavaşlatmayacaksa çok."
//
// "Mailde iste" işareti arka planda kaydediliyor. Kullanıcı bu sırada başka bir satırda yazmaya devam
// edebildiği için sunucu yanıtı listeyi körlemesine EZMEMELİ: yalnız istek gittiğinden beri
// değişmemiş satırlar sunucudaki hallerini (kimlik, isteyen, örnek dosya) alır.

let sayac = 0;

/**
 * Satıra kalıcı React anahtarı ekler: kayıtlı satırda _id, yeni satırda yerel sayaç. Anahtar kayıttan
 * sonra da korunur; yeni satır kaydedilip _id alınca yeniden oluşturulmaz ve imleç kaybolmaz.
 */
export const anahtarla = (satir) => {
  if (satir && satir._anahtar) return satir;
  sayac += 1;
  return { ...satir, _anahtar: satir && satir._id ? String(satir._id) : `yeni-${sayac}` };
};

export const listeyiAnahtarla = (liste) => (Array.isArray(liste) ? liste.map(anahtarla) : []);

/** Sunucuya giden liste: yerel anahtar gönderilmez, adı boş satır gönderilmez */
export const gonderilecekSatirlar = (liste) => (Array.isArray(liste) ? liste : [])
  .filter((satir) => String(satir?.ad || '').trim())
  .map(({ _anahtar, ...satir }) => satir);

/**
 * Kayıt yanıtını yerel listeye işler.
 *
 * @param yerel      yanıt geldiği andaki yerel liste
 * @param gonderilen istek anındaki (adı dolu) satır NESNELERİ; sunucu yanıtıyla aynı sırada
 * @param sunucu     sunucunun döndürdüğü istenenEvraklar
 * @returns yeni yerel liste — değişmemiş satırlar sunucu halini alır (anahtarları korunur); istekten
 *          sonra değiştirilen, eklenen ya da adı henüz boş satırlara dokunulmaz; silinen satır geri gelmez.
 */
export const kayitSonucunuIsle = (yerel, gonderilen, sunucu) => {
  const karsilik = new Map();
  (gonderilen || []).forEach((satir, i) => {
    if (sunucu && sunucu[i]) karsilik.set(satir, sunucu[i]);
  });
  return (yerel || []).map((satir) => {
    const kayitli = karsilik.get(satir);
    return kayitli ? { ...kayitli, _anahtar: satir._anahtar } : satir;
  });
};
