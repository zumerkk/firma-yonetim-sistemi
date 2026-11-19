// 🔗 MÜŞTERİ BELGE SAYFASI — /belge/:token (AUTH YOK)
//
// Müşteri (13.10.2026): firma kendi teşvik belgesini görür (belge ekranındaki sekmeler — evrak listesi
// hariç), gerçekleşen yerli/ithal ve diğer harcamalarda kalemleri ve evraklarını yönetir.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, Table, TableHead, TableBody, TableRow, TableCell, Chip, Stack, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api, { uploadPost } from '../../utils/axios';
import svc from '../../services/tesvikMakineService';
import { birimEtiketi } from '../../utils/makineFormat';
import { isoGun, tarihYaz } from '../../utils/cariFormat';
import { saveBlobResponse } from '../TesvikMakine/helpers';
import { renk, SekmeSeridi, VeriTablosu } from '../../tasarim';
import { KunyePaneli, FinansalPaneli } from '../../components/Tesvik/BelgeBilgiPanelleri';
import { YatirimCinsiTablosu, UrunTablosu, OzelSartTablosu, DestekUnsuruTablosu } from '../../components/Tesvik/BelgeSekmeTablolari';
import BelgeMakineListesi from '../../components/Tesvik/BelgeMakineListesi';
import TutarAlani from '../../components/common/TutarAlani';
import KalemEvrakPaneli from '../../components/Tesvik/KalemEvrakPaneli';
import { HARCAMA_SEKMELERI, GERCEKLESME_SEKMESI } from '../../components/Tesvik/harcamaSekmeleri';
import Harcamalar from '../TesvikMakine/Harcamalar';
import GerceklesmeOzeti from '../TesvikMakine/GerceklesmeOzeti';

// Belge bilgileri önde, gerçekleşen harcamalar ayrı sekmelerde. İç sekmeler firmaya açılmaz.
const BOLUMLER = [
  { anahtar: 'kunye', baslik: 'Belge Künye Bilgileri' },
  { anahtar: 'cins', baslik: 'Yatırım Cinsi' },
  { anahtar: 'urun', baslik: 'Ürün Bilgileri' },
  { anahtar: 'yerli', baslik: 'Onaylı Yerli Liste' },
  { anahtar: 'ithal', baslik: 'Onaylı İthal Liste' },
  { anahtar: 'finansal', baslik: 'Finansal Bilgiler' },
  { anahtar: 'sart', baslik: 'Özel Şartlar' },
  { anahtar: 'destek', baslik: 'Destek Unsurları' },
  { anahtar: 'gerceklesenYerli', baslik: 'Gerçekleşen Yerli Liste' },
  { anahtar: 'gerceklesenIthal', baslik: 'Gerçekleşen İthal Liste' },
  ...HARCAMA_SEKMELERI,
  GERCEKLESME_SEKMESI
];

const para = (v, kod = 'TRY') => {
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: kod, maximumFractionDigits: 2 }).format(Number(v) || 0); }
  catch (_) { return `${(Number(v) || 0).toLocaleString('tr-TR')} ${kod}`; }
};
const tarih = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '-');
const miktarMetni = (m) => `${m.miktar || 0} ${birimEtiketi(m.birim, m.birimAciklamasi)}`.trimEnd();
const kalemToplamMetni = (m) => {
  const { TRY, ...dovizler } = m.faturaTutarToplamlari || { [m.listType === 'import' ? 'USD' : 'TRY']: m.faturaToplami };
  const toplamlar = Object.entries(dovizler);
  if (TRY != null) toplamlar.unshift(['TRY', TRY]);
  return toplamlar.length
    ? toplamlar.map(([kod, tutar]) => para(tutar, kod)).join(' · ')
    : para(m.faturaToplami);
};
const BOS_KALEM = { tarih: '', no: '', yevmiyeNo: '', yevmiyeTarihi: '', icerik: '', tutar: 0, adet: '', malBedeliTl: undefined };
const GIREN_ANAHTARI = 'musteriBelge.giren';

