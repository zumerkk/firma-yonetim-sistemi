const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');
const MachineProcess = require('../../models/MachineProcess');
const { EVRAK_ALANLARI, EVRAK_BOYUTU, EVRAK_SAYISI } = require('../../constants/faturaEvrak');
const { dosyaAdiDuzelt } = require('../../utils/dosyaAdiKodlama');
const mps = require('./machineProcessService');
const resolver = require('./certificateResolver');
const faturaEvrakDeposu = require('./faturaEvrakDeposu');

function hata(message, code, status) {
  return Object.assign(new Error(message), { code, status });
}

async function personelFaturaEvrakBaglami(surecId, kalemId) {
  const bulunamadi = () => hata('Fatura veya beyanname kalemi bulunamadı.', 'FATURA_YOK', 404);
  if (![surecId, kalemId].every((id) => mongoose.isObjectIdOrHexString(id))) throw bulunamadi();
  const proc = await MachineProcess.findOne({
    _id: surecId, listType: { $in: Object.keys(EVRAK_ALANLARI) }, 'faturalar._id': kalemId
  })
    .select(mps.FATURA_EVRAK_OZEL_ALANLARI);
  if (!proc) throw bulunamadi();
  const belge = await resolver.modelFor(proc.tesvikModel).findById(proc.tesvikId)
    .select('makineListeleri.yerli.rowId makineListeleri.ithal.rowId').lean();
  if (!resolver.findMachineRow(belge, proc.listType, proc.rowId)) throw bulunamadi();
  return { proc, kalem: proc.faturalar.id(kalemId) };
}

function xmlBaslangici(buffer) {
  const ilkBaytlar = buffer.subarray(0, 4096);
  let kodlama = 'utf-8';
  if ((ilkBaytlar[0] === 0xff && ilkBaytlar[1] === 0xfe) || (ilkBaytlar[0] === 0x3c && ilkBaytlar[1] === 0)) kodlama = 'utf-16le';
  if ((ilkBaytlar[0] === 0xfe && ilkBaytlar[1] === 0xff) || (ilkBaytlar[0] === 0 && ilkBaytlar[1] === 0x3c)) kodlama = 'utf-16be';
  const baslangic = new TextDecoder(kodlama).decode(ilkBaytlar)
    .replace(/^(?:\s|<\?[a-z_:][\w.:-]*(?:\s[\s\S]*?)?\?>|<!--[\s\S]*?-->)+/i, '');
  // İmza kontrolü: XML ayrıştırılmaz ve dış varlıklar çözümlenmez.
  return /^<[\p{L}_][\p{L}\p{N}_.:-]*(?:[\s/>])/u.test(baslangic)
    && !/^<(?:html|head|body|script)(?=[\s/>])/i.test(baslangic);
}

function faturaEvrakDosyasi(dosya, ayarlar) {
  const ad = path.posix.basename(dosyaAdiDuzelt(dosya.originalname).replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const uzanti = path.extname(ad);
  const { buffer } = dosya;
  const mime = String(dosya.mimetype || '').toLowerCase();
  const pdf = ayarlar.uzanti === '.pdf';
  const mimeUygun = mime === ayarlar.mimeType || mime === 'application/octet-stream'
    || (!pdf && (mime === 'text/xml' || /^application\/[a-z0-9.+-]+\+xml$/.test(mime)));
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > EVRAK_BOYUTU) {
    throw hata('Fatura eki boş olamaz ve 10 MB sınırını aşamaz.', 'FATURA_EVRAK_BOYUTU', 400);
  }
  const imzaUygun = pdf ? /^%PDF-[12]\.\d/.test(buffer.subarray(0, 8).toString('ascii')) : xmlBaslangici(buffer);
  if (uzanti.toLowerCase() !== ayarlar.uzanti || !mimeUygun || !imzaUygun) {
    throw hata(`Geçerli bir ${pdf ? 'PDF' : 'XML'} dosyası seçin${ad ? ` (${ad})` : ''}.`, 'FATURA_EVRAK_TURU', 400);
  }
  return {
    _id: new mongoose.Types.ObjectId(), tur: ayarlar.tur, mimeType: ayarlar.mimeType,
    dosyaAdi: `${ad.slice(0, -uzanti.length).slice(0, 180 - uzanti.length)}${uzanti}`,
    fileSize: buffer.length, yuklemeTarihi: new Date(), buffer
  };
}

