// 📎 Teşvik görüntüleme → Evrak Listesi: bu belgenin Belge Takip işlemleri ve belgeleri
//
// Müşteri (21.09.2026): "'Evrak Listesi' bölümüne, o belge numarasıyla ilgili 'Belge Takip' ekranında
// açılan işlemlerin adı ve ilgili belgeler otomatik olarak gelirse harika olur."
// Eşleşme sunucuda: belgeye bağlı talepler + belge no / belge ID'si tutanlar (bkz. belgeIslemleri).
// Dosyalar Belge Takip'in kendi indirme ucundan gelir (Cloudinary PDF teslimat kısıtı orada aşılıyor).

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Chip, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import {
    Download as DownloadIcon, OpenInNew as OpenInNewIcon, AttachFile as AttachFileIcon
} from '@mui/icons-material';
import axios from '../../utils/axios';

const tarih = (d) => (d ? new Date(d).toLocaleDateString('tr-TR') : '-');

async function dosyaAc(talepId, dosya, indir) {
    // Pencere tıklamayla eşzamanlı açılmalı; istek bitince açılırsa açılır pencere engelleyicisi keser
    const pencere = indir ? null : window.open('', '_blank');
    try {
        const { data } = await axios.get(`/dosya-takip/${talepId}/dosya-getir/${dosya._id}`, {
            params: { alan: 'dosyalar', dl: indir ? 1 : 0 },
            responseType: 'blob',
            timeout: 5 * 60 * 1000
        });
        const url = URL.createObjectURL(new Blob([data], { type: dosya.dosyaTipi || data.type || 'application/octet-stream' }));
        if (pencere) {
            pencere.document.title = dosya.dosyaAdi || 'Dosya';
            pencere.document.body.style.margin = '0';
            pencere.document.body.innerHTML = `<iframe src="${url}" style="border:0;width:100vw;height:100vh"></iframe>`;
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = dosya.dosyaAdi || 'dosya';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) {
        if (pencere) pencere.close();
        throw err;
    }
}

export default function BelgeTakipIslemleri({ belgeRef, belgeNo, belgeId }) {
    const navigate = useNavigate();
    const [talepler, setTalepler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState('');

    useEffect(() => {
        let iptal = false;
        setYukleniyor(true);
        axios.get('/dosya-takip/belge-islemleri', { params: { belge: belgeRef || undefined, belgeNo: belgeNo || undefined, belgeId: belgeId || undefined } })
            .then((r) => { if (!iptal) { setTalepler(Array.isArray(r.data?.data) ? r.data.data : []); setHata(''); } })
            .catch((e) => { if (!iptal) setHata(e?.response?.data?.message || 'Belge Takip işlemleri yüklenemedi.'); })
            .finally(() => { if (!iptal) setYukleniyor(false); });
        return () => { iptal = true; };
    }, [belgeRef, belgeNo, belgeId]);

    const ac = async (talepId, dosya, indir) => {
        try {
            await dosyaAc(talepId, dosya, indir);
        } catch (_) {
            setHata(`"${dosya.dosyaAdi}" açılamadı. Talep ekranından tekrar deneyin.`);
        }
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Belge Takip İşlemleri {yukleniyor ? '' : `(${talepler.length})`}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                Bu belge numarasıyla Belge Takip'te açılan işlemler ve yüklenen belgeler. İşleme tıklayınca talep açılır.
            </Typography>
            {yukleniyor && <LinearProgress sx={{ mb: 1 }} />}
            {hata && <Alert severity="error" onClose={() => setHata('')} sx={{ mb: 1 }}>{hata}</Alert>}
            {!yukleniyor && !talepler.length && !hata && (
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Bu belge için Belge Takip'te açılmış işlem yok.</Typography>
            )}

            {talepler.map((t) => {
                const sonuc = t.sonuclanmaTarihi || t.sonucaAlinmaTarihi;
                return (
                    <Box key={t._id} sx={{ border: '1px solid #e2e8f0', mb: 1 }}>
                        <Box
                            role="button" tabIndex={0}
                            onClick={() => navigate(`/dosya-takip/${t._id}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/dosya-takip/${t._id}`); }}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 1.5, py: 1,
                                background: '#f8fafc', cursor: 'pointer', '&:hover': { background: '#fefce8' }
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{t.talepTuru}</Typography>
                            <Chip size="small" label={t.durumEtiketi || t.durum} sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }} />
                            <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto' }}>
                                {t.takipId} · Açılış {tarih(t.createdAt)}{sonuc ? ` · Sonuç ${tarih(sonuc)}` : ''}
                            </Typography>
                        </Box>
                        {(t.dosyalar || []).length > 0 ? (
                            <Box sx={{ px: 1.5, py: 0.75 }}>
                                {t.dosyalar.map((d) => (
                                    <Box key={d._id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25, minWidth: 0 }}>
                                        <AttachFileIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="body2" noWrap title={d.dosyaAdi}>{d.dosyaAdi}</Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b' }} noWrap>
                                                {[d.kategori, d.aciklama, d.firmaYukledi ? 'firmadan geldi' : '', tarih(d.yuklemeTarihi)].filter(Boolean).join(' · ')}
                                            </Typography>
                                        </Box>
                                        <Tooltip title="Aç">
                                            <IconButton size="small" onClick={() => ac(t._id, d, false)} aria-label="Belgeyi aç">
                                                <OpenInNewIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="İndir">
                                            <IconButton size="small" onClick={() => ac(t._id, d, true)} aria-label="Belgeyi indir">
                                                <DownloadIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', px: 1.5, py: 0.75 }}>
                                Yüklenmiş belge yok
                            </Typography>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
