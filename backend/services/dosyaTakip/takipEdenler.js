// 👥 Belge Takip — "Takibi Yapan" birden fazla kişi olabilir.
//
// Müşteri (13.10.2026): "Belgede takibi yapan kısmına birden fazla kişi atayabilelim."
// muraacatSonrasi.takibiYapanPersonel BİRİNCİL kişi olarak kalır (sıralama, eski kayıtlar, Excel'in ilk
// adı); diğerleri muraacatSonrasi.ekTakipEdenler'de. "Takibi bende", evrak/not bildirimleri ve kişi
// süzgeci hepsini birlikte sayar — tek kaynak bu dosya.

const kimlik = (v) => (v ? String(v._id || v) : '');

/** Talebi takip eden herkes (birincil önce), tekil kimlik metinleri */
function takipEdenIdleri(talep) {
  const ms = (talep && talep.muraacatSonrasi) || {};
  return [...new Set([ms.takibiYapanPersonel, ...(ms.ekTakipEdenler || [])].map(kimlik).filter(Boolean))];
}

/** Kullanıcının takip ettiği talepler (birincil ya da ek) için Mongo koşulu */
function takipEdenKosulu(kullaniciId) {
  return { $or: [{ 'muraacatSonrasi.takibiYapanPersonel': kullaniciId }, { 'muraacatSonrasi.ekTakipEdenler': kullaniciId }] };
}

/** Populate edilmiş talepten görünen adlar (birincil önce) */
function takipEdenAdlari(talep) {
  const ms = (talep && talep.muraacatSonrasi) || {};
  const birincil = (ms.takibiYapanPersonel && ms.takibiYapanPersonel.adSoyad) || ms.takibiYapanAdi || '';
  const ekler = (ms.ekTakipEdenler || []).map((k) => (k && k.adSoyad) || '').filter(Boolean);
  return [...new Set([birincil, ...ekler].filter(Boolean))];
}

/** Kaydetmeden önce: ek listeden birincili ve tekrarları çıkar */
function ekListesiniDuzelt(talep) {
  const ms = talep && talep.muraacatSonrasi;
  if (!ms) return;
  const birincil = kimlik(ms.takibiYapanPersonel);
  const gorulen = new Set(birincil ? [birincil] : []);
  const temiz = (ms.ekTakipEdenler || []).filter((k) => {
    const id = kimlik(k);
    if (!id || gorulen.has(id)) return false;
    gorulen.add(id);
    return true;
  });
  if (temiz.length !== (ms.ekTakipEdenler || []).length) ms.ekTakipEdenler = temiz;
}

module.exports = { takipEdenIdleri, takipEdenKosulu, takipEdenAdlari, ekListesiniDuzelt };
