import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Chip, Paper, Button, Avatar, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TextField, Alert, Stack,
  FormControl, InputLabel, Select, MenuItem, Divider, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  EmojiEvents as EmojiEventsIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { exportTesvikToExcel } from '../../utils/docxExcelExport';

// API Utils
import api from '../../utils/axios';
import { BELGE_DURUM_SECENEKLERI, belgeDurumLabel } from '../../utils/belgeDurum';

const TesvikDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State management
  const [tesvik, setTesvik] = useState(null);
  const [activities, setActivities] = useState([]); // 🔧 Ensure it's always an array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [exportingRevizyon, setExportingRevizyon] = useState(false);
  const [durumSaving, setDurumSaving] = useState(false); // belge durumu değiştirme

  // Modal states
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [allActivitiesModalOpen, setAllActivitiesModalOpen] = useState(false);
  const [revizyonModalOpen, setRevizyonModalOpen] = useState(false);
  const [afterRevisionAction, setAfterRevisionAction] = useState(null); // 'goEdit' | null
  const [savingRevision, setSavingRevision] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Form states
  const [revizyonForm, setRevizyonForm] = useState({
    revizyonSebebi: '',
    kullaniciNotu: ''
  });

  // Activity filters (modern modal)
  const [activityFilters, setActivityFilters] = useState({
    showView: false,
    includeRevisions: true,
    search: '',
    startDate: '',
    endDate: '',
    limit: 50
  });

  // Helper functions
  const getDurumColor = (durum) => {
    const colors = {
      'hazirlaniyor': '#f59e0b',
      'inceleniyor': '#3b82f6',
      'onaylandi': '#10b981',
      'reddedildi': '#ef4444',
      'beklemede': '#6b7280'
    };
    return colors[durum] || '#6b7280';
  };

  const getDurumProgress = (durum) => {
    const progress = {
      'hazirlaniyor': 25,
      'inceleniyor': 50,
      'onaylandi': 100,
      'reddedildi': 0,
      'beklemede': 10
    };
    return progress[durum] || 0;
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('tr-TR');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  // 🧩 Değerleri güvenli biçimde yazdırmak için yardımcı
  const formatChangeValue = (val) => {
    // null/undefined
    if (val === null || val === undefined) return '-';
    // Tarih objesi
    if (val instanceof Date) return formatDateTime(val);
    // Sayı/boolean/string direkt yaz
    if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') return String(val);
    // Dizi/obje -> JSON ile kısalt
    try {
      const str = JSON.stringify(val, null, 2);
      return str?.length > 500 ? str.slice(0, 500) + '…' : str;
    } catch (e) {
      return String(val);
    }
  };

  // 🧭 Nesne içinden path ile değer alma ("a.b.0.c" gibi)
  const getByPath = (obj, path) => {
    try {
      if (!obj || !path) return undefined;
      const keys = path.split('.');
      let cur = obj;
      for (const k of keys) {
        if (cur === null || cur === undefined) return undefined;
        const idx = Number.isInteger(Number(k)) ? Number(k) : k;
        cur = cur[idx];
      }
      return cur;
    } catch (_) {
      return undefined;
    }
  };

  // Modal handlers
  const handleCloseActivityModal = () => {
    setActivityModalOpen(false);
    setSelectedActivity(null);
  };

  const handleCloseAllActivitiesModal = () => {
    setAllActivitiesModalOpen(false);
  };

  const getFilteredActivities = () => {
    const base = Array.isArray(activities) ? activities : [];
    // Revizyonları listeye dahil et
    const revs = Array.isArray(tesvik?.revizyonlar) ? tesvik.revizyonlar.map((r) => ({
      _id: `rev_${r.revizyonNo}`,
      action: 'revizyon',
      createdAt: r.revizyonTarihi || r.createdAt,
      user: { adSoyad: r.yapanKullanici?.adSoyad || 'Sistem' },
      title: `Revizyon ${r.revizyonNo}`,
      description: r.revizyonSebebi,
      changes: {
        fields: (r.degisikenAlanlar || []).map(d => ({
          field: d.alan,
          label: d.label,
          oldValue: d.eskiDeger,
          newValue: d.yeniDeger
        }))
      }
    })) : [];

    let merged = activityFilters.includeRevisions ? [...base, ...revs] : base;

    // Önce action filtresi (view'ları gizle)
    merged = merged.filter(a => activityFilters.showView ? true : a.action !== 'view');

    // Tarih aralığı filtresi
    if (activityFilters.startDate) {
      const s = new Date(activityFilters.startDate).getTime();
      merged = merged.filter(a => new Date(a.createdAt).getTime() >= s);
    }
    if (activityFilters.endDate) {
      const e = new Date(activityFilters.endDate).getTime();
      merged = merged.filter(a => new Date(a.createdAt).getTime() <= e);
    }

    // Arama
    const q = (activityFilters.search || '').trim().toLowerCase();
    if (q) {
      merged = merged.filter(a => {
        const haystack = [a.title, a.description, a.action, a.user?.adSoyad]
          .filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    // Tarihe göre azalan sırala
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit uygula
    return merged.slice(0, activityFilters.limit);
  };

  // Export handlers
  const handleExcelExport = async () => {
    try {
      setExcelLoading(true);
      console.log('🚀 Excel export başlatılıyor:', tesvik._id);

      // Axios ile Excel dosyası indirme
      const response = await api.get(`/tesvik/${tesvik._id}/excel-export?includeColors=true`, {
        responseType: 'blob'
      });

      // Dosya adını response header'dan al
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `tesvik_${tesvik.tesvikId || tesvik.gmId}_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      // Dosyayı indir
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      console.log('✅ Excel export başarıyla tamamlandı:', fileName);

    } catch (error) {
      console.error('❌ Excel export hatası:', error);
      alert(`Excel export hatası: ${error.response?.data?.message || error.message}`);
    } finally {
      setExcelLoading(false);
    }
  };

  const handleRevizyonExcelExport = async () => {
    try {
      setExportingRevizyon(true);
      console.log('🚀 Revizyon Excel export başlatılıyor:', tesvik._id);

      // 🔒 ID kontrolü
      if (!tesvik?._id) {
        throw new Error('Teşvik ID bulunamadı');
      }

      // Axios ile Revizyon Excel dosyası indirme
      const response = await api.get(`/tesvik/${tesvik._id}/revizyon-excel-export?includeColors=true`, {
        responseType: 'blob'
      });

      // 🔍 Response type kontrolü - hata durumunda JSON dönebilir
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        // Hata yanıtı - blob'u JSON'a parse et
        const errorText = await response.data.text();
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || 'Excel oluşturulurken hata oluştu');
      }

      // Dosya adını response header'dan al
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `sistem_revizyon_${tesvik.tesvikId || tesvik.gmId}_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      // Dosyayı indir
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      console.log('✅ Revizyon Excel export başarıyla tamamlandı:', fileName);

    } catch (error) {
      console.error('❌ Revizyon export hatası:', error);

      // 🔍 Hata mesajını daha detaylı göster
      let errorMessage = 'Bilinmeyen hata';

      if (error.response) {
        // Server hatası
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            errorMessage = json.message || `Sunucu hatası (${error.response.status})`;
          } catch {
            errorMessage = `Sunucu hatası (${error.response.status})`;
          }
        } else {
          errorMessage = error.response.data?.message || `Sunucu hatası (${error.response.status})`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(`Revizyon Excel export hatası: ${errorMessage}`);
    } finally {
      setExportingRevizyon(false);
    }
  };

  const handleRevizyonEkle = async () => {
    try {
      if (!revizyonForm.revizyonSebebi) return;
      setSavingRevision(true);
      // API: Revizyon ekleme
      const res = await api.post(`/tesvik/${tesvik._id}/revizyon`, {
        revizyonSebebi: revizyonForm.revizyonSebebi,
        kullaniciNotu: revizyonForm.kullaniciNotu || ''
      });
      if (res?.data?.success) {
        setRevizyonModalOpen(false);
        setRevizyonForm({ revizyonSebebi: '', kullaniciNotu: '' });
        await loadData();
        if (afterRevisionAction === 'goEdit') {
          setAfterRevisionAction(null);
          navigate(`/tesvik/${id}/duzenle`);
        }
      }
    } catch (error) {
      console.error('Revizyon ekle hatası:', error);
      alert(`Revizyon eklenemedi: ${error.response?.data?.message || error.message}`);
    } finally {
      setSavingRevision(false);
    }
  };

  // 🎯 Belge durumu değiştir (müşteri: 'belge durumunu değiştirme yeri')
  const handleDurumChange = async (yeniDurum) => {
    if (!yeniDurum || yeniDurum === tesvik?.durumBilgileri?.genelDurum) return;
    try {
      setDurumSaving(true);
      const res = await api.patch(`/tesvik/${tesvik._id}/durum`, { yeniDurum });
      if (res?.data?.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      alert(`Durum güncellenemedi: ${error.response?.data?.message || error.message}`);
    } finally {
      setDurumSaving(false);
    }
  };

  // Data loading
  const loadData = async () => {
    try {
      setLoading(true);

      // Paralel API çağrıları - Gerçek data
      const [tesvikResponse, activitiesResponse] = await Promise.all([
        api.get(`/tesvik/${id}`),
        api.get(`/activities?targetId=${id}`)
      ]);

      // Tesvik verisi
      const tesvikData = tesvikResponse?.data?.data;

      // Activities verisi
      const activitiesData = activitiesResponse?.data?.data?.activities || [];

      setTesvik(tesvikData);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []); // 🔧 Ensure it's always an array

    } catch (error) {
      console.error('🚨 Veri yükleme hatası:', error);
      setError('Veri yüklenemedi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔔 Liste ekranından revizyon başlatıldıysa modalı otomatik aç ve düzenleme moduna yönlendir
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('revizyon') === '1') {
        setRevizyonModalOpen(true);
        setAfterRevisionAction('goEdit'); // ✅ Revizyon kaydedildikten sonra düzenleme sayfasına git
      }
    } catch (e) { }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography variant="h6">Yükleniyor...</Typography>
      </Box>
    );
  }

  if (error || !tesvik) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography variant="h6" color="error">{error || 'Tesvik bulunamadı'}</Typography>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ gridArea: 'content', overflow: 'auto', p: 0.5 }}>
      {/* 🧭 COMPACT SOL MENÜ - RESPONSIVE */}
      <Paper sx={{
        position: 'fixed',
        left: { xs: -4, sm: 0 },
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        borderRadius: '0 8px 8px 0',
        background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
        boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
        border: 'none',
        transition: 'left 0.3s ease',
        '&:hover': {
          left: 0
        },
        display: { xs: 'none', md: 'block' }
      }}>
        <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => navigate('/dashboard')}
            sx={{
              color: 'white',
              '&:hover': { background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' },
              width: 36,
              height: 36
            }}
            title="Ana Sayfa"
          >
            <HomeIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => navigate('/firma')}
            sx={{
              color: 'white',
              '&:hover': { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
              width: 36,
              height: 36
            }}
            title="Firmalar"
          >
            <BusinessIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => navigate('/tesvik')}
            sx={{
              color: 'white',
              '&:hover': { background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' },
              width: 36,
              height: 36
            }}
            title="Teşvikler"
          >
            <AssignmentIcon fontSize="small" />
          </IconButton>

          <Box sx={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', my: 0.5 }} />

          <IconButton
            size="small"
            onClick={() => navigate(-1)}
            sx={{
              color: 'white',
              '&:hover': { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' },
              width: 36,
              height: 36
            }}
            title="Geri Git"
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      <Container maxWidth="xl" disableGutters sx={{ px: 0.5 }}>

        {/* 🧭 NAVIGASYON & BREADCRUMB */}
        <Paper sx={{
          mb: 0.5,
          p: 1,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Sol Taraf - Geri Gitme & Breadcrumb */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
                sx={{
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  fontSize: '0.75rem',
                  px: 1.5,
                  py: 0.5,
                  fontWeight: 500,
                  '&:hover': { borderColor: '#3b82f6', color: '#3b82f6', background: '#f0f9ff' }
                }}
              >
                Geri
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => navigate('/dashboard')}
                  sx={{ color: '#64748b', '&:hover': { color: '#3b82f6', background: '#f0f9ff' } }}
                >
                  <HomeIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption" sx={{ color: '#cbd5e1' }}>/</Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/tesvik')}
                  sx={{
                    color: '#64748b',
                    fontSize: '0.7rem',
                    minWidth: 'auto',
                    textTransform: 'none',
                    '&:hover': { color: '#3b82f6', background: '#f0f9ff' }
                  }}
                >
                  Teşvik Listesi
                </Button>
                <Typography variant="caption" sx={{ color: '#cbd5e1' }}>/</Typography>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, fontSize: '0.7rem' }}>
                  {tesvik?.tesvikId || tesvik?.gmId || 'Belge Detay'}
                </Typography>
              </Box>
            </Box>

            {/* Sağ Taraf - Hızlı Navigasyon (Sadece Desktop) */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<BusinessIcon />}
                onClick={() => navigate('/firma')}
                sx={{
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  fontSize: '0.7rem',
                  px: 1,
                  py: 0.4,
                  fontWeight: 500,
                  '&:hover': { borderColor: '#10b981', color: '#10b981', background: '#f0fdf4' }
                }}
              >
                Firmalar
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AssignmentIcon />}
                onClick={() => navigate('/tesvik')}
                sx={{
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  fontSize: '0.7rem',
                  px: 1,
                  py: 0.4,
                  fontWeight: 500,
                  '&:hover': { borderColor: '#8b5cf6', color: '#8b5cf6', background: '#faf5ff' }
                }}
              >
                Teşvikler
              </Button>
            </Box>

            {/* Mobil için kompakt navigasyon */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => navigate('/firma')}
                sx={{ color: '#64748b', '&:hover': { color: '#10b981', background: '#f0fdf4' } }}
                title="Firmalar"
              >
                <BusinessIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => navigate('/tesvik')}
                sx={{ color: '#64748b', '&:hover': { color: '#8b5cf6', background: '#faf5ff' } }}
                title="Teşvikler"
              >
                <AssignmentIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        {/* 🎨 KOMPAKT PROFESYONEL HEADER */}
        <Box sx={{
          mb: 1,
          background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
          borderRadius: 2,
          p: 2,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar sx={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  width: 45,
                  height: 45,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <EmojiEventsIcon sx={{ fontSize: 24, color: 'white' }} />
                </Avatar>
                <Box sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                  border: '1px solid white'
                }} />
              </Box>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25, fontSize: '1.1rem' }}>
                  {tesvik.tesvikId || tesvik.gmId || '-'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, fontSize: '0.85rem' }}>
                  {tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan || '-'}
                </Typography>

                {/* Kompakt Status Badge */}
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={belgeDurumLabel(tesvik.durumBilgileri?.genelDurum)}
                    size="small"
                    sx={{
                      background: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      height: 22
                    }}
                  />
                  {/* 📋 Müracaat Talep Tipi Badge */}
                  {tesvik.belgeYonetimi?.belgeMuracaatTalepTipi && (
                    <Chip
                      label={`📋 ${tesvik.belgeYonetimi.belgeMuracaatTalepTipi}`}
                      size="small"
                      sx={{
                        background: '#0284c7',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        height: 22
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* Kompakt Action Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => { setAfterRevisionAction('goEdit'); setRevizyonModalOpen(true); }}
                sx={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  '&:hover': { background: 'rgba(255,255,255,0.3)' }
                }}
              >
                Düzenle
              </Button>

              {/* Sağdaki Excel butonu kaldırıldı */}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, flexDirection: { xs: 'column', sm: 'row' }, mt: 1 }}>
            {/* Revizyon Ekle butonu kaldırıldı */}

            <Button
              variant="contained"
              size="small"
              startIcon={exportingRevizyon ? null : <FileDownloadIcon />}
              onClick={handleRevizyonExcelExport}
              disabled={exportingRevizyon}
              sx={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                fontWeight: 500,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                textTransform: 'none',
                fontSize: '0.8rem',
                '&:hover': { background: 'rgba(255,255,255,0.3)' },
                '&:disabled': {
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)'
                }
              }}
            >
              {exportingRevizyon ? 'Excel Hazırlanıyor...' : 'Sistem Excel Revizyon'}
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<BuildIcon />}
              onClick={() => navigate('/tesvik/makine-yonetimi', { state: { autoSelectBelgeId: tesvik._id } })}
              sx={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                fontWeight: 500,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                textTransform: 'none',
                fontSize: '0.8rem',
                '&:hover': { background: 'rgba(255,255,255,0.3)' }
              }}
            >
              Makine Listesine Git
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportTesvikToExcel(tesvik, true)}
              sx={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                fontWeight: 500,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                textTransform: 'none',
                fontSize: '0.8rem',
                '&:hover': { background: 'rgba(255,255,255,0.3)' }
              }}
            >
              Müşteri Görünümü (Excel)
            </Button>
          </Box>

          {/* Progress indicator */}
          <Box sx={{ mt: 1.5, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.8rem' }}>
                Belge İlerleme Durumu
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                %{getDurumProgress(tesvik.durumBilgileri?.genelDurum)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getDurumProgress(tesvik.durumBilgileri?.genelDurum)}
              sx={{
                height: 6,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(255,255,255,0.3)'
                }
              }}
            />
          </Box>
        </Box>

        {/* 🏢 SIFIRDAN YENİ PROFESYONEL TASARIM - ULTRA KOMPAKT */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

          {/* 📊 ANA BİLGİ KARTLARI - TEK SATIR */}
          <Grid container spacing={0.5}>
            {/* Durum */}
            <Grid item xs={6} sm={3}>
              <Paper sx={{
                p: 1,
                minHeight: 80,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: '#ffffff',
                border: `2px solid ${getDurumColor(tesvik.durumBilgileri?.genelDurum)}`,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: getDurumColor(tesvik.durumBilgileri?.genelDurum) }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.65rem' }}>
                      Belge İzleme Sistemi
                    </Typography>
                  </Box>
                  <Select
                    value={tesvik.durumBilgileri?.genelDurum || ''}
                    onChange={(e) => handleDurumChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={durumSaving}
                    variant="standard"
                    disableUnderline
                    title="Belge durumunu değiştir"
                    sx={{
                      fontWeight: 700,
                      color: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                      fontSize: '0.85rem',
                      mb: 0.5,
                      '& .MuiSelect-select': { p: 0, pr: '20px !important', textAlign: 'center', minHeight: 'unset' },
                      '& .MuiSvgIcon-root': { color: getDurumColor(tesvik.durumBilgileri?.genelDurum) }
                    }}
                  >
                    {BELGE_DURUM_SECENEKLERI.map((o) => (
                      <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.8rem' }}>{o.label}</MenuItem>
                    ))}
                  </Select>
                  <Chip
                    label={`%${getDurumProgress(tesvik.durumBilgileri?.genelDurum)}`}
                    size="small"
                    sx={{
                      backgroundColor: `${getDurumColor(tesvik.durumBilgileri?.genelDurum)}20`,
                      color: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                      fontWeight: 500,
                      fontSize: '0.6rem',
                      height: 18
                    }}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Firma */}
            <Grid item xs={6} sm={3}>
              <Paper sx={{
                p: 1,
                minHeight: 80,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: 1,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)' }
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.65rem' }}>
                      Kurumsal Kimlik
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{
                    fontWeight: 600,
                    color: '#3b82f6',
                    fontSize: '0.75rem',
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {tesvik.firmaId || tesvik.firma?.firmaId || tesvik.firma?.vergiNoTC || '-'}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: '#64748b',
                    fontSize: '0.6rem',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {(tesvik.firmaBilgileri?.unvan || tesvik.yatirimciUnvan || 'Firma').substring(0, 20)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Yatırım */}
            <Grid item xs={6} sm={3}>
              <Paper sx={{
                p: 1,
                minHeight: 80,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: '#ffffff',
                border: '2px solid #10b981',
                borderRadius: 1,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)' }
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.65rem' }}>
                      Proje Detayları
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{
                    fontWeight: 600,
                    color: '#10b981',
                    fontSize: '0.8rem',
                    mb: 0.5
                  }}>
                    {tesvik.yatirimBilgileri?.yatirimKonusu || tesvik.yatirimBilgileri2?.yatirimKonusu || '-'}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: '#64748b',
                    fontSize: '0.6rem',
                    display: 'block'
                  }}>
                    {(tesvik.yatirimBilgileri?.destekSinifi || tesvik.yatirimBilgileri2?.destekSinifi || '-')} - {(tesvik.yatirimBilgileri?.yerinIl || tesvik.yatirimBilgileri2?.il || '-')}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* İstihdam */}
            <Grid item xs={6} sm={3}>
              <Paper sx={{
                p: 1,
                minHeight: 80,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: '#ffffff',
                border: '2px solid #f59e0b',
                borderRadius: 1,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)' }
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.65rem' }}>
                      İş Gücü Planı
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{
                    fontWeight: 700,
                    color: '#f59e0b',
                    fontSize: '1rem',
                    mb: 0.25
                  }}>
                    {tesvik.istihdam?.toplamKisi ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: '#10b981',
                    fontSize: '0.6rem',
                    fontWeight: 600
                  }}>
                    +{tesvik.istihdam?.ilaveKisi ?? 0} İlave
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* ========================================================= */}
          {/* 10 BÖLÜMLÜ DOCX ŞABLONU ACCORDION YAPISI (ESKİ BELGE)  */}
          {/* ========================================================= */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            
            {/* 1. GMdigi BİLGİLERİ — müşteri talebi: gizlendi */}
            <Accordion defaultExpanded sx={{ display: 'none', border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>GMdigi BİLGİLERİ</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>GM ID</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.gmId || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>FİRMA ID</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaId || tesvik.firma?.firmaId || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>UNVAN</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaBilgileri?.unvan || tesvik.firma?.tamUnvan || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>TALEP SONUÇ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.durumBilgileri?.genelDurum || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Sorgu Bağlantısı Seç</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 2. Yatırımcı İle İlgili Bilgiler — müşteri talebi: gizlendi (isim zaten üstte) */}
            <Accordion defaultExpanded sx={{ display: 'none', border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Yatırımcı İle İlgili Bilgiler</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Firma Adı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaBilgileri?.unvan || tesvik.firma?.tamUnvan || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>SGK Sicil No</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.sgkSicilNo || '-'}</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 3. Yatırım İle İlgili Bilgiler */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Yatırım İle İlgili Bilgiler</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Destekleme Sınıfı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.destekSinifi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Sermaye Türü</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firma?.yabanciSermayeli ? 'Yabancı Sermayeli' : 'Tamamı Yerli'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Yatırımın Konusu(US97)</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimKonusu || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Kararname Tarih/Sayı:</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.dayandigiKanun || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İli</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yerinIl || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İlçesi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yerinIlce || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Adres 1</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimAdresi1 || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Adres 2 (varsa)</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimAdresi2 || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Adres 3 (varsa)</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimAdresi3 || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>OSB Adı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.osbIseMudurluk || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Serbest Bölge Adı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.serbsetBolge || tesvik.yatirimBilgileri?.serbestBolge || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İl Bazlı Bölgesi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.ilBazliBolge || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İlçe Bazlı Bölgesi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.ilceBazliBolge || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Mevcut İstihdam</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.istihdam?.mevcutKisi || '0'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İlave İstihdam</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.istihdam?.ilaveKisi || '0'}</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 4. Belge İle İlgili Bilgiler */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Belge İle İlgili Bilgiler</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge ID</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeId || tesvik._id || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge NO</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeNo || tesvik.belgeNo || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeTarihi ? new Date(tesvik.belgeYonetimi.belgeTarihi).toLocaleDateString('tr-TR') : (tesvik.kunyeBilgileri?.kararTarihi ? new Date(tesvik.kunyeBilgileri.kararTarihi).toLocaleDateString('tr-TR') : '-')}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Dayandığı Kanun</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.dayandigiKanun || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Müracaat No</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeMuracaatNo || tesvik.kunyeBilgileri?.dosyaNo || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Müracaat Talep Tipi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeMuracaatTalepTipi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Müracaat Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeMuracaatTarihi ? new Date(tesvik.belgeYonetimi.belgeMuracaatTarihi).toLocaleDateString('tr-TR') : (tesvik.kunyeBilgileri?.basvuruTarihi ? new Date(tesvik.kunyeBilgileri.basvuruTarihi).toLocaleDateString('tr-TR') : '-')}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge Başlama Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeBaslamaTarihi ? new Date(tesvik.belgeYonetimi.belgeBaslamaTarihi).toLocaleDateString('tr-TR') : '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge Bitiş Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.belgeBitisTarihi ? new Date(tesvik.belgeYonetimi.belgeBitisTarihi).toLocaleDateString('tr-TR') : '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Süre Uzatım Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.uzatimTarihi ? new Date(tesvik.belgeYonetimi.uzatimTarihi).toLocaleDateString('tr-TR') : '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Mücbir Uzama Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.mucbirUzumaTarihi ? new Date(tesvik.belgeYonetimi.mucbirUzumaTarihi).toLocaleDateString('tr-TR') : '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Öncelikli Yatırım</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.oncelikliYatirim || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Öncelikli Yatırım Türü</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeYonetimi?.oncelikliYatirimTuru || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Yatırım Cinsi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {[
                      tesvik.yatirimBilgileri?.sCinsi1,
                      tesvik.yatirimBilgileri?.tCinsi2,
                      tesvik.yatirimBilgileri?.uCinsi3,
                      tesvik.yatirimBilgileri?.vCinsi4
                    ].filter(Boolean).join(', ') || tesvik.yatirimBilgileri?.yatirimCinsi || '-'}
                  </Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Ada</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.ada || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Parsel</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.parsel || '-'}</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 5. Ürün Bilgileri (ESKİ BELGE - US97 KODU) */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Ürün Bilgileri</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>US97 Kodu</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Ürün Adı</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Mevcut Kap.</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>İlave Kap.</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Toplam Kap.</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Kap. Birim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tesvik.urunler && tesvik.urunler.length > 0 ? (
                      tesvik.urunler.map((urun, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{urun.us97Kodu || urun.u97Kodu || urun.naceKodu || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{urun.urunAdi || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{(Number(urun.mevcutKapasite) || 0).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{(Number(urun.ilaveKapasite) || 0).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{(Number(urun.toplamKapasite) || 0).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{urun.kapasiteBirimi || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Ürün bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </AccordionDetails>
            </Accordion>

            {/* 6. Finansal Bilgiler */}
            {(() => {
              const mali = tesvik.maliHesaplamalar || {};
              const araziArsa = Number(mali.araciArsaBedeli || mali.araziArsaBedeli || mali.maliyetlenen?.sn || 0);
              const binaInsaat = Number(mali.binaInsaatGideri?.toplamBinaGideri || 0);
              const ithalMak = Number(mali.makinaTechizat?.ithalMakina || 0);
              const yerliMak = Number(mali.makinaTechizat?.yerliMakina || 0);
              const toplamMak = Number(mali.makinaTechizat?.toplamMakina || 0);
              const yeniMakUsd = Number(mali.makinaTechizat?.yeniMakine || 0);
              const kullMakUsd = Number(mali.makinaTechizat?.kullanimisMakina || 0);
              const topMakUsd = yeniMakUsd + kullMakUsd;
              
              // ESKİ BELGE - 6 Kalem
              const yardimciIsletmeMakGider = 0; // Şemada ayrı bir alan yok, genelde 0
              const ithalatGider = Number(mali.yatirimHesaplamalari?.ev || 0); 
              const tasimaGider = Number(mali.yatirimHesaplamalari?.ew || 0);  
              const montajGider = Number(mali.yatirimHesaplamalari?.et || 0);  
              const etudGider = Number(mali.yatirimHesaplamalari?.ex || 0);    
              const digerGider = Number(mali.yatirimHesaplamalari?.ey || 0);   
              const toplamDigerHarcama = yardimciIsletmeMakGider + ithalatGider + tasimaGider + montajGider + etudGider + digerGider;
              
              let topSabit = Number(mali.toplamSabitYatirim || 0);
              if (!topSabit) topSabit = araziArsa + binaInsaat + toplamMak + toplamDigerHarcama;

              const yabanci = Number(mali.finansman?.yabanciKaynak || 0);
              const ozkaynak = Number(mali.finansman?.ozKaynak || 0);
              const topFin = Number(mali.finansman?.toplamFinansman || 0);

              return (
                <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Finansal Bilgiler</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>Arazi-Arsa Gideri</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Arazi-Arsa Bedeli Açıklama:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{mali.maliyetlenen?.aciklama || '-'}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Metrekaresi</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{Number(mali.maliyetlenen?.sl || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Birim Fiyatı</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.maliyetlenen?.sm || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Arazi Arsa Bedeli</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{araziArsa.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>Bina İnşaat Gideri</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Bina-İnşaat Giderleri Açıklama:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{mali.binaInsaatGideri?.aciklama || '-'}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Ana bina ve tesisleri:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.binaInsaatGideri?.anaBinaGideri || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yardımcı işletmeler bina ve tesisleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.binaInsaatGideri?.yardimciBinaGideri || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İdare binaları</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺0</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Bina İnşaat Giderleri:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{binaInsaat.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>Diğer Yatırım Harcamaları</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yardımcı işletme makine teçhizat giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yardimciIsletmeMakGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İthalat ve gümrükleme giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ithalatGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Taşıma ve sigorta giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{tasimaGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Montaj giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{montajGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Etüd ve proje giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{etudGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Diğer giderler</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{digerGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Diğer Yatırım Harcamaları</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{toplamDigerHarcama.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#fef3c7', p: 1, borderRadius: 1, display: 'block', textAlign: 'center', mt: 1 }}>TOPLAM SABİT YATIRIM TUTARI : ₺{topSabit.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>Makina ve Teçhizat Giderleri</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İthal</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ithalMak.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yerli</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yerliMak.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Makine Teçhizat</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{toplamMak.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>İthal Makine ($)</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yeni Makine</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>${yeniMakUsd.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Kullanılmış Makine</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>${kullMakUsd.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Top. İthal. Mak. ($)</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>${topMakUsd.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>Yabancı Kaynaklar</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Top. Yabancı Kaynak</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yabanci.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>Özkaynaklar</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Özkaynaklar</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ozkaynak.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#e0f2fe', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>TOPLAM FİNANSMAN</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Finansman</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', color: '#0369a1' }}>₺{topFin.toLocaleString('tr-TR')}</Typography></Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })()}

            {/* 7. Özel Şartlar */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Özel Şartlar</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '20%' }}>Kısaltma</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '80%' }}>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tesvik.ozelSartlar && tesvik.ozelSartlar.length > 0 ? (
                      tesvik.ozelSartlar.map((sart, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', verticalAlign: 'top' }}>{sart?.koşulMetni || sart?.kisaltma || `Şart ${i+1}`}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{sart?.aciklamaNotu || sart?.sart || sart?.metin || sart?.aciklama || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="2" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Özel şart bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </AccordionDetails>
            </Accordion>

            {/* 8. Destek Unsurları */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Destek Unsurları</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '25%' }}>Destek Unsuru</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '35%' }}>Şartı</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '40%' }}>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0 ? (
                      tesvik.destekUnsurlari.map((destek, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#7c3aed' }}>{destek.destekUnsuru || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{destek.sarti || destek.sart || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{destek.aciklama || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Destek unsuru bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </AccordionDetails>
            </Accordion>

            {/* 9. Proje Tanıtım — müşteri talebi: gizlendi */}
            <Accordion sx={{ display: 'none', border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Proje Tanıtım</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Proje tanıtım bilgisi bulunmuyor.</Typography>
              </AccordionDetails>
            </Accordion>

            {/* 10. Evrak Listesi — müşteri talebi: gizlendi */}
            <Accordion sx={{ display: 'none', border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Evrak Listesi</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '15%' }}>ID</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '35%' }}>Evrak Tipi</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '50%' }}>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan="3" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Evrak listesi boş</td></tr>
                  </tbody>
                </table>
              </AccordionDetails>
            </Accordion>

          </Box>

          {/* 👨‍💼 KULLANICI TAKİBİ - KOMPAKT */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#6366f1' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                👨‍💼 Kullanıcı Takibi
              </Typography>
            </Box>

            <Grid container spacing={0.5}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#0369a1', fontSize: '0.65rem', fontWeight: 500 }}>Oluşturan</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7', fontSize: '0.8rem' }}>
                    {tesvik?.olusturanKullanici?.adSoyad || 'Bilinmiyor'}
                  </Typography>
                  {tesvik?.olusturanKullanici?.rol && (
                    <Chip label={tesvik.olusturanKullanici.rol} size="small" sx={{ backgroundColor: '#dc2626', color: 'white', fontSize: '0.6rem', height: 16, mt: 0.25 }} />
                  )}
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#166534', fontSize: '0.65rem', fontWeight: 500 }}>Oluşturma Tarihi</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#15803d', fontSize: '0.8rem' }}>
                    {formatDate(tesvik.createdAt) || '8 Ağustos 2025'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#fffbeb', borderRadius: 1, border: '1px solid #fed7aa', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontSize: '0.65rem', fontWeight: 500 }}>Son Güncelleyen</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#d97706', fontSize: '0.8rem' }}>
                    {tesvik?.sonGuncelleyen?.adSoyad || '—'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#dc2626', fontSize: '0.65rem', fontWeight: 500 }}>Son Güncelleme Tarihi</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#991b1b', fontSize: '0.8rem' }}>
                    {formatDate(tesvik.updatedAt) || '10 Ağustos 2025'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* 📊 BELGE İŞLEM YÖNETİMİ - KOMPAKT */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                📊 Belge İşlem Yönetimi
              </Typography>
              <Chip
                label={`Toplam ${(activities?.length || 0) + (tesvik?.revizyonlar?.length || 0)} İşlem`}
                size="small"
                sx={{ ml: 'auto', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.6rem', height: 20 }}
              />
            </Box>

            <Grid container spacing={0.5}>
              <Grid item xs={6} sm={4}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={() => setAllActivitiesModalOpen(true)}
                  sx={{
                    p: 1,
                    borderColor: '#e2e8f0',
                    color: '#475569',
                    fontSize: '0.7rem',
                    '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' }
                  }}
                >
                  📋 Tüm İşlemleri Göster ({(activities?.length || 0) + (tesvik?.revizyonlar?.length || 0)})
                </Button>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={handleExcelExport}
                  disabled={excelLoading}
                  sx={{
                    p: 1,
                    borderColor: '#e2e8f0',
                    color: '#475569',
                    fontSize: '0.7rem',
                    '&:hover': { borderColor: '#10b981', color: '#10b981' }
                  }}
                >
                  📥 Excel Export
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{
                  p: 1,
                  backgroundColor: '#f8fafc',
                  borderRadius: 1,
                  border: '1px solid #e2e8f0',
                  display: 'block',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.65rem'
                }}>
                  📅 İşlem Geçmişi: Toplam {(activities?.length || 0) + (tesvik?.revizyonlar?.length || 0)} • Güncellemeler {activities?.filter?.(a => a.action === 'update')?.length || 0} • Revizyonlar {tesvik?.revizyonlar?.length || 0}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Container>

      {/* 📱 MODALS - Detaylı Bilgi Görüntüleme */}

      {/* Activity Detail Modal */}
      <Dialog
        open={activityModalOpen}
        onClose={handleCloseActivityModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedActivity && (
              <>
                <Avatar sx={{
                  backgroundColor: (selectedActivity.user?.rol || selectedActivity.user?.role) === 'admin' ? '#dc2626' : '#3b82f6',
                  width: 32,
                  height: 32,
                  fontSize: '0.9rem'
                }}>
                  {(selectedActivity.user?.adSoyad || selectedActivity.user?.name || 'U')?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    📋 İşlem Bilgisi
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(selectedActivity.user?.adSoyad || selectedActivity.user?.name || 'Sistem')} - {selectedActivity.action}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
          <IconButton
            onClick={handleCloseActivityModal}
            size="small"
            sx={{ ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {selectedActivity ? (
            <Box>
              {/* Değişiklik Detayları */}
              {selectedActivity.changes?.fields && selectedActivity.changes.fields.length > 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🔄 Değişiklik Detayları ({selectedActivity.changes.fields.length} Alan)
                  </Typography>
                  {/* Özet bilgileri */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                    <Chip size="small" label={`İşlem: ${selectedActivity.action}`} color="default" />
                    <Chip size="small" label={`Kullanıcı: ${(selectedActivity.user?.adSoyad || selectedActivity.user?.name || 'Sistem')}`} color="primary" variant="outlined" />
                    <Chip size="small" label={`Tarih: ${formatDateTime(selectedActivity.createdAt)}`} color="success" variant="outlined" />
                  </Stack>
                  {selectedActivity.changes.fields.map((rawChange, index) => {
                    // String gelebilir (örn. sadece path) → objeye normalleştir
                    const isStringItem = typeof rawChange === 'string';
                    const pathKeyStr = isStringItem ? rawChange : undefined;
                    const label = (isStringItem ? pathKeyStr : (rawChange.label || rawChange.field || rawChange.alan || rawChange.columnName)) || `Alan ${index + 1}`;
                    let oldValRaw = isStringItem ? undefined : (rawChange.eskiDeger ?? rawChange.oldValue);
                    let newValRaw = isStringItem ? undefined : (rawChange.yeniDeger ?? rawChange.newValue);
                    // Fallback: fields içinde değer yoksa before/after içinden alan path'i ile çek
                    if (oldValRaw === undefined && newValRaw === undefined) {
                      const pathKey = pathKeyStr || rawChange.alan || rawChange.field || rawChange.columnName;
                      if (pathKey) {
                        oldValRaw = getByPath(selectedActivity.changes?.before, pathKey);
                        newValRaw = getByPath(selectedActivity.changes?.after, pathKey);
                      }
                    }
                    const oldVal = formatChangeValue(oldValRaw);
                    const newVal = formatChangeValue(newValRaw);
                    return (
                      <Paper key={index} elevation={0} sx={{
                        p: 2,
                        mb: 1.25,
                        background: 'linear-gradient(180deg,#ffffff, #f9fafb)',
                        border: '1px solid #e5e7eb',
                        borderRadius: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip size="small" label="Alan" color="secondary" variant="outlined" />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {label}
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                            <strong>Önceki Değer:</strong> {oldVal}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                            <strong>Yeni Değer:</strong> {newVal}
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Alert severity="info">Bu işlem için detaylı değişiklik kaydı bulunamadı.</Alert>
              )}
            </Box>
          ) : (
            <Typography variant="body1">İşlem bilgisi yükleniyor...</Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseActivityModal}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* All Activities Modal */}
      <Dialog
        open={allActivitiesModalOpen}
        onClose={handleCloseAllActivitiesModal}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📚 Tüm Belge İşlemleri
          <IconButton onClick={handleCloseAllActivitiesModal} sx={{ ml: 'auto' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {/* Filtre Barı */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Ara (işlem, kullanıcı, açıklama)"
              value={activityFilters.search}
              onChange={(e) => setActivityFilters({ ...activityFilters, search: e.target.value })}
              sx={{ minWidth: 240 }}
            />
            <TextField
              size="small"
              type="date"
              label="Başlangıç"
              InputLabelProps={{ shrink: true }}
              value={activityFilters.startDate}
              onChange={(e) => setActivityFilters({ ...activityFilters, startDate: e.target.value })}
            />
            <TextField
              size="small"
              type="date"
              label="Bitiş"
              InputLabelProps={{ shrink: true }}
              value={activityFilters.endDate}
              onChange={(e) => setActivityFilters({ ...activityFilters, endDate: e.target.value })}
            />
            <FormControlLabel
              control={<Switch checked={activityFilters.showView} onChange={(e) => setActivityFilters({ ...activityFilters, showView: e.target.checked })} />}
              label="View kayıtlarını göster"
            />
            <FormControlLabel
              control={<Switch checked={activityFilters.includeRevisions} onChange={(e) => setActivityFilters({ ...activityFilters, includeRevisions: e.target.checked })} />}
              label="Revizyonları dahil et"
            />
            <TextField
              size="small"
              type="number"
              label="Limit"
              InputLabelProps={{ shrink: true }}
              value={activityFilters.limit}
              onChange={(e) => setActivityFilters({ ...activityFilters, limit: Math.max(10, Math.min(500, Number(e.target.value) || 50)) })}
              sx={{ width: 100 }}
            />
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          {getFilteredActivities().length > 0 ? (
            <Stack spacing={1}>
              {getFilteredActivities().map((activity, index) => (
                <Paper key={activity._id || index} sx={{
                  p: 1.25,
                  border: '1px solid #e5e7eb',
                  display: 'flex', alignItems: 'center', gap: 1,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f9fafb' }
                }}
                  onClick={() => { setSelectedActivity(activity); setActivityModalOpen(true); }}
                >
                  <Chip
                    size="small"
                    label={activity.action}
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      backgroundColor: activity.action === 'update' ? '#ecfccb' : activity.action === 'create' ? '#dbeafe' : activity.action === 'revizyon' ? '#fff7ed' : '#f1f5f9'
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {typeof activity.title === 'object' ? JSON.stringify(activity.title) : (activity.title || '')}
                    {typeof activity.description === 'object' ? ` ${JSON.stringify(activity.description)}` : (activity.description ? ` ${activity.description}` : (!activity.title ? activity.action : ''))}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto' }}>
                    {formatDateTime(activity.createdAt)} • {activity.user?.adSoyad || 'Sistem'}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Kayıt bulunamadı. Filtreleri genişletmeyi deneyin.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAllActivitiesModal}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Revizyon Modal */}
      <Dialog
        open={revizyonModalOpen}
        onClose={() => setRevizyonModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e5e7eb'
        }}>
          📝 Revizyon Sebebi
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 1 }}>
                Bu revizyon teşvik belgesinin geçmişine kaydedilecek.
              </Alert>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Revizyon Sebebi</InputLabel>
                <Select
                  value={revizyonForm.revizyonSebebi}
                  onChange={(e) => setRevizyonForm({ ...revizyonForm, revizyonSebebi: e.target.value })}
                  label="Revizyon Sebebi"
                >
                  <MenuItem value="Talep Revize">📋 Talep Revize</MenuItem>
                  <MenuItem value="Sonuç Revize">✅ Sonuç Revize</MenuItem>
                  <MenuItem value="Resen Revize">⚖️ Resen Revize</MenuItem>
                  <MenuItem value="Müşavir Revize">👨‍💼 Müşavir Revize</MenuItem>
                  <MenuItem value="Red geldi - Ek belge istendi">Red geldi - Ek belge istendi</MenuItem>
                  <MenuItem value="Red geldi - Revizyon talep edildi">Red geldi - Revizyon talep edildi</MenuItem>
                  <MenuItem value="Onay geldi">Onay geldi</MenuItem>
                  <MenuItem value="Belge tamamlandı">Belge tamamlandı</MenuItem>
                  <MenuItem value="İptal edildi">İptal edildi</MenuItem>
                  <MenuItem value="Diğer">Diğer</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Açıklama / Not"
                placeholder="Bu revizyon hakkında detaylı açıklama yazabilirsiniz..."
                value={revizyonForm.kullaniciNotu}
                onChange={(e) => setRevizyonForm({ ...revizyonForm, kullaniciNotu: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRevizyonModalOpen(false)}>İptal</Button>
          <Button
            onClick={handleRevizyonEkle}
            variant="contained"
            disabled={!revizyonForm.revizyonSebebi || savingRevision}
          >
            {savingRevision ? 'Kaydediliyor...' : 'Devam Et'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TesvikDetail;