export default function MusteriBelgeSayfasi() {
  const { token } = useParams();
  return <BelgeGorunumu key={token} token={token} />;
}

function BelgeGorunumu({ token }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [aktif, setAktif] = useState('kunye');
  const [secili, setSecili] = useState(null); // kalem penceresindeki makine

  useEffect(() => {
    let iptal = false;
    api.get(`/musteri-belge/${token}`)
      .then((r) => { if (!iptal) setVeri(r.data?.data || null); })
      .catch((e) => { if (!iptal) setHata(e?.response?.data?.message || 'Bağlantı açılamadı. Lütfen danışmanınızla iletişime geçin.'); });
    return () => { iptal = true; };
  }, [token]);

  useEffect(() => { document.title = veri ? `Teşvik Belgesi ${veri.belge.belgeYonetimi?.belgeNo || ''}` : 'Teşvik Belgesi'; }, [veri]);

  // Kalem kaydedilince yalnız o makine güncellenir (sayfa yeniden yüklenmez)
  const makineyiGuncelle = (m) => {
    setVeri((v) => {
      const anahtar = m.listType === 'import' ? 'ithal' : 'yerli';
      return { ...v, makineler: { ...v.makineler, [anahtar]: v.makineler[anahtar].map((x) => (x.rowId === m.rowId ? m : x)) } };
    });
    setSecili((onceki) => onceki?.listType === m.listType && onceki?.rowId === m.rowId ? m : onceki);
  };

  if (hata) return <Kabuk><Alert severity="error">{hata}</Alert></Kabuk>;
  if (!veri) return <Kabuk><Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box></Kabuk>;

  const { belge, tur, etiketler, makineler } = veri;
  const onayliListeler = belge.makineListeleri || {};
  const onayliListe = aktif === 'yerli' || aktif === 'ithal';
  const gerceklesenListe = aktif === 'gerceklesenYerli' || aktif === 'gerceklesenIthal';
  const gerceklesenIthal = aktif === 'gerceklesenIthal';
  const harcamaSekmesi = HARCAMA_SEKMELERI.find(({ anahtar }) => anahtar === aktif);
  const by = belge.belgeYonetimi || {};
  const konuGoster = (kod) => (etiketler.konu ? `${kod} — ${etiketler.konu}` : kod);
  const oecdGoster = (kod) => etiketler.oecd || kod || '-';

  return (
    <Kabuk>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {belge.yatirimciUnvan || belge.firma?.tamUnvan || 'Teşvik Belgesi'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Yatırım Teşvik Belgesi · Belge No: {by.belgeNo || '-'} · Belge Id: {by.belgeId || '-'}
        </Typography>
      </Box>

      <SekmeSeridi sekmeler={BOLUMLER.map((b) => (b.anahtar === 'yerli' || b.anahtar === 'ithal')
        ? { ...b, baslik: `${b.baslik} (${onayliListeler[b.anahtar]?.length || 0})` } : b)}
        etkin={aktif} onDegis={setAktif} />
      <Box sx={{ border: `1px solid ${renk.cizgi}`, borderTop: 'none', backgroundColor: renk.yuzey, p: { xs: 1, sm: 1.75 } }}>
        {aktif === 'kunye' && <KunyePaneli tesvik={belge} tur={tur} konuGoster={tur === 'yeni' ? konuGoster : undefined} oecdGoster={oecdGoster} />}
        {aktif === 'cins' && <YatirimCinsiTablosu tesvik={belge} />}
        {aktif === 'urun' && <UrunTablosu tesvik={belge} tur={tur} />}
        {onayliListe && <BelgeMakineListesi key={aktif} ithal={aktif === 'ithal'} satirlar={onayliListeler[aktif] || []} />}
        {gerceklesenListe && (
          <MakineListesi ithal={gerceklesenIthal} satirlar={gerceklesenIthal ? makineler.ithal : makineler.yerli} onSec={setSecili} />
        )}
        {aktif === 'finansal' && <FinansalPaneli tesvik={belge} />}
        {aktif === 'sart' && <OzelSartTablosu tesvik={belge} />}
        {harcamaSekmesi && <Harcamalar key={harcamaSekmesi.anahtar} musteriToken={token}
          kategori={harcamaSekmesi.anahtar} baslik={harcamaSekmesi.baslik} />}
        {aktif === GERCEKLESME_SEKMESI.anahtar && <GerceklesmeOzeti musteriToken={token} />}
        {aktif === 'destek' && <DestekUnsuruTablosu tesvik={belge} />}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        Bu sayfa GM Planlama tarafından yalnız sizinle paylaşılmıştır. Bilgilerde hata görürseniz danışmanınıza bildirin.
      </Typography>

      {secili && (
        <KalemPenceresi key={`${secili.listType}:${secili.rowId}`} token={token} makine={secili}
          onClose={() => setSecili(null)} onKaydedildi={makineyiGuncelle} />
      )}
    </Kabuk>
  );
}

function Kabuk({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 2 } }}>
      <Paper sx={{ maxWidth: 1280, mx: 'auto', p: { xs: 1.5, sm: 3 } }}>{children}</Paper>
    </Box>
  );
}

