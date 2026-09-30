/**
 * 🔧 Makine listesinde çift tıklanan makinenin Ekipman Takip satırı
 *
 * Müşteri (30.09.2026): "Makine listesinden çift tıklayınca sadece bu alttaki fotoğraftaki gibi
 * satır olarak görünse, biz işleme tıklayınca o makine işlemi genel sekmesi açılsa."
 *
 * Yani çift tıklama pencereyi DOĞRUDAN açmaz: önce Ekipman Takip'teki satırın aynısı listenin
 * altında belirir, İşlem düğmesine basınca süreç penceresi açılır.
 */
import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography, Button, Chip, IconButton, Skeleton } from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CloseIcon from '@mui/icons-material/Close';
import svc from '../../services/tesvikMakineService';
import { formatDate, formatMoney, StatusChip, listTypeLabel } from '../../pages/TesvikMakine/helpers';

export default function EkipmanSatiri({ tesvikModel, tesvikId, rowId, listType, makine, onKapat, onIslem }) {
  const [satir, setSatir] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    svc.getMachines(tesvikModel, tesvikId)
      .then((mc) => {
        if (iptal) return;
        setSatir((mc.rows || []).find((r) => String(r.rowId) === String(rowId)) || null);
      })
      .catch(() => { if (!iptal) setSatir(null); })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [tesvikModel, tesvikId, rowId]);

  const g = satir || {};
  const ad = g.machineName || makine?.adiVeOzelligi || makine?.adi || '-';

  return (
    <Box sx={{ mt: 1, border: '1px solid #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc', p: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
          EKİPMAN TAKİP — {listTypeLabel(listType)}
        </Typography>
        <IconButton size="small" sx={{ ml: 'auto' }} onClick={onKapat} aria-label="Kapat">
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
      {yukleniyor ? <Skeleton height={32} /> : (
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`${g.siraNo || makine?.siraNo || '-'}. sıra`} />
          {(g.makineId || makine?.makineId) && <Chip size="small" variant="outlined" label={`ID ${g.makineId || makine.makineId}`} />}
          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 180 }} noWrap>{ad}</Typography>
          <Typography variant="body2">{g.quantity || makine?.miktar || 0} {g.unit || ''}</Typography>
          <Typography variant="body2">{formatMoney(g.totalPrice, g.currency)}</Typography>
          <StatusChip badge={g.statusBadge} />
          <Typography variant="caption" color="text.secondary">Son mail: {formatDate(g.lastMailAt)}</Typography>
          <Typography variant="caption" color="text.secondary">Evrak: {g.documentCount || 0}</Typography>
          <Typography variant="caption" color="text.secondary">
            Fatura: {g.invoiceRealizedValue ? formatMoney(g.invoiceRealizedValue, g.currency) : '-'}
          </Typography>
          <Button size="small" variant="contained" startIcon={<BuildCircleIcon />} onClick={onIslem}>
            İşlem
          </Button>
        </Stack>
      )}
    </Box>
  );
}
