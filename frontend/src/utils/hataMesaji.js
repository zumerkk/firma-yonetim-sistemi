// 🩹 HATA MESAJI ÇÖZÜCÜ
//
// ⚠️ `responseType: 'blob'` isteklerde sunucunun hata mesajı KAYBOLUR.
// Axios, yanıt gövdesini istenen tipe göre çözer; sunucu JSON hata dönse bile
// elimize Blob geçer ve `e.response.data.message` `undefined` kalır. Ekranlar
// bu yüzden hep aynı genel metni gösterir.
//
// Gerçek vaka (8 Eylül 2026): KDV muafiyet indirme bağlantısında sunucu
// "Dosya sunucuda bulunamadı — yeniden yüklenmesi gerekiyor" diyordu, ekranda
// "Dosya indirilemedi. Lütfen tekrar deneyin." yazıyordu. Yanıltıcıydı: tekrar
// denemek hiçbir şeyi değiştirmiyordu, çünkü dosya gerçekten yoktu.
//
// Kullanım (await gerektirir — Blob okuma asenkron):
//     catch (e) { setHata(await hataMesaji(e, 'Dosya indirilemedi.')); }

/**
 * Axios hatasından kullanıcıya gösterilecek metni çıkarır.
 * Sıra: blob içindeki JSON → axios katmanının kullaniciMesaji → sunucu message
 *       → hata mesajı → verilen yedek metin.
 */
export const hataMesaji = async (hata, yedek = 'İşlem tamamlanamadı.') => {
  const veri = hata?.response?.data;

  if (typeof Blob !== 'undefined' && veri instanceof Blob) {
    try {
      const metin = await veri.text();
      const json = JSON.parse(metin);
      if (json?.message) return json.message;
    } catch (_) {
      // JSON değilse (ör. HTML hata sayfası) sessizce aşağıya düş
    }
  }

  return hata?.kullaniciMesaji || veri?.message || hata?.message || yedek;
};

/** Blob beklemeyen istekler için senkron sürüm. */
export const hataMesajiSenkron = (hata, yedek = 'İşlem tamamlanamadı.') =>
  hata?.kullaniciMesaji || hata?.response?.data?.message || hata?.message || yedek;

export default hataMesaji;
