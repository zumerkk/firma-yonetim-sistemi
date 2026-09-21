// 🕓 BELGE TAKİP → DURUM GEÇMİŞİ TARİH DÜZELTME
//
// Müşteri (21.09.2026): "Bu durum geçmişindeki tarihleri istediğimiz gibi revize edebilme şansımız var
// mıdır acaba?" İşler acil olduğu için veri girişi geriye dönük yapılıyor; her durum geçişi girildiği
// günün tarihiyle düşüyor ve gerçek tarih kayboluyor.
//
// Bu dosya yalnızca KURALLARI taşır (doğrulama + kayda işleme); okuma/yazma controller'da. Saf tutulma
// sebebi: yanlış işlenen bir tarih "Sonuçlanma" sütununu da bozar ve hata vermeden yanlış rapor üretir.

// Sistem "Sonuçlandı"ya geçişte sonuclanmaTarihi'ni geçişle AYNI anda damgalıyor (iki ayrı new Date,
// arada milisaniyeler). Bu pencere içindeki eşitlik "damga bu geçişten geldi" demek.
const DAMGA_PENCERESI_MS = 60 * 1000;
// Saat farkı ve istemci saati kayması payı: "şimdi" diye girilen tarih reddedilmesin
const ILERI_TARIH_PAYI_MS = 5 * 60 * 1000;
const EN_ESKI_TARIH = new Date('2015-01-01T00:00:00.000Z');

const tarihCoz = (deger) => {
    if (deger === null || deger === undefined || deger === '') return null;
    const t = new Date(deger);
    return Number.isNaN(t.getTime()) ? null : t;
};

/**
 * Geçmiş kaydının tarihini düzeltir (talep belgesi üzerinde, kaydetmeden).
 *
 * - Sistemin ilk yazdığı zaman `ilkTarih` olarak bir kez saklanır; ikinci düzeltme onu ezmez.
 * - Kayıt "Sonuçlandı"/"Belgeye Yansıtıldı" geçişiyse ve sonuclanmaTarihi o geçişin otomatik damgasıysa
 *   o da yeni tarihe taşınır — yoksa liste "Sonuçlanma" sütunu eski (giriş günü) tarihi göstermeye
 *   devam ederdi. Elle girilmiş bir sonuçlanma tarihine dokunulmaz.
 *
 * @returns {{ hata: string, durumKodu: number } | { kayit, eskiTarih: Date, sonuclanmaTasindi: boolean }}
 */
function gecmisTarihiDuzelt(talep, gecmisId, tarihGirdisi, {
    kullanici = null, sonucDurumlari = [], simdi = new Date()
} = {}) {
    const kayit = (talep?.durumGecmisi || []).find((g) => g && String(g._id) === String(gecmisId));
    if (!kayit) return { hata: 'Durum geçmişi kaydı bulunamadı.', durumKodu: 404 };

    const yeni = tarihCoz(tarihGirdisi);
    if (!yeni) return { hata: 'Geçerli bir tarih ve saat girin.', durumKodu: 400 };
    if (yeni.getTime() > simdi.getTime() + ILERI_TARIH_PAYI_MS) {
        return { hata: 'İleri bir tarih girilemez — durum değişikliği henüz olmamış olur.', durumKodu: 400 };
    }
    if (yeni < EN_ESKI_TARIH) return { hata: 'Tarih 2015’ten önce olamaz.', durumKodu: 400 };

    const eskiTarih = tarihCoz(kayit.tarih);
    if (!kayit.ilkTarih && eskiTarih) kayit.ilkTarih = eskiTarih;
    kayit.tarih = yeni;
    kayit.tarihDuzenleyen = kullanici?._id;
    kayit.tarihDuzenleyenAdi = kullanici?.adSoyad || '';
    kayit.tarihDuzenlemeTarihi = simdi;

    let sonuclanmaTasindi = false;
    const sonuclanma = tarihCoz(talep.sonuclanmaTarihi);
    if (sonucDurumlari.includes(kayit.yeniDurum) && sonuclanma && eskiTarih
        && Math.abs(sonuclanma.getTime() - eskiTarih.getTime()) <= DAMGA_PENCERESI_MS) {
        talep.sonuclanmaTarihi = yeni;
        sonuclanmaTasindi = true;
    }

    return { kayit, eskiTarih, sonuclanmaTasindi };
}

module.exports = { gecmisTarihiDuzelt, DAMGA_PENCERESI_MS };
