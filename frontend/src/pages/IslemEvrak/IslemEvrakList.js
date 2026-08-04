// 🧩 İŞLEM VE EVRAK YÖNETİMİ - Talep listesi (/islem-evrak)
// Müşteri akışı: Firma seç → İstenenler listesi → Evraklar → Mail gönderme
// Bu ekran taleplerin listesi + yeni talep başlatma adımıdır.

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, MenuItem,
  Snackbar, Alert, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/islemEvrakService';
import api from '../../utils/axios';

const DURUM_ETIKET = {
  taslak: { label: 'Taslak', color: '#64748b', bg: '#f1f5f9' },
  mail_gonderildi: { label: 'Mail Gönderildi', color: '#1d4ed8', bg: '#dbeafe' },
  kismi_geldi: { label: 'Kısmi Geldi', color: '#b45309', bg: '#fef3c7' },
  tamamlandi: { label: 'Tamamlandı', color: '#047857', bg: '#d1fae5' },
  iptal: { label: 'İptal', color: '#b91c1c', bg: '#fee2e2' }
};

const IslemEvrakList = () => {
  const navigate = useNavigate();
  const [talepler, setTalepler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('');
  const [snack, setSnack] = useState(null);

  // Yeni talep diyaloğu
  const [dialogAcik, setDialogAcik] = useState(false);
  const [turler, setTurler] = useState([]);
  const [firmalar, setFirmalar] = useState([]);
  const [firmaArama, setFirmaArama] = useState('');
  const [seciliFirma, setSeciliFirma] = useState(null);
  const [seciliTur, setSeciliTur] = useState('');
  const [seciliVaryant, setSeciliVaryant] = useState('');
  const [kaydediyor, setKaydediyor] = useState(false);

  const notify = (message, severity = 'success') => setSnack({ message, severity });
  const errMsg = (e) => e?.response?.data?.message || e?.message || 'İşlem başarısız';

  const yukle = useCallback(async () => {
    setLoading(true);
    try {
      const r = await svc.talepler({ q: arama || undefined, durum: durumFiltre || undefined, limit: 100 });
      setTalepler(r?.data || []);
    } catch (e) { notify(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [arama, durumFiltre]);

  useEffect(() => {
    const t = setTimeout(yukle, 300);
    return () => clearTimeout(t);
  }, [yukle]);

  useEffect(() => {
    svc.turler().then((d) => setTurler(d || [])).catch(() => setTurler([]));
  }, []);

  // Firma araması (diyalog için)
  useEffect(() => {
    if (!dialogAcik) return;
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/firma', { params: { arama: firmaArama || undefined, limit: 50 } });
        setFirmalar(r.data?.data?.firmalar || r.data?.data || []);
      } catch { setFirmalar([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [firmaArama, dialogAcik]);

  const secilenTur = turler.find((t) => t._id === seciliTur);

  const talepBaslat = async () => {
    if (!seciliFirma || !seciliTur) return notify('Firma ve işlem türü seçin', 'warning');
    setKaydediyor(true);
    try {
      const talep = await svc.talepOlustur({
        firmaId: seciliFirma._id,
        islemTuruId: seciliTur,
        varyantKod: seciliVaryant || undefined
      });
      setDialogAcik(false);
      setSeciliFirma(null); setSeciliTur(''); setSeciliVaryant('');
      navigate(`/islem-evrak/${talep._id}`);
    } catch (e) { notify(errMsg(e), 'error'); } finally { setKaydediyor(false); }
  };

  const sil = async (t) => {
    if (!window.confirm(`"${t.firmaAdi} — ${t.islemTuruAdi}" talebini kaldırmak istediğinize emin misiniz?`)) return;
    try {
      await svc.talepSil(t._id);
      setTalepler((p) => p.filter((x) => x._id !== t._id));
      notify('Talep kaldırıldı');
    } catch (e) { notify(errMsg(e), 'error'); }
  };

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <DescriptionIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>İşlem ve Evrak Yönetimi</Typography>
            <Typography variant="body2" color="text.secondary">
              Firmadan işlem bazlı evrak talebi: istenen belgeler, mail gönderimi ve gelen evrakların takibi
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogAcik(true)}>
            Yeni Talep
          </Button>
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              size="small" placeholder="Firma veya işlem ara..." value={arama}
              onChange={(e) => setArama(e.target.value)} sx={{ flex: 1, minWidth: 220 }}
            />
            <TextField
              select size="small" label="Durum" value={durumFiltre}
              onChange={(e) => setDurumFiltre(e.target.value)} sx={{ minWidth: 170 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {Object.entries(DURUM_ETIKET).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </TextField>
            <Tooltip title="Yenile">
              <IconButton onClick={yukle}><RefreshIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Paper>

        {loading && <LinearProgress sx={{ mb: 1 }} />}

        <Paper sx={{ p: 2 }}>
          {talepler.length === 0 && !loading && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Henüz talep yok. "Yeni Talep" ile firma ve işlem türü seçerek başlayabilirsiniz.
            </Typography>
          )}
          <Stack spacing={1}>
            {talepler.map((t) => {
              const d = DURUM_ETIKET[t.durum] || DURUM_ETIKET.taslak;
              return (
                <Box
                  key={t._id}
                  onClick={() => navigate(`/islem-evrak/${t._id}`)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                    p: 1.25, borderRadius: 2, border: '1px solid #e2e8f0', cursor: 'pointer',
                    '&:hover': { borderColor: '#3b82f6', bgcolor: '#f8fafc' }
                  }}
                >
                  <Chip size="small" label={d.label} sx={{ bgcolor: d.bg, color: d.color, fontWeight: 700 }} />
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{t.firmaAdi || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.islemTuruAdi}{t.varyantAd ? ` · ${t.varyantAd}` : ''}
                    </Typography>
                  </Box>
                  <Tooltip title="İstenen evrak / gelen">
                    <Chip size="small" variant="outlined" label={`${t.gelenSayisi}/${t.istenenSayisi} evrak`} />
                  </Tooltip>
                  {t.sonMailTarihi && (
                    <Typography variant="caption" color="text.secondary">
                      Mail: {new Date(t.sonMailTarihi).toLocaleDateString('tr-TR')}
                    </Typography>
                  )}
                  <Tooltip title="Aç">
                    <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); navigate(`/islem-evrak/${t._id}`); }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Kaldır">
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); sil(t); }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Box>

      {/* Yeni talep: firma + işlem türü (+ varyant) */}
      <Dialog open={dialogAcik} onClose={() => setDialogAcik(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Evrak Talebi</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Autocomplete
              options={firmalar}
              value={seciliFirma}
              onChange={(e, v) => setSeciliFirma(v)}
              onInputChange={(e, v, reason) => { if (reason === 'input') setFirmaArama(v); }}
              getOptionLabel={(f) => f.tamUnvan || ''}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              filterOptions={(x) => x}
              renderInput={(params) => <TextField {...params} label="Firma" size="small" placeholder="Firma ara..." />}
            />
            <TextField
              select size="small" label="İşlem Türü" value={seciliTur}
              onChange={(e) => { setSeciliTur(e.target.value); setSeciliVaryant(''); }}
            >
              {turler.map((t) => <MenuItem key={t._id} value={t._id}>{t.ad}</MenuItem>)}
            </TextField>
            {secilenTur?.varyantlar?.length > 0 && (
              <TextField
                select size="small" label="Tür (Şahıs / Şirket)" value={seciliVaryant}
                onChange={(e) => setSeciliVaryant(e.target.value)}
                helperText="Seçime göre istenen evraklar ve mail metni değişir"
              >
                {secilenTur.varyantlar.map((v) => <MenuItem key={v.kod} value={v.kod}>{v.ad}</MenuItem>)}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAcik(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={talepBaslat} disabled={kaydediyor || !seciliFirma || !seciliTur}>
            Talebi Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : null}
      </Snackbar>
    </LayoutWrapper>
  );
};

export default IslemEvrakList;
