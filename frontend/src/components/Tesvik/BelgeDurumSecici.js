// 🎯 Listede belge durumu — belgeye girmeden değiştirilir.
//
// Müşteri (14.10.2026): "Birde acaba buradan belgenin içine girmeden Durum kısmını değiştirebilme gibi bir
// şey ekleyebilme ihtimalimiz olur mu acaba?" Belge sayfasındaki seçiciyle AYNI uç (PATCH /:id/durum):
// yetki (belgeDuzenle), doğrulama ve yan etkiler (firma pasif kuralı, iz kaydı) aynen geçerli.
import React, { useState } from 'react';
import { Chip, Menu, MenuItem, CircularProgress, Box } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import api from '../../utils/axios';
import { BELGE_DURUM_SECENEKLERI, belgeDurumLabel, belgeDurumRengi } from '../../utils/belgeDurum';

export default function BelgeDurumSecici({ belgeId, sistem = 'Eski', durum, onDegisti, onHata }) {
  const [menu, setMenu] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const sec = async (yeniDurum) => {
    setMenu(null);
    if (!yeniDurum || yeniDurum === durum) return;
    setKaydediliyor(true);
    try {
      const yol = sistem === 'Yeni' ? 'yeni-tesvik' : 'tesvik';
      const res = await api.patch(`/${yol}/${belgeId}/durum`, { yeniDurum });
      if (res?.data?.success === false) throw new Error(res.data.message || 'Durum güncellenemedi');
      if (onDegisti) onDegisti(yeniDurum);
    } catch (e) {
      if (onHata) onHata(e?.response?.data?.message || e.message || 'Durum güncellenemedi');
    } finally { setKaydediliyor(false); }
  };

  return (
    // Satıra tıklayınca belge açılıyor — seçici tıklaması satıra geçmesin
    <Box component="span" onClick={(e) => e.stopPropagation()}>
      <Chip
        label={belgeDurumLabel(durum)}
        size="small"
        onClick={(e) => setMenu(e.currentTarget)}
        onDelete={(e) => setMenu(e.currentTarget.parentElement)}
        deleteIcon={kaydediliyor ? <CircularProgress size={12} sx={{ color: 'white !important' }} /> : <ArrowDropDownIcon />}
        disabled={kaydediliyor}
        aria-haspopup="menu"
        aria-label={`Durum: ${belgeDurumLabel(durum)} — değiştir`}
        title="Durumu değiştir"
        sx={{
          backgroundColor: belgeDurumRengi(durum), color: 'white', fontSize: '0.75rem', fontWeight: 600,
          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.85)', '&:hover': { color: 'white' } },
          '&:hover': { backgroundColor: belgeDurumRengi(durum), filter: 'brightness(0.92)' }
        }}
      />
      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        {BELGE_DURUM_SECENEKLERI.map((o) => (
          <MenuItem key={o.value} selected={o.value === durum} onClick={() => sec(o.value)} dense>
            <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: o.renk, mr: 1, display: 'inline-block' }} />
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
