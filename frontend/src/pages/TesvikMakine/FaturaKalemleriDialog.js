// 🧾 FATURA KALEMLERİ PENCERESİ — Ekipman Takip › Yerli / İthal Liste'de makineye tıklayınca açılır.
//
// Müşteri (13.10.2026): "Fatura kalem girme ve Makine talepleri kısmını komple ayıracağız … Fatura
// değerleri vs buradan güncellenmesin sadece kayıt edilenler görünsün, Makinelerin üstüne tıklayınca
// fatura kalem kaydetme kısmı açılsın; Üstte makinanın bilgisi, altta fatura listesi (daha önceden
// kaydedilen fatura varsa burada görünsün), onun altında da kalem girme ve kaydetme yeri olsun.
// (F. Tarih - F. Sayı, Kalem içeriği, Kalem tutarı - Kaydet)"
//
// Firmanın belge linkinden girdiği kalemler firmaya kilitlidir ("Onaylandı"); personel buradan
// düzeltir/siler. İthal makinede aynı pencere beyanname kalemleri içindir.
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Tooltip, Chip, Alert, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TutarAlani from '../../components/common/TutarAlani';
import KalemEvrakPaneli, { BEYANNAME_EVRAK_TURLERI, FATURA_EVRAK_TURLERI } from '../../components/Tesvik/KalemEvrakPaneli';
import svc from '../../services/tesvikMakineService';
import { hataMesaji } from '../../utils/hataMesaji';
import { birimEtiketi } from '../../utils/makineFormat';
import { formatDate, formatFaturaToplamlari, formatMoney } from './helpers';

const BOS = { tarih: '', no: '', icerik: '', tutar: 0, adet: '', malBedeliTl: undefined };
const PARA_SIMGESI = { TRY: '₺', USD: '$', EUR: '€' };
const kalemEvraklari = (kalem, turler) => (Array.isArray(kalem.evraklar) ? kalem.evraklar : [])
  .filter((evrak) => evrak?._id && turler.some(({ tur }) => tur === evrak.tur));
const evrakAnahtari = (kalemId, evrakId) => `${kalemId}/${evrakId}`;
const dosyaAdi = (evrak) => {
  const uzanti = evrak.tur === 'fatura_xml' ? '.xml' : '.pdf';
  const ad = evrak.dosyaAdi?.trim().replace(/[\\/]/g, '_') || evrak.tur;
  return ad.toLowerCase().endsWith(uzanti) ? ad : `${ad}${uzanti}`;
};

