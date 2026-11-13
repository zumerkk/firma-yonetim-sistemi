const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const { HARCAMA_KATEGORILERI } = require('../../constants/harcama');
const { kalemeEvrakYukle, istekIdDogrula } = require('./faturaEvrakService');
const { faturaEvrakDepolariniSil } = require('./machineProcessService');
const evrakDeposu = require('./faturaEvrakDeposu');
const resolver = require('./certificateResolver');

const hata = (status, message) => Object.assign(new Error(message), { status });
const kalemYok = () => hata(404, 'Harcama kalemi bulunamadı.');
const evrakYok = () => hata(404, 'Harcama evrakı bulunamadı.');
const OZEL_EVRAK_ALANLARI = '+evraklar.depo +evraklar.istekId +evraklar.istekOzeti';
const KALEM_ALANLARI = ['kategori', 'altKategori', 'tarih', 'no', 'icerik', 'tutar', 'adet'];

async function belgeFiltresi({ tesvikModel, tesvikId }) {
  if (!['Tesvik', 'YeniTesvik'].includes(tesvikModel)) throw hata(400, 'Geçersiz teşvik belge türü.');
  if (!mongoose.isObjectIdOrHexString(tesvikId) || !await resolver.modelFor(tesvikModel).exists({ _id: tesvikId })) {
    throw hata(404, 'Teşvik belgesi bulunamadı.');
  }
  return { tesvikModel, tesvikId };
}

function kalemFiltresi(belge, kalemId) {
  if (!mongoose.isObjectIdOrHexString(kalemId)) throw kalemYok();
  return { ...belge, _id: kalemId };
}

function metin(deger, etiket, uzunluk) {
  if (typeof deger !== 'string' || deger.trim().length > uzunluk) {
    throw hata(400, `${etiket} en fazla ${uzunluk} karakter olabilir.`);
  }
  return deger.trim();
}

function tarihOku(deger) {
  const iso = deger instanceof Date ? deger.toISOString().slice(0, 10) : deger;
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw hata(400, 'Fatura tarihini girin.');
  const tarih = new Date(iso);
  if (!Number.isFinite(tarih.getTime()) || tarih.toISOString().slice(0, 10) !== iso) throw hata(400, 'Fatura tarihi geçersiz.');
  return tarih;
}

function sayiOku(deger, desen, mesaj) {
  if (!['number', 'string'].includes(typeof deger) || !desen.test(String(deger).trim())) throw hata(400, mesaj);
  const sayi = Number(deger);
  if (!Number.isFinite(sayi)) throw hata(400, mesaj);
  return sayi;
}

function kalemVerisi(govde, mevcut = {}) {
  const alan = (ad) => Object.hasOwn(govde, ad) ? govde[ad] : mevcut[ad];
  const kategori = alan('kategori');
  const altKategori = alan('altKategori');
  if (typeof kategori !== 'string' || !Object.hasOwn(HARCAMA_KATEGORILERI, kategori)
      || !HARCAMA_KATEGORILERI[kategori].altKategoriler.some(({ id }) => id === altKategori)) {
    throw hata(400, 'Bu harcama grubu için bir gider türü seçin.');
  }
  const tarih = tarihOku(alan('tarih'));
  const no = metin(alan('no') ?? '', 'Fatura sayısı', 100);
  if (!no) throw hata(400, 'Fatura sayısını girin.');
  const icerik = metin(alan('icerik') ?? '', 'Kalem içeriği', 500);
  const tutarHatasi = 'TL tutarını sıfırdan büyük ve en fazla iki ondalık hane ile girin.';
  const tutar = sayiOku(alan('tutar'), /^\d{1,13}(?:\.\d{1,2})?$/, tutarHatasi);
  if (tutar <= 0) throw hata(400, tutarHatasi);
  const adet = sayiOku(alan('adet') ?? 0, /^\d{1,13}(?:\.\d+)?$/, 'Adet sıfır veya pozitif bir sayı olmalıdır.');
  return { kategori, altKategori, tarih, no, icerik, tutar, adet };
}

