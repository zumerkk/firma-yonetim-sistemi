import api from '../utils/axios';

// ZIP akışı başladığında toplam boyutu henüz bilinmez. Bu durumda sahte yüzde
// üretmek yerine alınan bayt sayısını gösteririz; yalnız tamamlanınca %100 olur.
export const sistemYedegiIndir = async ({ onProgress, signal } = {}) => {
  try {
    const response = await api.get('/backup/full', {
      responseType: 'blob',
      timeout: 15 * 60 * 1000,
      signal,
      onDownloadProgress: (event) => onProgress?.({
        loaded: event.loaded,
        percent: event.total > 0 ? Math.min(99, Math.round(event.loaded * 100 / event.total)) : null
      })
    });
    const blob = response.data;
    // Kesilmiş bir akışı başarılı yedek olarak kaydetmeyelim. ZIP merkezi dizin
    // sonu kaydı dosyanın sonunda bulunmalı (isteğe bağlı ZIP açıklaması dahil).
    const tail = new Uint8Array(await blob.slice(-65557).arrayBuffer());
    if (signal?.aborted) throw Object.assign(new Error('Yedekleme iptal edildi.'), { code: 'ERR_CANCELED' });
    let tamam = false;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 5 && tail[i + 3] === 6
          && i + 22 + tail[i + 20] + tail[i + 21] * 256 === tail.length) {
        tamam = true;
        break;
      }
    }
    if (!tamam) throw new Error('Yedek dosyası tamamlanamadı. Lütfen tekrar deneyin.');
    const disposition = response.headers?.['content-disposition'] || '';
    const filename = disposition.match(/filename="([^"\r\n]+)"/)?.[1] || 'GM_Yedek.zip';
    return { blob, filename };
  } catch (error) {
    // Axios blob indirmesinde JSON hata yanıtı da Blob olarak gelir.
    if (error.response?.data?.text) {
      const body = await error.response.data.text();
      try { error.message = JSON.parse(body).message || error.message; } catch (_) { /* proxy yanıtı */ }
    }
    throw error;
  }
};