function evrakiGoster(veri, evrak, pencere) {
  const pdf = evrak.tur !== 'fatura_xml';
  const mime = veri?.type?.split(';')[0];
  const tipler = pdf ? ['application/pdf'] : ['application/xml', 'text/xml', 'text/plain'];
  if (!(veri instanceof Blob) || !veri.size || (mime && mime !== 'application/octet-stream' && !tipler.includes(mime))) {
    throw new Error('Sunucu geçerli bir evrak göndermedi.');
  }
  if (pencere?.closed) return;

  const url = URL.createObjectURL(new Blob([veri], { type: pdf ? 'application/pdf' : 'application/octet-stream' }));
  try {
    if (pencere) pencere.location.replace(url);
    else {
      const link = document.createElement('a');
      link.href = url;
      link.download = dosyaAdi(evrak);
      document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); }
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export const kalemEtiketleri = (listType) => (listType === 'import'
  ? { tarih: 'Beyanname Tarihi', no: 'Beyanname No', baslik: 'Beyanname Kalemleri' }
  : { tarih: 'Fatura Tarihi', no: 'Fatura Sayısı', baslik: 'Fatura Kalemleri' });

export default function FaturaKalemleriDialog({ open, onClose, tesvikModel, tesvikId, makine, onChanged, duzenlenebilir = true }) {
  const [proc, setProc] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [form, setForm] = useState(BOS);
  const [duzenlenen, setDuzenlenen] = useState(null); // kalem _id
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [evrakiAcikKalem, setEvrakiAcikKalem] = useState(null);
  const [yuklenenEvraklar, setYuklenenEvraklar] = useState([]);
  const [evrakHatasi, setEvrakHatasi] = useState(null);
  const evrakIstekleri = useRef(new Map());
  const yuklemeIstegi = useRef(null);
  const [evrakYukleniyor, setEvrakYukleniyor] = useState(false);

  const etiket = kalemEtiketleri(makine?.listType);
  const ithal = makine?.listType === 'import';
  const evrakTurleri = ithal ? BEYANNAME_EVRAK_TURLERI : FATURA_EVRAK_TURLERI;
  const eskiParaBirimi = proc?.currency || makine?.currency || 'USD';
  const kalemParaBirimi = (kalem) => ithal ? (kalem?.tutarParaBirimi || eskiParaBirimi) : 'TRY';
  const duzenlenenKalem = proc?.faturalar?.find((k) => k._id === duzenlenen);
  const formParaBirimi = duzenlenenKalem ? kalemParaBirimi(duzenlenenKalem) : 'TRY';
  const dovizliKalem = formParaBirimi !== 'TRY';
  const malBedeliTl = form.malBedeliTl === undefined ? duzenlenenKalem?.malBedeliTl : form.malBedeliTl;
  const malBedeliHatasi = dovizliKalem && malBedeliTl != null
    && (malBedeliTl <= 0 || !/^\d{1,13}(?:\.\d{1,2})?$/.test(String(malBedeliTl)));
  const tutarEtiketi = ithal ? 'Kalem Tutarı – Mal Bedeli TL' : 'Kalem Tutarı';
  const birim = birimEtiketi(makine?.unit, makine?.unitDescription);

  useEffect(() => {
    if (!open || !makine) return undefined;
    let iptal = false;
    const istekler = evrakIstekleri.current;
    setProc(null); setForm(BOS); setDuzenlenen(null); setHata(''); setBilgi('');
    setEvrakiAcikKalem(null); setEvrakHatasi(null); setYuklenenEvraklar([]);
    setEvrakYukleniyor(false);
    setYukleniyor(true);
    const istek = duzenlenebilir
      ? svc.ensureProcess({ tesvikModel, tesvikId, listType: makine.listType, rowId: makine.rowId })
      : makine.process?._id ? svc.getProcess(makine.process._id).then((d) => d.process) : Promise.resolve({ faturalar: [] });
    istek
      .then((p) => { if (!iptal) setProc(p); })
      .catch((e) => { if (!iptal) setHata(e?.response?.data?.message || 'Makine bilgisi alınamadı'); })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => {
      iptal = true;
      yuklemeIstegi.current?.abort();
      yuklemeIstegi.current = null;
      istekler.forEach(({ controller, pencere }) => {
        controller.abort();
        pencere?.close();
      });
      istekler.clear();
    };
  }, [open, makine, tesvikModel, tesvikId, duzenlenebilir]);

  const kalemler = proc?.faturalar || [];
  const evrakEklenebilir = duzenlenebilir;
  const evrakSutunu = evrakEklenebilir || kalemler.some((kalem) => kalemEvraklari(kalem, evrakTurleri).length);
  const toplamTutar = proc?.faturaTutarToplamlari || kalemler.reduce((toplamlar, k) => {
    const kod = kalemParaBirimi(k);
    toplamlar[kod] = (toplamlar[kod] || 0) + (Number(k.tutar) || 0);
    if (kod !== 'TRY' && k.malBedeliTl != null) toplamlar.TRY = (toplamlar.TRY || 0) + k.malBedeliTl;
    return toplamlar;
  }, {});
  const toplamAdet = kalemler.reduce((t, k) => t + (Number(k.adet) || 0), 0);
  const kilitli = mesgul || evrakYukleniyor;
  const kapat = () => { if (!yuklemeIstegi.current) onClose(); };

  const alan = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const sonuc = (data, mesaj) => {
    setProc((p) => ({ ...p, ...data }));
    setForm(BOS); setDuzenlenen(null); setBilgi(mesaj); setHata('');
    if (onChanged) onChanged();
  };

  const kaydet = async () => {
    if (!proc || kilitli || !duzenlenebilir || malBedeliHatasi) return;
    setMesgul(true); setHata(''); setBilgi('');
    const govde = { tarih: form.tarih || null, no: form.no, icerik: form.icerik, tutar: Number(form.tutar) || 0, adet: Number(form.adet) || 0 };
    if (!dovizliKalem) govde.tutarParaBirimi = 'TRY';
    if (dovizliKalem && form.malBedeliTl !== undefined) govde.malBedeliTl = form.malBedeliTl;
    try {
      const data = duzenlenen
        ? await svc.faturaKalemiGuncelle(proc._id, duzenlenen, govde)
        : await svc.faturaKalemiEkle(proc._id, govde);
      sonuc(data, duzenlenen ? 'Kalem güncellendi' : 'Kalem kaydedildi');
      if (evrakEklenebilir && !duzenlenen && data?.yeniKalemId) setEvrakiAcikKalem(data.yeniKalemId);
    } catch (e) {
      setHata(e?.response?.data?.message || 'Kaydedilemedi');
    } finally { setMesgul(false); }
  };

  const duzenle = (k) => {
    setDuzenlenen(k._id);
    setForm({
      tarih: k.tarih ? String(k.tarih).slice(0, 10) : '', no: k.no || '', icerik: k.icerik || '',
      tutar: Number(k.tutar) || 0, adet: k.adet ? String(k.adet) : ''
    });
    setBilgi(''); setHata('');
  };

  const sil = async (k) => {
    if (kilitli || !duzenlenebilir) return;
    const kim = k.kaynak === 'firma' ? ' Firmanın girdiği (onaylanmış) bir kalem.' : '';
    const ekler = k.evraklar?.length ? ` Kaleme bağlı ${k.evraklar.length} evrak da silinecek.` : '';
    if (!window.confirm(`"${k.no || k.icerik || 'Kalem'}" silinsin mi?${kim}${ekler}`)) return;
    setMesgul(true); setHata(''); setBilgi('');
    try { sonuc(await svc.faturaKalemiSil(proc._id, k._id), 'Kalem silindi'); }
    catch (e) { setHata(e?.response?.data?.message || 'Silinemedi'); }
    finally { setMesgul(false); }
  };

  const evrakYukle = async (kalemId, formData, onProgress) => {
    if (!proc?._id || !evrakEklenebilir || mesgul || yuklemeIstegi.current) return false;
    const controller = new AbortController();
    yuklemeIstegi.current = controller;
    setEvrakYukleniyor(true);
    try {
      const data = await svc.faturaKalemiEvrakYukle(proc._id, kalemId, formData, { onProgress, signal: controller.signal });
      if (controller.signal.aborted) return false;
      if (!data?.faturalar?.some((k) => k._id === kalemId)) throw new Error('Kalem evrakları güncellenemedi.');
      setProc((onceki) => ({ ...onceki, ...data }));
      onChanged?.();
      return true;
    } finally {
      if (yuklemeIstegi.current === controller) {
        yuklemeIstegi.current = null;
        setEvrakYukleniyor(false);
      }
    }
  };

  const evrakiAc = async (kalem, evrak) => {
    if (!proc?._id) return;
    const anahtar = evrakAnahtari(kalem._id, evrak._id);
    const istekler = evrakIstekleri.current;
    if (istekler.has(anahtar)) return;

    // PDF sekmesini doğrudan tıklamada aç. Sonradan yalnız doğrulanan blob'a yönlendir.
    let pencere = null;
    if (evrak.tur !== 'fatura_xml') {
      try {
        pencere = window.open('', '_blank');
        if (pencere) {
          pencere.opener = null;
          pencere.document.title = 'Evrak açılıyor';
          pencere.document.body.textContent = 'Evrak açılıyor…';
        }
      } catch (_) {
        pencere?.close();
        pencere = null;
      }
    }
    const controller = new AbortController();
    const istek = { controller, pencere };
    istekler.set(anahtar, istek);
    setYuklenenEvraklar([...istekler.keys()]);
    setEvrakHatasi(null);

    try {
      const veri = await svc.faturaKalemiEvrakGetir(proc._id, kalem._id, evrak._id, { signal: controller.signal });
      if (!controller.signal.aborted) evrakiGoster(veri, evrak, pencere);
    } catch (error) {
      if (!controller.signal.aborted) {
        pencere?.close();
        const mesaj = await hataMesaji(error, 'Evrak yüklenemedi.');
        if (!controller.signal.aborted) setEvrakHatasi({ kalemId: kalem._id, mesaj });
      }
    } finally {
      if (istekler.get(anahtar) === istek) {
        istekler.delete(anahtar);
        setYuklenenEvraklar([...istekler.keys()]);
      }
    }
  };

  const formDolu = form.no || form.icerik || form.tarih || Number(form.tutar) || Number(form.adet) || form.malBedeliTl;

  return (
    <Dialog open={open} onClose={kapat} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        {etiket.baslik}
        <IconButton onClick={kapat} disabled={evrakYukleniyor} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Kapat"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Makine bilgisi */}
        <Box sx={{ bgcolor: '#f8fafc', p: 2, mb: 2 }}>
          <Grid container spacing={1}>
            <Bilgi etiket="Sıra No" deger={makine?.siraNo} xs={4} sm={2} />
            <Bilgi etiket="Makine ID" deger={makine?.makineId || '-'} xs={8} sm={3} />
            {makine?.listType === 'import' && <Bilgi etiket="GTİP" deger={makine?.gtipNo || '-'} xs={12} sm={3} />}
            <Bilgi etiket="Miktar" deger={`${makine?.quantity || 0} ${birim}`.trim()} xs={6} sm={2} />
            <Bilgi etiket={ithal ? 'FOB Toplam' : 'Toplam'} deger={formatMoney(makine?.totalPrice, ithal ? 'USD' : 'TRY')} xs={6} sm={ithal ? 2 : 5} />
            <Bilgi etiket="Makine Adı" deger={makine?.machineName} xs={12} />
          </Grid>
        </Box>

        {yukleniyor && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={28} /></Box>}

        {!yukleniyor && proc && (
          <>
            {/* Kayıtlı kalemler */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Kayıtlı Kalemler ({kalemler.length})</Typography>
            {kalemler.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Bu makineye henüz kalem girilmedi.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto', mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{etiket.tarih}</TableCell>
                      <TableCell>{etiket.no}</TableCell>
                      <TableCell>Kalem İçeriği</TableCell>
                      <TableCell align="right">{ithal ? 'Mal Bedeli' : 'Kalem Tutarı'}</TableCell>
                      <TableCell align="right">Adet</TableCell>
                      <TableCell>Giren</TableCell>
                      {evrakSutunu && <TableCell>Evraklar</TableCell>}
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kalemler.map((k) => {
                      const evraklar = kalemEvraklari(k, evrakTurleri);
                      const evrakVar = evrakEklenebilir || evraklar.length > 0;
                      const evrakAcik = evrakVar && evrakiAcikKalem === k._id;
                      const evrakPaneli = `fatura-evrak-${k._id}`;
                      const evrakGorunumunuDegistir = () => setEvrakiAcikKalem(evrakAcik ? null : k._id);
                      return (
                        <React.Fragment key={k._id}>
                          <TableRow selected={duzenlenen === k._id || evrakAcik}
                            hover={evrakVar} onClick={evrakVar && !kilitli ? evrakGorunumunuDegistir : undefined}
                            sx={evrakVar ? { cursor: 'pointer' } : undefined}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(k.tarih)}</TableCell>
                            <TableCell>{k.no || '-'}</TableCell>
                            <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>{k.icerik || '-'}</TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                              {formatMoney(k.tutar, kalemParaBirimi(k))}
                              {ithal && k.malBedeliTl != null && <Typography variant="caption" display="block" color="text.secondary">
                                Mal Bedeli TL {formatMoney(k.malBedeliTl)}
                              </Typography>}
                            </TableCell>
                            <TableCell align="right">{k.adet || 0}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {k.kaynak === 'firma'
                                ? <Tooltip title={`Firma linkinden girildi${k.girenAdi ? ` — ${k.girenAdi}` : ''} · ${formatDate(k.girisTarihi, true)}`}>
                                    <Chip size="small" color="success" label="Onaylandı · Firma" />
                                  </Tooltip>
                                : <Typography variant="caption" color="text.secondary">{k.girenAdi || 'Personel'}</Typography>}
                            </TableCell>
                            {evrakSutunu && <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {evrakVar ? <Button size="small" startIcon={<AttachFileIcon />} aria-expanded={evrakAcik} disabled={kilitli}
                                aria-controls={evrakAcik ? evrakPaneli : undefined} aria-label={`${k.no || 'Fatura'} evrakları`}
                                onClick={(event) => { event.stopPropagation(); evrakGorunumunuDegistir(); }}>
                                {evraklar.length ? `Evraklar (${evraklar.length})` : 'Evrak Yükle'}
                              </Button> : '—'}
                            </TableCell>}
                            <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(event) => event.stopPropagation()}>
                              {duzenlenebilir && <>
                                <Tooltip title="Düzelt"><span><IconButton size="small" aria-label={`${k.no || 'Kalem'} düzelt`} disabled={kilitli} onClick={() => duzenle(k)}><EditIcon fontSize="small" /></IconButton></span></Tooltip>
                                <Tooltip title="Sil"><span><IconButton size="small" color="error" aria-label={`${k.no || 'Kalem'} sil`} disabled={kilitli} onClick={() => sil(k)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
                              </>}
                            </TableCell>
                          </TableRow>
                          {evrakAcik && <KalemEvraklari id={evrakPaneli} kalem={k} evraklar={evraklar}
                            evrakTurleri={evrakTurleri} yuklenenler={yuklenenEvraklar} onAc={evrakiAc}
                            yuklemePaneli={evrakEklenebilir && <KalemEvrakPaneli kalem={k} ithal={ithal} islem={evrakYukleniyor ? 'evrak' : (mesgul ? 'kalem' : '')}
                              onYukle={evrakYukle} yuklenenleriGoster={false} />}
                            hata={evrakHatasi?.kalemId === k._id ? evrakHatasi.mesaj : ''} />}
                        </React.Fragment>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Toplam</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatFaturaToplamlari(toplamTutar)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{toplamAdet}</TableCell>
                      <TableCell colSpan={evrakSutunu ? 3 : 2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* Kalem girişi */}
            {duzenlenebilir && <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {duzenlenen ? 'Kalemi Düzelt' : 'Yeni Kalem'}
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6} sm={3}>
                  <TextField fullWidth size="small" type="date" label={etiket.tarih} InputLabelProps={{ shrink: true }}
                    value={form.tarih} onChange={alan('tarih')} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField fullWidth size="small" label={etiket.no} value={form.no} onChange={alan('no')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Kalem İçeriği" value={form.icerik} onChange={alan('icerik')} />
                </Grid>
                <Grid item xs={8} sm={4}>
                  <TutarAlani fullWidth size="small" label={dovizliKalem ? `Kalem Tutarı – Mal Bedeli (${formParaBirimi})` : tutarEtiketi}
                    value={form.tutar} simge={PARA_SIMGESI[formParaBirimi] || formParaBirimi}
                    onChange={(v) => setForm((f) => ({ ...f, tutar: v }))} />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField fullWidth size="small" type="number" label="Adet" value={form.adet} onChange={alan('adet')}
                    inputProps={{ min: 0 }} />
                </Grid>
                {dovizliKalem && <Grid item xs={8} sm={4}>
                  <TutarAlani key={duzenlenen} fullWidth size="small" label="Mal Bedeli TL" value={malBedeliTl ?? 0} bosDeger={null}
                    error={malBedeliHatasi} helperText={malBedeliHatasi ? 'En fazla iki ondalık haneli, pozitif tutar girin.' : undefined}
                    onChange={(v) => setForm((f) => ({ ...f, malBedeliTl: v }))} />
                </Grid>}
                <Grid item xs={12} sm={dovizliKalem ? 2 : 6}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ height: '100%' }} alignItems="center">
                    {duzenlenen && <Button onClick={() => { setDuzenlenen(null); setForm(BOS); }} disabled={kilitli}>Vazgeç</Button>}
                    <Button variant="contained" startIcon={mesgul ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={kaydet} disabled={kilitli || !formDolu || malBedeliHatasi}>
                      Kaydet
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>}
          </>
        )}
        {hata && <Alert severity="error" sx={{ mt: 2 }}>{hata}</Alert>}
        {bilgi && <Alert severity="success" sx={{ mt: 2 }}>{bilgi}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={kapat} disabled={evrakYukleniyor}>Kapat</Button></DialogActions>
    </Dialog>
  );
}

function KalemEvraklari({ id, kalem, evraklar, evrakTurleri, yuklenenler, onAc, hata, yuklemePaneli }) {
  return <TableRow>
    <TableCell colSpan={8} sx={{ bgcolor: 'action.hover' }}>
      <Stack id={id} spacing={1} role="region" aria-label={`${kalem.no || 'Fatura'} evrak listesi`}>
        {evrakTurleri.map(({ tur, etiket }) => {
          const ayniTur = evraklar.filter((evrak) => evrak.tur === tur);
          if (!ayniTur.length) return null;
          const xml = tur === 'fatura_xml';
          return <Box key={tur}>
            <Typography variant="caption" component="div" sx={{ fontWeight: 700 }}>{etiket}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {ayniTur.map((evrak) => {
                const bekliyor = yuklenenler.includes(evrakAnahtari(kalem._id, evrak._id));
                const ad = dosyaAdi(evrak);
                return <Button key={evrak._id} size="small" disabled={bekliyor}
                  startIcon={bekliyor ? <CircularProgress size={14} /> : (xml ? <DownloadIcon /> : <OpenInNewIcon />)}
                  sx={{ textTransform: 'none', overflowWrap: 'anywhere' }}
                  aria-label={`${ad} ${xml ? 'indir' : 'aç'}`} onClick={() => onAc(kalem, evrak)}>
                  {ad}
                </Button>;
              })}
            </Stack>
          </Box>;
        })}
        {hata && <Alert severity="error">{hata}</Alert>}
        {yuklemePaneli}
      </Stack>
    </TableCell>
  </TableRow>;
}

function Bilgi({ etiket, deger, xs, sm }) {
  return (
    <Grid item xs={xs} sm={sm}>
      <Typography variant="caption" color="text.secondary" display="block">{etiket}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>{deger ?? '-'}</Typography>
    </Grid>
  );
}
