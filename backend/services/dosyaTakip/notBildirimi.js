// 🔔 Belge Takip not bildirimi — sistem bildirimi metni ve ana sayfa satırı
//
// Talepte not yazılırken seçilen personele hem e-posta hem sistem bildirimi gider
// (dosyaTakipController.notEkle). Müşteri (07.10.2026): "Belge takip için bildirim gönderince
// maile gidiyor ya aynı şekilde Dashboard'ına da düşme şansı var mı acaba?" → ana sayfadaki
// "Benim İşlerim"e "Bana Gelen Notlar" sütunu; kaynak aynı bildirim kayıtları (30 gün tutulur).
// Başlık ve mesaj biçimi burada tek yerde: ana sayfa satırı bu biçimi geri çözer.

const NOT_BASLIGI = 'Talep Notu';
const AYRAC = ' · ';

const notBildirimiBasligi = (firmaAdi) => `${NOT_BASLIGI} — ${firmaAdi}`.slice(0, 100);

const notBildirimiMesaji = ({ firmaAdi, tarihStr, gonderen, metin }) => {
  const kisaNot = String(metin).length > 260 ? `${String(metin).slice(0, 257)}...` : String(metin);
  return `${firmaAdi}${AYRAC}${tarihStr}${AYRAC}${gonderen}\n${kisaNot}`.slice(0, 500);
};

// Ana sayfa sorgusu: yalnız not bildirimleri (firma yüklemesi kendi sütununda zaten var)
const notBildirimiSorgusu = (kullaniciId) => ({ userId: kullaniciId, title: { $regex: `^${NOT_BASLIGI} ` } });

/** Bildirim kaydını ana sayfa satırına çevirir */
function notBildirimiSatiri(b) {
  const mesaj = String(b?.message || '');
  const satirSonu = mesaj.indexOf('\n');
  const ilkSatir = satirSonu >= 0 ? mesaj.slice(0, satirSonu) : mesaj;
  const parcalar = ilkSatir.split(AYRAC);
  const baslikFirma = String(b?.title || '').replace(new RegExp(`^${NOT_BASLIGI} — `), '');
  const url = b?.actionButton?.url || '';
  const talep = /^\/dosya-takip\/([0-9a-fA-F]{24})$/.exec(url);
  return {
    _id: b?._id,
    talepId: talep ? talep[1] : null,
    firmaUnvan: parcalar.length >= 3 ? parcalar.slice(0, -2).join(AYRAC) : baslikFirma,
    gonderen: parcalar.length >= 3 ? parcalar[parcalar.length - 1] : '',
    not: satirSonu >= 0 ? mesaj.slice(satirSonu + 1) : '',
    tarih: b?.createdAt || null,
    okundu: !!b?.isRead
  };
}

module.exports = { NOT_BASLIGI, notBildirimiBasligi, notBildirimiMesaji, notBildirimiSorgusu, notBildirimiSatiri };
