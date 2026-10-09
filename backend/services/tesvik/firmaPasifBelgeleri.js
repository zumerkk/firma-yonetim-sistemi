// 💤 Firma pasife alınınca belgeleri de "Pasife Alındı"
//
// Müşteri (07.10.2026): "Firma pasif ise belgesi (varsa) o da pasife alındı olsun ve bundan sonra
// pasife alınan firmaların da belgeleri otomatik olarak pasife alınsın."
//
// Kurallar:
//  - Sonuçlanmış belge (Kapandı / İptal / Reddedildi) olduğu gibi kalır (PASIFE_ALINMAYAN_DURUMLAR).
//  - Belgenin önceki durumu saklanır; firma yeniden aktif yapılınca belge ona döner. Listedeki
//    ⏸ düğmesine yanlışlıkla basmak bütün belgelerin durumunu geri dönüşsüz silmesin diye.
//  - `firmaPasif` işareti belgenin bu kuralla işlendiğini söyler: açılış göçü her başlatmada çalışır
//    ama işaretli belgeye dokunmaz. Kullanıcı pasif firmanın belgesini elle başka duruma alırsa
//    sunucu yeniden başladığında belge tekrar pasife DÖNMEZ.
//
// Karar mantığı saf fonksiyonlarda (pasifePlan / geriAlmaPlani), veritabanı katmanı ince.

const { PASIF_DURUM, PASIFE_ALINMAYAN_DURUMLAR, durumRengi } = require('../../constants/belgeDurumlari');

const VARSAYILAN_DURUM = 'onaylandi'; // şema varsayılanı; durumu hiç yazılmamış eski kayıtlar için

const kimlikleriTopla = (liste) => liste.map((b) => b._id);
const grupla = (liste, anahtar) => liste.reduce((m, b) => {
  const k = anahtar(b);
  if (!m.has(k)) m.set(k, []);
  m.get(k).push(b);
  return m;
}, new Map());

/**
 * Henüz işlenmemiş belgeleri ikiye ayırır.
 * @returns {{ pasifeAlinacak: Map<eskiDurum, belge[]>, dokunulmayacak: belge[] }}
 */
function pasifePlan(belgeler = []) {
  const dokunulmayacak = [];
  const alinacak = [];
  for (const b of belgeler) {
    const durum = b?.durumBilgileri?.genelDurum || VARSAYILAN_DURUM;
    if (PASIFE_ALINMAYAN_DURUMLAR.includes(durum)) dokunulmayacak.push(b);
    else alinacak.push(b);
  }
  return {
    pasifeAlinacak: grupla(alinacak, (b) => b?.durumBilgileri?.genelDurum || VARSAYILAN_DURUM),
    dokunulmayacak
  };
}

/**
 * Firma yeniden aktif: pasifliği bu kuralla gelmiş ve hâlâ "Pasife Alındı" duran belge eski
 * durumuna döner. Arada elle başka duruma alınmış belgenin durumuna dokunulmaz, yalnız işaret kalkar.
 * @returns {{ donecek: Map<hedefDurum, belge[]>, yalnizIsaret: belge[] }}
 */
function geriAlmaPlani(belgeler = []) {
  const donecekler = [];
  const yalnizIsaret = [];
  for (const b of belgeler) {
    const d = b?.durumBilgileri || {};
    if (d.genelDurum === PASIF_DURUM && d.pasifOncesiDurum && d.pasifOncesiDurum !== PASIF_DURUM) donecekler.push(b);
    else yalnizIsaret.push(b);
  }
  return { donecek: grupla(donecekler, (b) => b.durumBilgileri.pasifOncesiDurum), yalnizIsaret };
}

const modeller = () => [require('../../models/Tesvik'), require('../../models/YeniTesvik')];

/**
 * Verilen firmaların işlenmemiş belgelerini pasife alır.
 * @returns {Promise<{ pasifeAlinan: number, korunan: number }>}
 */
async function belgeleriPasifeAl(firmaIdleri) {
  const firmalar = [].concat(firmaIdleri || []).filter(Boolean);
  const sonuc = { pasifeAlinan: 0, korunan: 0 };
  if (!firmalar.length) return sonuc;
  const simdi = new Date();

  for (const Model of modeller()) {
    const belgeler = await Model.find({
      firma: { $in: firmalar },
      aktif: { $ne: false },
      'durumBilgileri.firmaPasif': { $ne: true }
    }).select('durumBilgileri.genelDurum').lean();
    if (!belgeler.length) continue;

    const { pasifeAlinacak, dokunulmayacak } = pasifePlan(belgeler);
    for (const [eskiDurum, grup] of pasifeAlinacak) {
      // Filtrede eski durum da var: okuma ile yazma arasında biri durumu değiştirdiyse ezilmez
      const r = await Model.updateMany(
        { _id: { $in: kimlikleriTopla(grup) }, 'durumBilgileri.firmaPasif': { $ne: true }, ...(
          eskiDurum === VARSAYILAN_DURUM
            ? { 'durumBilgileri.genelDurum': { $in: [VARSAYILAN_DURUM, null] } }
            : { 'durumBilgileri.genelDurum': eskiDurum }
        ) },
        { $set: {
          'durumBilgileri.genelDurum': PASIF_DURUM,
          'durumBilgileri.durumRengi': durumRengi(PASIF_DURUM),
          'durumBilgileri.pasifOncesiDurum': eskiDurum,
          'durumBilgileri.firmaPasif': true,
          'durumBilgileri.sonDurumGuncelleme': simdi
        } }
      );
      sonuc.pasifeAlinan += r.modifiedCount || 0;
    }
    if (dokunulmayacak.length) {
      await Model.updateMany(
        { _id: { $in: kimlikleriTopla(dokunulmayacak) } },
        { $set: { 'durumBilgileri.firmaPasif': true } }
      );
      sonuc.korunan += dokunulmayacak.length;
    }
  }
  return sonuc;
}

