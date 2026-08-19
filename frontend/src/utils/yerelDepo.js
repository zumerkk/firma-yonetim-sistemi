// 🗄️ localStorage kota yönetimi
//
// Sorun: Makine Yönetimi, açılan HER teşvik belgesi için makine listelerinin
// tamamını `mk_<tesvikId>_yerli` / `mk_<tesvikId>_ithal` anahtarlarına yazıyor ve
// bu anahtarlar hiç silinmiyordu. Yüzlerce satırlık listeler birikince tarayıcının
// ~5 MB'lık localStorage kotası doluyor; ardından SIRADAKİ HERHANGİ bir yazma
// patlıyor. Hata bu yüzden alakasız bir yerde görünüyordu:
//   "Setting the value of 'currentScreenshotJobId' exceeded the quota"
//
// Çözüm iki katmanlı:
//   1) Önbellek budanır — yalnızca en son kullanılan birkaç teşvik saklanır.
//      (Veri kaybı yok: makine listelerinin aslı veritabanında, localStorage
//       sadece önbellek ve sayfa kapanma güvenliği.)
//   2) Yazma yine de kotaya takılırsa yer açılıp bir kez daha denenir.

const MAKINE_ONEKI = 'mk_';
const SON_KULLANIM_ANAHTARI = 'mk_sonKullanim'; // { tesvikId: zamanDamgasi }
const VARSAYILAN_SAKLANACAK = 3;                // kaç teşvikin önbelleği kalsın
const BUDAMA_ESIGI_BAYT = 3 * 1024 * 1024;      // açılışta bu boyutun üstündeyse budanır

// Teşvike ait önbellek anahtarları (Mongo ObjectId = 24 hex).
// Bu kalıplara UYMAYAN mk_ anahtarları (mk_tpl_*, favoriler) genel ayardır, silinmez.
const TESVIK_ANAHTAR_KALIPLARI = [
    /^mk_([0-9a-fA-F]{24})_(?:yerli|ithal)$/,
    /^mk_(?:deleted|activity)_([0-9a-fA-F]{24})$/
];

const tesvikIdCoz = (anahtar) => {
    for (const kalip of TESVIK_ANAHTAR_KALIPLARI) {
        const e = anahtar.match(kalip);
        if (e) return e[1];
    }
    return null;
};

export const kotaHatasiMi = (hata) =>
    hata && (hata.name === 'QuotaExceededError' ||
        hata.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
        hata.code === 22 || hata.code === 1014);

// UTF-16 saklama varsayımıyla kaba boyut — kesin değer değil, eşik kontrolü için yeterli
export const yerelKullanimBayt = () => {
    let toplam = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            toplam += (k?.length || 0) + (localStorage.getItem(k)?.length || 0);
        }
    } catch (_) { return 0; }
    return toplam * 2;
};

const sonKullanimOku = () => {
    try { return JSON.parse(localStorage.getItem(SON_KULLANIM_ANAHTARI)) || {}; }
    catch (_) { return {}; }
};

const sonKullanimDamgala = (tesvikId, zaman) => {
    if (!tesvikId) return;
    const harita = sonKullanimOku();
    harita[tesvikId] = zaman;
    try { localStorage.setItem(SON_KULLANIM_ANAHTARI, JSON.stringify(harita)); } catch (_) { /* budama zaten devrede */ }
};

const tesvikOnbelleginiSil = (tesvikId) => {
    const silinecek = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(MAKINE_ONEKI) && tesvikIdCoz(k) === tesvikId) silinecek.push(k);
    }
    silinecek.forEach((k) => localStorage.removeItem(k));
    return silinecek.length;
};

/**
 * Eski teşvik önbelleklerini atar; en son kullanılan `saklanacak` tanesi ve
 * `korunanTesvikId` her hâlükârda kalır. Damgası olmayan (eski sürümden kalan)
 * kayıtlar önce gider.
 */
