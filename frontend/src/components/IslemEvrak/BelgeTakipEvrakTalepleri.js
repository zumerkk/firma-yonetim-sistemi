// 📎 Belge Takip › Firma Maili — İşlem & Evrak evrak talebi (pencerede)
//
// Müşteri (22.09.2026): "'İşlem & Evrak' modülündeki yeni belge takibi mail kısmını, doğrudan 'Belge Takip'
// modülündeki mail gönderme kısmına da ekleyebilir miyiz bu 'mailde iste-evrak talebi kısmı da dahil
// (pop-up gibi olabilir firma maili kısmında o istenenler yeri küçük olduğu için)'? İki alanda da birebir
// aynı olsun isteniyor."
//
// Pencerede İşlem & Evrak'ın talep ekranının KENDİSİ açılır (IslemEvrakTalepPaneli): istenen evraklar ve
// "Mailde iste", örnek dosyalar, mail, yükleme linki, firmadan gelenler, ZIP. Talep Belge Takip talebine
// bağlıdır; İşlem & Evrak listesinde de "Belge Takip" işaretiyle görünür.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Button, Chip, Tooltip, Dialog, DialogTitle, DialogContent,
  IconButton, LinearProgress, useMediaQuery, useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import svc from '../../services/islemEvrakService';
import IslemEvrakTalepPaneli from './IslemEvrakTalepPaneli';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { talepDurumu } from './talepDurumlari';

const tarih = (d) => (d ? new Date(d).toLocaleDateString('tr-TR') : '');

/**
 * @param {string} dosyaTakipId  Belge Takip talebi
 * @param {{_id: string, tamUnvan?: string}|null} firma  talebin firması (yoksa evrak talebi açılamaz)
 * @param {Function} [onMesaj]   (mesaj, severity) => void
 */
export default function BelgeTakipEvrakTalepleri({ dosyaTakipId, firma, onMesaj }) {
  const tema = useTheme();
  const darEkran = useMediaQuery(tema.breakpoints.down('md'));
  const [talepler, setTalepler] = useState(null); // null = yükleniyor
  const [acikTalepId, setAcikTalepId] = useState(null);
  const [islemSuruyor, setIslemSuruyor] = useState(false);
  // Üst bileşen her çizimde yeni fonksiyon verebilir; bağımlılık olursa liste durmadan yeniden yüklenirdi
  const onMesajRef = useRef(onMesaj);
  onMesajRef.current = onMesaj;

  const yukle = useCallback(async () => {
    try {
      const r = await svc.talepler({ dosyaTakip: dosyaTakipId, limit: 50 });
      setTalepler(r?.data || []);
    } catch (e) {
      setTalepler([]);
      onMesajRef.current?.(e?.response?.data?.message || 'Evrak talepleri yüklenemedi', 'error');
    }
  }, [dosyaTakipId]);

  useEffect(() => { if (dosyaTakipId) yukle(); }, [dosyaTakipId, yukle]);

  const yeniTalep = async () => {
    if (islemSuruyor) return;
    setIslemSuruyor(true);
    try {
      const talep = await svc.talepOlustur({ firmaId: firma._id, dosyaTakipId });
      await yukle();
      setAcikTalepId(talep._id);
    } catch (e) { onMesajRef.current?.(e?.response?.data?.message || 'Talep oluşturulamadı', 'error'); }
    finally { setIslemSuruyor(false); }
  };
  const talepSil = async (t) => {
    if (!window.confirm('Bu evrak talebi listeden kaldırılacak ve yükleme bağlantısı kapanacak. Devam edilsin mi?')) return;
    setIslemSuruyor(true);
    try { await svc.talepSil(t._id); await yukle(); }
    catch (e) { onMesajRef.current?.(e?.response?.data?.message || 'Talep silinemedi', 'error'); }
    finally { setIslemSuruyor(false); }
  };

  const pencereyiKapat = () => { setAcikTalepId(null); yukle(); };
  const acikTalep = (talepler || []).find((t) => t._id === acikTalepId);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: '#bfdbfe', background: '#f8fbff' }}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
        <AssignmentIcon sx={{ color: '#1d4ed8' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 180 }}>
          Evrak Talebi (İşlem & Evrak)
        </Typography>
        <Tooltip title={firma ? '' : 'Bu talebe bağlı firma yok'}>
          <span>
            <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!firma || islemSuruyor}
              onClick={yeniTalep} sx={{ textTransform: 'none' }}>
              Yeni Evrak Talebi
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1.5 }}>
        İşlem & Evrak'taki ekranın aynısı açılır: istenecek evrakları "Mailde iste" ile seçin, örnek dosyaları
        ekleyin, maili gönderin. Firmanın yükleme bağlantısından gönderdikleri aynı pencerede takip edilir.
      </Typography>

      {talepler === null && <LinearProgress sx={{ mb: 1 }} />}
      {talepler?.length === 0 && (
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>Bu talepten açılmış evrak talebi yok.</Typography>
      )}
      <Stack spacing={1}>
        {(talepler || []).map((t) => {
          const d = talepDurumu(t.durum);
          return (
            <Box key={t._id} role="button" tabIndex={0}
              onClick={() => setAcikTalepId(t._id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAcikTalepId(t._id); } }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', p: 1.25, background: '#fff',
                border: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { borderColor: '#3b82f6', background: '#f8fafc' }
              }}>
              <Chip size="small" label={d.label} sx={{ bgcolor: d.bg, color: d.color, fontWeight: 700 }} />
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {t.islemTuruAdi}{t.varyantAd ? ` · ${t.varyantAd}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.sonMailTarihi ? `Son mail ${tarih(t.sonMailTarihi)}` : 'Mail henüz gönderilmedi'}
                  {t.olusturanAdi ? ` · ${t.olusturanAdi}` : ''}
                </Typography>
              </Box>
              <Tooltip title={`Mailde istenen ${t.istenenSayisi} evraktan ${t.gelenSayisi} tanesi geldi`}>
                <Chip size="small" variant="outlined" label={`${t.gelenSayisi}/${t.istenenSayisi} evrak`} />
              </Tooltip>
              <IconButton size="small" color="error" aria-label="Talebi sil" disabled={islemSuruyor}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); talepSil(t); }}><DeleteOutlineIcon /></IconButton>
              <Button size="small" endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none' }}>Aç</Button>
            </Box>
          );
        })}
      </Stack>

      {/* Talep ekranı — İşlem & Evrak sayfasıyla aynı bileşen */}
      <Dialog open={!!acikTalepId} onClose={pencereyiKapat} maxWidth="lg" fullWidth fullScreen={darEkran} scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.25, borderBottom: '1px solid #e2e8f0' }}>
          <AssignmentIcon sx={{ color: '#1d4ed8' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>Evrak Talebi</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {firma?.tamUnvan || acikTalep?.firmaAdi || ''}
            </Typography>
          </Box>
          <IconButton onClick={pencereyiKapat} aria-label="Kapat"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1, md: 2 }, background: '#f8fafc' }}>
          {acikTalepId && <IslemEvrakTalepPaneli talepId={acikTalepId} gomulu />}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
