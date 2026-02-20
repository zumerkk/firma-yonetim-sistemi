// 📋 Dosya İş Akış Takip - Talep Detay ve İş Akışı Takibi
// Sol: Dikey stepper / timeline, Sağ: Aktif aşama form, Alt: Tarihçe

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, Chip, Paper, Grid, Avatar,
    Stepper, Step, StepLabel, StepContent, TextField,
    MenuItem, IconButton, Divider, Alert, Snackbar,
    Tooltip, LinearProgress, Collapse, Tabs, Tab,
    List, ListItem, ListItemIcon, ListItemText, ListItemAvatar,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Add as AddIcon,
    AttachFile as AttachFileIcon,
    Note as NoteIcon,
    Timeline as TimelineIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    PlayCircle as PlayCircleIcon,
    Person as PersonIcon,
    Business as BusinessIcon,
    AccountBalance as AccountBalanceIcon,
    Warning as WarningIcon,
    Send as SendIcon,
    History as HistoryIcon,
    Folder as FolderIcon,
    CloudUpload as CloudUploadIcon,
    Description as DescriptionIcon,
    Schedule as ScheduleIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDosyaTakip } from '../../contexts/DosyaTakipContext';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';

// Renk eşleştirmeleri
const DURUM_RENKLERI = {
    mavi: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', gradient: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' },
    sari: { bg: '#fefce8', text: '#a16207', border: '#fde047', gradient: 'linear-gradient(135deg, #92400e, #f59e0b)' },
    turuncu: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74', gradient: 'linear-gradient(135deg, #9a3412, #f97316)' },
    kirmizi: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', gradient: 'linear-gradient(135deg, #991b1b, #ef4444)' },
    yesil: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac', gradient: 'linear-gradient(135deg, #14532d, #22c55e)' },
    gri: { bg: '#f9fafb', text: '#4b5563', border: '#d1d5db', gradient: 'linear-gradient(135deg, #374151, #6b7280)' },
    mor: { bg: '#faf5ff', text: '#7c3aed', border: '#c4b5fd', gradient: 'linear-gradient(135deg, #4c1d95, #7c3aed)' }
};

// Durum etiketleri
const DURUM_ETIKETLERI = {
    '2.1.1_GORUSULUYOR': 'Görüşülüyor',
    '2.1.2_BEKLE_EVRAK_TAMAM_FIYAT': 'Bekle - Evrak Tamam, Fiyat Bekleniyor',
    '2.1.3_FIYAT_TAMAM_EVRAK_BEKLE': 'Fiyat Tamam - Evrak Bekleniyor',
    '2.1.4_MURACAAT_HAZIRLANIYOR': 'Müracaat Hazırlanıyor',
    '2.2.1_KURUM_DEGERLENDIRME': 'Kurum Değerlendirme',
    '2.2.1.1_KURUM_BEKLENIYOR': 'Kurum Bekleniyor',
    '2.2.1.1.1_KURUM_IRTIBAT_SAGLANDI': 'Kurum İrtibat Sağlandı',
    '2.2.1.1.2_KURUM_IRTIBAT_SAGLANAMADI': 'Kurum İrtibat Sağlanamadı',
    '2.2.1.1.3_KURUM_KENDI_HALINDE': 'Kurum Kendi Halinde Kalacak',
    '2.2.3_KURUM_EKSIK': 'Kurum Eksik',
    '2.2.3.1_EKSIK_FIRMADAN_BEKLENIYOR': 'Eksik Firmadan Bekleniyor',
    '2.2.3.2_EKSIK_BIZDEN_BEKLENIYOR': 'Eksik Bizden Bekleniyor',
    '2.2.3.3_EKSIK_HEM_FIRMA_HEM_BIZDEN': 'Eksik Hem Firma Hem Bizden',
    '2.3.1_SONUC_FIRMAYA_ILETILDI': 'Sonuç Firmaya İletildi',
    '2.3.2_SONUC_BEKLETILECEK': 'Sonuç Bekletilecek',
    '2.3.3_TALEP_FIRMA_IPTAL': 'Talep Firma Tarafından İptal',
    '2.3.4_TALEP_GM_IPTAL': 'Talep GM Tarafından İptal'
};

// Workflow aşamaları yapılandırması
const WORKFLOW_STEPS = [
    {
        key: 'MURACAAT_ONCESI',
        label: '2.1 Müracaat Öncesi',
        icon: <DescriptionIcon />,
        color: '#7c3aed',
        subSteps: [
            { key: '2.1.1_GORUSULUYOR', label: 'Görüşülüyor' },
            { key: '2.1.2_BEKLE_EVRAK_TAMAM_FIYAT', label: 'Bekle - Evrak Tamam, Fiyat' },
            { key: '2.1.3_FIYAT_TAMAM_EVRAK_BEKLE', label: 'Fiyat Tamam - Evrak Bekle' },
            { key: '2.1.4_MURACAAT_HAZIRLANIYOR', label: 'Müracaat Hazırlanıyor' }
        ]
    },
    {
        key: 'MURACAAT_SONRASI',
        label: '2.2 Müracaat Sonrası',
        icon: <AccountBalanceIcon />,
        color: '#dc2626',
        subSteps: [
            { key: '2.2.1_KURUM_DEGERLENDIRME', label: 'Kurum Değerlendirme' },
            { key: '2.2.1.1_KURUM_BEKLENIYOR', label: 'Kurum Bekleniyor' },
            { key: '2.2.1.1.1_KURUM_IRTIBAT_SAGLANDI', label: 'İrtibat Sağlandı' },
            { key: '2.2.1.1.2_KURUM_IRTIBAT_SAGLANAMADI', label: 'İrtibat Sağlanamadı' },
            { key: '2.2.1.1.3_KURUM_KENDI_HALINDE', label: 'Kendi Halinde Kalacak' },
            { key: '2.2.3_KURUM_EKSIK', label: 'Kurum Eksik' },
            { key: '2.2.3.1_EKSIK_FIRMADAN_BEKLENIYOR', label: 'Eksik Firmadan' },
            { key: '2.2.3.2_EKSIK_BIZDEN_BEKLENIYOR', label: 'Eksik Bizden' },
            { key: '2.2.3.3_EKSIK_HEM_FIRMA_HEM_BIZDEN', label: 'Eksik Her İkisinden' }
        ]
    },
    {
        key: 'KURUM_SONUCLANMA',
        label: '2.3 Kurum Sonuçlanma',
        icon: <CheckCircleIcon />,
        color: '#059669',
        subSteps: [
            { key: '2.3.1_SONUC_FIRMAYA_ILETILDI', label: 'Firmaya İletildi' },
            { key: '2.3.2_SONUC_BEKLETILECEK', label: 'Bekletilecek' },
            { key: '2.3.3_TALEP_FIRMA_IPTAL', label: 'Firma İptal' },
            { key: '2.3.4_TALEP_GM_IPTAL', label: 'GM İptal' }
        ]
    }
];

const DosyaTakipDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { seciliTalep, fetchTalep, durumDegistir, notEkle, dosyaEkle, talepGuncelle, loading, error, clearError } = useDosyaTakip();

    const [activeTab, setActiveTab] = useState(0);
    const [notText, setNotText] = useState('');
    const [notAlan, setNotAlan] = useState('genelNotlar');
    const [durumDialog, setDurumDialog] = useState({ open: false, yeniDurum: '', aciklama: '' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [expandedStep, setExpandedStep] = useState(null);

    useEffect(() => {
        if (id) fetchTalep(id);
    }, [id, fetchTalep]);

    // Aktif ana aşama index'i
    const getActiveStepIndex = () => {
        if (!seciliTalep) return 0;
        const asama = seciliTalep.anaAsama;
        return WORKFLOW_STEPS.findIndex(s => s.key === asama);
    };

    // Durum değişikliği
    const handleDurumDegistir = async () => {
        try {
            await durumDegistir(id, durumDialog.yeniDurum, durumDialog.aciklama);
            setDurumDialog({ open: false, yeniDurum: '', aciklama: '' });
            setSnackbar({ open: true, message: 'Durum başarıyla güncellendi!', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Durum değiştirilemedi.', severity: 'error' });
        }
    };

    // Not ekleme
    const handleNotEkle = async () => {
        if (!notText.trim()) return;
        try {
            await notEkle(id, notText, notAlan);
            setNotText('');
            setSnackbar({ open: true, message: 'Not eklendi!', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Not eklenemedi.', severity: 'error' });
        }
    };

    // Dosya yükleme
    const handleDosyaYukle = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await dosyaEkle(id, file, 'dosyalar');
            setSnackbar({ open: true, message: 'Dosya yüklendi!', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Dosya yüklenemedi.', severity: 'error' });
        }
        e.target.value = '';
    };

    if (!seciliTalep && loading) {
        return (
            <LayoutWrapper>
                <Box sx={{ p: 3 }}>
                    <LinearProgress />
                    <Typography sx={{ mt: 2, color: '#64748b', textAlign: 'center' }}>Talep yükleniyor...</Typography>
                </Box>
            </LayoutWrapper>
        );
    }

    if (!seciliTalep && !loading) {
        return (
            <LayoutWrapper>
                <Box sx={{ p: 3, textAlign: 'center', mt: 8 }}>
                    <WarningIcon sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>Talep bulunamadı</Typography>
                    <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/dosya-takip/liste')} sx={{ textTransform: 'none' }}>
                        Listeye Dön
                    </Button>
                </Box>
            </LayoutWrapper>
        );
    }

    const renk = DURUM_RENKLERI[seciliTalep.durumRengi] || DURUM_RENKLERI.mavi;
    const activeStepIndex = getActiveStepIndex();

    return (
        <LayoutWrapper>
            <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
                {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate('/dosya-takip/liste')} sx={{ border: '1px solid #e2e8f0' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                    {seciliTalep.takipId}
                                </Typography>
                                <Chip
                                    label={DURUM_ETIKETLERI[seciliTalep.durum] || seciliTalep.durum}
                                    size="small"
                                    sx={{
                                        background: renk.bg,
                                        color: renk.text,
                                        border: `1px solid ${renk.border}`,
                                        fontWeight: 600,
                                        fontSize: '0.72rem'
                                    }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                                {seciliTalep.talepTuru} • {seciliTalep.firmaUnvan || 'Firma bilgisi yok'}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/dosya-takip/${id}/duzenle`)}
                            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#e2e8f0', color: '#374151' }}
                        >
                            Düzenle
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => setDurumDialog({ open: true, yeniDurum: '', aciklama: '' })}
                            sx={{
                                textTransform: 'none',
                                borderRadius: 2,
                                background: renk.gradient,
                                boxShadow: `0 4px 14px ${renk.text}35`
                            }}
                        >
                            Durum Değiştir
                        </Button>
                    </Box>
                </Box>

                {/* Talep Özet Kartı */}
                <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', background: `linear-gradient(135deg, ${renk.bg}, white)` }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Firma</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{seciliTalep.firmaUnvan || '-'}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>{seciliTalep.firmaId}</Typography>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>YTB No</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{seciliTalep.ytbNo || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Belge Türü</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{seciliTalep.belgeTuru || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Oluşturma</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {seciliTalep.createdAt ? new Date(seciliTalep.createdAt).toLocaleDateString('tr-TR') : '-'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>Oluşturan</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {seciliTalep.olusturanAdi || seciliTalep.olusturanKullanici?.adSoyad || '-'}
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Ana İçerik: Sol Timeline + Sağ Panel */}
                <Grid container spacing={3}>
                    {/* Sol: İş Akışı Timeline */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <TimelineIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                                    İş Akışı Aşamaları
                                </Typography>
                            </Box>
                            <Box sx={{ p: 2 }}>
                                <Stepper activeStep={activeStepIndex} orientation="vertical">
                                    {WORKFLOW_STEPS.map((step, index) => {
                                        const isActive = index === activeStepIndex;
                                        const isCompleted = index < activeStepIndex;
                                        const isExpanded = expandedStep === index || isActive;

                                        return (
                                            <Step key={step.key} completed={isCompleted}>
                                                <StepLabel
                                                    onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                                                    StepIconComponent={() => (
                                                        <Avatar sx={{
                                                            width: 32, height: 32,
                                                            background: isActive ? `${step.color}` : isCompleted ? '#22c55e' : '#e2e8f0',
                                                            color: isActive || isCompleted ? 'white' : '#9ca3af',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s',
                                                            boxShadow: isActive ? `0 0 0 3px ${step.color}30` : 'none'
                                                        }}>
                                                            {isCompleted ? <CheckCircleIcon sx={{ fontSize: 18 }} /> :
                                                                isActive ? <PlayCircleIcon sx={{ fontSize: 18 }} /> :
                                                                    React.cloneElement(step.icon, { sx: { fontSize: 16 } })}
                                                        </Avatar>
                                                    )}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <Typography variant="body2" sx={{
                                                        fontWeight: isActive ? 700 : 500,
                                                        color: isActive ? step.color : isCompleted ? '#22c55e' : '#6b7280',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {step.label}
                                                    </Typography>
                                                </StepLabel>
                                                <StepContent>
                                                    <Collapse in={isExpanded}>
                                                        <Box sx={{ pl: 1, mt: 0.5 }}>
                                                            {step.subSteps.map(sub => {
                                                                const isCurrentSub = seciliTalep.durum === sub.key;
                                                                return (
                                                                    <Box key={sub.key} sx={{
                                                                        display: 'flex', alignItems: 'center', gap: 1,
                                                                        py: 0.75, px: 1, mb: 0.5,
                                                                        borderRadius: 1.5,
                                                                        background: isCurrentSub ? `${step.color}10` : 'transparent',
                                                                        border: isCurrentSub ? `1px solid ${step.color}30` : '1px solid transparent',
                                                                        transition: 'all 0.2s'
                                                                    }}>
                                                                        {isCurrentSub ?
                                                                            <PlayCircleIcon sx={{ fontSize: 14, color: step.color }} /> :
                                                                            <UncheckedIcon sx={{ fontSize: 14, color: '#d1d5db' }} />
                                                                        }
                                                                        <Typography variant="caption" sx={{
                                                                            fontSize: '0.72rem',
                                                                            fontWeight: isCurrentSub ? 600 : 400,
                                                                            color: isCurrentSub ? step.color : '#6b7280'
                                                                        }}>
                                                                            {sub.label}
                                                                        </Typography>
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    </Collapse>
                                                </StepContent>
                                            </Step>
                                        );
                                    })}
                                </Stepper>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Sağ: Detay Panelleri */}
                    <Grid item xs={12} md={8}>
                        {/* Tab Paneli */}
                        <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <Tabs
                                value={activeTab}
                                onChange={(e, v) => setActiveTab(v)}
                                sx={{
                                    borderBottom: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', minHeight: 48 },
                                    '& .Mui-selected': { color: '#f59e0b !important' },
                                    '& .MuiTabs-indicator': { backgroundColor: '#f59e0b' }
                                }}
                            >
                                <Tab icon={<NoteIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Notlar" />
                                <Tab icon={<FolderIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Dosyalar" />
                                <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Durum Geçmişi" />
                                <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Atamalar" />
                            </Tabs>

                            <Box sx={{ p: 3 }}>
                                {/* TAB 0: NOTLAR */}
                                {activeTab === 0 && (
                                    <Box>
                                        {/* Not ekleme formu */}
                                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="Not yazın..."
                                                value={notText}
                                                onChange={(e) => setNotText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleNotEkle()}
                                                multiline
                                                maxRows={3}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                            <TextField
                                                select
                                                size="small"
                                                value={notAlan}
                                                onChange={(e) => setNotAlan(e.target.value)}
                                                sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            >
                                                <MenuItem value="genelNotlar">Genel Not</MenuItem>
                                                <MenuItem value="muraacatOncesi.gorusmeNotlari">Görüşme Notu</MenuItem>
                                                <MenuItem value="muraacatOncesi.eksikEvraklar">Eksik Evrak</MenuItem>
                                                <MenuItem value="muraacatSonrasi.kurumDegerlendirme.gorusmeNotlari">Kurum Notu</MenuItem>
                                                <MenuItem value="kurumSonuclanma.sonucNotlari">Sonuç Notu</MenuItem>
                                            </TextField>
                                            <Button
                                                variant="contained"
                                                onClick={handleNotEkle}
                                                disabled={!notText.trim()}
                                                sx={{
                                                    minWidth: 48,
                                                    borderRadius: 2,
                                                    background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                                                    '&:hover': { background: 'linear-gradient(135deg, #b45309, #d97706)' }
                                                }}
                                            >
                                                <SendIcon sx={{ fontSize: 18 }} />
                                            </Button>
                                        </Box>

                                        {/* Not listesi */}
                                        {renderNotlar(seciliTalep)}
                                    </Box>
                                )}

                                {/* TAB 1: DOSYALAR */}
                                {activeTab === 1 && (
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Yüklenen Dosyalar</Typography>
                                            <Button
                                                variant="outlined"
                                                component="label"
                                                startIcon={<CloudUploadIcon />}
                                                sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#e2e8f0', color: '#374151' }}
                                            >
                                                Dosya Yükle
                                                <input hidden type="file" onChange={handleDosyaYukle} />
                                            </Button>
                                        </Box>
                                        {renderDosyalar(seciliTalep)}
                                    </Box>
                                )}

                                {/* TAB 2: DURUM GEÇMİŞİ */}
                                {activeTab === 2 && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Durum Değişiklik Geçmişi</Typography>
                                        {(!seciliTalep.durumGecmisi || seciliTalep.durumGecmisi.length === 0) ? (
                                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                                <HistoryIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                                                <Typography color="textSecondary">Henüz durum değişikliği yapılmamış</Typography>
                                            </Box>
                                        ) : (
                                            <List sx={{ p: 0 }}>
                                                {[...seciliTalep.durumGecmisi].reverse().map((gecmis, index) => (
                                                    <ListItem key={index} alignItems="flex-start" sx={{ px: 0 }}>
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ width: 32, height: 32, background: '#f59e0b', fontSize: '0.75rem' }}>
                                                                {index + 1}
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                    <Chip label={DURUM_ETIKETLERI[gecmis.oncekiDurum] || gecmis.oncekiDurum} size="small"
                                                                        sx={{ fontSize: '0.65rem', height: 22, background: '#fee2e2', color: '#dc2626' }} />
                                                                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>→</Typography>
                                                                    <Chip label={DURUM_ETIKETLERI[gecmis.yeniDurum] || gecmis.yeniDurum} size="small"
                                                                        sx={{ fontSize: '0.65rem', height: 22, background: '#dcfce7', color: '#16a34a' }} />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                                                                    {gecmis.degistirenAdi || 'Sistem'} • {gecmis.tarih ? new Date(gecmis.tarih).toLocaleString('tr-TR') : '-'}
                                                                    {gecmis.aciklama && <><br /><em>"{gecmis.aciklama}"</em></>}
                                                                </Typography>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        )}
                                    </Box>
                                )}

                                {/* TAB 3: ATAMALAR */}
                                {activeTab === 3 && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Personel Atamaları</Typography>
                                        <Grid container spacing={2}>
                                            {[
                                                { label: 'Görüşme Yapan', value: seciliTalep.muraacatOncesi?.gorusmeYapan?.adSoyad || seciliTalep.muraacatOncesi?.gorusmeYapanAdi },
                                                { label: 'Müracaat Hazırlayan', value: seciliTalep.muraacatOncesi?.muraacatHazirlayanPersonel?.adSoyad || seciliTalep.muraacatOncesi?.muraacatHazirlayanAdi },
                                                { label: 'Takibi Yapan', value: seciliTalep.muraacatSonrasi?.takibiYapanPersonel?.adSoyad || seciliTalep.muraacatSonrasi?.takibiYapanAdi },
                                                { label: 'Sonuçlama Personeli', value: seciliTalep.kurumSonuclanma?.personel?.adSoyad || seciliTalep.kurumSonuclanma?.personelAdi }
                                            ].map((atama, i) => (
                                                <Grid item xs={12} md={6} key={i}>
                                                    <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', background: atama.value ? '#f0fdf4' : '#f9fafb' }}>
                                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                                            {atama.label}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 500, color: atama.value ? '#1e293b' : '#9ca3af', mt: 0.5 }}>
                                                            {atama.value || 'Atanmadı'}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            ))}

                                            {/* Kurum Bilgileri */}
                                            {seciliTalep.muraacatSonrasi?.kurumDegerlendirme && (
                                                <>
                                                    <Grid item xs={12} md={6}>
                                                        <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                                                Kurum Dairesi
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                                                {seciliTalep.muraacatSonrasi.kurumDegerlendirme.kurumDaire || 'Belirtilmedi'}
                                                            </Typography>
                                                        </Paper>
                                                    </Grid>
                                                    <Grid item xs={12} md={6}>
                                                        <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                                                Daire Uzmanı
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                                                {seciliTalep.muraacatSonrasi.kurumDegerlendirme.daireUzman || 'Belirtilmedi'}
                                                            </Typography>
                                                        </Paper>
                                                    </Grid>
                                                </>
                                            )}
                                        </Grid>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Durum Değiştir Dialog */}
                <Dialog open={durumDialog.open} onClose={() => setDurumDialog({ open: false, yeniDurum: '', aciklama: '' })} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                        🔄 Durum Değiştir
                    </DialogTitle>
                    <DialogContent sx={{ pt: '16px !important' }}>
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                            Mevcut durum: <strong>{DURUM_ETIKETLERI[seciliTalep?.durum] || seciliTalep?.durum}</strong>
                        </Typography>
                        <TextField
                            fullWidth
                            select
                            label="Yeni Durum *"
                            value={durumDialog.yeniDurum}
                            onChange={(e) => setDurumDialog(prev => ({ ...prev, yeniDurum: e.target.value }))}
                            sx={{ mb: 2 }}
                        >
                            {Object.entries(DURUM_ETIKETLERI).map(([key, label]) => (
                                <MenuItem key={key} value={key} disabled={key === seciliTalep?.durum}>
                                    {label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Açıklama (Opsiyonel)"
                            value={durumDialog.aciklama}
                            onChange={(e) => setDurumDialog(prev => ({ ...prev, aciklama: e.target.value }))}
                            placeholder="Durum değişikliği hakkında not yazın..."
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
                        <Button onClick={() => setDurumDialog({ open: false, yeniDurum: '', aciklama: '' })} sx={{ textTransform: 'none' }}>
                            İptal
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleDurumDegistir}
                            disabled={!durumDialog.yeniDurum || loading}
                            sx={{
                                textTransform: 'none',
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                                '&:hover': { background: 'linear-gradient(135deg, #b45309, #d97706)' }
                            }}
                        >
                            Durumu Güncelle
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} sx={{ borderRadius: 2 }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </LayoutWrapper>
    );
};

// ============================================================================
// YARDIMCI RENDER FONKSİYONLARI
// ============================================================================

function renderNotlar(talep) {
    const tumNotlar = [];

    // Genel notlar
    (talep.genelNotlar || []).forEach(n => tumNotlar.push({ ...n, kaynak: 'Genel Not' }));
    // Görüşme notları
    (talep.muraacatOncesi?.gorusmeNotlari || []).forEach(n => tumNotlar.push({ ...n, kaynak: 'Görüşme Notu' }));
    // Müracaat notları
    (talep.muraacatOncesi?.muraacatGorusmeNotlari || []).forEach(n => tumNotlar.push({ ...n, kaynak: 'Müracaat Notu' }));
    // Eksik evraklar
    (talep.muraacatOncesi?.eksikEvraklar || []).forEach(n => tumNotlar.push({ ...n, kaynak: 'Eksik Evrak' }));
    // Kurum notları
    (talep.muraacatSonrasi?.kurumDegerlendirme?.gorusmeNotlari || []).forEach(n => tumNotlar.push({ ...n, kaynak: 'Kurum Notu' }));
    // Sonuç notları
    (talep.kurumSonuclanma?.sonucNotlari || []).forEach(n => tumNotlar.push({ ...n, kaynak: 'Sonuç Notu' }));

    // Tarihe göre sırala
    tumNotlar.sort((a, b) => new Date(b.tarih || b.createdAt) - new Date(a.tarih || a.createdAt));

    if (tumNotlar.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <NoteIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                <Typography color="textSecondary">Henüz not eklenmemiş</Typography>
            </Box>
        );
    }

    return (
        <List sx={{ p: 0 }}>
            {tumNotlar.map((not, index) => (
                <ListItem key={not._id || index} alignItems="flex-start" sx={{ px: 0, py: 1 }}>
                    <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, background: '#fef3c7', color: '#d97706', fontSize: '0.7rem', fontWeight: 700 }}>
                            {not.yazanAdi?.charAt(0) || 'N'}
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                    {not.yazanAdi || 'Sistem'}
                                </Typography>
                                <Chip label={not.kaynak} size="small" sx={{ height: 18, fontSize: '0.6rem', background: '#f1f5f9', color: '#64748b' }} />
                                <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.65rem' }}>
                                    {not.tarih ? new Date(not.tarih).toLocaleString('tr-TR') : '-'}
                                </Typography>
                            </Box>
                        }
                        secondary={
                            <Typography variant="body2" sx={{ color: '#374151', mt: 0.25, fontSize: '0.82rem', lineHeight: 1.5 }}>
                                {not.metin}
                            </Typography>
                        }
                    />
                </ListItem>
            ))}
        </List>
    );
}

function renderDosyalar(talep) {
    const tumDosyalar = [];

    (talep.dosyalar || []).forEach(d => tumDosyalar.push({ ...d, kaynak: 'Genel' }));
    (talep.muraacatOncesi?.gorusmeEvraklari || []).forEach(d => tumDosyalar.push({ ...d, kaynak: 'Görüşme Evrakı' }));
    (talep.muraacatOncesi?.muraacatKlasor || []).forEach(d => tumDosyalar.push({ ...d, kaynak: 'Müracaat Klasörü' }));

    if (tumDosyalar.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <FolderIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                <Typography color="textSecondary">Henüz dosya yüklenmemiş</Typography>
            </Box>
        );
    }

    return (
        <List sx={{ p: 0 }}>
            {tumDosyalar.map((dosya, index) => (
                <ListItem key={dosya._id || index} sx={{
                    px: 2, py: 1.5, mb: 1,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    '&:hover': { background: '#f8fafc' }
                }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <AttachFileIcon sx={{ color: '#f59e0b' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{dosya.dosyaAdi}</Typography>
                        }
                        secondary={
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {dosya.kaynak} • {dosya.yukleyenAdi || '-'} • {dosya.yuklemeTarihi ? new Date(dosya.yuklemeTarihi).toLocaleDateString('tr-TR') : '-'}
                                {dosya.dosyaBoyutu && ` • ${(dosya.dosyaBoyutu / 1024).toFixed(1)} KB`}
                            </Typography>
                        }
                    />
                    {dosya.dosyaYolu && (
                        <Tooltip title="İndir">
                            <IconButton size="small" component="a" href={dosya.dosyaYolu} target="_blank" download>
                                <DescriptionIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </ListItem>
            ))}
        </List>
    );
}

export default DosyaTakipDetail;