export const makineOnbellegiBudala = (korunanTesvikId = null, saklanacak = VARSAYILAN_SAKLANACAK) => {
    let idler = [];
    try {
        const kume = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            const id = tesvikIdCoz(localStorage.key(i) || '');
            if (id) kume.add(id);
        }
        idler = [...kume];
    } catch (_) { return 0; }
    if (!idler.length) return 0;

    const damgalar = sonKullanimOku();
    const kalacak = idler
        .sort((a, b) => (damgalar[b] || 0) - (damgalar[a] || 0))
        .slice(0, saklanacak);
    if (korunanTesvikId && !kalacak.includes(korunanTesvikId)) kalacak.push(korunanTesvikId);

    let silinen = 0;
    idler.filter((id) => !kalacak.includes(id)).forEach((id) => { silinen += tesvikOnbelleginiSil(id); });

    if (silinen) {
        const harita = sonKullanimOku();
        Object.keys(harita).forEach((id) => { if (!kalacak.includes(id)) delete harita[id]; });
        try { localStorage.setItem(SON_KULLANIM_ANAHTARI, JSON.stringify(harita)); } catch (_) { /* yoksay */ }
    }
    return silinen;
};

/**
 * Kotaya dayanıklı yazma. Kota dolduysa eski teşvik önbellekleri atılıp tekrar denenir.
 * @returns {boolean} yazılabildi mi
 */
export const yerelYaz = (anahtar, metin, { korunanTesvikId = null } = {}) => {
    try {
        localStorage.setItem(anahtar, metin);
        return true;
    } catch (hata) {
        if (!kotaHatasiMi(hata)) return false;
        // 1. deneme: en son kullanılanlar dışındakileri at
        makineOnbellegiBudala(korunanTesvikId);
        try {
            localStorage.setItem(anahtar, metin);
            return true;
        } catch (_) { /* hâlâ dar → aşağıda son çare */ }
        // 2. deneme: korunan teşvik dışındaki tüm makine önbelleğini at
        makineOnbellegiBudala(korunanTesvikId, 0);
        try {
            localStorage.setItem(anahtar, metin);
            return true;
        } catch (sonHata) {
            console.warn('localStorage dolu, yazılamadı:', anahtar, sonHata?.message);
            return false;
        }
    }
};

/**
 * Makine Yönetimi önbelleği: kullanımı damgalar, önbelleği en son kullanılan
 * birkaç teşvikle sınırlar, sonra yazar.
 *
 * Budama YAZMADAN ÖNCE ve her seferinde yapılır — kota hatasını beklemek yetmez:
 * o hata bu modülün dışındaki bir localStorage yazımında da patlayabilir
 * (nitekim "currentScreenshotJobId" hatası böyle çıkmıştı).
 */
export const makineOnbellegiKaydet = (anahtar, deger) => {
    const tesvikId = tesvikIdCoz(anahtar);
    if (tesvikId) sonKullanimDamgala(tesvikId, Date.now());
    const yazildi = yerelYaz(anahtar, JSON.stringify(deger), { korunanTesvikId: tesvikId });
    // Budama yazmadan SONRA: bu teşvik de aday listesine girsin, sınır tam tutsun
    if (tesvikId) makineOnbellegiBudala(tesvikId);
    return yazildi;
};

/**
 * Uygulama açılışında çalışır: depo şişmişse eski önbellekleri atar.
 * Kotası çoktan dolmuş tarayıcıların (giriş bile yazamayabilir) kendiliğinden
 * toparlanması için gerekli.
 */
export const acilistaDepoyuToparla = () => {
    try {
        if (yerelKullanimBayt() < BUDAMA_ESIGI_BAYT) return 0;
        const silinen = makineOnbellegiBudala(null, 1);
        if (silinen) console.info(`localStorage toparlandı: ${silinen} eski önbellek anahtarı silindi.`);
        return silinen;
    } catch (_) { return 0; }
};
