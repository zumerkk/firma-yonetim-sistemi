// 📑 Teşvik belgesi (eski + yeni) genel durumları — TEK KAYNAK
//
// Eskiden liste model enum'larında, doğrulamada, iki denetleyicide ve Excel çıktısında ayrı ayrı
// yazılıydı; "kapandı" eklenirken Excel etiketleri unutulmuştu. Yeni durum buraya eklenir, önyüzün
// eşi frontend/src/utils/belgeDurum.js (sıra ve değerler birebir aynı olmalı — test korur).
//
// Müşteri (07.10.2026): "Bu kısma Kapama Talepli ve Pasife alındı ekleyebilir miyiz?" +
// "Firma pasif ise belgesi (varsa) o da pasife alındı olsun ve bundan sonra pasife alınan
// firmaların da belgeleri otomatik olarak pasife alınsın." (bkz. services/tesvik/firmaPasifBelgeleri.js)

// renk: şemadaki durumRengi enum'u (yesil/sari/kirmizi/mavi/turuncu/gri) · hex: ekrandaki renk
const BELGE_DURUMLARI = [
  { value: 'taslak', label: 'Taslak', renk: 'gri', hex: '#6B7280' },
  { value: 'hazirlaniyor', label: 'Hazırlanıyor', renk: 'sari', hex: '#F59E0B' },
  { value: 'başvuru_yapildi', label: 'Başvuru Yapıldı', renk: 'mavi', hex: '#3B82F6' },
  { value: 'inceleniyor', label: 'İnceleniyor', renk: 'turuncu', hex: '#F97316' },
  { value: 'ek_belge_istendi', label: 'Ek Belge İstendi', renk: 'sari', hex: '#F59E0B' },
  { value: 'revize_talep_edildi', label: 'Revize Talep Edildi', renk: 'kirmizi', hex: '#EF4444' },
  { value: 'onay_bekliyor', label: 'Onay Bekliyor', renk: 'turuncu', hex: '#F97316' },
  { value: 'onaylandi', label: 'Onaylandı', renk: 'yesil', hex: '#10B981' },
  { value: 'reddedildi', label: 'Reddedildi', renk: 'kirmizi', hex: '#EF4444' },
  { value: 'iptal_edildi', label: 'İptal Edildi', renk: 'gri', hex: '#6B7280' },
  { value: 'kapama_talepli', label: 'Kapama Talepli', renk: 'mavi', hex: '#7C3AED' },
  { value: 'kapandi', label: 'Kapandı', renk: 'gri', hex: '#6B7280' },
  { value: 'pasife_alindi', label: 'Pasife Alındı', renk: 'gri', hex: '#94A3B8' }
];

const BELGE_DURUM_DEGERLERI = BELGE_DURUMLARI.map((d) => d.value);
const PASIF_DURUM = 'pasife_alindi';

const durumRengi = (deger) => BELGE_DURUMLARI.find((d) => d.value === deger)?.renk || 'gri';
const durumEtiketi = (deger) => BELGE_DURUMLARI.find((d) => d.value === deger)?.label || deger || '';

// Revizyon geçmişinden durum türetme bunları ASLA ezmez: kullanıcının bilinçli seçimidir ve
// revizyon metninden türetilemez (bkz. autoSyncDurumFromRevisions).
const OTO_SENKRON_DISI_DURUMLAR = ['kapama_talepli', 'kapandi', 'iptal_edildi', PASIF_DURUM];

// "Tümü" kapsamlı toplu durum değişikliğinde dokunulmayanlar
const TOPLU_KORUNAN_DURUMLAR = ['kapama_talepli', 'kapandi', 'iptal_edildi', PASIF_DURUM];

// Firma pasife alınınca belge bu durumlardaysa olduğu gibi kalır: sonuçlanmış belgedir,
// "Kapandı"yı "Pasife Alındı" yapmak kapanış bilgisini siler.
const PASIFE_ALINMAYAN_DURUMLAR = ['kapandi', 'iptal_edildi', 'reddedildi', PASIF_DURUM];

// Ekipman takip listesi varsayılan olarak bunları göstermez (kapanan ve pasif belgeler)
const EKIPMAN_TAKIP_GIZLI_DURUMLAR = ['kapandi', PASIF_DURUM];

// 🗄️ Teşvik listesi arşivi — müşteri (09.10.2026): "Belge takipdeki Arşiv gibi Kapalı belgeler için de bir
// arşiv kısmı yapabilir miyiz Teşvik belgesinde?" Kapanan belgeler ana listeden çıkar, "Arşiv"te görünür.
const ARSIV_DURUMLARI = ['kapandi'];

/**
 * Liste sorgusunun durum koşulu. Durum süzgecinden açıkça seçilen durum her zaman kazanır (Belge Takip'te
 * aşama seçimi gibi). `arsiv` yalnız açıkça gelirse uygulanır: '1' → yalnız arşiv, '0' → arşiv hariç.
 * Parametresiz çağıranlar (başka ekranlardaki belge seçicileri) eskisi gibi bütün belgeleri alır.
 */
function listeDurumKosulu({ durum, arsiv } = {}) {
  if (durum) return { 'durumBilgileri.genelDurum': durum };
  const a = String(arsiv ?? '');
  if (a === '1' || a === 'true') return { 'durumBilgileri.genelDurum': { $in: ARSIV_DURUMLARI } };
  if (a === '0' || a === 'false') return { 'durumBilgileri.genelDurum': { $nin: ARSIV_DURUMLARI } };
  return {};
}

module.exports = {
  BELGE_DURUMLARI,
  BELGE_DURUM_DEGERLERI,
  PASIF_DURUM,
  durumRengi,
  durumEtiketi,
  OTO_SENKRON_DISI_DURUMLAR,
  TOPLU_KORUNAN_DURUMLAR,
  PASIFE_ALINMAYAN_DURUMLAR,
  EKIPMAN_TAKIP_GIZLI_DURUMLAR,
  ARSIV_DURUMLARI,
  listeDurumKosulu
};
