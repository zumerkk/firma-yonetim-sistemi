// 📋 Dosya İş Akış Takip - Yeni Talep Oluşturma Formu
// Multi-step wizard form

import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, TextField, MenuItem, Grid,
    Paper, Stepper, Step, StepLabel, Autocomplete,
    Alert, CircularProgress, Divider
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Save as SaveIcon,
    Business as BusinessIcon,
    Assignment as AssignmentIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDosyaTakip } from '../../contexts/DosyaTakipContext';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import axios from '../../utils/axios';

const steps = ['Firma Seçimi', 'Talep Bilgileri', 'Ek Bilgiler'];

const DosyaTakipForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const { talepOlustur, talepGuncelle, fetchTalep, fetchEnums, enumDegerleri, loading, error, clearError } = useDosyaTakip();

    const [activeStep, setActiveStep] = useState(0);
    const [firmalar, setFirmalar] = useState([]);
    const [firmaLoading, setFirmaLoading] = useState(false);
    const [firmaSearch, setFirmaSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        firma: null,
        firmaId: '',
        firmaUnvan: '',
        belgeSistemi: 'Tesvik',
        belgeId: '',
        ytbNo: '',
        ytbBaslamaTarihi: '',
        ytbBitisTarihi: '',
        belgeTuru: '',
        sektorKonu: '',
        belgeGoruntulemeLinki: '',
        belgeDurumu: '',
        talepTuru: '',
        gmId: '',
        durumAciklamasi: ''
    });

    // Enum değerlerini yükle
    useEffect(() => {
        fetchEnums();
        loadUsers();
    }, [fetchEnums]);

    // Edit modunda mevcut veriyi yükle
    useEffect(() => {
        if (isEdit && id) {
            loadExistingData();
        }
    }, [isEdit, id]);

    const loadExistingData = async () => {
        try {
            const data = await fetchTalep(id);
            if (data) {
                setFormData({
                    firma: data.firma?._id || data.firma,
                    firmaId: data.firmaId || '',
                    firmaUnvan: data.firmaUnvan || '',
                    belgeSistemi: data.belgeSistemi || 'Tesvik',
                    belgeId: data.belgeId || '',
                    ytbNo: data.ytbNo || '',
                    ytbBaslamaTarihi: data.ytbBaslamaTarihi ? data.ytbBaslamaTarihi.split('T')[0] : '',
                    ytbBitisTarihi: data.ytbBitisTarihi ? data.ytbBitisTarihi.split('T')[0] : '',
                    belgeTuru: data.belgeTuru || '',
                    sektorKonu: data.sektorKonu || '',
                    belgeGoruntulemeLinki: data.belgeGoruntulemeLinki || '',
                    belgeDurumu: data.belgeDurumu || '',
                    talepTuru: data.talepTuru || '',
                    gmId: data.gmId || '',
                    durumAciklamasi: data.durumAciklamasi || ''
                });
                if (data.firma) {
                    setFirmalar([typeof data.firma === 'object' ? data.firma : { _id: data.firma, tamUnvan: data.firmaUnvan }]);
                }
            }
        } catch (err) {
            console.error('Mevcut veri yükleme hatası:', err);
        }
    };

    // Firma arama
    useEffect(() => {
        const timer = setTimeout(() => {
            if (firmaSearch.length >= 2) {
                searchFirmalar(firmaSearch);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [firmaSearch]);

    const searchFirmalar = async (query) => {
        try {
            setFirmaLoading(true);
            const { data } = await axios.get(`/firma?search=${query}&limit=20`);
            setFirmalar(data.data || data.firmalar || []);
        } catch (err) {
            console.error('Firma arama hatası:', err);
        } finally {
            setFirmaLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const { data } = await axios.get('/admin/users');
            setUsers(data.data || data.users || []);
        } catch (err) {
            // Admin olmayabilir, sessizce geç
            console.log('Kullanıcı listesi yüklenemedi');
        }
    };

    const handleChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleFirmaSelect = (event, value) => {
        if (value) {
            setFormData(prev => ({
                ...prev,
                firma: value._id,
                firmaId: value.firmaId || '',
                firmaUnvan: value.tamUnvan || ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                firma: null,
                firmaId: '',
                firmaUnvan: ''
            }));
        }
    };

    const handleNext = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

    const handleSubmit = async () => {
        try {
            clearError();
            setSuccess('');

            if (!formData.firma) {
                return;
            }
            if (!formData.talepTuru) {
                return;
            }

            let result;
            if (isEdit) {
                result = await talepGuncelle(id, formData);
            } else {
                result = await talepOlustur(formData);
            }

            if (result?.success) {
                setSuccess(isEdit ? 'Talep güncellendi!' : 'Talep oluşturuldu!');
                setTimeout(() => {
                    navigate(result.data?._id ? `/dosya-takip/${result.data._id}` : '/dosya-takip/liste');
                }, 1000);
            }
        } catch (err) {
            console.error('Kaydetme hatası:', err);
        }
    };

    const isStepValid = (step) => {
        switch (step) {
            case 0: return Boolean(formData.firma);
            case 1: return Boolean(formData.talepTuru);
            case 2: return true;
            default: return true;
        }
    };

    return (
        <LayoutWrapper>
            <Box sx={{ p: 3, maxWidth: 1000, margin: '0 auto' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                        sx={{ textTransform: 'none', color: '#64748b' }}
                    >
                        Geri
                    </Button>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {isEdit ? 'Talebi Düzenle' : 'Yeni Talep Oluştur'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {isEdit ? 'Mevcut talep bilgilerini güncelleyin' : 'Yeni bir iş akış talebi oluşturun'}
                        </Typography>
                    </Box>
                </Box>

                {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

                {/* Stepper */}
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label, index) => (
                        <Step key={label}>
                            <StepLabel
                                StepIconProps={{
                                    sx: {
                                        '&.Mui-active': { color: '#f59e0b' },
                                        '&.Mui-completed': { color: '#22c55e' }
                                    }
                                }}
                            >
                                {label}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                    {/* ADIM 1: FİRMA SEÇİMİ */}
                    {activeStep === 0 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <BusinessIcon sx={{ color: '#f59e0b' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    Firma Seçimi
                                </Typography>
                            </Box>

                            <Autocomplete
                                options={firmalar}
                                getOptionLabel={(option) => option.tamUnvan || option.firmaId || ''}
                                value={firmalar.find(f => f._id === formData.firma) || null}
                                onChange={handleFirmaSelect}
                                onInputChange={(e, value) => setFirmaSearch(value)}
                                loading={firmaLoading}
                                noOptionsText="Firma adı yazarak arayın..."
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Firma Seçimi *"
                                        placeholder="Firma adı veya ID yazın..."
                                        helperText="En az 2 karakter yazarak arayın"
                                        sx={{ mb: 3 }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <li {...props} key={option._id}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.tamUnvan}</Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                                {option.firmaId} {option.vergiNoTC && `• VKN: ${option.vergiNoTC}`}
                                            </Typography>
                                        </Box>
                                    </li>
                                )}
                            />

                            {formData.firma && (
                                <Paper sx={{ p: 2, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 2, mb: 3 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#16a34a' }}>
                                        ✅ Seçili Firma: {formData.firmaUnvan}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                                        Firma ID: {formData.firmaId}
                                    </Typography>
                                </Paper>
                            )}

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2 }}>
                                Belge Bilgileri (Opsiyonel)
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        select
                                        label="Belge Sistemi"
                                        value={formData.belgeSistemi}
                                        onChange={handleChange('belgeSistemi')}
                                    >
                                        <MenuItem value="Tesvik">Eski Teşvik Sistemi</MenuItem>
                                        <MenuItem value="YeniTesvik">Yeni Teşvik Sistemi</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth size="small" label="Belge ID" value={formData.belgeId} onChange={handleChange('belgeId')} />
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* ADIM 2: TALEP BİLGİLERİ */}
                    {activeStep === 1 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <AssignmentIcon sx={{ color: '#f59e0b' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    Talep Bilgileri
                                </Typography>
                            </Box>

                            <TextField
                                fullWidth
                                select
                                label="Talep Türü *"
                                value={formData.talepTuru}
                                onChange={handleChange('talepTuru')}
                                sx={{ mb: 3 }}
                                helperText="Oluşturmak istediğiniz talep türünü seçin"
                            >
                                {(enumDegerleri?.talepTurleri || []).map(t => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </TextField>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <TextField fullWidth size="small" label="YTB No" value={formData.ytbNo} onChange={handleChange('ytbNo')} />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField fullWidth size="small" type="date" label="YTB Başlama Tarihi" value={formData.ytbBaslamaTarihi}
                                        onChange={handleChange('ytbBaslamaTarihi')} InputLabelProps={{ shrink: true }} />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField fullWidth size="small" type="date" label="YTB Bitiş Tarihi" value={formData.ytbBitisTarihi}
                                        onChange={handleChange('ytbBitisTarihi')} InputLabelProps={{ shrink: true }} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth size="small" label="Belge Türü" value={formData.belgeTuru} onChange={handleChange('belgeTuru')} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth size="small" label="Sektör / Konu" value={formData.sektorKonu} onChange={handleChange('sektorKonu')} />
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* ADIM 3: EK BİLGİLER */}
                    {activeStep === 2 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <DescriptionIcon sx={{ color: '#f59e0b' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    Ek Bilgiler
                                </Typography>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth size="small" label="GM ID" value={formData.gmId} onChange={handleChange('gmId')} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth size="small" label="Belge Görüntüleme Linki" value={formData.belgeGoruntulemeLinki}
                                        onChange={handleChange('belgeGoruntulemeLinki')} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth size="small" label="Belge Durumu" value={formData.belgeDurumu} onChange={handleChange('belgeDurumu')} />
                                </Grid>
                            </Grid>

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                sx={{ mt: 3 }}
                                label="Açıklama / Not"
                                value={formData.durumAciklamasi}
                                onChange={handleChange('durumAciklamasi')}
                                placeholder="Talep hakkında ek açıklama yazın..."
                            />

                            {/* Özet */}
                            <Paper sx={{ p: 2.5, mt: 3, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#92400e', mb: 1 }}>
                                    📋 Talep Özeti
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#78350f' }}>
                                    <strong>Firma:</strong> {formData.firmaUnvan || '-'}<br />
                                    <strong>Talep Türü:</strong> {formData.talepTuru || '-'}<br />
                                    <strong>YTB No:</strong> {formData.ytbNo || '-'}<br />
                                    <strong>Başlangıç Durumu:</strong> 2.1.1 Görüşülüyor
                                </Typography>
                            </Paper>
                        </Box>
                    )}

                    {/* Butonlar */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #e2e8f0' }}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            startIcon={<ArrowBackIcon />}
                            sx={{ textTransform: 'none', color: '#64748b' }}
                        >
                            Geri
                        </Button>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            {activeStep < steps.length - 1 ? (
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                    disabled={!isStepValid(activeStep)}
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                                        '&:hover': { background: 'linear-gradient(135deg, #b45309, #d97706)' }
                                    }}
                                >
                                    İleri
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={loading || !isStepValid(0) || !isStepValid(1)}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        background: 'linear-gradient(135deg, #059669, #10b981)',
                                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                                        '&:hover': { background: 'linear-gradient(135deg, #047857, #059669)' }
                                    }}
                                >
                                    {isEdit ? 'Güncelle' : 'Talebi Oluştur'}
                                </Button>
                            )}
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </LayoutWrapper>
    );
};

export default DosyaTakipForm;
