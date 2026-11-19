import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KalemEvrakPaneli from '../../components/Tesvik/KalemEvrakPaneli';
import TutarAlani from '../../components/common/TutarAlani';
import svc from '../../services/tesvikMakineService';
import { hataMesaji } from '../../utils/hataMesaji';
import { formatMoney, saveBlobResponse } from './helpers';

const BOS_KALEM = {
  altKategori: '', tarih: '', no: '', yevmiyeNo: '', yevmiyeTarihi: '', icerik: '', tutar: 0, adet: ''
};
const kurusToplami = (kalemler) => kalemler.reduce((toplam, kalem) => toplam + Math.round(kalem.tutar * 100), 0);
const para = (kurus) => formatMoney(kurus / 100, 'TRY');
const yeniIstekId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const tarihMetni = (tarih) => tarih ? tarih.slice(0, 10).split('-').reverse().join('.') : '–';
const GIREN_ANAHTARI = 'musteriBelge.giren';

export default function Harcamalar({ tesvikModel, tesvikId, musteriToken, kategori, baslik, duzenlenebilir, yenileme }) {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [yeniden, setYeniden] = useState(0);
  const [pencere, setPencere] = useState(null);
  const [form, setForm] = useState(BOS_KALEM);
  const [islem, setIslem] = useState('');
  const [pencereHatasi, setPencereHatasi] = useState('');
  const [giren, setGiren] = useState(() => {
    if (!musteriToken) return '';
    try { return localStorage.getItem(GIREN_ANAHTARI) || ''; } catch { return ''; }
  });
  const istekId = useRef(null);
  const devamEden = useRef(null);
  const listeIstegi = useRef(null);
  const kalemEklenebilir = !!musteriToken || duzenlenebilir;
  const kalemDuzenlenebilir = (kalem) => musteriToken ? kalem?.duzenlenebilir === true : duzenlenebilir;
  const evrakEklenebilir = (kalem) => musteriToken ? kalem?.evrakEklenebilir === true : duzenlenebilir;

  useEffect(() => () => devamEden.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    listeIstegi.current = controller;
    setYukleniyor(true);
    setHata('');
    const secenekler = { signal: controller.signal };
    const istek = musteriToken
      ? svc.musteriHarcamalariniGetir(musteriToken, secenekler)
      : svc.harcamalariGetir(tesvikModel, tesvikId, secenekler);
    istek
      .then((sonuc) => { if (!controller.signal.aborted) setVeri(sonuc); })
      .catch(async (error) => {
        const mesaj = await hataMesaji(error, 'Harcamalar yüklenemedi.');
        if (!controller.signal.aborted) setHata(mesaj);
      })
      .finally(() => { if (!controller.signal.aborted) setYukleniyor(false); });
    return () => {
      controller.abort();
      if (listeIstegi.current === controller) listeIstegi.current = null;
    };
  }, [tesvikModel, tesvikId, musteriToken, yenileme, yeniden]);

  const altKategoriler = veri?.kategoriler?.[kategori]?.altKategoriler || [];
  const kalemler = (veri?.kalemler || []).filter((k) => k.kategori === kategori);
  const secili = kalemler.find((k) => k._id === pencere?.id);
  const tutarGecerli = form.tutar >= 0.01 && /^\d{1,13}(?:\.\d{1,2})?$/.test(String(form.tutar));
  const formGecerli = altKategoriler.some(({ id }) => id === form.altKategori)
    && form.tarih && form.no.trim() && tutarGecerli && Number(form.adet) >= 0 && (!musteriToken || secili || giren.trim());

  const formHatasiniTemizle = () => {
    istekId.current = null;
    setPencereHatasi('');
  };

  const formAlani = (alan, deger) => {
    setForm((onceki) => ({ ...onceki, [alan]: deger }));
    formHatasiniTemizle();
  };

  const pencereAc = (tur, kalem) => {
    istekId.current = null;
    setPencereHatasi('');
    const ilkYevmiye = {
      yevmiyeNo: kalem?.yevmiyeNo || '', yevmiyeTarihi: String(kalem?.yevmiyeTarihi || '').slice(0, 10)
    };
    const ilkForm = kalem && tur === 'form' ? {
      altKategori: kalem.altKategori, tarih: String(kalem.tarih || '').slice(0, 10), no: kalem.no,
      ...ilkYevmiye,
      icerik: kalem.icerik || '', tutar: kalem.tutar, adet: kalem.adet || ''
    } : BOS_KALEM;
    setForm(ilkForm);
    setPencere({ tur, id: kalem?._id, ilkForm });
  };

  const islemYap = async (tur, fn, hataGoster, mesaj) => {
    if (devamEden.current) return false;
    const controller = new AbortController();
    devamEden.current = controller;
    setIslem(tur);
    if (tur !== 'indir') {
      listeIstegi.current?.abort();
      setYukleniyor(false);
    }
    hataGoster?.('');
    try {
      await fn(controller.signal);
      return !controller.signal.aborted;
    } catch (error) {
      if (controller.signal.aborted) return false;
      if (!hataGoster) throw error;
      const aciklama = await hataMesaji(error, mesaj);
      if (!controller.signal.aborted) hataGoster(aciklama);
      return false;
    } finally {
      devamEden.current = null;
      if (!controller.signal.aborted) setIslem('');
    }
  };

  const kalemiYansit = (kalem) => setVeri((onceki) => ({
    ...onceki,
    kalemler: onceki.kalemler.some((k) => k._id === kalem._id)
      ? onceki.kalemler.map((k) => k._id === kalem._id ? kalem : k)
      : [...onceki.kalemler, kalem]
  }));

  const kaydet = (event) => {
    event.preventDefault();
    if (!kalemEklenebilir || !formGecerli || (secili && !kalemDuzenlenebilir(secili))) return;
    islemYap('kalem', async (signal) => {
      const { yevmiyeNo, yevmiyeTarihi, ...digerAlanlar } = form;
      const govde = {
        ...digerAlanlar, kategori, no: form.no.trim(), icerik: form.icerik.trim(), adet: Number(form.adet)
      };
      const duzeltilenNo = yevmiyeNo.trim();
      if (!secili || duzeltilenNo !== pencere.ilkForm.yevmiyeNo) govde.yevmiyeNo = duzeltilenNo;
      if (!secili || yevmiyeTarihi !== pencere.ilkForm.yevmiyeTarihi) govde.yevmiyeTarihi = yevmiyeTarihi;
      if (!secili) {
        if (!istekId.current) istekId.current = yeniIstekId();
        govde.istekId = istekId.current;
      }
      let sonuc;
      if (musteriToken) {
        const ilkDegerler = {
          ...pencere.ilkForm, no: pencere.ilkForm.no.trim(),
          icerik: pencere.ilkForm.icerik.trim(), adet: Number(pencere.ilkForm.adet)
        };
        const musteriGovdesi = secili
          ? Object.fromEntries(Object.entries(govde).filter(([alan, deger]) => (
            alan !== 'kategori' && deger !== ilkDegerler[alan]
          ))) : govde;
        if (secili && !Object.keys(musteriGovdesi).length) {
          setPencere(null);
          return;
        }
        const veri = { ...musteriGovdesi, giren: giren.trim() };
        sonuc = secili
          ? await svc.musteriHarcamaGuncelle(musteriToken, secili._id, veri, { signal })
          : await svc.musteriHarcamaEkle(musteriToken, veri, { signal });
        if (!signal.aborted) {
          try { localStorage.setItem(GIREN_ANAHTARI, giren.trim()); } catch { /* depolama kapalı */ }
        }
      } else sonuc = secili
        ? await svc.harcamaGuncelle(tesvikModel, tesvikId, secili._id, govde)
        : await svc.harcamaEkle(tesvikModel, tesvikId, govde);
      if (signal.aborted) return;
      kalemiYansit(sonuc);
      if (evrakEklenebilir(sonuc)) pencereAc('evrak', sonuc);
      else setPencere(null);
    }, setPencereHatasi, 'Harcama kalemi kaydedilemedi.');
  };

  const evrakYukle = (kalemId, formData, onProgress) => islemYap('evrak', async (signal) => {
    const secenekler = { onProgress, signal };
    const kalem = musteriToken
      ? await svc.musteriHarcamaEvrakiYukle(musteriToken, kalemId, formData, secenekler)
      : await svc.harcamaEvrakiYukle(tesvikModel, tesvikId, kalemId, formData, secenekler);
    if (!signal.aborted) kalemiYansit(kalem);
  });

  const evrakIndir = (kalem, evrak) => islemYap('indir', async () => {
    const response = await svc.harcamaEvrakiIndir(tesvikModel, tesvikId, kalem._id, evrak._id);
    saveBlobResponse(response, evrak.dosyaAdi);
  }, setPencereHatasi, 'Evrak indirilemedi.');

  const kalemiSil = () => islemYap('sil', async () => {
    await svc.harcamaSil(tesvikModel, tesvikId, secili._id);
    setVeri((onceki) => ({ ...onceki, kalemler: onceki.kalemler.filter((k) => k._id !== secili._id) }));
    setPencere(null);
  }, setPencereHatasi, 'Harcama kalemi silinemedi.');

  const kapat = () => { if (!devamEden.current) setPencere(null); };

  return (
    <Paper component="section" aria-label={baslik} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <Typography component="h2" variant="h6" fontWeight={700}>{baslik}</Typography>
        {kalemEklenebilir && <Button variant="contained" startIcon={<AddIcon />} onClick={() => pencereAc('form')}
          disabled={yukleniyor || !!hata || !altKategoriler.length}>Kalem Gir</Button>}
      </Stack>
      {hata && <Alert severity="error" action={<Button color="inherit" onClick={() => setYeniden((n) => n + 1)}>Tekrar Dene</Button>}>
        {hata}
      </Alert>}
      {yukleniyor && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={28} aria-label="Harcamalar yükleniyor" /></Box>}
      {!yukleniyor && !hata && !kalemler.length && <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
        Henüz harcama kalemi yok.
      </Typography>}
      {!yukleniyor && !hata && !!kalemler.length && <TableContainer>
        <Table size="small" aria-label={`${baslik} kalemleri`} sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow>
              <TableCell>Sıra</TableCell><TableCell>Fatura Tarihi</TableCell><TableCell>Fatura Sayısı</TableCell>
              <TableCell>Yevmiye No</TableCell><TableCell>Yevmiye Tarihi</TableCell>
              <TableCell>Kalem İçeriği</TableCell><TableCell align="right">Adet</TableCell>
              <TableCell align="right">Kalem Tutarı (TL)</TableCell><TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          {altKategoriler.map(({ id, etiket }) => {
            const satirlar = kalemler.filter((k) => k.altKategori === id);
            if (!satirlar.length) return null;
            return <TableBody key={id}>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell component="th" scope="rowgroup" colSpan={7} sx={{ fontWeight: 700 }}>{etiket}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{para(kurusToplami(satirlar))}</TableCell>
                <TableCell />
              </TableRow>
              {satirlar.map((k, i) => <TableRow key={k._id} hover>
                <TableCell>{i + 1}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{tarihMetni(k.tarih)}</TableCell>
                <TableCell>{k.no}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>{k.yevmiyeNo || '–'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{tarihMetni(k.yevmiyeTarihi)}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere', maxWidth: 360 }}>{k.icerik || '–'}</TableCell>
                <TableCell align="right">{k.adet || '–'}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatMoney(k.tutar)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {(evrakEklenebilir(k) || (!musteriToken && !!k.evraklar?.length)) && <Button size="small" startIcon={<AttachFileIcon />}
                    onClick={() => pencereAc('evrak', k)} aria-label={`${k.no} evrakları`}>
                    {k.evraklar?.length ? `Evraklar (${k.evraklar.length})` : 'Evrak Yükle'}
                  </Button>}
                  {kalemDuzenlenebilir(k) && <IconButton size="small" aria-label={`${k.no} düzenle`}
                    onClick={() => pencereAc('form', k)}><EditIcon fontSize="small" /></IconButton>}
                  {duzenlenebilir && <>
                    <IconButton size="small" color="error" aria-label={`${k.no} sil`} onClick={() => pencereAc('sil', k)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </>}
                </TableCell>
              </TableRow>)}
            </TableBody>;
          })}
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row" colSpan={7} sx={{ fontWeight: 700 }}>Genel Toplam</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{para(kurusToplami(kalemler))}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>}

      {pencere?.tur === 'form' && <Dialog open fullWidth maxWidth="sm" onClose={kapat} aria-labelledby="harcama-form-baslik">
        <Box component="form" onSubmit={kaydet}>
          <DialogTitle id="harcama-form-baslik">{secili ? 'Harcama Kalemini Düzenle' : 'Yeni Harcama Kalemi'}</DialogTitle>
          <DialogContent dividers>
            <TextField select fullWidth required size="small" label="Harcama Türü" value={form.altKategori} disabled={!!islem}
              onChange={(event) => formAlani('altKategori', event.target.value)}>
              {altKategoriler.map(({ id, etiket }) => <MenuItem key={id} value={id}>{etiket}</MenuItem>)}
            </TextField>
            {form.altKategori && <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}><TextField type="date" label="Fatura Tarihi" size="small" fullWidth required
                InputLabelProps={{ shrink: true }} value={form.tarih} disabled={!!islem} onChange={(e) => formAlani('tarih', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Fatura Sayısı" size="small" fullWidth required inputProps={{ maxLength: 100 }}
                value={form.no} disabled={!!islem} onChange={(e) => formAlani('no', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Yevmiye No" size="small" fullWidth inputProps={{ maxLength: 100 }}
                value={form.yevmiyeNo} disabled={!!islem} onChange={(e) => formAlani('yevmiyeNo', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField type="date" label="Yevmiye Tarihi" size="small" fullWidth
                InputLabelProps={{ shrink: true }} value={form.yevmiyeTarihi} disabled={!!islem}
                onChange={(e) => formAlani('yevmiyeTarihi', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField label="Kalem İçeriği" size="small" fullWidth inputProps={{ maxLength: 500 }}
                value={form.icerik} disabled={!!islem} onChange={(e) => formAlani('icerik', e.target.value)} /></Grid>
              <Grid item xs={8}><TutarAlani label="Kalem Tutarı (TL)" size="small" fullWidth required
                value={form.tutar} disabled={!!islem} onChange={(v) => formAlani('tutar', v)}
                error={form.tutar !== 0 && !tutarGecerli}
                helperText={form.tutar !== 0 && !tutarGecerli ? 'En fazla iki ondalık haneli, pozitif tutar girin.' : undefined} /></Grid>
              <Grid item xs={4}><TextField type="number" label="Adet" size="small" fullWidth inputProps={{ min: 0, step: 'any' }}
                value={form.adet} disabled={!!islem} onChange={(e) => formAlani('adet', e.target.value)} /></Grid>
              {musteriToken && <Grid item xs={12}>
                <TextField label="Adınız Soyadınız" size="small" fullWidth required={!secili} inputProps={{ maxLength: 120 }}
                  value={giren} disabled={!!islem} onChange={(e) => { setGiren(e.target.value); formHatasiniTemizle(); }} />
              </Grid>}
            </Grid>}
            {pencereHatasi && <Alert severity="error" sx={{ mt: 2 }}>{pencereHatasi}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={kapat} disabled={!!islem}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={!!islem || !formGecerli}>{islem ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </DialogActions>
        </Box>
      </Dialog>}

      {pencere?.tur === 'evrak' && secili && <Dialog open fullWidth maxWidth="sm" onClose={kapat} aria-labelledby="harcama-evrak-baslik">
        <DialogTitle id="harcama-evrak-baslik">{secili.no} Evrakları</DialogTitle>
        <DialogContent dividers>
          {evrakEklenebilir(secili) ? <KalemEvrakPaneli key={secili._id} kalem={secili} islem={islem}
            onYukle={evrakYukle} onIndir={musteriToken ? undefined : (evrak) => evrakIndir(secili, evrak)} /> : (
            <Stack alignItems="flex-start">
              {secili.evraklar.map((evrak) => <Button key={evrak._id} onClick={() => evrakIndir(secili, evrak)} disabled={!!islem}
                sx={{ textTransform: 'none' }}>{evrak.dosyaAdi}</Button>)}
            </Stack>
          )}
          {pencereHatasi && <Alert severity="error" sx={{ mt: 2 }}>{pencereHatasi}</Alert>}
        </DialogContent>
        <DialogActions><Button onClick={kapat} disabled={!!islem}>Kapat</Button></DialogActions>
      </Dialog>}

      {pencere?.tur === 'sil' && secili && <Dialog open onClose={kapat} aria-labelledby="harcama-sil-baslik">
        <DialogTitle id="harcama-sil-baslik">Harcama Kalemini Sil</DialogTitle>
        <DialogContent dividers>
          <Typography>{secili.no} numaralı kalem ve bağlı evrakları silinecek.</Typography>
          {pencereHatasi && <Alert severity="error" sx={{ mt: 2 }}>{pencereHatasi}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={kapat} disabled={!!islem}>Vazgeç</Button>
          <Button onClick={kalemiSil} color="error" variant="contained" disabled={!!islem}>{islem ? 'Siliniyor…' : 'Sil'}</Button>
        </DialogActions>
      </Dialog>}
    </Paper>
  );
}
