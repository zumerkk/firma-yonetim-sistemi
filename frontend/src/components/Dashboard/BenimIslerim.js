/**
 * 🏠 Benim İşlerim — kişisel ana sayfa özeti
 *
 * Müşteri (29.09.2026): "Dashboard'ı personelin kendine özel arayüzü haline getirmeyi düşünüyoruz
 * ama, dashboarda/ana sayfaya girince, mevcut kendi açtığı talepler, belgelerden mail geldiyse
 * mailler vs tarzı bir arayüz düşünüyoruz."
 *
 * Üç sütun: takibi bende olan açık talepler, benim açtığım açık talepler ve bu taleplere
 * firmadan gelen son dosyalar. Hepsi tıklanabilir — satıra tıklayınca talep açılır.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Chip, Stack, Skeleton } from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import api from '../../utils/axios';

const tarih = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '-');

function Liste({ baslik, ikon, kayitlar, bos, satirCiz, onAc, yukleniyor }) {
  return (
    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, bgcolor: '#fff', height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1}
        sx={{ px: 1.5, py: 1, borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
        {ikon}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{baslik}</Typography>
        <Chip size="small" label={kayitlar.length} sx={{ ml: 'auto', height: 20 }} />
      </Stack>
      <Box sx={{ p: 1 }}>
        {yukleniyor && [1, 2, 3].map((i) => <Skeleton key={i} height={28} />)}
        {!yukleniyor && kayitlar.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>{bos}</Typography>
        )}
        {!yukleniyor && kayitlar.map((k, i) => (
          <Box key={k._id ? `${k._id}-${i}` : i} onClick={() => onAc(k)}
            sx={{
              px: 1, py: 0.75, borderRadius: 0.5, cursor: 'pointer',
              '&:hover': { bgcolor: '#f1f5f9' },
              borderBottom: i < kayitlar.length - 1 ? '1px dashed #e2e8f0' : 'none'
            }}>
            {satirCiz(k)}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function BenimIslerim() {
  const navigate = useNavigate();
  const [veri, setVeri] = useState({ takibimde: [], actiklarim: [], sonYuklemeler: [] });
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;
    api.get('/dosya-takip/benim')
      .then((y) => { if (!iptal && y.data?.success) setVeri(y.data.data); })
      .catch(() => { /* ana sayfa bu yüzden bozulmasın */ })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, []);

  const ac = (k) => navigate(`/dosya-takip/${k._id}`);
  const talepSatiri = (k) => (
    <>
      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{k.firmaUnvan || '-'}</Typography>
      <Typography variant="caption" color="text.secondary">
        {k.talepTuru || '-'}{k.ytbNo ? ` · ${k.ytbNo}` : ''} · {tarih(k.updatedAt || k.createdAt)}
      </Typography>
    </>
  );

  return (
    <Grid container spacing={1.2} sx={{ mb: 1.5 }}>
      <Grid item xs={12} md={4}>
        <Liste baslik="Takibi Bende" ikon={<AssignmentIndIcon sx={{ fontSize: 16 }} />}
          kayitlar={veri.takibimde} yukleniyor={yukleniyor} onAc={ac} satirCiz={talepSatiri}
          bos="Üzerinize atanmış açık talep yok." />
      </Grid>
      <Grid item xs={12} md={4}>
        <Liste baslik="Açtığım Talepler" ikon={<FolderSharedIcon sx={{ fontSize: 16 }} />}
          kayitlar={veri.actiklarim} yukleniyor={yukleniyor} onAc={ac} satirCiz={talepSatiri}
          bos="Açtığınız açık talep yok." />
      </Grid>
      <Grid item xs={12} md={4}>
        <Liste baslik="Firmadan Gelenler" ikon={<MarkEmailUnreadIcon sx={{ fontSize: 16 }} />}
          kayitlar={veri.sonYuklemeler} yukleniyor={yukleniyor} onAc={ac}
          bos="Henüz firmadan dosya gelmedi."
          satirCiz={(k) => (
            <>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{k.dosyaAdi}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {k.firmaUnvan || '-'}{k.ytbNo ? ` · ${k.ytbNo}` : ''} · {tarih(k.tarih)}
              </Typography>
            </>
          )} />
      </Grid>
    </Grid>
  );
}