/**
 * Firma yeniden aktif yapıldı: belgeleri pasif öncesi durumuna döndürür.
 * @returns {Promise<{ geriAlinan: number }>}
 */
async function belgeleriGeriAl(firmaIdleri) {
  const firmalar = [].concat(firmaIdleri || []).filter(Boolean);
  const sonuc = { geriAlinan: 0 };
  if (!firmalar.length) return sonuc;
  const simdi = new Date();
  const isaretiKaldir = { 'durumBilgileri.firmaPasif': '', 'durumBilgileri.pasifOncesiDurum': '' };

  for (const Model of modeller()) {
    const belgeler = await Model.find({ firma: { $in: firmalar }, 'durumBilgileri.firmaPasif': true })
      .select('durumBilgileri.genelDurum durumBilgileri.pasifOncesiDurum').lean();
    if (!belgeler.length) continue;

    const { donecek, yalnizIsaret } = geriAlmaPlani(belgeler);
    for (const [hedef, grup] of donecek) {
      const r = await Model.updateMany(
        { _id: { $in: kimlikleriTopla(grup) }, 'durumBilgileri.genelDurum': PASIF_DURUM },
        {
          $set: {
            'durumBilgileri.genelDurum': hedef,
            'durumBilgileri.durumRengi': durumRengi(hedef),
            'durumBilgileri.sonDurumGuncelleme': simdi
          },
          $unset: isaretiKaldir
        }
      );
      sonuc.geriAlinan += r.modifiedCount || 0;
    }
    if (yalnizIsaret.length) {
      await Model.updateMany({ _id: { $in: kimlikleriTopla(yalnizIsaret) } }, { $unset: isaretiKaldir });
    }
  }
  return sonuc;
}

/** Açılış göçü: bugüne kadar pasife alınmış firmaların belgeleri (idempotent). */
async function pasifFirmalarinBelgeleriniIsle() {
  const Firma = require('../../models/Firma');
  const pasifler = await Firma.find({ aktif: false }).distinct('_id');
  return belgeleriPasifeAl(pasifler);
}

/**
 * Belgenin durumu elle (durum menüsü / form) değiştirildiğinde çağrılır: başka bir duruma
 * alındıysa geri dönüş hedefi silinir — firma aktif yapılınca kullanıcının seçimi ezilmesin.
 * `firmaPasif` işareti kalır (açılış göçü belgeyi yeniden pasife almasın).
 */
function elleSecimiIsle(durumBilgileri) {
  if (durumBilgileri && durumBilgileri.genelDurum !== PASIF_DURUM) {
    durumBilgileri.pasifOncesiDurum = undefined;
  }
}

/** Firma güncellemesinde aktiflik değiştiyse belgeleri izler. */
async function firmaAktiflikDegisti(eskiAktif, yeniAktif, firmaId) {
  const onceAktif = eskiAktif !== false;
  const simdiAktif = yeniAktif !== false;
  if (onceAktif && !simdiAktif) return { yon: 'pasif', ...(await belgeleriPasifeAl([firmaId])) };
  if (!onceAktif && simdiAktif) return { yon: 'aktif', ...(await belgeleriGeriAl([firmaId])) };
  return null;
}

/** Firma güncelleme yanıtına eklenecek kısa açıklama */
function sonucMetni(sonuc) {
  if (!sonuc) return '';
  if (sonuc.yon === 'pasif') return sonuc.pasifeAlinan ? `${sonuc.pasifeAlinan} belge "Pasife Alındı" yapıldı` : '';
  if (sonuc.yon === 'aktif') return sonuc.geriAlinan ? `${sonuc.geriAlinan} belge önceki durumuna döndü` : '';
  return '';
}

module.exports = {
  pasifePlan,
  geriAlmaPlani,
  belgeleriPasifeAl,
  belgeleriGeriAl,
  pasifFirmalarinBelgeleriniIsle,
  elleSecimiIsle,
  firmaAktiflikDegisti,
  sonucMetni
};
