// 🧾 PUBLIC KDV MUAFİYET YAZISI İNDİRME - /kdv-muafiyet/:token  (AUTH YOK)
// Tedarikçiye giden mailde ek dosya yerine bu sayfanın bağlantısı yer alır
// (müşteri talebi: "kdv muafiyet yazısını bu linkten indirebilirsiniz ... ekten ziyade").
// LayoutWrapper KULLANMAZ — PublicUpload ile aynı sade kabuk.
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Button, Alert, CircularProgress, Stack, Divider } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import svc from '../../services/tesvikMakineService';

// Component DIŞINDA: içeride tanımlanırsa her render'da alt ağaç remount olur.
function Wrapper({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, maxWidth: 520, width: '100%' }}>{children}</Paper>
    </Box>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{value}</Typography>
    </Box>
  );
}

const trTarih = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '');

export default function KdvMuafiyetIndir() {
  const { token } = useParams();
  const [bilgi, setBilgi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [indiriliyor, setIndiriliyor] = useState(false);
  const [indirmeHatasi, setIndirmeHatasi] = useState('');

  useEffect(() => {
    let iptal = false;
    svc.kdvMuafiyetPublicInfo(token)
      .then((d) => { if (!iptal) setBilgi(d); })
      .catch((e) => { if (!iptal) setHata(e?.response?.data?.message || 'Bağlantı geçersiz veya süresi dolmuş.'); })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [token]);

  const indir = async () => {
    setIndiriliyor(true); setIndirmeHatasi('');
    try {
      const res = await svc.kdvMuafiyetPublicIndir(token);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = bilgi?.dosyaAdi || 'kdv-muafiyet-yazisi';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setIndirmeHatasi(e?.response?.data?.message || 'Dosya indirilemedi. Lütfen tekrar deneyin.');
    } finally { setIndiriliyor(false); }
  };

  if (yukleniyor) return <Wrapper><Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box></Wrapper>;
  if (hata) return <Wrapper><Alert severity="error">{hata}</Alert></Wrapper>;

  const gecerlilik = [trTarih(bilgi.gecerlilikBaslangic), trTarih(bilgi.gecerlilikBitis)].filter(Boolean).join(' – ');

  return (
    <Wrapper>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>KDV Muafiyet Yazısı</Typography>
        <Typography variant="body2" color="text.secondary">
          Aşağıdaki belgeyi bilgisayarınıza indirebilirsiniz.
        </Typography>
      </Stack>

      <Box sx={{ bgcolor: '#f8fafc', p: 2, mb: 2 }}>
        <Row label="Firma" value={bilgi.firmaAdi} />
        <Row label="Belge No" value={bilgi.belgeNo} />
        <Divider sx={{ my: 1 }} />
        <Row label="Dosya" value={bilgi.dosyaAdi} />
        <Row label="Geçerlilik" value={gecerlilik || 'Süresiz'} />
      </Box>

      {bilgi.suresiDoldu && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Bu yazının geçerlilik süresi {trTarih(bilgi.gecerlilikBitis)} tarihinde dolmuştur. Güncel yazı için lütfen yetkiliyle iletişime geçin.
        </Alert>
      )}
      {bilgi.henuzBaslamadi && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Bu yazı {trTarih(bilgi.gecerlilikBaslangic)} tarihinde geçerlilik kazanacaktır.
        </Alert>
      )}
      {indirmeHatasi && <Alert severity="error" sx={{ mb: 2 }}>{indirmeHatasi}</Alert>}

      <Button
        fullWidth variant="contained" size="large" onClick={indir} disabled={indiriliyor}
        startIcon={indiriliyor ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
      >
        {indiriliyor ? 'İndiriliyor…' : 'Yazıyı İndir'}
      </Button>

      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
        <DescriptionIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
        <Typography variant="caption" color="text.secondary">
          Bu bağlantı yalnızca ilgili yazının indirilmesi içindir.
        </Typography>
      </Stack>
    </Wrapper>
  );
}