function MakineListesi({ ithal, satirlar, onSec }) {
  const kod = ithal ? 'USD' : 'TRY';
  const sutunlar = useMemo(() => [
    { anahtar: 'siraNo', baslik: 'Sıra', genislik: 56 },
    { anahtar: 'makineId', baslik: 'Makine ID', genislik: 100, bicim: (v) => v || '-' },
    ...(ithal ? [{ anahtar: 'gtipNo', baslik: 'GTİP', genislik: 120, bicim: (v) => v || '-' }] : []),
    { anahtar: 'adi', baslik: 'Adı ve Özelliği', sar: true, bicim: (v) => v || '-' },
    { anahtar: 'miktar', baslik: 'Miktar', genislik: 110, bicim: (_, m) => miktarMetni(m) },
    { anahtar: 'birimFiyat', baslik: 'Birim Fiyatı', genislik: 140, sayi: true, bicim: (v, m) => para(v, m.birimParaBirimi || kod) },
    { anahtar: 'toplam', baslik: ithal ? 'FOB Toplam ($)' : 'Toplam (TL)', genislik: 150, sayi: true, bicim: (v) => para(v, kod) },
    {
      anahtar: 'fatura', baslik: ithal ? 'Beyanname' : 'Fatura', genislik: 200,
      bicim: (_, m) => (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            {m.kalemler.length ? `${m.kalemler.length} kalem · ${kalemToplamMetni(m)}` : '—'}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ py: 0, fontSize: 11, whiteSpace: 'nowrap' }}
            onClick={(e) => { e.stopPropagation(); onSec(m); }}>
            {m.kalemler.length ? 'Gör / Ekle' : 'Kalem Gir'}
          </Button>
        </Stack>
      )
    }
  ], [ithal, kod, onSec]);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {ithal
          ? 'Makinenizin satırındaki "Kalem Gir" ile gümrük beyannamesi bilgisini girebilirsiniz.'
          : 'Makinenizin satırındaki "Kalem Gir" ile kestiğiniz/aldığınız faturanın bilgisini girebilirsiniz. Bir makineye birden fazla fatura kalemi girilebilir.'}
      </Typography>
      <VeriTablosu enAzGenislik={760} satirlar={satirlar} anahtarAl={(m) => m.rowId} sutunlar={sutunlar} onSatirTik={onSec}
        bosMetin={ithal ? 'Bu belgede ithal makine yok' : 'Bu belgede yerli makine yok'} />
    </Box>
  );
}

