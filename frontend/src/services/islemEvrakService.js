// 🧩 İşlem ve Evrak Yönetimi - Frontend API servisi
import api, { uploadPost } from '../utils/axios';

const base = '/islem-evrak';
const d = (r) => r.data?.data;

const islemEvrakService = {
  // İşlem türleri (şablonlar)
  turler: (params = {}) => api.get(`${base}/turler`, { params }).then(d),
  turDetay: (id) => api.get(`${base}/turler/${id}`).then(d),
  turOlustur: (body) => api.post(`${base}/turler`, body).then(d),
  turGuncelle: (id, body) => api.put(`${base}/turler/${id}`, body).then(d),
  turSil: (id) => api.delete(`${base}/turler/${id}`).then((r) => r.data),
  // Şablon örnek dosyası: dosyayı depoya koyar, künyesini döner. Künye satıra
  // yazılır ve türü kaydedince kalıcılaşır — yükleme tek başına türü değiştirmez.
  turOrnekYukle: (formData, onProgress) =>
    uploadPost(`${base}/turler/ornek-yukle`, formData, { onProgress }).then(d),
  turOrnekIndir: (id, { varyant = '', i, ornek = 0 } = {}) =>
    api.get(`${base}/turler/${id}/ornek-indir`, { params: { varyant, i, ornek }, responseType: 'blob' }),

  // Talepler
  talepler: (params = {}) => api.get(`${base}/talepler`, { params }).then((r) => r.data),
  talepDetay: (id) => api.get(`${base}/talepler/${id}`).then(d),
  talepOlustur: (body) => api.post(`${base}/talepler`, body).then(d),
  talepGuncelle: (id, body) => api.patch(`${base}/talepler/${id}`, body).then(d),
  talepSil: (id) => api.delete(`${base}/talepler/${id}`).then((r) => r.data),
  varyantUygula: (id, varyantKod) => api.post(`${base}/talepler/${id}/varyant`, { varyantKod }).then(d),
  // devam: true → yalnız bekleyen / eksik-hatalı evrakları aynı bağlantıyla isteyen devam maili
  mailOnizle: (id, { devam = false } = {}) =>
    api.get(`${base}/talepler/${id}/mail-onizle`, { params: devam ? { devam: 1 } : {} }).then(d),
  // ekler: bu maile özel dosyalar (saklanmaz) — varsa çok parçalı gider, alanlar metin olarak
  mailGonder: (id, body, ekler = [], onProgress) => {
    if (!ekler.length) return api.post(`${base}/talepler/${id}/mail-gonder`, body).then(d);
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => fd.append(k, Array.isArray(v) ? JSON.stringify(v) : (v ?? '')));
    ekler.forEach((f) => fd.append('ekDosyalar', f));
    return uploadPost(`${base}/talepler/${id}/mail-gonder`, fd, { onProgress }).then(d);
  },
  linkUret: (id, gun) => api.post(`${base}/talepler/${id}/link`, { gun }).then(d),
  // Yüklemeler uploadPost üzerinden: gerçek yüzde + uzun timeout (global 15 sn büyük dosyaya yetmiyor)
  ornekDosyaYukle: (id, evrakId, formData, onProgress) =>
    uploadPost(`${base}/talepler/${id}/evrak/${evrakId}/ornek`, formData, { onProgress }).then(d),
  yuklenenSil: (id, dosyaId) => api.delete(`${base}/talepler/${id}/yuklenen/${dosyaId}`).then(d),
  firmaEkiSil: (id, ekId) => api.delete(`${base}/talepler/${id}/firma-eki/${ekId}`).then(d),
  mailEkiSil: (id, ekId) => api.delete(`${base}/talepler/${id}/mail-eki/${ekId}`).then(d),
  // 🔁 Gelen evrak eksik / hatalı → tekrar iste (müşteri, 09.10.2026); geri al
  tekrarIste: (id, evrakId, not) => api.post(`${base}/talepler/${id}/evrak/${evrakId}/tekrar-iste`, { not }).then(d),
  tekrarIstemeGeriAl: (id, evrakId) => api.delete(`${base}/talepler/${id}/evrak/${evrakId}/tekrar-iste`).then(d),
  // Dosya indirme: blob olarak çekilir. Göreli fileUrl'i doğrudan href vermek işe yaramıyor —
  // tarayıcı onu frontend origin'ine göre çözüp SPA'nın index.html'ini indiriyordu.
  dosyaIndir: (id, dosyaId, signal, ornek) =>
    api.get(`${base}/talepler/${id}/dosya/${dosyaId}/indir`, { responseType: 'blob', signal, params: ornek === undefined ? undefined : { ornek }, timeout: 2 * 60 * 1000 }),
  // Firmadan gelen evrakların hepsi tek ZIP (evrak adına göre klasörlü). Büyük arşivde global
  // 15 sn'lik zaman aşımı yetmez; sunucu dosyaları buluttan tek tek çekip paketliyor.
  topluIndir: (id) =>
    api.get(`${base}/talepler/${id}/toplu-indir`, { responseType: 'blob', timeout: 10 * 60 * 1000 }),

  // Public (token — auth gerektirmez)
  publicNedenKaydet: (token, body) => api.post(`${base}/public/${token}/neden`, body).then(r => r.data),
  publicEkBelgeEkle: (token, body) => api.post(`${base}/public/${token}/ek-belge`, body).then(r => r.data),
  publicEkBelgeSil: (token, ekId) => api.delete(`${base}/public/${token}/ek-belge/${ekId}`).then(r => r.data),
  publicMailEkiIndir: (token, ekId) => api.get(`${base}/public/${token}/mail-eki/${ekId}`, { responseType: 'blob' }),
  publicBilgi: (token) => api.get(`${base}/public/${token}`).then(d),
  // Maile eklediğimiz örnek/şablon dosya — firma yükleme sayfasından da indirebilsin
  publicOrnekIndir: (token, evrakId, ornek = 0) =>
    api.get(`${base}/public/${token}/ornek/${evrakId}`, { params: { ornek }, responseType: 'blob' }),
  publicYukle: (token, formData, onProgress) =>
    uploadPost(`${base}/public/${token}`, formData, { onProgress }).then((r) => r.data)
};

export default islemEvrakService;
