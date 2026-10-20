import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../utils/axios';
import { hataMesajiSenkron } from '../../utils/hataMesaji';
import { useAuth } from '../../contexts/AuthContext';

export default function BelgeOzelNotlar({ tesvikModel, tesvikId }) {
  const { user } = useAuth();
  const duzenleyebilir = ['admin', 'kullanici'].includes(user?.rol);
  const [notlar, setNotlar] = useState([]);
  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [silinecek, setSilinecek] = useState(null);
  const [siliniyor, setSiliniyor] = useState(false);
  const kimlik = `${tesvikModel}/${tesvikId}`;
  const kimlikRef = useRef(kimlik);
  kimlikRef.current = kimlik;
  const adres = `/musteri-belge/yonetim/${kimlik}/notlar`;

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true); setHata(''); setMetin(''); setNotlar([]); setSilinecek(null); setSiliniyor(false);
    api.get(adres).then((r) => {
      if (!iptal) setNotlar(r.data?.data || []);
    }).catch((e) => {
      if (!iptal) setHata(hataMesajiSenkron(e));
    }).finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [adres]);

  const ekle = async () => {
    if (!duzenleyebilir || !metin.trim() || kaydediliyor) return;
    setKaydediliyor(true); setHata('');
    try {
      const r = await api.post(adres, { metin: metin.trim() });
      if (kimlikRef.current !== kimlik) return;
      setNotlar((onceki) => [r.data.data, ...onceki]); setMetin('');
    } catch (e) {
      if (kimlikRef.current === kimlik) setHata(hataMesajiSenkron(e));
    } finally { setKaydediliyor(false); }
  };

  const sil = async () => {
    if (!duzenleyebilir || !silinecek || siliniyor) return;
    setSiliniyor(true); setHata('');
    try {
      await api.delete(`${adres}/${silinecek._id}`);
      if (kimlikRef.current !== kimlik) return;
      setNotlar((onceki) => onceki.filter((not) => not._id !== silinecek._id));
      setSilinecek(null);
    } catch (e) {
      if (kimlikRef.current === kimlik) setHata(hataMesajiSenkron(e));
    } finally {
      if (kimlikRef.current === kimlik) setSiliniyor(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">Bu notlar yalnızca personel tarafından görülür.</Typography>
      {hata && <Alert severity="error">{hata}</Alert>}
      {duzenleyebilir && <><TextField label="Özel not" multiline minRows={3} fullWidth value={metin}
        disabled={kaydediliyor} onChange={(e) => setMetin(e.target.value)} inputProps={{ maxLength: 5000 }} />
      <Box><Button variant="contained" onClick={ekle} disabled={kaydediliyor || !metin.trim()}>
        {kaydediliyor ? 'Kaydediliyor…' : 'Not Ekle'}
      </Button></Box></>}
      {yukleniyor ? <CircularProgress size={24} aria-label="Notlar yükleniyor" /> : notlar.length === 0
        ? <Typography color="text.secondary">Henüz özel not yok.</Typography>
        : notlar.map((not) => (
          <Box key={not._id} sx={{ borderTop: '1px solid #e2e8f0', pt: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {not.kullaniciAdi} · {new Date(not.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
              </Typography>
              {duzenleyebilir && <IconButton aria-label="Notu sil" size="small" color="error" onClick={() => setSilinecek(not)}>
                <DeleteIcon fontSize="small" />
              </IconButton>}
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{not.metin}</Typography>
          </Box>
        ))}
      <Dialog open={!!silinecek} onClose={() => !siliniyor && setSilinecek(null)} fullWidth maxWidth="sm">
        <DialogTitle>Özel not silinsin mi?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{silinecek?.metin}</Typography>
          <Typography variant="caption" color="text.secondary">Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={siliniyor} onClick={() => setSilinecek(null)}>Vazgeç</Button>
          <Button disabled={siliniyor} color="error" variant="contained" onClick={sil}>{siliniyor ? 'Siliniyor…' : 'Sil'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