function KalemPenceresi({ token, makine, onClose, onKaydedildi }) {
  const ithal = makine.listType === 'import';
  const kod = ithal ? 'USD' : 'TRY';
  const etiket = ithal ? { tarih: 'Beyanname Tarihi', no: 'Beyanname No' } : { tarih: 'Fatura Tarihi', no: 'Fatura Sayısı' };
  const [form, setForm] = useState(BOS_KALEM);
  const [duzenlenen, setDuzenlenen] = useState(null);
  const ilkYevmiye = useRef(BOS_KALEM);
  const [giren, setGiren] = useState(() => { try { return localStorage.getItem(GIREN_ANAHTARI) || ''; } catch (_) { return ''; } });
  const [islem, setIslem] = useState('');
  const devamEdenIstek = useRef(null);
  const [evrakKalemiId, setEvrakKalemiId] = useState(null);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const duzenlenenKalem = makine.kalemler.find((kalem) => kalem._id === duzenlenen);
  const formParaBirimi = ithal && duzenlenenKalem ? duzenlenenKalem.tutarParaBirimi || kod : 'TRY';
  const dovizliKalem = formParaBirimi !== 'TRY';
  const malBedeliTl = form.malBedeliTl === undefined ? duzenlenenKalem?.malBedeliTl : form.malBedeliTl;
  const tutarGecerli = form.tutar >= 0.01 && /^\d{1,13}(?:\.\d{1,2})?$/.test(String(form.tutar));
  const malBedeliHatasi = dovizliKalem && malBedeliTl != null
    && (malBedeliTl <= 0 || !/^\d{1,13}(?:\.\d{1,2})?$/.test(String(malBedeliTl)));
  const formGecerli = form.tarih && form.no.trim() && tutarGecerli && Number(form.adet) >= 0 && giren.trim() && !malBedeliHatasi;
  const alan = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => () => devamEdenIstek.current?.abort(), []);

  const islemiBaslat = (tur) => {
    if (devamEdenIstek.current) return null;
    const denetim = new AbortController();
    devamEdenIstek.current = denetim;
    setIslem(tur);
    return denetim;
  };

  const islemiBitir = (denetim) => {
    if (devamEdenIstek.current !== denetim) return;
    devamEdenIstek.current = null;
    if (!denetim.signal.aborted) setIslem('');
  };

  const kapat = () => { if (!devamEdenIstek.current) onClose(); };

  const makineYaniti = (guncel) => {
    if (guncel?.rowId !== makine.rowId || guncel?.listType !== makine.listType || !Array.isArray(guncel?.kalemler)) {
      throw new Error('Makine bilgileri güncellenemedi. Lütfen tekrar deneyin.');
    }
    return guncel;
  };

  const formuTemizle = () => { setForm(BOS_KALEM); setDuzenlenen(null); };

  const duzenle = (kalem) => {
    if (devamEdenIstek.current) return;
    ilkYevmiye.current = { yevmiyeNo: kalem.yevmiyeNo || '', yevmiyeTarihi: isoGun(kalem.yevmiyeTarihi) };
    setForm({
      ...BOS_KALEM, ...ilkYevmiye.current, tarih: isoGun(kalem.tarih), no: kalem.no || '',
      icerik: kalem.icerik || '', tutar: kalem.tutar, adet: kalem.adet || ''
    });
    setDuzenlenen(kalem._id);
    setHata(''); setBilgi('');
  };

  const kaydet = async () => {
    if (devamEdenIstek.current || !formGecerli) return;
    const yevmiyeNo = form.yevmiyeNo.trim();
    const yevmiyeTarihi = form.yevmiyeTarihi || null;
    const yevmiyeBilgisi = [
      yevmiyeNo && `Yevmiye No: ${yevmiyeNo}`,
      yevmiyeTarihi && `Yevmiye Tarihi: ${tarihYaz(yevmiyeTarihi)}`
    ].filter(Boolean).map((satir) => `\n${satir}`).join('');
    if (!window.confirm(`Kalem ${duzenlenen ? 'güncellensin' : 'kaydedilsin'} mi?\n\n${etiket.no}: ${form.no}\n${ithal && !dovizliKalem ? 'Mal Bedeli TL' : 'Tutar'}: ${para(form.tutar, formParaBirimi)}${yevmiyeBilgisi}`)) return;
    const denetim = islemiBaslat('kalem');
    if (!denetim) return;
    setHata(''); setBilgi('');
    try {
      const govde = {
        listType: makine.listType, rowId: makine.rowId, tarih: form.tarih, no: form.no.trim(), icerik: form.icerik.trim(),
        tutar: Number(form.tutar), adet: Number(form.adet) || 0, giren: giren.trim()
      };
      if (!duzenlenen || yevmiyeNo !== ilkYevmiye.current.yevmiyeNo) govde.yevmiyeNo = yevmiyeNo;
      if (!duzenlenen || form.yevmiyeTarihi !== ilkYevmiye.current.yevmiyeTarihi) govde.yevmiyeTarihi = yevmiyeTarihi;
      if (!dovizliKalem) govde.tutarParaBirimi = 'TRY';
      if (dovizliKalem && form.malBedeliTl !== undefined) govde.malBedeliTl = form.malBedeliTl;
      const secenekler = { signal: denetim.signal };
      const veri = duzenlenen
        ? await svc.musteriFaturaKalemiGuncelle(token, duzenlenen, govde, secenekler)
        : (await api.post(`/musteri-belge/${encodeURIComponent(token)}/fatura-kalemi`, govde, secenekler)).data?.data;
      if (denetim.signal.aborted) return;
      const guncel = makineYaniti(veri);
      try { localStorage.setItem(GIREN_ANAHTARI, giren); } catch (_) { /* gizli sekme */ }
      formuTemizle();
      setBilgi(duzenlenen ? 'Kalem güncellendi.' : 'Kalem kaydedildi. Teşekkür ederiz.');
      onKaydedildi(guncel);
      if (guncel.yeniKalemId) setEvrakKalemiId(guncel.yeniKalemId);
    } catch (e) {
      if (!denetim.signal.aborted) setHata(e?.response?.data?.message || e?.message || 'Kaydedilemedi. Lütfen tekrar deneyin.');
    } finally { islemiBitir(denetim); }
  };

  const kalemiSil = async (kalem) => {
    if (devamEdenIstek.current || !window.confirm(`"${kalem.no || 'Kalem'}" ve bağlı evrakları silinsin mi?`)) return;
    const denetim = islemiBaslat('sil');
    if (!denetim) return;
    setHata(''); setBilgi('');
    try {
      const veri = await svc.musteriFaturaKalemiSil(token, kalem._id,
        { rowId: makine.rowId, listType: makine.listType, giren: giren.trim() }, { signal: denetim.signal });
      if (denetim.signal.aborted) return;
      onKaydedildi(makineYaniti(veri));
      if (duzenlenen === kalem._id) formuTemizle();
      if (evrakKalemiId === kalem._id) setEvrakKalemiId(null);
      setBilgi('Kalem silindi.');
    } catch (e) {
      if (!denetim.signal.aborted) setHata(e?.response?.data?.message || e?.message || 'Kalem silinemedi.');
    } finally { islemiBitir(denetim); }
  };

  const evrakIndir = async (kalem, evrak) => {
    const denetim = islemiBaslat('indir');
    if (!denetim) return;
    setHata('');
    try {
      const yanit = await svc.musteriFaturaEvrakiIndir(token, kalem._id, evrak._id,
        { rowId: makine.rowId, listType: makine.listType }, { signal: denetim.signal });
      if (!denetim.signal.aborted) saveBlobResponse(yanit, evrak.dosyaAdi);
    } catch (e) {
      if (!denetim.signal.aborted) setHata(e?.response?.data?.message || e?.message || 'Evrak indirilemedi.');
    } finally { islemiBitir(denetim); }
  };

  const evrakSil = async (kalem, evrak) => {
    const denetim = islemiBaslat('evrakSil');
    if (!denetim) return false;
    try {
      const veri = await svc.musteriFaturaEvrakiSil(token, kalem._id, evrak._id,
        { rowId: makine.rowId, listType: makine.listType }, { signal: denetim.signal });
      if (denetim.signal.aborted) return false;
      onKaydedildi(makineYaniti(veri));
      return true;
    } catch (e) {
      if (denetim.signal.aborted) return false;
      throw e;
    } finally { islemiBitir(denetim); }
  };

  const evrakYukle = async (kalemId, formData, onProgress) => {
    const denetim = islemiBaslat('evrak');
    if (!denetim) return false;
    try {
      const r = await uploadPost(`/musteri-belge/${encodeURIComponent(token)}/fatura-kalemi/${encodeURIComponent(kalemId)}/evrak`,
        formData, { onProgress, signal: denetim.signal });
      if (denetim.signal.aborted) return false;
      onKaydedildi(makineYaniti(r.data?.data));
      return true;
    } catch (e) {
      if (denetim.signal.aborted) return false;
      throw e;
    } finally { islemiBitir(denetim); }
  };

  return (
    <Dialog open onClose={kapat} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        {ithal ? 'Beyanname Kalemleri' : 'Fatura Kalemleri'}
        <IconButton onClick={kapat} disabled={!!islem} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Kapat"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ bgcolor: '#f8fafc', p: 1.5, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{makine.siraNo}. {makine.adi}</Typography>
          <Typography variant="caption" color="text.secondary">
            {makine.makineId ? `Makine ID ${makine.makineId} · ` : ''}{ithal && makine.gtipNo ? `GTİP ${makine.gtipNo} · ` : ''}
            {miktarMetni(makine)} · Birim: {para(makine.birimFiyat, makine.birimParaBirimi || kod)} · {ithal ? 'FOB Toplam' : 'Toplam'}: {para(makine.toplam, kod)}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Kayıtlı Kalemler ({makine.kalemler.length})</Typography>
        {makine.kalemler.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Henüz kalem girilmedi.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{etiket.tarih}</TableCell><TableCell>{etiket.no}</TableCell>
                  <TableCell>Yevmiye No</TableCell><TableCell>Yevmiye Tarihi</TableCell><TableCell>Kalem İçeriği</TableCell>
                  <TableCell align="right">Tutar</TableCell><TableCell align="right">Adet</TableCell><TableCell>Giren</TableCell>
                  <TableCell>Evraklar</TableCell><TableCell>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {makine.kalemler.map((k) => {
                  const yuklenebilir = !!k._id;
                  const evraklarAcik = yuklenebilir && String(evrakKalemiId) === String(k._id);
                  return (
                    <React.Fragment key={k._id}>
                      <TableRow selected={duzenlenen === k._id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tarih(k.tarih)}</TableCell>
                        <TableCell>{k.no || '-'}</TableCell>
                        <TableCell sx={{ overflowWrap: 'anywhere' }}>{k.yevmiyeNo || '—'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tarihYaz(k.yevmiyeTarihi)}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-word' }}>{k.icerik || '-'}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {para(k.tutar, k.tutarParaBirimi || kod)}
                          {ithal && k.malBedeliTl != null && <Typography variant="caption" display="block" color="text.secondary">
                            Mal Bedeli TL {para(k.malBedeliTl)}
                          </Typography>}
                        </TableCell>
                        <TableCell align="right">{k.adet || 0}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip size="small" color={k.kaynak === 'firma' ? 'success' : 'default'}
                            label={k.kaynak === 'firma' ? `Firma${k.girenAdi ? ` · ${k.girenAdi}` : ''}` : 'Danışman girdi'} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {yuklenebilir && (
                            <Button size="small" startIcon={<AttachFileIcon />} disabled={!!islem} aria-expanded={evraklarAcik}
                              onClick={() => setEvrakKalemiId(evraklarAcik ? null : k._id)}>
                              {k.evraklar?.length ? `Evraklar (${k.evraklar.length})` : 'Evrak Yükle'}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton size="small" aria-label={`${k.no || 'Kalem'} düzenle`} disabled={!!islem} onClick={() => duzenle(k)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" aria-label={`${k.no || 'Kalem'} sil`} disabled={!!islem} onClick={() => kalemiSil(k)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {evraklarAcik && (
                        <TableRow>
                          <TableCell colSpan={10}>
                            <KalemEvrakPaneli key={k._id} kalem={k} rowId={makine.rowId} ithal={ithal} islem={islem} onYukle={evrakYukle}
                              onIndir={(evrak) => evrakIndir(k, evrak)} onSil={(evrak) => evrakSil(k, evrak)} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={5} sx={{ fontWeight: 700 }}>Toplam</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{kalemToplamMetni(makine)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{makine.faturaAdedi}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}

        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{duzenlenen ? 'Kalemi Düzenle' : 'Yeni Kalem'}</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="date" required label={etiket.tarih} InputLabelProps={{ shrink: true }} value={form.tarih} onChange={alan('tarih')} disabled={!!islem} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" required label={etiket.no} value={form.no} onChange={alan('no')} inputProps={{ maxLength: 100 }} disabled={!!islem} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Yevmiye No" value={form.yevmiyeNo} onChange={alan('yevmiyeNo')}
                inputProps={{ maxLength: 100 }} disabled={!!islem} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="date" label="Yevmiye Tarihi" InputLabelProps={{ shrink: true }}
                value={form.yevmiyeTarihi} onChange={alan('yevmiyeTarihi')} disabled={!!islem} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Kalem İçeriği" value={form.icerik} onChange={alan('icerik')} inputProps={{ maxLength: 500 }} disabled={!!islem} />
            </Grid>
            <Grid item xs={8} sm={4}>
              <TutarAlani fullWidth size="small" required
                label={dovizliKalem ? `Kalem Tutarı – Mal Bedeli (${formParaBirimi})` : ithal ? 'Kalem Tutarı – Mal Bedeli TL' : 'Kalem Tutarı'}
                simge={dovizliKalem ? formParaBirimi : '₺'} value={form.tutar} disabled={!!islem}
                error={form.tutar !== 0 && !tutarGecerli}
                onChange={(v) => setForm((f) => ({ ...f, tutar: v }))} />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField fullWidth size="small" type="number" label="Adet" value={form.adet} onChange={alan('adet')} inputProps={{ min: 0 }} disabled={!!islem} />
            </Grid>
            {dovizliKalem && <Grid item xs={12} sm={6}>
              <TutarAlani key={duzenlenen} fullWidth size="small" label="Mal Bedeli TL" value={malBedeliTl ?? 0} bosDeger={null}
                disabled={!!islem} error={malBedeliHatasi}
                onChange={(v) => setForm((f) => ({ ...f, malBedeliTl: v }))} />
            </Grid>}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" required label="Adınız Soyadınız" value={giren} onChange={(e) => setGiren(e.target.value)} inputProps={{ maxLength: 120 }} disabled={!!islem} />
            </Grid>
          </Grid>
        </Box>
        {hata && <Alert severity="error" sx={{ mt: 2 }}>{hata}</Alert>}
        {bilgi && <Alert severity="success" sx={{ mt: 2 }}>{bilgi}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={kapat} disabled={!!islem}>Kapat</Button>
        {duzenlenen && <Button onClick={formuTemizle} disabled={!!islem}>Vazgeç</Button>}
        <Button variant="contained" onClick={kaydet}
          disabled={!!islem || !formGecerli}
          startIcon={islem === 'kalem' ? <CircularProgress size={16} color="inherit" /> : null}>
          {duzenlenen ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
