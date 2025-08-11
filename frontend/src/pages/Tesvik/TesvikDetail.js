import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Chip, Paper, Button, Avatar, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TextField, Alert, Stack,
  FormControl, InputLabel, Select, MenuItem, Divider, Switch, FormControlLabel
} from '@mui/material';
import {
  EmojiEvents as EmojiEventsIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

// API Utils
import api from '../../utils/axios';

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
      changes: { fields: (r.degisikenAlanlar || []).map(d => ({
        field: d.alan,
        label: d.label,
        oldValue: d.eskiDeger,
        newValue: d.yeniDeger
      })) }
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
      
      // Axios ile Revizyon Excel dosyası indirme
      const response = await api.get(`/tesvik/${tesvik._id}/revizyon-excel-export?includeColors=true`, {
        responseType: 'blob'
      });

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
      alert(`Revizyon Excel export hatası: ${error.response?.data?.message || error.message}`);
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

  // Data loading
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Paralel API çağrıları - Gerçek data
      const [tesvikResponse, activitiesResponse] = await Promise.all([
        api.get(`/tesvik/${id}`).catch(err => {
          console.warn('Tesvik API hatası, mock data kullanılıyor:', err.message);
          return null;
        }),
        api.get(`/activities?targetId=${id}`).catch(err => {
          console.warn('Activities API hatası, mock data kullanılıyor:', err.message);
          return null;
        })
      ]);

      // Tesvik verisi
      let tesvikData;
      if (tesvikResponse && tesvikResponse.data.success) {
        tesvikData = tesvikResponse.data.data;
        console.log('✅ Gerçek tesvik verisi yüklendi:', tesvikData.tesvikId);
      } else {
        // Fallback - Mock data
        console.log('⚠️ Mock data kullanılıyor...');
        tesvikData = {
          _id: id,
          tesvikId: 'TES20250011',
          gmId: 'GM2025009',
          yatirimciUnvan: 'TOPÇUOĞLU SANAYİ VE TİCARET ANONİM ŞİRKETİ',
          durumBilgileri: { genelDurum: 'reddedildi' },
          firmaBilgileri: { vergiNo: 'A001081', unvan: 'TOPÇUOĞLU SANAYİ VE TİCARET ANONİM ŞİRKETİ' },
          yatirimBilgileri2: { yatirimKonusu: '1513', destekSinifi: 'Bölgesel', il: 'TOKAT', ilce: 'MERKEZ', yatirimAdresi1: 'Bedestenlioğlu OSB Mah. 2. OSB Mevkii 6. Cad. No:34' },
          istihdam: { toplamKisi: 41, mevcutKisi: 11, ilaveKisi: 30 },
          urunler: [{ urunAdi: 'Hazır Paketlenmiş - Dondurulmuş Kızartmalık Patates', us97Kodu: 'US97001', mevcut: 300000, ilave: 1900000, toplam: 2200000, birim: 'KG/YIL' }],
          maliHesaplamalar: { toplamSabitYatirim: 8899899, araziArsaBedeli: 2000000, binaInsaatGiderleri: 5499999, finansman: 25000000, makineTeçhizatGiderleri: 399900, digerYatirimHarcamalari: 1000000 },
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // Activities verisi
      let activitiesData = [];
      if (activitiesResponse && activitiesResponse.data.success) {
        // 🔥 FIX: activities array'i data.activities içinde
        activitiesData = activitiesResponse.data.data?.activities || [];
        console.log('✅ Gerçek activities verisi yüklendi:', activitiesData.length, 'adet');
      } else {
        // Fallback - Mock activities
        activitiesData = [
          { _id: '1', action: 'create', user: { adSoyad: 'Hüseyin Cahit Ağar', rol: 'admin' }, createdAt: new Date(), changes: { fields: [{ field: 'durum', oldValue: '-', newValue: 'hazırlanıyor' }] } },
          { _id: '2', action: 'update', user: { adSoyad: 'Sistem Yöneticisi', rol: 'system' }, createdAt: new Date(), changes: { fields: [{ field: 'durum', oldValue: 'hazırlanıyor', newValue: 'reddedildi' }] } }
        ];
      }
      
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
                  {tesvik.tesvikId || tesvik.gmId}
              </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, fontSize: '0.85rem' }}>
                {tesvik.yatirimciUnvan}
              </Typography>
                
                {/* Kompakt Status Badge */}
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
                  <Chip
                    label={tesvik.durumBilgileri?.genelDurum?.replace('_', ' ')}
                    size="small"
                    sx={{
                      background: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      height: 22
                    }}
                  />
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
              {exportingRevizyon ? 'Excel Hazırlanıyor...' : 'Sistem Exel Revizyon'}
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
                height: 80,
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
                  <Typography variant="body1" sx={{ 
                    fontWeight: 700, 
                    color: getDurumColor(tesvik.durumBilgileri?.genelDurum),
                    fontSize: '0.85rem',
                    mb: 0.5
                  }}>
                    {tesvik.durumBilgileri?.genelDurum?.replace('_', ' ') || 'Bilinmiyor'}
                    </Typography>
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
                height: 80,
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
                    {tesvik.firmaBilgileri?.vergiNo || 'A001081'}
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
                height: 80,
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
                    {tesvik.yatirimBilgileri2?.yatirimKonusu || '1513'}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: '#64748b',
                    fontSize: '0.6rem',
                    display: 'block'
                  }}>
                    {tesvik.yatirimBilgileri2?.destekSinifi || 'Bölgesel'} - {tesvik.yatirimBilgileri2?.il || 'TOKAT'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* İstihdam */}
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 1,
                height: 80,
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
                    {tesvik.istihdam?.toplamKisi || '41'}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: '#10b981',
                    fontSize: '0.6rem',
                    fontWeight: 600
                  }}>
                    +{tesvik.istihdam?.ilaveKisi || '30'} İlave
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            </Grid>

          {/* 💼 YATIRIM İLE İLGİLİ BİLGİLER */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                💼 Yatırım İle İlgili Bilgiler
                  </Typography>
            </Box>
            <Grid container spacing={1}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0' }}>
                  <Typography variant="caption" sx={{ color: '#166534', fontSize: '0.65rem', fontWeight: 500 }}>Yatırım Konusu</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#15803d', fontSize: '0.8rem' }}>
                    {tesvik.yatirimBilgileri2?.yatirimKonusu || '1513'}
                    </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#fef7ff', borderRadius: 1, border: '1px solid #e9d5ff' }}>
                  <Typography variant="caption" sx={{ color: '#7c3aed', fontSize: '0.65rem', fontWeight: 500 }}>Destek Sınıfı</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#8b5cf6', fontSize: '0.8rem' }}>
                    {tesvik.yatirimBilgileri2?.destekSinifi || 'Bölgesel'}
                        </Typography>
                </Box>
                      </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#eff6ff', borderRadius: 1, border: '1px solid #dbeafe' }}>
                  <Typography variant="caption" sx={{ color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 500 }}>Yatırım Lokasyonu</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#2563eb', fontSize: '0.8rem' }}>
                    {tesvik.yatirimBilgileri2?.il || 'TOKAT'} / {tesvik.yatirimBilgileri2?.ilce || 'MERKEZ'}
                        </Typography>
                </Box>
                      </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#fefce8', borderRadius: 1, border: '1px solid #fef08a' }}>
                  <Typography variant="caption" sx={{ color: '#ca8a04', fontSize: '0.65rem', fontWeight: 500 }}>Yatırım Adresi</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#d97706', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tesvik.yatirimBilgileri2?.yatirimAdresi1?.substring(0, 25) || 'Bedestenlioğlu OSB Mah.'}
                        </Typography>
                </Box>
                      </Grid>
                    </Grid>
                  </Paper>

          {/* 👥 İSTİHDAM BİLGİLERİ */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#f59e0b' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                👥 İstihdam Bilgileri
                    </Typography>
            </Box>
            <Grid container spacing={1}>
                      <Grid item xs={4}>
                <Box sx={{ p: 1, backgroundColor: '#fef7ff', borderRadius: 1, border: '1px solid #e9d5ff', textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.5rem' }}>
                    {tesvik.istihdam?.toplamKisi || '41'}
                        </Typography>
                  <Typography variant="caption" sx={{ color: '#7c3aed', fontSize: '0.65rem', fontWeight: 500 }}>
                    Toplam İstihdam
                  </Typography>
                </Box>
                      </Grid>
                      <Grid item xs={4}>
                <Box sx={{ p: 1, backgroundColor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981', fontSize: '1.2rem' }}>
                    {tesvik.istihdam?.mevcutKisi || '11'}
                        </Typography>
                  <Typography variant="caption" sx={{ color: '#166534', fontSize: '0.65rem', fontWeight: 500 }}>
                    Mevcut Kişi
                  </Typography>
                </Box>
                      </Grid>
                      <Grid item xs={4}>
                <Box sx={{ p: 1, backgroundColor: '#ecfdf5', borderRadius: 1, border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#059669', fontSize: '1.2rem' }}>
                    +{tesvik.istihdam?.ilaveKisi || '30'}
                        </Typography>
                  <Typography variant="caption" sx={{ color: '#047857', fontSize: '0.65rem', fontWeight: 500 }}>
                    İlave Kişi
                  </Typography>
                </Box>
                      </Grid>
                    </Grid>
                  </Paper>

          {/* 💰 FİNANSAL BİLGİLER - KOMPAKT FORM STİLİ */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#3b82f6' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                💰 Finansal Bilgiler
                  </Typography>
              <Chip label="Form Verileri" size="small" sx={{ ml: 'auto', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.6rem', height: 20 }} />
            </Box>
            
            {/* Ana Toplam */}
            <Paper sx={{ 
              p: 2, 
              mb: 1.5, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: 'white',
              borderRadius: 2
            }}>
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                ₺{(tesvik.maliHesaplamalar?.toplamSabitYatirim || 8899899).toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>
                TOPLAM SABİT YATIRIM TUTARI TL
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                Ana yatırım tutarı • Form verisi
              </Typography>
            </Paper>
            
            {/* Finansal Detay Kartları */}
            <Grid container spacing={0.5}>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#fef7cd', border: '1px solid #fbbf24', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400e', mb: 0.5, fontSize: '0.6rem' }}>Arazi Arsa Bedeli</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#78350f', fontSize: '0.8rem' }}>₺{(tesvik.maliHesaplamalar?.araziArsaBedeli || 2000000).toLocaleString()}</Typography>
                </Paper>
            </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#dcfce7', border: '1px solid #4ade80', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', mb: 0.5, fontSize: '0.6rem' }}>Bina İnşaat Giderleri</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d', fontSize: '0.8rem' }}>₺{(tesvik.maliHesaplamalar?.binaInsaatGiderleri || 5499999).toLocaleString()}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#dbeafe', border: '1px solid #60a5fa', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e40af', mb: 0.5, fontSize: '0.6rem' }}>Finansman TL</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.8rem' }}>₺{(tesvik.maliHesaplamalar?.finansman || 25000000).toLocaleString()}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#fae8ff', border: '1px solid #c084fc', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed', mb: 0.5, fontSize: '0.6rem' }}>Makine Teçhizat</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#8b5cf6', fontSize: '0.8rem' }}>₺{(tesvik.maliHesaplamalar?.makineTeçhizatGiderleri || 399900).toLocaleString()}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#dc2626', mb: 0.5, fontSize: '0.6rem' }}>Diğer Yatırım Harc.</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#991b1b', fontSize: '0.8rem' }}>₺{(tesvik.maliHesaplamalar?.digerYatirimHarcamalari || 1000000).toLocaleString()}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', mb: 0.5, fontSize: '0.6rem' }}>Finansal Durum</Typography>
                  <Chip label="✓ Hazır" size="small" sx={{ backgroundColor: '#10b981', color: 'white', fontWeight: 600, fontSize: '0.6rem', height: 18 }} />
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          {/* 📦 ÜRÜN BİLGİLERİ & US97 KODLARI */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#8b5cf6' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                📦 Ürün Bilgileri & US97 Kodları
                  </Typography>
              <Chip label="+3 ürün daha" size="small" sx={{ ml: 'auto', backgroundColor: '#fef7ff', color: '#8b5cf6', fontSize: '0.6rem', height: 20 }} />
            </Box>
            
            {/* Kompakt Ürün Listesi */}
            {tesvik.urunler && tesvik.urunler.length > 0 ? (
              <Grid container spacing={0.5}>
                {tesvik.urunler.slice(0, 6).map((urun, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper sx={{ 
                      p: 1, 
                      backgroundColor: '#fafbfc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 1,
                      transition: 'all 0.2s ease',
                      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.65rem' }}>
                          Ürün #{index + 1}
                        </Typography>
                        {urun.us97Kodu && (
                          <Chip 
                            label={urun.us97Kodu} 
                            size="small" 
                      sx={{
                              backgroundColor: '#fef7ff', 
                              color: '#8b5cf6',
                              fontWeight: 500,
                              fontSize: '0.6rem',
                              height: 18
                            }} 
                          />
                        )}
                      </Box>
                      
                      <Typography variant="body2" sx={{ 
                        mb: 0.5, 
                        fontWeight: 500, 
                        fontSize: '0.75rem',
                        minHeight: 32,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {urun.urunAdi || 'Hazır Paketlenmiş - Dondurulmuş Kızartmalık Patates'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981', fontSize: '0.8rem' }}>
                            {urun.mevcut?.toLocaleString() || '300.000'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6rem' }}>Mevcut</Typography>
                            </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.8rem' }}>
                            +{urun.ilave?.toLocaleString() || '1.900.000'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6rem' }}>İlave</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem' }}>
                            {urun.toplam?.toLocaleString() || '2.200.000'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6rem' }}>{urun.birim || 'KG/YIL'}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper sx={{ p: 1, backgroundColor: '#f9fafb', textAlign: 'center', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Henüz ürün bilgisi tanımlanmamış
                </Typography>
              </Paper>
            )}
          </Paper>

          {/* 🛡️ DESTEK UNSURLARI - KOMPAKT */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#8b5cf6' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                🛡️ Destek Unsurları
                      </Typography>
            </Box>
            
            {/* Default Destek Unsurları */}
            <Grid container spacing={0.5}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 1, backgroundColor: '#fef7ff', border: '1px solid #d8b4fe', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#7c3aed', fontSize: '0.75rem' }}>
                      Sigorta Primi İşveren Hissesi
                        </Typography>
                    <Chip label="beklemede" size="small" sx={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.6rem', height: 18 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
                    7 Yıl ve En Fazla Yatırım Tutarının %35'i (5. Bölge)
                        </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 1, backgroundColor: '#fef7ff', border: '1px solid #d8b4fe', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#7c3aed', fontSize: '0.75rem' }}>
                      Vergi İndirimi
                        </Typography>
                    <Chip label="beklemede" size="small" sx={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.6rem', height: 18 }} />
                      </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
                    Yatırıma Katkı Oranı:%40 - Vergi İndirim %80 (5. Bölge)
                  </Typography>
                    </Paper>
            </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 1, backgroundColor: '#fef7ff', border: '1px solid #d8b4fe', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#7c3aed', fontSize: '0.75rem' }}>
                      Faiz Desteği
                    </Typography>
                    <Chip label="beklemede" size="small" sx={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.6rem', height: 18 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
                    TL 5 Puan - Döviz 2 Puan (En Fazla 1.4 Milyon TL yararlanılır)(5. Bölge)
                    </Typography>
                </Paper>
              </Grid>
          </Grid>
          </Paper>

          {/* ⚖️ ÖZEL ŞARTLAR - KOMPAKT */}
          <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#f59e0b' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                ⚖️ Özel Şartlar
              </Typography>
      </Box>

            {/* Default Özel Şartlar */}
            <Grid container spacing={0.5}>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 1, backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#d97706', fontSize: '0.75rem', mb: 0.5 }}>
                    Şart #1
              </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e', fontSize: '0.65rem' }}>
                    DİĞER KURUM-3(21.08.2020)
                </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 1, backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#d97706', fontSize: '0.75rem', mb: 0.5 }}>
                    Şart #2
                      </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e', fontSize: '0.65rem' }}>
                    BÖL- Faliyet Zorunluluğu
                      </Typography>
                    </Paper>
                  </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 1, backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#d97706', fontSize: '0.75rem', mb: 0.5 }}>
                    Şart #3
                      </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e', fontSize: '0.65rem' }}>
                    BÖL - SGK NO
                      </Typography>
                    </Paper>
                  </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 1, backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#d97706', fontSize: '0.75rem', mb: 0.5 }}>
                    Şart #4
                      </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e', fontSize: '0.65rem' }}>
                    İşyeri Açma ve Çalışma Ruhsatı
                      </Typography>
                    </Paper>
                  </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 1, backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#d97706', fontSize: '0.75rem', mb: 0.5 }}>
                    Şart #5
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e', fontSize: '0.65rem' }}>
                    DİĞER
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
          </Paper>

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
                    {activities?.find?.(a => a.action === 'create')?.user?.adSoyad || 'Hüseyin Cahit Ağar'}
                </Typography>
                  <Chip label="admin" size="small" sx={{ backgroundColor: '#dc2626', color: 'white', fontSize: '0.6rem', height: 16, mt: 0.25 }} />
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
                  <Typography variant="caption" sx={{ color: '#92400e', fontSize: '0.65rem', fontWeight: 500 }}>Son Güncelleme</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#d97706', fontSize: '0.8rem' }}>
                    Sistem Yöneticisi
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1, backgroundColor: '#fef2f2', borderRadius: 1, border: '1px solid #fecaca', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#dc2626', fontSize: '0.65rem', fontWeight: 500 }}>Son Güncelleme</Typography>
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
                  onChange={(e) => setRevizyonForm({...revizyonForm, revizyonSebebi: e.target.value})}
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