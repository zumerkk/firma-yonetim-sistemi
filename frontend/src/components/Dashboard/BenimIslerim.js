/**
 * 🏠 Benim İşlerim — kişisel ana sayfa özeti
 *
 * Müşteri (29.09.2026): "Dashboard'ı personelin kendine özel arayüzü haline getirmeyi düşünüyoruz
 * ama, dashboarda/ana sayfaya girince, mevcut kendi açtığı talepler, belgelerden mail geldiyse
 * mailler vs tarzı bir arayüz düşünüyoruz."
 *
 * Üç sütun: takibi bende olan açık talepler, benim açtığım açık talepler ve bu taleplere
 * firmadan gelen son dosyalar. Hepsi tıklanabilir — satıra tıklayınca talep açılır.
 *
 * Müşteri (05.10.2026): "Burada talepleri vs. aşağıya kaydırmalı liste yapma şansımız var mı sadece
 * 10 adet görünüyor." Sunucu artık hepsini gönderiyor; her sütun ~10 satır yüksekliğinde sabit kalıp
 * kendi içinde kayıyor, sayaç toplamı gösteriyor.
 *
 * Müşteri (07.10.2026): "Belge takip için bildirim gönderince maile gidiyor ya aynı şekilde Dashboard'ına
 * da düşme şansı var mı acaba?" — dördüncü sütun "Bana Gelen Notlar": talep notunda bana gönderilen
 * bildirimler (son 30 gün). Okunmamışlar kalın; tıklayınca okundu işaretlenir ve talep açılır.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Chip, Stack, Skeleton } from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import ChatIcon from '@mui/icons-material/ChatOutlined';
import api from '../../utils/axios';

const tarih = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '-');

function Liste({ baslik, ikon, kayitlar, bos, satirCiz, onAc, yukleniyor, sayac }) {
  return (
    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, bgcolor: '#fff', height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1}
        sx={{ px: 1.5, py: 1, borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
        {ikon}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{baslik}</Typography>
        {sayac || <Chip size="small" label={kayitlar.length} sx={{ ml: 'auto', height: 20 }} />}
      </Stack>
      {/* ~10 satır görünür, fazlası sütunun içinde kayar (sayfa uzamaz) */}
      <Box sx={{ p: 1, maxHeight: 440, overflowY: 'auto', overscrollBehavior: 'contain' }}>
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
  const [veri, setVeri] = useState({ takibimde: [], actiklarim: [], sonYuklemeler: [], gelenNotlar: [] });
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;
    api.get('/dosya-takip/benim')
      .then((y) => { if (!iptal && y.data?.success) setVeri({ gelenNotlar: [], ...y.data.data }); })
      .catch(() => { /* ana sayfa bu yüzden bozulmasın */ })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, []);

  const ac = (k) => navigate(`/dosya-takip/${k._id}`);
  // Not bildirimi: okunmamışsa okundu işaretle (zildeki sayı da düşsün), sonra talebi aç
  const notuAc = (n) => {
    if (!n.okundu && n._id) {
      api.patch(`/notifications/${n._id}/read`).catch(() => { /* açılış bundan etkilenmesin */ });
      setVeri((v) => ({ ...v, gelenNotlar: v.gelenNotlar.map((x) => (x._id === n._id ? { ...x, okundu: true } : x)) }));
    }
    if (n.talepId) navigate(`/dosya-takip/${n.talepId}`);
  };
  const okunmamis = (veri.gelenNotlar || []).filter((n) => !n.okundu).length;
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
      <Grid item xs={12} md={6} lg={3}>
        <Liste baslik="Takibi Bende" ikon={<AssignmentIndIcon sx={{ fontSize: 16 }} />}
          kayitlar={veri.takibimde} yukleniyor={yukleniyor} onAc={ac} satirCiz={talepSatiri}
          bos="Üzerinize atanmış açık talep yok." />
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Liste baslik="Açtığım Talepler" ikon={<FolderSharedIcon sx={{ fontSize: 16 }} />}
          kayitlar={veri.actiklarim} yukleniyor={yukleniyor} onAc={ac} satirCiz={talepSatiri}
          bos="Açtığınız açık talep yok." />
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
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
      <Grid item xs={12} md={6} lg={3}>
        <Liste baslik="Bana Gelen Notlar" ikon={<ChatIcon sx={{ fontSize: 16 }} />}
          kayitlar={veri.gelenNotlar || []} yukleniyor={yukleniyor} onAc={notuAc}
          bos="Son 30 günde size gönderilen not yok."
          sayac={(
            <Chip size="small" label={okunmamis ? `${okunmamis} yeni` : (veri.gelenNotlar || []).length}
              color={okunmamis ? 'primary' : 'default'} sx={{ ml: 'auto', height: 20 }} />
          )}
          satirCiz={(n) => (
            <>
              <Typography variant="body2" sx={{ fontWeight: n.okundu ? 500 : 800 }} noWrap>{n.firmaUnvan || '-'}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {n.gonderen || '-'} · {n.tarih ? new Date(n.tarih).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
              </Typography>
              <Typography variant="caption" component="div"
                sx={{ color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-line' }}>
                {n.not}
              </Typography>
            </>
          )} />
      </Grid>
    </Grid>
  );
}
