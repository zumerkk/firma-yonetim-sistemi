import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import api from '../../utils/axios';
import { hataMesajiSenkron } from '../../utils/hataMesaji';

export default function BelgeOzelNotlar({ tesvikModel, tesvikId }) {
  const [notlar, setNotlar] = useState([]);
  const [metin, setMetin] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');
  const kimlik = `${tesvikModel}/${tesvikId}`;
  const kimlikRef = useRef(kimlik);
  kimlikRef.current = kimlik;
  const adres = `/musteri-belge/yonetim/${kimlik}/notlar`;

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true); setHata(''); setMetin(''); setNotlar([]);
    api.get(adres).then((r) => {
      if (!iptal) setNotlar(r.data?.data || []);
    }).catch((e) => {
      if (!iptal) setHata(hataMesajiSenkron(e));
    }).finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [adres]);

  const ekle = async () => {
    if (!metin.trim() || kaydediliyor) return;
    setKaydediliyor(true); setHata('');
    try {
      const r = await api.post(adres, { metin: metin.trim() });
      if (kimlikRef.current !== kimlik) return;
      setNotlar((onceki) => [r.data.data, ...onceki]); setMetin('');
    } catch (e) {
      if (kimlikRef.current === kimlik) setHata(hataMesajiSenkron(e));
    } finally { setKaydediliyor(false); }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">Bu notlar yalnızca personel tarafından görülür.</Typography>
      {hata && <Alert severity="error">{hata}</Alert>}
      <TextField label="Özel not" multiline minRows={3} fullWidth value={metin}
        disabled={kaydediliyor} onChange={(e) => setMetin(e.target.value)} inputProps={{ maxLength: 5000 }} />
      <Box><Button variant="contained" onClick={ekle} disabled={kaydediliyor || !metin.trim()}>
        {kaydediliyor ? 'Kaydediliyor…' : 'Not Ekle'}
      </Button></Box>
      {yukleniyor ? <CircularProgress size={24} aria-label="Notlar yükleniyor" /> : notlar.length === 0
        ? <Typography color="text.secondary">Henüz özel not yok.</Typography>
        : notlar.map((not) => (
          <Box key={not._id} sx={{ borderTop: '1px solid #e2e8f0', pt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {not.kullaniciAdi} · {new Date(not.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{not.metin}</Typography>
          </Box>
        ))}
    </Stack>
  );
}
