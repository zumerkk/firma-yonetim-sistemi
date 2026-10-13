// 🔗 "Müşteri Linki" düğmesi — belge sayfalarının ve Ekipman Takip'in sağ üstünde.
//
// Müşteri (13.10.2026): "Müşterinin sadece burayı görebileceği bir link üretmemiz mümkün mü acaba? …
// Olursa o linki de sağ üst kısma ekleyebilir miyiz?" Link: belge bilgileri (evrak listesi hariç) +
// yerli/ithal liste + firmanın makinelere fatura kalemi girmesi (backend services/musteriPortal).
import React, { useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip,
  Typography, Alert, Stack, CircularProgress, InputAdornment
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../utils/axios';

const tarihYaz = (v) => (v ? new Date(v).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '');

export default function MusteriLinkiDugmesi({ tesvikModel, tesvikId }) {
  const [acik, setAcik] = useState(false);
  const [bilgi, setBilgi] = useState(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const [kopyalandi, setKopyalandi] = useState(false);
  const adres = `/musteri-belge/yonetim/${tesvikModel}/${tesvikId}`;

  const istek = async (fn) => {
    setMesgul(true); setHata(''); setKopyalandi(false);
    try { setBilgi(await fn()); }
    catch (e) { setHata(e?.response?.data?.message || 'Link alınamadı'); }
    finally { setMesgul(false); }
  };

  // Açınca yalnız okunur; link bilerek üretilir (bakmak için açan kişi link yaratmasın)
  const ac = () => {
    setAcik(true);
    istek(async () => (await api.get(adres)).data?.data || null);
  };
  const uret = () => istek(async () => (await api.post(adres, {})).data?.data || null);
  const yenile = () => {
    if (!window.confirm('Yeni link üretilsin mi? Firmaya daha önce gönderdiğiniz link çalışmaz hale gelir.')) return;
    istek(async () => (await api.post(adres, { yenile: true })).data?.data || null);
  };
  const kapat = () => {
    if (!window.confirm('Link kapatılsın mı? Firma bu belgeyi artık göremez ve fatura kalemi giremez.')) return;
    istek(async () => { await api.delete(adres); return null; });
  };
  const kopyala = () => {
    if (!bilgi?.link) return;
    navigator.clipboard?.writeText(bilgi.link);
    setKopyalandi(true);
  };

  if (!tesvikId) return null;
  return (
    <>
      <Tooltip title="Firmanın belgeyi görüp makinelere fatura kalemi gireceği link">
        <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={ac}
          sx={{ textTransform: 'none', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          Müşteri Linki
        </Button>
      </Tooltip>
      <Dialog open={acik} onClose={() => setAcik(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Müşteri Belge Linki</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Firma bu linkle belge bilgilerini (evrak listesi hariç), yerli ve ithal makine listesini görür;
            makinelere fatura kalemi girebilir. Girdiği kalem kaydedilince firmaya kilitlenir
            ("Onaylandı"); düzeltme ve silme Ekipman Takip › Yerli / İthal Liste'den yapılır.
          </Typography>
          {mesgul && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}
          {!mesgul && bilgi?.link && (
            <>
              <TextField fullWidth size="small" value={bilgi.link} InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Kopyala"><IconButton size="small" onClick={kopyala}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Yeni sekmede aç"><IconButton size="small" component="a" href={bilgi.link} target="_blank" rel="noopener noreferrer"><OpenInNewIcon fontSize="small" /></IconButton></Tooltip>
                  </InputAdornment>
                )
              }} />
              {kopyalandi && <Alert severity="success" sx={{ mt: 1, py: 0 }}>Link kopyalandı</Alert>}
              {bilgi.olusturmaTarihi && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Oluşturma: {tarihYaz(bilgi.olusturmaTarihi)}{bilgi.olusturanAdi ? ` · ${bilgi.olusturanAdi}` : ''}
                </Typography>
              )}
            </>
          )}
          {!mesgul && !bilgi && !hata && (
            <Alert severity="info">Bu belge için henüz link üretilmedi. "Link Üret" ile oluşturabilirsiniz.</Alert>
          )}
          {hata && <Alert severity="error" sx={{ mt: 1 }}>{hata}</Alert>}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          <Stack direction="row" spacing={1}>
            {bilgi?.link && <Button color="error" size="small" onClick={kapat} disabled={mesgul}>Linki Kapat</Button>}
            {bilgi?.link
              ? <Button size="small" onClick={yenile} disabled={mesgul}>Yeni Link Üret</Button>
              : <Button size="small" variant="contained" onClick={uret} disabled={mesgul}>Link Üret</Button>}
          </Stack>
          <Button onClick={() => setAcik(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
