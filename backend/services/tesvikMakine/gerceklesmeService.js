const MachineProcess = require('../../models/MachineProcess');
const HarcamaKalemi = require('../../models/HarcamaKalemi');
const { HARCAMA_KATEGORILERI } = require('../../constants/harcama');
const resolver = require('./certificateResolver');
const mps = require('./machineProcessService');

const HARCAMA_GRUPLARI = [
  {
    id: 'arazi', baslik: 'Arazi-Arsa Bedeli Gerçekleşme Bilgisi', toplamEtiketi: 'Toplam Arazi-Arsa Gerçekleşmesi',
    satirlar: [['arazi', 'Arazi-Arsa Gerçekleşmesi'], ['faizKarPayi'], ['maddiOlmayanVarlik']]
  },
  {
    id: 'bina', baslik: 'Bina-İnşaat Giderleri Gerçekleşme Bilgisi', toplamEtiketi: 'Toplam Bina Gerçekleşmesi',
    satirlar: [['anaBina'], ['yardimciIsletmeler'], ['idareBinalari'], ['yerAltiGalerileri', 'Yeraltı Ana Galerileri'], ['faizKarPayi'], ['maddiOlmayanVarlik']]
  },
  {
    id: 'diger', baslik: 'Diğer Gerçekleşme Bilgisi', toplamEtiketi: 'Toplam Diğer Yatırım Giderleri',
    satirlar: [
      ['yardimciMakine'], ['ithalatGumrukleme'], ['tasimaSigorta'], ['montaj'], ['etutProje'], ['diger'],
      ['harcamaBelgesi', 'Harcama Belgesi Giderleri'], ['faizKarPayi'], ['maddiOlmayanVarlik']
    ]
  }
];

const MAKINE_GRUPLARI = [
  { listType: 'local', id: 'yerli', etiket: 'Yerli Liste', kategori: 'Fatura' },
  { listType: 'import', id: 'ithal', etiket: 'İthal Liste', kategori: 'Beyanname' }
];

const kurusaCevir = mps.tutariKurusaCevir;

function makineKalemleriniHesapla(belge, surecler, kalemler) {
  const surecHaritasi = new Map(surecler.map((surec) => [`${surec.listType}:${surec.rowId}`, surec]));
  const makineToplamlari = { yerli: 0, ithal: 0 };
  let cevrilmemisIthalKalemSayisi = 0;

  for (const { listType, id, etiket, kategori } of MAKINE_GRUPLARI) {
    for (const makine of resolver.listFor(belge, listType)) {
      if (!makine || makine.silinmeTarihi) continue;
      const surec = surecHaritasi.get(`${listType}:${makine.rowId}`);
      const paraBirimiBaglami = surec || { listType };
      const faturalar = surec ? mps.faturaKalemleriniOku(surec) : [];
      if (!faturalar.length && !surec?.faturaKalemleriKaydedildi && kurusaCevir(makine.gerceklesenTutar)) {
        faturalar.push({ tutar: makine.gerceklesenTutar, tutarParaBirimi: 'TRY', adet: makine.gerceklesenAdet });
      }
      for (const fatura of faturalar) {
        const paraBirimi = mps.faturaKalemiParaBirimi(fatura, paraBirimiBaglami);
        const tutarTl = mps.faturaKalemiTlTutari(fatura, paraBirimi);
        if (tutarTl == null && kurusaCevir(fatura.tutar)) {
          cevrilmemisIthalKalemSayisi += 1;
        }
        const kurus = kurusaCevir(tutarTl);
        if (!kurus) continue;
        makineToplamlari[id] += kurus;
        kalemler.push({
          grup: etiket, kategori, tarih: fatura.tarih || null, no: fatura.no || '',
          icerik: [makine.adiVeOzelligi, fatura.icerik].filter(Boolean).join(' · '), adet: fatura.adet ?? null, tutar: kurus / 100
        });
      }
    }
  }
  return { makineToplamlari, cevrilmemisIthalKalemSayisi };
}

function gerceklesmeyiHesapla(belge, surecler, harcamalar) {
  const kalemler = [];
  const { makineToplamlari: { yerli, ithal }, cevrilmemisIthalKalemSayisi } = makineKalemleriniHesapla(belge, surecler, kalemler);
  const harcamaToplamlari = new Map();
  let kurFarki = 0;

  for (const harcama of harcamalar) {
    const grup = HARCAMA_KATEGORILERI[harcama.kategori];
    const kategori = grup?.altKategoriler?.find(({ id }) => id === harcama.altKategori);
    const kurus = kurusaCevir(harcama.tutar);
    if (!kategori || !kurus) continue;
    if (kategori.id === 'kurFarki') {
      kurFarki += kurus;
    } else {
      const anahtar = `${harcama.kategori}:${kategori.id}`;
      harcamaToplamlari.set(anahtar, (harcamaToplamlari.get(anahtar) || 0) + kurus);
    }
    kalemler.push({
      grup: grup.etiket, kategori: kategori.etiket, tarih: harcama.tarih || null, no: harcama.no || '',
      icerik: harcama.icerik || '', adet: harcama.adet ?? null, tutar: kurus / 100
    });
  }

  let toplam = yerli + ithal + kurFarki;
  const gruplar = HARCAMA_GRUPLARI.map(({ id, baslik, toplamEtiketi, satirlar }) => {
    const altKategoriler = HARCAMA_KATEGORILERI[id].altKategoriler;
    let grupToplami = 0;
    const giderler = satirlar.map(([altId, etiket]) => {
      const kurus = harcamaToplamlari.get(`${id}:${altId}`) || 0;
      grupToplami += kurus;
      return { id: altId, etiket: etiket || altKategoriler.find((kategori) => kategori.id === altId).etiket, tutar: kurus / 100 };
    });
    toplam += grupToplami;
    return { id, baslik, toplamEtiketi, satirlar: giderler, toplam: grupToplami / 100 };
  });

  return { gruplar, kalemler, yerli: yerli / 100, ithal: ithal / 100, kurFarki: kurFarki / 100, toplam: toplam / 100, cevrilmemisIthalKalemSayisi };
}

async function belgeGerceklesmesi(tesvikModel, tesvikId) {
  const Model = resolver.modelFor(tesvikModel);
  const makineAlanlari = ['yerli', 'ithal'].flatMap((liste) =>
    ['rowId', 'adiVeOzelligi', 'gerceklesenTutar', 'gerceklesenAdet', 'silinmeTarihi'].map((alan) => `makineListeleri.${liste}.${alan}`));
  const belge = await Model.findById(tesvikId).select(makineAlanlari.join(' ')).lean();
  if (!belge) throw Object.assign(new Error('Teşvik belgesi bulunamadı.'), { code: 'CERT_NOT_FOUND' });
  const kapsam = { tesvikModel, tesvikId: belge._id };
  const [surecler, harcamalar] = await Promise.all([
    MachineProcess.find(kapsam).select([
      'rowId listType currency faturaKalemleriKaydedildi invoiceRealizedValue invoiceRealizedQty invoiceNo invoiceDate',
      'faturalar.tarih faturalar.no faturalar.icerik faturalar.tutar faturalar.tutarParaBirimi faturalar.malBedeliTl faturalar.adet faturalar.kaynak'
    ].join(' ')).lean(),
    HarcamaKalemi.find(kapsam).select('kategori altKategori tarih no icerik adet tutar').sort({ createdAt: 1, _id: 1 }).lean()
  ]);
  return gerceklesmeyiHesapla(belge, surecler, harcamalar);
}

module.exports = { belgeGerceklesmesi };