function listele(belge) {
  return HarcamaKalemi.find(belge).sort({ createdAt: 1, _id: 1 });
}

async function ekle(belge, govde, user) {
  const veri = kalemVerisi(govde);
  const { istekId } = govde;
  istekIdDogrula(istekId);
  const sahip = { olusturanKullanici: user._id };
  const yeniKalem = { ...belge, ...veri, ...sahip, girenAdi: (user.adSoyad || '').slice(0, 120) };
  if (!istekId) return HarcamaKalemi.create(yeniKalem);

  const istekOzeti = createHash('sha256').update(JSON.stringify(veri)).digest('hex');
  const filtre = { ...belge, ...sahip, istekId };
  await HarcamaKalemi.init();
  try {
    return await HarcamaKalemi.create({ ...yeniKalem, istekId, istekOzeti });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const mevcut = await HarcamaKalemi.findOne(filtre).select('+istekOzeti');
    if (!mevcut || mevcut.istekOzeti !== istekOzeti) throw hata(409, 'Bu kayıt kimliği farklı bir harcama için kullanılmış.');
    return mevcut;
  }
}

async function guncelle(filtre, govde, user) {
  if (!KALEM_ALANLARI.some((ad) => Object.hasOwn(govde, ad))) throw hata(400, 'Güncellenecek bir kalem bilgisi girin.');
  const mevcut = await HarcamaKalemi.findOne(filtre).select([...KALEM_ALANLARI, '__v'].join(' '));
  if (!mevcut) throw kalemYok();
  const veri = kalemVerisi(govde, mevcut);
  const kalem = await HarcamaKalemi.findOneAndUpdate({ ...filtre, __v: mevcut.__v }, {
    $set: { ...veri, sonGuncelleyen: user._id }, $inc: { __v: 1 }
  }, { new: true, runValidators: true });
  if (!kalem) throw hata(409, 'Harcama kalemi değişti. Sayfayı yenileyip tekrar deneyin.');
  return kalem;
}

async function sil(filtre) {
  const kalem = await HarcamaKalemi.findOneAndDelete(filtre).select('+evraklar.depo');
  if (!kalem) throw kalemYok();
  await faturaEvrakDepolariniSil(kalem.evraklar.map((e) => e.depo).filter(Boolean));
  return { _id: kalem._id };
}

async function evrakBaglami(filtre) {
  const kalem = await HarcamaKalemi.findOne(filtre).select(OZEL_EVRAK_ALANLARI);
  if (!kalem) throw kalemYok();
  return { listType: 'local', kalem };
}

async function evrakYukle(filtre, { istekId, dosyalar, user }) {
  const ekleriKaydet = async (_baglam, evraklar) => {
    const kalem = await HarcamaKalemi.findOneAndUpdate({
      ...filtre, ...(istekId ? { 'evraklar.istekId': { $ne: istekId } } : {})
    }, {
      $push: { evraklar: { $each: evraklar } }, $set: { sonGuncelleyen: user._id }
    }, { new: true, runValidators: true });
    return kalem && { listType: 'local', kalem };
  };
  const kaydiTekrarOku = async () => {
    const kalem = await HarcamaKalemi.findOne(filtre);
    return kalem && { listType: 'local', kalem };
  };
  const { kalem } = await kalemeEvrakYukle({ baglamiYukle: () => evrakBaglami(filtre), ekleriKaydet, kaydiTekrarOku, istekId, dosyalar });
  return kalem;
}

async function evrakIndir(filtre, evrakId) {
  if (!mongoose.isObjectIdOrHexString(evrakId)) throw evrakYok();
  const kalem = await HarcamaKalemi.findOne({ ...filtre, 'evraklar._id': evrakId }).select('+evraklar.depo');
  const evrak = kalem?.evraklar.id(evrakId);
  if (!evrak?.depo) throw evrakYok();
  return { evrak, buffer: await evrakDeposu.oku(evrak.depo) };
}

module.exports = { belgeFiltresi, kalemFiltresi, listele, ekle, guncelle, sil, evrakBaglami, evrakYukle, evrakIndir };
