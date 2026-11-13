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

const BOS_KALEM = { altKategori: '', tarih: '', no: '', icerik: '', tutar: 0, adet: '' };
const kurusToplami = (kalemler) => kalemler.reduce((toplam, kalem) => toplam + Math.round(kalem.tutar * 100), 0);
const para = (kurus) => formatMoney(kurus / 100, 'TRY');
const yeniIstekId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const tarihMetni = (tarih) => tarih ? tarih.slice(0, 10).split('-').reverse().join('.') : '–';

export default function Harcamalar({ tesvikModel, tesvikId, kategori, baslik, duzenlenebilir, yenileme }) {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [yeniden, setYeniden] = useState(0);
  const [pencere, setPencere] = useState(null);
  const [form, setForm] = useState(BOS_KALEM);
  const [islem, setIslem] = useState('');
  const [pencereHatasi, setPencereHatasi] = useState('');
  const istekId = useRef(null);
  const devamEden = useRef(false);
  const listeIstegi = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    listeIstegi.current = controller;
    setYukleniyor(true);
    setHata('');
    svc.harcamalariGetir(tesvikModel, tesvikId, { signal: controller.signal })
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
  }, [tesvikModel, tesvikId, yenileme, yeniden]);

  const altKategoriler = veri?.kategoriler?.[kategori]?.altKategoriler || [];
  const kalemler = (veri?.kalemler || []).filter((k) => k.kategori === kategori);
  const secili = kalemler.find((k) => k._id === pencere?.id);
  const tutarGecerli = form.tutar >= 0.01 && /^\d{1,13}(?:\.\d{1,2})?$/.test(String(form.tutar));
  const formGecerli = altKategoriler.some(({ id }) => id === form.altKategori)
    && form.tarih && form.no.trim() && tutarGecerli && Number(form.adet) >= 0;

  const formAlani = (alan, deger) => {
    setForm((onceki) => ({ ...onceki, [alan]: deger }));
    istekId.current = null;
    setPencereHatasi('');
  };

  const pencereAc = (tur, kalem) => {
    istekId.current = null;
    setPencereHatasi('');
    setForm(kalem && tur === 'form' ? {
      altKategori: kalem.altKategori, tarih: String(kalem.tarih || '').slice(0, 10), no: kalem.no,
      icerik: kalem.icerik || '', tutar: kalem.tutar, adet: kalem.adet || ''
    } : BOS_KALEM);
    setPencere({ tur, id: kalem?._id });
  };

  const islemYap = async (tur, fn, hataGoster, mesaj) => {
    if (devamEden.current) return false;
    devamEden.current = true;
    setIslem(tur);
    if (tur !== 'indir') {
      listeIstegi.current?.abort();
      setYukleniyor(false);
    }
    hataGoster?.('');
    try {
      await fn();
      return true;
    } catch (error) {
      if (!hataGoster) throw error;
      hataGoster(await hataMesaji(error, mesaj));
      return false;
    } finally {
      devamEden.current = false;
      setIslem('');
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
    if (!duzenlenebilir || !formGecerli) return;
    islemYap('kalem', async () => {
      const govde = { ...form, kategori, no: form.no.trim(), icerik: form.icerik.trim(), adet: Number(form.adet) };
      if (!secili) {
        if (!istekId.current) istekId.current = yeniIstekId();
        govde.istekId = istekId.current;
      }
      const sonuc = secili
        ? await svc.harcamaGuncelle(tesvikModel, tesvikId, secili._id, govde)
        : await svc.harcamaEkle(tesvikModel, tesvikId, govde);
      kalemiYansit(sonuc);
      pencereAc('evrak', sonuc);
    }, setPencereHatasi, 'Harcama kalemi kaydedilemedi.');
  };

  const evrakYukle = (kalemId, formData, onProgress) => islemYap('evrak', async () => {
    const kalem = await svc.harcamaEvrakiYukle(tesvikModel, tesvikId, kalemId, formData, { onProgress });
    kalemiYansit(kalem);
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
        {duzenlenebilir && <Button variant="contained" startIcon={<AddIcon />} onClick={() => pencereAc('form')}
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
        <Table size="small" aria-label={`${baslik} kalemleri`} sx={{ minWidth: 660 }}>
          <TableHead>
            <TableRow>
              <TableCell>Sıra</TableCell><TableCell>Fatura Tarihi</TableCell><TableCell>Fatura Sayısı</TableCell>
              <TableCell>Kalem İçeriği</TableCell><TableCell align="right">Adet</TableCell>
              <TableCell align="right">Kalem Tutarı (TL)</TableCell><TableCell>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          {altKategoriler.map(({ id, etiket }) => {
            const satirlar = kalemler.filter((k) => k.altKategori === id);
            if (!satirlar.length) return null;
            return <TableBody key={id}>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell component="th" scope="rowgroup" colSpan={5} sx={{ fontWeight: 700 }}>{etiket}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{para(kurusToplami(satirlar))}</TableCell>
                <TableCell />
              </TableRow>
              {satirlar.map((k, i) => <TableRow key={k._id} hover>
                <TableCell>{i + 1}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{tarihMetni(k.tarih)}</TableCell>
                <TableCell>{k.no}</TableCell><TableCell sx={{ overflowWrap: 'anywhere', maxWidth: 360 }}>{k.icerik || '–'}</TableCell>
                <TableCell align="right">{k.adet || '–'}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatMoney(k.tutar)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {(duzenlenebilir || !!k.evraklar?.length) && <Button size="small" startIcon={<AttachFileIcon />}
                    onClick={() => pencereAc('evrak', k)} aria-label={`${k.no} evrakları`}>
                    {k.evraklar?.length ? `Evraklar (${k.evraklar.length})` : 'Evrak Yükle'}
                  </Button>}
                  {duzenlenebilir && <>
                    <IconButton size="small" aria-label={`${k.no} düzenle`} onClick={() => pencereAc('form', k)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" aria-label={`${k.no} sil`} onClick={() => pencereAc('sil', k)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </>}
                </TableCell>
              </TableRow>)}
            </TableBody>;
          })}
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row" colSpan={5} sx={{ fontWeight: 700 }}>Genel Toplam</TableCell>
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
              <Grid item xs={12}><TextField label="Kalem İçeriği" size="small" fullWidth inputProps={{ maxLength: 500 }}
                value={form.icerik} disabled={!!islem} onChange={(e) => formAlani('icerik', e.target.value)} /></Grid>
              <Grid item xs={8}><TutarAlani label="Kalem Tutarı (TL)" size="small" fullWidth required
                value={form.tutar} disabled={!!islem} onChange={(v) => formAlani('tutar', v)}
                error={form.tutar !== 0 && !tutarGecerli}
                helperText={form.tutar !== 0 && !tutarGecerli ? 'En fazla iki ondalık haneli, pozitif tutar girin.' : undefined} /></Grid>
              <Grid item xs={4}><TextField type="number" label="Adet" size="small" fullWidth inputProps={{ min: 0, step: 'any' }}
                value={form.adet} disabled={!!islem} onChange={(e) => formAlani('adet', e.target.value)} /></Grid>
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
          {duzenlenebilir ? <KalemEvrakPaneli key={secili._id} kalem={secili} islem={islem}
            onYukle={evrakYukle} onIndir={(evrak) => evrakIndir(secili, evrak)} /> : (
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
