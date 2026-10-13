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
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Tooltip, Chip, Alert, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TutarAlani from '../../components/common/TutarAlani';
import svc from '../../services/tesvikMakineService';
import { formatDate, formatMoney } from './helpers';

const BOS = { tarih: '', no: '', icerik: '', tutar: 0, adet: '' };
const PARA_SIMGESI = { TRY: '₺', USD: '$', EUR: '€' };

export const kalemEtiketleri = (listType) => (listType === 'import'
  ? { tarih: 'Beyanname Tarihi', no: 'Beyanname No', baslik: 'Beyanname Kalemleri' }
  : { tarih: 'Fatura Tarihi', no: 'Fatura Sayısı', baslik: 'Fatura Kalemleri' });

export default function FaturaKalemleriDialog({ open, onClose, tesvikModel, tesvikId, makine, onChanged }) {
  const [proc, setProc] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [form, setForm] = useState(BOS);
  const [duzenlenen, setDuzenlenen] = useState(null); // kalem _id
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');

  const etiket = kalemEtiketleri(makine?.listType);
  const paraBirimi = makine?.currency || (makine?.listType === 'import' ? 'USD' : 'TRY');

  useEffect(() => {
    if (!open || !makine) return undefined;
    let iptal = false;
    setProc(null); setForm(BOS); setDuzenlenen(null); setHata(''); setBilgi('');
    setYukleniyor(true);
    // Süreç yoksa oluşturulur (makineye ilk kez fatura giriliyor olabilir)
    svc.ensureProcess({ tesvikModel, tesvikId, listType: makine.listType, rowId: makine.rowId })
      .then((p) => { if (!iptal) setProc(p); })
      .catch((e) => { if (!iptal) setHata(e?.response?.data?.message || 'Makine bilgisi alınamadı'); })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [open, makine, tesvikModel, tesvikId]);

  const kalemler = proc?.faturalar || [];
  const toplamTutar = kalemler.reduce((t, k) => t + (Number(k.tutar) || 0), 0);
  const toplamAdet = kalemler.reduce((t, k) => t + (Number(k.adet) || 0), 0);

  const alan = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const sonuc = (data, mesaj) => {
    setProc((p) => ({ ...p, ...data }));
    setForm(BOS); setDuzenlenen(null); setBilgi(mesaj); setHata('');
    if (onChanged) onChanged();
  };

  const kaydet = async () => {
    if (!proc) return;
    setMesgul(true); setHata(''); setBilgi('');
    const govde = { tarih: form.tarih || null, no: form.no, icerik: form.icerik, tutar: Number(form.tutar) || 0, adet: Number(form.adet) || 0 };
    try {
      const data = duzenlenen
        ? await svc.faturaKalemiGuncelle(proc._id, duzenlenen, govde)
        : await svc.faturaKalemiEkle(proc._id, govde);
      sonuc(data, duzenlenen ? 'Kalem güncellendi' : 'Kalem kaydedildi');
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
    const kim = k.kaynak === 'firma' ? ' Firmanın girdiği (onaylanmış) bir kalem.' : '';
    if (!window.confirm(`"${k.no || k.icerik || 'Kalem'}" silinsin mi?${kim}`)) return;
    setMesgul(true); setHata(''); setBilgi('');
    try { sonuc(await svc.faturaKalemiSil(proc._id, k._id), 'Kalem silindi'); }
    catch (e) { setHata(e?.response?.data?.message || 'Silinemedi'); }
    finally { setMesgul(false); }
  };

  const formDolu = form.no || form.icerik || form.tarih || Number(form.tutar) || Number(form.adet);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        {etiket.baslik}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Kapat"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Makine bilgisi */}
        <Box sx={{ bgcolor: '#f8fafc', p: 2, mb: 2 }}>
          <Grid container spacing={1}>
            <Bilgi etiket="Sıra No" deger={makine?.siraNo} xs={4} sm={2} />
            <Bilgi etiket="Makine ID" deger={makine?.makineId || '-'} xs={8} sm={3} />
            {makine?.listType === 'import' && <Bilgi etiket="GTİP" deger={makine?.gtipNo || '-'} xs={12} sm={3} />}
            <Bilgi etiket="Adet" deger={`${makine?.quantity || 0} ${makine?.unit || ''}`} xs={6} sm={2} />
            <Bilgi etiket={makine?.listType === 'import' ? 'FOB Toplam' : 'Toplam'} deger={formatMoney(makine?.totalPrice, paraBirimi)} xs={6} sm={makine?.listType === 'import' ? 2 : 5} />
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
                      <TableCell align="right">Kalem Tutarı</TableCell>
                      <TableCell align="right">Adet</TableCell>
                      <TableCell>Giren</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kalemler.map((k) => (
                      <TableRow key={k._id} selected={duzenlenen === k._id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(k.tarih)}</TableCell>
                        <TableCell>{k.no || '-'}</TableCell>
                        <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>{k.icerik || '-'}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatMoney(k.tutar, paraBirimi)}</TableCell>
                        <TableCell align="right">{k.adet || 0}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {k.kaynak === 'firma'
                            ? <Tooltip title={`Firma linkinden girildi${k.girenAdi ? ` — ${k.girenAdi}` : ''} · ${formatDate(k.girisTarihi, true)}`}>
                                <Chip size="small" color="success" label="Onaylandı · Firma" />
                              </Tooltip>
                            : <Typography variant="caption" color="text.secondary">{k.girenAdi || 'Personel'}</Typography>}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Düzelt"><span><IconButton size="small" disabled={mesgul} onClick={() => duzenle(k)}><EditIcon fontSize="small" /></IconButton></span></Tooltip>
                          <Tooltip title="Sil"><span><IconButton size="small" color="error" disabled={mesgul} onClick={() => sil(k)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Toplam</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMoney(toplamTutar, paraBirimi)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{toplamAdet}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* Kalem girişi */}
            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5 }}>
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
                  <TutarAlani fullWidth size="small" label="Kalem Tutarı" value={form.tutar} simge={PARA_SIMGESI[paraBirimi] || paraBirimi}
                    onChange={(v) => setForm((f) => ({ ...f, tutar: v }))} />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField fullWidth size="small" type="number" label="Adet" value={form.adet} onChange={alan('adet')}
                    inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ height: '100%' }} alignItems="center">
                    {duzenlenen && <Button onClick={() => { setDuzenlenen(null); setForm(BOS); }} disabled={mesgul}>Vazgeç</Button>}
                    <Button variant="contained" startIcon={mesgul ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={kaydet} disabled={mesgul || !formDolu}>
                      Kaydet
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
        {hata && <Alert severity="error" sx={{ mt: 2 }}>{hata}</Alert>}
        {bilgi && <Alert severity="success" sx={{ mt: 2 }}>{bilgi}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Kapat</Button></DialogActions>
    </Dialog>
  );
}

function Bilgi({ etiket, deger, xs, sm }) {
  return (
    <Grid item xs={xs} sm={sm}>
      <Typography variant="caption" color="text.secondary" display="block">{etiket}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>{deger ?? '-'}</Typography>
    </Grid>
  );
}