const dosyaOzeti = (ekler) => crypto.createHash('sha256').update(JSON.stringify(ekler.map((e) => [
  e.tur, e.dosyaAdi, crypto.createHash('sha256').update(e.buffer).digest('hex')
]).sort())).digest('hex');

function tekrarEvrakIstegi(kalem, istekId, istekOzeti) {
  const kayitli = istekId && kalem.evraklar.find((e) => e.istekId === istekId);
  if (kayitli && kayitli.istekOzeti !== istekOzeti) {
    throw hata('Bu yükleme kimliği farklı dosyalarla kullanılmış. Dosyaları yeniden seçin.', 'FATURA_EVRAK_ISTEK_CAKISMA', 409);
  }
  return Boolean(kayitli);
}

async function evrakYukle({ baglamiYukle, kalemId, kaynak, istekId, dosyalar = {} }) {
  if (istekId !== undefined && (typeof istekId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(istekId))) {
    throw hata('Geçersiz yükleme kimliği.', 'BAD_REQUEST_ID', 400);
  }
  let baglam = await baglamiYukle();
  const { listType } = baglam.proc;
  const alanlar = EVRAK_ALANLARI[listType];
  if (!alanlar || Object.keys(dosyalar).some((alan) => !Object.hasOwn(alanlar, alan))) {
    throw hata('Bu makine listesi için dosya alanları geçersiz.', 'FATURA_EVRAK_TURU', 400);
  }
  const ekler = Object.entries(alanlar).flatMap(([alan, ayarlar]) =>
    (dosyalar[alan] || []).map((dosya) => faturaEvrakDosyasi(dosya, ayarlar)));
  if (!ekler.length || ekler.length > EVRAK_SAYISI) {
    throw hata(`Bir seferde 1–${EVRAK_SAYISI} dosya seçin.`, 'FATURA_EVRAK_ADEDI', 400);
  }
  const istekOzeti = istekId ? dosyaOzeti(ekler) : undefined;
  if (tekrarEvrakIstegi(baglam.kalem, istekId, istekOzeti)) return baglam;

  const evraklar = [];
  let temizle = true;
  try {
    for (const { buffer, ...ek } of ekler) {
      const depo = await faturaEvrakDeposu.kaydet({ buffer, dosyaAdi: ek.dosyaAdi, mimeType: ek.mimeType });
      evraklar.push({ ...ek, depo, ...(istekId ? { istekId, istekOzeti } : {}) });
    }
    baglam = await baglamiYukle();
    if (baglam.proc.listType !== listType) throw hata('Makine listesi değişti. Sayfayı yenileyip tekrar deneyin.', 'FATURA_CAKISMA', 409);
    if (tekrarEvrakIstegi(baglam.kalem, istekId, istekOzeti)) return baglam;

    const proc = baglam.proc;
    let kaydedilen;
    try {
      kaydedilen = await mps.faturaEvraklariniEkle({
        surecId: proc._id, tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, rowId: proc.rowId,
        listType: proc.listType, kalemId, kaynak, evraklar, istekId
      });
    } catch (error) {
      // Yazımın yanıtı kaybolduysa gerçekten kaydedilen dosyaların depo kopyasına dokunma.
      const sonuc = await MachineProcess.findById(proc._id).catch(() => undefined);
      if (sonuc === undefined) temizle = false;
      const mevcut = sonuc?.faturalar.id(kalemId)?.evraklar;
      if (!mevcut || !evraklar.every((ek) => mevcut.id(ek._id))) throw error;
      kaydedilen = sonuc;
    }
    if (kaydedilen) {
      temizle = false;
      return { ...baglam, proc: kaydedilen, kalem: kaydedilen.faturalar.id(kalemId) };
    }
    baglam = await baglamiYukle();
    if (tekrarEvrakIstegi(baglam.kalem, istekId, istekOzeti)) return baglam;
    throw hata('Fatura kalemi değişti. Sayfayı yenileyip tekrar deneyin.', 'FATURA_CAKISMA', 409);
  } finally {
    if (temizle) await mps.faturaEvrakDepolariniSil(evraklar.map((e) => e.depo));
  }
}

module.exports = { evrakYukle, personelFaturaEvrakBaglami };
