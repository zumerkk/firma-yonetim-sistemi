// 🆕 YENİ TEŞVİK FORM - ENTERPRISE EDITION  
// Excel şablonu 1:1 aynısı - GM ID otomatik, tüm firmalar, U$97 kodları
// Mali hesaplamalar + ürün bilgileri + destek unsurları + özel şartlar

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  // Table,           // Commented out - unused import
  // TableBody,       // Commented out - unused import
  // TableCell,       // Commented out - unused import
  // TableHead,       // Commented out - unused import
  // TableRow,        // Commented out - unused import
  Autocomplete,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,


} from '@mui/material';
import {
  Save as SaveIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  Close as CloseIcon,
  People as PeopleIcon,
  Remove as RemoveIcon,
  Info as InfoIcon,
  Engineering as EngineeringIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  TableView as TableViewIcon,
  ContentPaste as ContentPasteIcon,
  CloudUpload as CloudUploadIcon

} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import axios from '../../utils/axios';
import destekSartService from '../../services/destekSartService'; // 🎯 Destek-Şart eşleştirmesi

// 🏙️ İl İlçe Seçici Import - Yatırım Yeri İl/İlçe seçimi için hala kullanılıyor
import EnhancedCitySelector from '../../components/EnhancedCitySelector.tsx';
// 🔄 Revizyon Timeline Import
import RevisionTimeline from '../../components/RevisionTimeline';
// 🏆 Öncelikli Yatırım Data Import
import { oncelikliYatirimTurleri, oncelikliYatirimKategorileri } from '../../data/oncelikliYatirimData';
// 🔤 Türkçe Karakter Utils
import { turkishIncludes } from '../../utils/turkishUtils';
// 🏭 Yatırım Konusu OECD 4 Haneli Kodları artık API'den çekiliyor (templateData.yatirimKonusuKodlari)
// 🏭 OSB (Organize Sanayi Bölgeleri) Import
import { osbListesi, osbIlleri } from '../../data/osbData';
// 🏪 Serbest Bölgeler Import
import { serbestBolgeler, serbestBolgeKategorileri } from '../../data/serbestBolgeData';
// 🚀 US 97 Kodları ULTRA-FAST Search Component
import NaceSuperSearch from '../../components/NaceSuperSearch';
import gtipService from '../../services/gtipService';
import GTIPSuperSearch from '../../components/GTIPSuperSearch';
import UnitCurrencySearch from '../../components/UnitCurrencySearch';
// 📏 Kapasite Birimleri Import  
import { kapasiteBirimleri } from '../../data/kapasiteData';

const YeniTesvikForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // 🔢 NUMBER FORMATTING UTILITIES
  const formatNumber = (value) => {
    // Boş, null, undefined ise boş string döndür
    if (value === null || value === undefined || value === '') return '';

    // 0 değeri için özel kontrol - 0 geçerli bir sayıdır!
    if (value === 0 || value === '0') return '0';

    // Sadece sayıları al (nokta ve virgülleri temizle)
    const numericValue = value.toString().replace(/[^\d]/g, '');
    if (numericValue === '') return '';

    // Sayıyı formatla (3'lü gruplar halinde nokta koy)
    return parseInt(numericValue).toLocaleString('tr-TR');
  };

  const parseNumber = (formattedValue) => {
    if (!formattedValue || formattedValue === '') return '';
    // Formatlanmış değerden sadece sayıları al
    return formattedValue.toString().replace(/[^\d]/g, '');
  };

  // 🔧 FIX: Güvenli parseInt - Türkçe formatlı sayıları ("1.088.000") doğru parse eder
  // parseInt("1.088.000") → 1 (YANLIŞ!), safeParseInt("1.088.000") → 1088000 (DOĞRU)
  const safeParseInt = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    // Önce string'e çevir, sonra tüm nokta/virgül/boşluk ayırıcıları temizle
    const cleaned = value.toString().replace(/[^\d]/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleNumberChange = (e, fieldPath) => {
    const rawValue = e.target.value;
    const numericValue = parseNumber(rawValue);

    // FormData'yı güncelle - raw değeri kaydet
    const keys = fieldPath.split('.');
    let newData = { ...formData };
    let current = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = numericValue;

    // Özel durum: US97 kapasite alanları için toplam hesaplama
    if (fieldPath.includes('urunBilgileri') && (fieldPath.includes('mevcut') || fieldPath.includes('ilave'))) {
      const index = parseInt(keys[1]);
      const urun = newData.urunBilgileri[index];
      if (urun) {
        const mevcut = Number(urun.mevcut) || 0;
        const ilave = Number(urun.ilave) || 0;
        urun.toplam = mevcut + ilave;
      }
    }

    setFormData(newData);
  };

  // 🛠️ Makine Listesi yardımcıları
  const emptyMakineYerli = () => ({
    makineId: '',
    gtipKodu: '',
    gtipAciklamasi: '',
    adiVeOzelligi: '',
    miktar: '',
    birim: '',
    birimFiyatiTl: '',
    toplamTutariTl: '',
    kdvIstisnasi: ''
  });

  const emptyMakineIthal = () => ({
    makineId: '',
    gtipKodu: '',
    gtipAciklamasi: '',
    adiVeOzelligi: '',
    miktar: '',
    birim: '',
    birimFiyatiFob: '',
    gumrukDovizKodu: '',
    toplamTutarFobUsd: '',
    toplamTutarFobTl: '',
    kullanilmisMakine: '',
    ckdSkdMi: '',
    aracMi: '',
    kdvMuafiyeti: '',
    gumrukVergisiMuafiyeti: ''
  });

  const [makineTab, setMakineTab] = useState('yerli');

  const addMakineSatiri = (tip) => {
    setFormData(prev => ({
      ...prev,
      makineListeleri: {
        ...(prev.makineListeleri || {}),
        [tip]: [
          ...((prev.makineListeleri && prev.makineListeleri[tip]) || []),
          tip === 'ithal' ? emptyMakineIthal() : emptyMakineYerli()
        ]
      }
    }));
  };

  const removeMakineSatiri = (tip, index) => {
    setFormData(prev => {
      const mevcut = (prev.makineListeleri && prev.makineListeleri[tip]) || [];
      const arr = [...mevcut];
      arr.splice(index, 1);
      return { ...prev, makineListeleri: { ...(prev.makineListeleri || {}), [tip]: arr } };
    });
  };

  const updateMakineField = (tip, index, field, value) => {
    setFormData(prev => {
      const mevcut = (prev.makineListeleri && prev.makineListeleri[tip]) || [];
      const arr = [...mevcut];
      const row = { ...(arr[index] || (tip === 'ithal' ? emptyMakineIthal() : emptyMakineYerli())) };
      row[field] = value;
      const miktar = parseInt((row.miktar || '').toString().replace(/[^\d]/g, '')) || 0;
      if (tip === 'ithal') {
        const birimFiyatiFob = parseInt((row.birimFiyatiFob || '').toString().replace(/[^\d]/g, '')) || 0;
        if (miktar && birimFiyatiFob) row.toplamTutarFobUsd = (miktar * birimFiyatiFob).toString();
      } else {
        const birimFiyati = parseInt((row.birimFiyatiTl || '').toString().replace(/[^\d]/g, '')) || 0;
        if (miktar && birimFiyati) row.toplamTutariTl = (miktar * birimFiyati).toString();
      }
      arr[index] = row;
      return { ...prev, makineListeleri: { ...(prev.makineListeleri || {}), [tip]: arr } };
    });
  };

  const renderMakineSatirlari = (tip) => {
    const rows = (formData.makineListeleri && formData.makineListeleri[tip]) || [];
    return (
      <Grid container spacing={2}>
        {rows.map((row, idx) => (
          <React.Fragment key={`${tip}-${idx}`}>
            <Grid item xs={12} md={3}>
              <GTIPSuperSearch
                value={row.gtipKodu || ''}
                onChange={(kod, aciklama) => {
                  updateMakineField(tip, idx, 'gtipKodu', kod);
                  if (aciklama) updateMakineField(tip, idx, 'gtipAciklamasi', aciklama);
                }}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField fullWidth label="GTIP Açıklama" value={row.gtipAciklamasi || ''}
                onChange={(e) => updateMakineField(tip, idx, 'gtipAciklamasi', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Adı ve Özelliği" value={row.adiVeOzelligi || ''}
                onChange={(e) => updateMakineField(tip, idx, 'adiVeOzelligi', e.target.value)} />
            </Grid>

            {tip === 'ithal' ? (
              <>
                <Grid item xs={6} md={2}>
                  <TextField fullWidth label="Miktar" value={row.miktar || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'miktar', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <UnitCurrencySearch
                    type="unit"
                    value={row.birim || ''}
                    onChange={(kod) => updateMakineField(tip, idx, 'birim', kod)}
                    placeholder="Birim seç..."
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth label="Menşe Ülke Döviz Birim Fiyatı (FOB)" value={row.birimFiyatiFob || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'birimFiyatiFob', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <UnitCurrencySearch
                    type="currency"
                    value={row.gumrukDovizKodu || ''}
                    onChange={(kod) => updateMakineField(tip, idx, 'gumrukDovizKodu', kod)}
                    placeholder="Döviz seç..."
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth label="Toplam Tutar (FOB $)" value={row.toplamTutarFobUsd || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'toplamTutarFobUsd', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth label="Toplam Tutar (FOB TL)" value={row.toplamTutarFobTl || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'toplamTutarFobTl', e.target.value)}
                    onBlur={async () => {
                      try {
                        // Otomatik hesaplama: FOB USD * kur
                        if (row.toplamTutarFobUsd && row.gumrukDovizKodu && row.gumrukDovizKodu !== 'TRY') {
                          const rate = await (await import('../../services/currencyService')).default.getRate(row.gumrukDovizKodu, 'TRY');
                          if (rate) {
                            const usd = parseInt((row.toplamTutarFobUsd || '').toString().replace(/[^\d]/g, '')) || 0;
                            const tl = Math.round(usd * rate);
                            updateMakineField(tip, idx, 'toplamTutarFobTl', tl.toString());
                          }
                        }
                      } catch (e) { /* sessiz geç */ }
                    }} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <UnitCurrencySearch
                    type="used"
                    value={row.kullanilmisMakine || ''}
                    onChange={(kod, aciklama) => {
                      updateMakineField(tip, idx, 'kullanilmisMakine', kod);
                      updateMakineField(tip, idx, 'kullanilmisMakineAciklama', aciklama || '');
                    }}
                    placeholder="Kullanılmış makine seç..."
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>CKD/SKD Mi?</InputLabel>
                    <Select label="CKD/SKD Mi?" value={row.ckdSkdMi || ''}
                      onChange={(e) => updateMakineField(tip, idx, 'ckdSkdMi', e.target.value)}>
                      <MenuItem value="">Seçilmedi</MenuItem>
                      <MenuItem value="EVET">EVET</MenuItem>
                      <MenuItem value="HAYIR">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>ARAÇ MI?</InputLabel>
                    <Select label="ARAÇ MI?" value={row.aracMi || ''}
                      onChange={(e) => updateMakineField(tip, idx, 'aracMi', e.target.value)}>
                      <MenuItem value="">Seçilmedi</MenuItem>
                      <MenuItem value="EVET">EVET</MenuItem>
                      <MenuItem value="HAYIR">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>KDV İstisnası</InputLabel>
                    <Select label="KDV İstisnası" value={row.kdvMuafiyeti || ''}
                      onChange={(e) => updateMakineField(tip, idx, 'kdvMuafiyeti', e.target.value)}>
                      <MenuItem value="">Seçilmedi</MenuItem>
                      <MenuItem value="EVET">EVET</MenuItem>
                      <MenuItem value="HAYIR">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>GV İstisnası</InputLabel>
                    <Select label="GV İstisnası" value={row.gumrukVergisiMuafiyeti || ''}
                      onChange={(e) => updateMakineField(tip, idx, 'gumrukVergisiMuafiyeti', e.target.value)}>
                      <MenuItem value="">Seçilmedi</MenuItem>
                      <MenuItem value="EVET">EVET</MenuItem>
                      <MenuItem value="HAYIR">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={6} md={2}>
                  <TextField fullWidth label="Makine ID" value={row.makineId || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'makineId', e.target.value)}
                    placeholder="Bakanlık M. ID" />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField fullWidth label="Miktar" value={row.miktar || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'miktar', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <UnitCurrencySearch
                    type="unit"
                    value={row.birim || ''}
                    onChange={(kod) => updateMakineField(tip, idx, 'birim', kod)}
                    placeholder="Birim seç..."
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField fullWidth label="Birim Fiyatı (TL) (KDV Hariç)" value={row.birimFiyatiTl || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'birimFiyatiTl', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField fullWidth label="Toplam Tutar (TL) (KDV Hariç)" value={row.toplamTutariTl || ''}
                    onChange={(e) => updateMakineField(tip, idx, 'toplamTutariTl', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>KDV İstisnası</InputLabel>
                    <Select label="KDV İstisnası" value={row.kdvIstisnasi || ''}
                      onChange={(e) => updateMakineField(tip, idx, 'kdvIstisnasi', e.target.value)}>
                      <MenuItem value="">Seçilmedi</MenuItem>
                      <MenuItem value="EVET">EVET</MenuItem>
                      <MenuItem value="HAYIR">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button color="error" startIcon={<DeleteIcon />} onClick={() => removeMakineSatiri(tip, idx)}>Sil</Button>
              </Box>
            </Grid>
            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
          </React.Fragment>
        ))}
        <Grid item xs={12}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => addMakineSatiri(tip)}>
            Satır Ekle
          </Button>
        </Grid>
      </Grid>
    );
  };

  const renderMakineListesi = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Makine-Teçhizat Listesi</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <Button variant={makineTab === 'yerli' ? 'contained' : 'outlined'} onClick={() => setMakineTab('yerli')}>Yerli</Button>
        <Button variant={makineTab === 'ithal' ? 'contained' : 'outlined'} onClick={() => setMakineTab('ithal')}>İthal</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          color="secondary"
          onClick={async () => {
            try {
              if (!formData._id && !id) {
                alert('Önce teşviki kaydedin, sonra Excel alın.');
                return;
              }
              const tesvikId = id || formData._id;
              const res = await axios.get(`/yeni-tesvik/${tesvikId}/excel-export`, { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const a = document.createElement('a');
              a.href = url;
              a.download = `tesvik_${tesvikId}.xlsx`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (e) {
              console.error('Excel export hatası:', e);
              alert('Excel export sırasında bir hata oluştu.');
            }
          }}
        >
          Excel Çıktısı
        </Button>
      </Box>
      {renderMakineSatirlari(makineTab)}
      <Alert severity="info" sx={{ mt: 2 }}>Bu alan isteğe bağlıdır. GTIP kodu girerek açıklamayı otomatik çekebilirsiniz.</Alert>
    </Box>
  );

  // 📊 State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 🔢 Dinamik Alan Sayıları
  const [cinsSayisi, setCinsSayisi] = useState(1); // J-CNS alanları (max 4)
  const [adresSayisi, setAdresSayisi] = useState(1); // Yatırım Adresi alanları (max 3)
  const [urunSayisi, setUrunSayisi] = useState(1); // Ürün bilgileri satır sayısı (max 10)
  const [destekSayisi, setDestekSayisi] = useState(1); // Destek unsurları satır sayısı (max 8)
  const [ozelSartSayisi, setOzelSartSayisi] = useState(1); // Özel şartlar satır sayısı (limit kaldırıldı)

  // 🆕 YENİ SEÇENEK EKLEME MODAL STATE'LERİ
  const [addOptionModal, setAddOptionModal] = useState({
    open: false,
    type: '',
    title: '',
    newValue: '',
    newLabel: '',
    newKategori: '',
    newAciklama: '',
    newEkBilgi: {},
    adding: false
  });

  // 📋 Form Data - Excel Yapısına Uygun
  const [formData, setFormData] = useState({
    // 🆔 Otomatik ID'ler
    gmId: '', // Otomatik atanacak
    tesvikId: '', // Otomatik atanacak

    // 🏢 Temel Bilgiler
    firma: '',
    yatirimciUnvan: '',

    // 📊 Yatırım Bilgileri tanımları aşağıda (duplicate kaldırıldı)

    // 📄 Belge Bilgileri
    belgeYonetimi: {
      belgeId: '',
      belgeNo: '',
      belgeTarihi: '',
      dayandigiKanun: '',
      belgeMuracaatNo: '',
      belgeDurumu: '',
      belgeMuracaatTarihi: '',
      belgeBaslamaTarihi: '',
      belgeBitisTarihi: '',
      uzatimTarihi: '',
      mucbirUzumaTarihi: '',
      oncelikliYatirim: '', // 🏆 Öncelikli Yatırım (Evet/Hayır)
      oncelikliYatirimTuru: '' // 🏆 Öncelikli Yatırım Türü (dropdown)
    },

    // 📝 Künye Bilgileri - Excel Formatına Uygun
    kunyeBilgileri: {
      talepSonuc: '',
      revizeId: '',
      sorguBaglantisi: '',
      yatirimci: '',
      yatirimciUnvan: '',
      sgkSicilNo: '', // 🆕 YENİ ALAN - Excel'den eklendi
      sermayeTuru: '', // 🆕 EKSİK ALAN EKLENDİ
      // 🔧 EKSİK ALANLAR EKLENDİ - Excel detayları
      kararTarihi: '',
      kararSayisi: '',
      yonetmelikMaddesi: '',
      basvuruTarihi: '',
      dosyaNo: '',
      projeBedeli: 0,
      tesvikMiktari: 0,
      tesvikOrani: 0
    },

    // 👥 İstihdam Bilgileri - Boş başlangıç değerleri
    istihdam: {
      mevcutKisi: '',
      ilaveKisi: '',
      toplamKisi: ''
    },

    // 💰 Yatırım İle İlgili Bilgiler - Bölüm 1
    yatirimBilgileri1: {
      yatirimKonusu: '',
      yatirimci: '',
      yrYatirimKonusu: '',
      cins1: '',
      cins2: '',
      cins3: '',
      cins4: '',
      destekSinifi: '',
      // 🎯 YENİ PROFESYONEL ALANLAR - Resimden eklenenler
      cazibeMerkeziMi: '', // Cazibe Merkezi Mi? (Evet/Hayır)
      savunmaSanayiProjesi: '', // Savunma Sanayi Projesi Mi? (Evet/Hayır)
      enerjiUretimKaynagi: '', // Enerji Üretim Kaynağı (metin)
      cazibeMerkezi2018: '', // Cazibe Merkezi Mi? (2018/11201) (Evet/Hayır)
      cazibeMerkeziDeprem: '', // Cazibe Merkezi Deprem Nedeni (Evet/Hayır)
      hamleMi: '', // HAMLE MI? (Evet/Hayır)
      vergiIndirimsizDestek: '', // 🆕 EKSİK ALAN EKLENDİ
      vergiIndirimsizDestekTalebi: '', // 🆕 EKSİK ALAN EKLENDİ (Form field)
      oecdKategori: ''
    },

    // 💰 Yatırım İle İlgili Bilgiler - Bölüm 2  
    yatirimBilgileri2: {
      yerinIl: '',
      yerinIlce: '',
      ilBazliBolge: '',
      ilceBazliBolge: '',
      ada: '', // 🆕 Excel'den eklendi
      parsel: '', // 🆕 Excel'den eklendi
      yatirimAdresi1: '',
      yatirimAdresi2: '',
      yatirimAdresi3: '',
      ossBelgeMudavimi: '',
      serbsetBolge: '' // 🆕 Excel'den eklendi
    },

    // 📦 Ürün Bilgileri (U$97 Kodları) - Dinamik, başlangıçta 1 satır
    urunBilgileri: [
      { kod: '', aciklama: '', mevcut: '', ilave: '', toplam: '', kapsite: '', kapasite_birimi: '' }
    ],

    // 🎯 Destek Unsurları - Dinamik, başlangıçta 1 satır
    destekUnsurlari: [
      { index: 1, destekUnsuru: '', sartlari: '' }
    ],

    // 🏷️ Özel Şartlar - Dinamik, başlangıçta 1 satır (max 7)
    ozelSartlar: [
      { index: 1, kisaltma: '', notu: '' }
    ],

    // 💰 FİNANSAL BİLGİLER - Excel Benzeri Kapsamlı Yapı
    finansalBilgiler: {
      // 1. TOPLAM SABİT YATIRIM TUTARI TL
      toplamSabitYatirimTutari: '',

      // 2. ARAZI ARSA BEDELİ
      araziArsaBedeli: {
        aciklama: '',
        metrekaresi: '',
        birimFiyatiTl: '',
        araziArsaBedeli: ''
      },

      // 3. FİNANSMAN TL
      finansman: {
        yabanciKaynaklar: {
          // 🔧 EKSİK ALANLAR EKLENDİ - Excel formatına uygun
          bankKredisi: '',
          ikinciElFiyatFarki: '',
          kullanilmisTeçhizatBedeli: '',
          digerDisKaynaklar: '',
          digerYabanciKaynak: '',
          toplamYabanciKaynak: ''
        },
        ozkaynaklar: {
          ozkaynaklar: ''
        },
        toplamFinansman: ''
      },

      // 4. BİNA İNŞAAT GİDERLERİ TL
      binaInsaatGiderleri: {
        aciklama: '',
        anaBinaVeTesisleri: '',
        yardimciIsBinaVeIcareBinalari: '',
        yeraltiAnaGalerileri: '',
        toplamBinaInsaatGideri: ''
      },

      // 5. MAKİNE TEÇHİZAT GİDERLERİ
      makineTeçhizatGiderleri: {
        // TL Cinsinden
        tl: {
          ithal: '',
          yerli: '',
          toplamMakineTeç: ''
        },
        // Dolar Cinsinden
        dolar: {
          ithalMakine: '',  // İTHAL MAKİNE ($)
          yeniMakine: '',
          kullanilmisMakine: '',
          toplamIthalMakine: ''  // TOPLAM İTHAL MAKİNE ($)
        }
      },

      // 6. DİĞER YATIRIM HARCAMALARI TL
      digerYatirimHarcamalari: {
        yardimciIslMakTeçGid: '',        // Yardımcı İşl. Mak. Teç. Gid.
        ithalatVeGumGiderleri: '',       // İthalat ve Güm.Giderleri
        tasimaVeSigortaGiderleri: '',    // Taşıma ve Sigorta G.(Monta) Giderleri
        etudVeProjeGiderleri: '',        // Etüd ve Proje Giderleri
        digerGiderleri: '',              // Diğer Giderleri
        toplamDigerYatirimHarcamalari: '' // TOPLAM DİĞER YATIRIM HARCAMALARI
      }
    },

    // 📅 Durum Bilgileri
    durumBilgileri: {
      genelDurum: 'taslak',
      durumAciklamasi: '',
      sonDurumGuncelleme: new Date()
    }
  });

  // 📋 Template Data
  const [templateData, setTemplateData] = useState({
    firmalar: [],
    durumlar: [],
    destekSiniflari: [],
    iller: [],
    dayandigiKanunlar: [],
    belgeDurumlari: [],
    osbListesi: [], // OSB verileri
    yatirimTipleri: [],
    kapasiteBirimleri: [],
    osbOptions: [],
    yatirimKonusuKategorileri: [],
    yatirimKonusuKodlari: [], // 🆕 OECD 4 Haneli Kodları
    u97Kodlari: [],
    destekUnsurlariOptions: [],
    destekSartlariOptions: [],
    ozelSartKisaltmalari: [],
    ozelSartNotlari: [],
    oecdKategorileri: [],
    nextGmId: '',
    nextTesvikId: ''
  });

  // DESTEK SINIFI seçenekleri artık tamamen backend template API'sinden (DB) gelir

  const [activeStep, setActiveStep] = useState(0);

  // Adım isimleri - Yeniden düzenlenmiş profesyonel yapı (Künye + Yatırım Bilgileri birleşik)
  const stepLabels = [
    '📋 KÜNYE VE YATIRIM BİLGİLERİ',
    '📦 ÜRÜN BİLGİLERİ',
    '🛠️ MAKİNE LİSTESİ',
    '💰 FİNANSAL BİLGİLER',
    '⚖️ ÖZEL ŞARTLAR',
    '🎯 DESTEK UNSURLARI',
    '📈 REVİZYON GEÇMİŞİ'
  ];

  // Klavye kısayolları handler
  const handleKeyDown = (event) => {
    // Ctrl+F ile firma arama
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      document.querySelector('input[placeholder*="Firma ID"]')?.focus();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 📱 Responsive Handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 📊 Load initial data with new API endpoint - sadece component mount'ta bir kez
  useEffect(() => {
    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 📝 Edit mode için ayrı effect
  useEffect(() => {
    if (isEdit && id) {
      loadTesvikData();
    }
  }, [id, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔧 FIX: formData değiştiğinde satır sayılarını senkronize et (revize modunda timing sorununu çözer)
  useEffect(() => {
    if (isEdit && formData.ozelSartlar && formData.ozelSartlar.length > 0) {
      const actualOzelSartCount = formData.ozelSartlar.filter(s => s && (s.kisaltma || s.notu)).length;
      if (actualOzelSartCount > 0 && actualOzelSartCount !== ozelSartSayisi) {
        console.log('🔄 Özel şart sayısı senkronize ediliyor:', actualOzelSartCount);
        setOzelSartSayisi(Math.max(1, actualOzelSartCount));
      }
    }
    if (isEdit && formData.destekUnsurlari && formData.destekUnsurlari.length > 0) {
      const actualDestekCount = formData.destekUnsurlari.filter(d => d && d.destekUnsuru).length;
      if (actualDestekCount > 0 && actualDestekCount !== destekSayisi) {
        console.log('🔄 Destek unsuru sayısı senkronize ediliyor:', actualDestekCount);
        setDestekSayisi(Math.max(1, actualDestekCount));
      }
    }
  }, [isEdit, formData.ozelSartlar, formData.destekUnsurlari]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // console.log('🔥 Loading template data from new API...');

      // API endpoint'i kullan - tüm veriler tek çağrıda!
      const response = await axios.get('/yeni-tesvik/templates');

      // 🆕 OECD 4 Haneli Kodları API'den çek
      let oecdKod4HaneliData = [];
      try {
        const oecdResponse = await axios.get('/lookup/oecd-4-haneli');
        if (oecdResponse.data.success) {
          oecdKod4HaneliData = oecdResponse.data.data || [];
          console.log('✅ OECD 4 Haneli kodları yüklendi:', oecdKod4HaneliData.length);
        }
      } catch (oecdError) {
        console.error('⚠️ OECD 4 Haneli kodları yüklenemedi:', oecdError);
      }

      // 🎓 Dinamik Destek Unsurları API'den çek (Öğrenen Sistem)
      let dinamikDestekUnsurlari = [];
      try {
        const destekResponse = await axios.get('/lookup/destek-unsuru');
        if (destekResponse.data.success) {
          dinamikDestekUnsurlari = destekResponse.data.data || [];
          console.log('✅ Dinamik destek unsurları yüklendi:', dinamikDestekUnsurlari.length);
        }
      } catch (destekError) {
        console.error('⚠️ Dinamik destek unsurları yüklenemedi:', destekError);
      }

      // 🏷️ Dinamik Özel Şartlar API'den çek (Öğrenen Sistem)
      let dinamikOzelSartlar = [];
      try {
        const ozelSartResponse = await axios.get('/lookup/ozel-sart');
        if (ozelSartResponse.data.success) {
          dinamikOzelSartlar = ozelSartResponse.data.data || [];
          console.log('✅ Dinamik özel şartlar yüklendi:', dinamikOzelSartlar.length);
        }
      } catch (ozelSartError) {
        console.error('⚠️ Dinamik özel şartlar yüklenemedi:', ozelSartError);
      }

      if (response.data.success) {
        const data = response.data.data;
        console.log('✅ Template data loaded:', {
          firmalar: data.firmalar?.length,
          nextGmId: data.nextGmId,
          nextTesvikId: data.nextTesvikId,
          destekSiniflari: data.destekSiniflari?.map(d => d.value),
          belgeDurumlari: data.belgeDurumlari?.map(d => d.value),
          yatirimTipleri: data.yatirimTipleri?.map(d => d.value),
          destekUnsurlariOptions: data.destekUnsurlariOptions?.map(d => d.value),
          destekSartlariOptions: data.destekSartlariOptions?.map(d => d.value),
          oecdKod4Haneli: oecdKod4HaneliData.length
        });

        // 🎯 CSV verileriyle dinamik verileri birleştir (Akıllı Öğrenme)
        const mergedDestekUnsurlari = [
          ...(data.destekUnsurlariOptions || []),
          ...dinamikDestekUnsurlari.map(item => ({
            value: item.value,
            label: item.label,
            kategori: item.kategori,
            renk: item.renk,
            isDynamic: true // Dinamik eklenen işaretle
          }))
        ];

        const mergedOzelSartlar = [
          ...(data.ozelSartKisaltmalari || []),
          ...dinamikOzelSartlar.map(item => ({
            kisaltma: item.kisaltma,
            aciklama: item.aciklama,
            kategori: item.kategori,
            isDynamic: true // Dinamik eklenen işaretle
          }))
        ];

        console.log('🔄 Birleştirilmiş veriler:', {
          destekUnsurlari: mergedDestekUnsurlari.length,
          ozelSartlar: mergedOzelSartlar.length
        });

        setTemplateData({
          firmalar: data.firmalar || [],
          durumlar: data.durumlar || [],
          destekSiniflari: data.destekSiniflari || [],
          iller: data.iller || [],
          dayandigiKanunlar: data.dayandigiKanunlar || [],
          belgeDurumlari: data.belgeDurumlari || [],
          yatirimTipleri: data.yatirimTipleri || [],
          kapasiteBirimleri: data.kapasiteBirimleri || [],
          osbOptions: data.osbOptions || [],
          yatirimKonusuKategorileri: data.yatirimKonusuKategorileri || [],
          yatirimKonusuKodlari: oecdKod4HaneliData, // 🆕 OECD 4 Haneli Kodları
          u97Kodlari: data.u97Kodlari || [],
          destekUnsurlariOptions: mergedDestekUnsurlari, // 🎓 CSV + Dinamik
          destekSartlariOptions: data.destekSartlariOptions || [],
          oecdKategorileri: data.oecdKategorileri || [],
          ozelSartKisaltmalari: mergedOzelSartlar, // 🎓 CSV + Dinamik
          ozelSartNotlari: data.ozelSartNotlari || [],
          nextGmId: data.nextGmId || '',
          nextTesvikId: data.nextTesvikId || ''
        });

        // 🎯 GM ID'yi otomatik ata (edit değilse)
        if (!isEdit && data.nextGmId) {
          setFormData(prev => ({
            ...prev,
            gmId: data.nextGmId,
            tesvikId: data.nextTesvikId || '',
            // 🔧 Default değerler ekle - Controlled input'lar için
            belgeYonetimi: {
              ...prev.belgeYonetimi,
              belgeDurumu: 'hazirlaniyor' // Backend model'e uygun default değer
            },
            // Ürün bilgilerini template'den al - gerçek U$97 kodlarıyla
            urunBilgileri: data.u97Kodlari?.slice(0, 9).map((kod, index) => ({
              kod: kod.kod,
              aciklama: kod.aciklama,
              mevcut: 0,
              ilave: 0,
              toplam: 0,
              kapsite: 0,
              kapasite_birimi: ''
            })) || prev.urunBilgileri,
            destekUnsurlari: data.destekUnsurlari || prev.destekUnsurlari,
            ozelSartlar: data.ozelSartlar || prev.ozelSartlar,
            // Künye bilgilerini template'den al
            kunyeBilgileri: data.kunyeBilgileri || prev.kunyeBilgileri
          }));
          console.log('🎯 GM ID otomatik atandı:', data.nextGmId);
        }
      } else {
        setError('Template verileri yüklenemedi');
      }
    } catch (error) {
      console.error('🚨 Template data hatası:', error);
      setError('Başlangıç verileri yüklenemedi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 🔧 Date Format Utility - ISO string'i HTML date input formatına çevir
  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toISOString().split('T')[0]; // yyyy-MM-dd format
    } catch (error) {
      console.warn('Date format error:', error);
      return '';
    }
  };

  // 📋 Kopyala-Yapıştır Date Handler - Çeşitli tarih formatlarını destekler
  const handleDatePaste = (e, fieldPath) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();

    // Çeşitli tarih formatlarını dene
    let parsedDate = null;

    // Format: dd.mm.yyyy veya dd/mm/yyyy
    const dmyMatch = pastedText.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Format: yyyy-mm-dd
    const ymdMatch = pastedText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!parsedDate && ymdMatch) {
      const [, year, month, day] = ymdMatch;
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Format: mm/dd/yyyy
    const mdyMatch = pastedText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!parsedDate && mdyMatch) {
      const [, month, day, year] = mdyMatch;
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // ISO Format: yyyy-mm-ddTHH:mm:ss
    if (!parsedDate) {
      const isoDate = new Date(pastedText);
      if (!isNaN(isoDate.getTime())) {
        parsedDate = isoDate;
      }
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      // yyyy-MM-dd formatına çevir
      const formattedDate = parsedDate.toISOString().split('T')[0];
      handleFieldChange(fieldPath, formattedDate);
    } else {
      // Geçersiz format - ham metni dene
      console.warn('Geçersiz tarih formatı:', pastedText);
    }
  };

  // 🔧 Problematik Değer Temizleme Utility
  const cleanProblematicValue = (value) => {
    if (!value) return '';
    if (typeof value !== 'string') return value;

    // Problematik değerler listesi
    const problematicValues = [
      '2012/3305',
      'hazirlaniyor',
      'undefined',
      'null',
      '1',
      'SİGORTA BAŞLAMA',
      'Var (Yerli ve İthal Liste - Tamamı)',
      'ÇOK ÖZEL',
      'BEYANNAMESIZ',
      'BEYANNAMELI',
      'YANLIŞ'
    ];

    // Trim edilmiş değeri kontrol et
    const trimmedValue = value.trim();

    if (problematicValues.includes(trimmedValue)) {
      return '';
    }

    return trimmedValue;
  };

  const loadTesvikData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/yeni-tesvik/${id}`);

      if (response.data.success) {
        const backendData = response.data.data;

        // 🔄 Backend data'sını frontend formatına çevir
        const mappedData = {
          ...backendData,

          // 🏢 Firma - Backend'den populate edilmiş obje geliyor, ID'yi çıkar
          firma: typeof backendData.firma === 'object' ? backendData.firma?._id : (backendData.firma || ''),
          yatirimciUnvan: backendData.yatirimciUnvan || backendData.firma?.tamUnvan || '',

          // 📄 Belge Yönetimi - Date formatlarını düzelt
          belgeYonetimi: {
            belgeId: backendData.belgeYonetimi?.belgeId || '',
            belgeNo: backendData.belgeYonetimi?.belgeNo || '',
            belgeTarihi: formatDateForInput(backendData.belgeYonetimi?.belgeTarihi) || '',
            dayandigiKanun: backendData.belgeYonetimi?.dayandigiKanun || '',
            belgeMuracaatNo: backendData.belgeYonetimi?.belgeMuracaatNo || '',
            belgeDurumu: backendData.belgeYonetimi?.belgeDurumu || '',
            belgeMuracaatTarihi: formatDateForInput(backendData.belgeYonetimi?.belgeMuracaatTarihi) || '',
            belgeBaslamaTarihi: formatDateForInput(backendData.belgeYonetimi?.belgeBaslamaTarihi) || '',
            // 🔧 Geriye uyumluluk: Eski field ismi (belgebitisTarihi) ve yeni (belgeBitisTarihi)
            belgeBitisTarihi: formatDateForInput(backendData.belgeYonetimi?.belgeBitisTarihi || backendData.belgeYonetimi?.belgebitisTarihi) || '',
            uzatimTarihi: formatDateForInput(backendData.belgeYonetimi?.uzatimTarihi) || '',
            // 🔧 Geriye uyumluluk: Eski field ismi (mudebbirUzatimTarihi) ve yeni (mucbirUzumaTarihi)
            mucbirUzumaTarihi: formatDateForInput(backendData.belgeYonetimi?.mucbirUzumaTarihi || backendData.belgeYonetimi?.mudebbirUzatimTarihi) || '',
            oncelikliYatirim: backendData.belgeYonetimi?.oncelikliYatirim || '', // 🏆 Öncelikli Yatırım
            oncelikliYatirimTuru: backendData.belgeYonetimi?.oncelikliYatirimTuru || '' // 🏆 Öncelikli Yatırım Türü
          },

          // Backend'deki maliHesaplamalar → Frontend'deki finansalBilgiler
          finansalBilgiler: {
            toplamSabitYatirimTutari: backendData.maliHesaplamalar?.toplamSabitYatirim || 0,

            araziArsaBedeli: {
              aciklama: backendData.maliHesaplamalar?.araziArsaBedeli?.aciklama || backendData.maliHesaplamalar?.maliyetlenen?.aciklama || '',
              metrekaresi: backendData.maliHesaplamalar?.maliyetlenen?.sl || 0,
              birimFiyatiTl: backendData.maliHesaplamalar?.maliyetlenen?.sm || 0,
              araziArsaBedeli: backendData.maliHesaplamalar?.araciArsaBedeli || backendData.maliHesaplamalar?.maliyetlenen?.sn || 0
            },

            finansman: {
              yabanciKaynaklar: {
                bankKredisi: backendData.maliHesaplamalar?.finansman?.yabanciKaynak || 0,
                ikinciElFiyatFarki: 0,
                kullanilmisTeçhizatBedeli: 0,
                digerDisKaynaklar: 0,
                digerYabanciKaynak: 0,
                toplamYabanciKaynak: backendData.maliHesaplamalar?.finansman?.yabanciKaynak || 0
              },
              ozkaynaklar: {
                ozkaynaklar: backendData.maliHesaplamalar?.finansman?.ozKaynak || 0
              },
              toplamFinansman: backendData.maliHesaplamalar?.finansman?.toplamFinansman || 0
            },

            binaInsaatGiderleri: {
              aciklama: backendData.maliHesaplamalar?.binaInsaatGideri?.aciklama || '',
              anaBinaVeTesisleri: backendData.maliHesaplamalar?.binaInsaatGideri?.anaBinaGideri || 0,
              yardimciIsBinaVeIcareBinalari: backendData.maliHesaplamalar?.binaInsaatGideri?.yardimciBinaGideri || 0,
              yeraltiAnaGalerileri: 0,
              toplamBinaInsaatGideri: backendData.maliHesaplamalar?.binaInsaatGideri?.toplamBinaGideri || 0
            },

            makineTeçhizatGiderleri: {
              tl: {
                ithal: backendData.maliHesaplamalar?.makinaTechizat?.ithalMakina || 0,
                yerli: backendData.maliHesaplamalar?.makinaTechizat?.yerliMakina || 0,
                toplamMakineTeç: backendData.maliHesaplamalar?.makinaTechizat?.toplamMakina || 0
              },
              dolar: {
                yeniMakine: backendData.maliHesaplamalar?.makinaTechizat?.yeniMakina || 0,
                kullanilmisMakine: backendData.maliHesaplamalar?.makinaTechizat?.kullanimisMakina || 0,
                toplamIthalMakine: backendData.maliHesaplamalar?.makinaTechizat?.toplamYeniMakina || 0
              }
            },

            digerYatirimHarcamalari: {
              yardimciIslMakTeçGid: backendData.maliHesaplamalar?.yatirimHesaplamalari?.eu || 0,
              ithalatVeGumGiderleri: backendData.maliHesaplamalar?.yatirimHesaplamalari?.ev || 0,
              tasimaVeSigortaGiderleri: backendData.maliHesaplamalar?.yatirimHesaplamalari?.ew || 0,
              etudVeProjeGiderleri: backendData.maliHesaplamalar?.yatirimHesaplamalari?.ex || 0,
              digerGiderleri: backendData.maliHesaplamalar?.yatirimHesaplamalari?.ey || 0,
              toplamDigerYatirimHarcamalari: backendData.maliHesaplamalar?.yatirimHesaplamalari?.ez || 0
            }
          },

          // Yatırım bilgilerini böl (backend'deki yatirimBilgileri → frontend'deki 2 bölüm)
          yatirimBilgileri1: {
            yatirimKonusu: backendData.yatirimBilgileri?.yatirimKonusu || '',
            // 🎯 YENİ PROFESYONEL ALANLAR - Backend'den frontend'e mapping
            cazibeMerkeziMi: backendData.yatirimBilgileri?.cazibeMerkeziMi || '',
            savunmaSanayiProjesi: backendData.yatirimBilgileri?.savunmaSanayiProjesi || '',
            enerjiUretimKaynagi: backendData.yatirimBilgileri?.enerjiUretimKaynagi || '',
            cazibeMerkezi2018: backendData.yatirimBilgileri?.cazibeMerkezi2018 || '',
            cazibeMerkeziDeprem: backendData.yatirimBilgileri?.cazibeMerkeziDeprem || '',
            hamleMi: backendData.yatirimBilgileri?.hamleMi || '',
            vergiIndirimsizDestek: backendData.yatirimBilgileri?.vergiIndirimsizDestek || '',
            vergiIndirimsizDestekTalebi: backendData.yatirimBilgileri?.vergiIndirimsizDestek || '', // Form field mapping
            oecdKategori: backendData.yatirimBilgileri?.oecdKategori || '', // 🆕 OECD Kategori
            // 🔧 Problematik değerleri temizle
            cins1: cleanProblematicValue(backendData.yatirimBilgileri?.sCinsi1),
            cins2: cleanProblematicValue(backendData.yatirimBilgileri?.tCinsi2),
            cins3: cleanProblematicValue(backendData.yatirimBilgileri?.uCinsi3),
            cins4: cleanProblematicValue(backendData.yatirimBilgileri?.vCinsi4),
            destekSinifi: cleanProblematicValue(backendData.yatirimBilgileri?.destekSinifi)
          },

          yatirimBilgileri2: {
            yerinIl: backendData.yatirimBilgileri?.yerinIl || '',
            yerinIlce: backendData.yatirimBilgileri?.yerinIlce || '',
            ada: backendData.yatirimBilgileri?.ada || '', // 🗺️ ADA MAPPING
            parsel: backendData.yatirimBilgileri?.parsel || '', // 📄 PARSEL MAPPING
            yatirimAdresi1: backendData.yatirimBilgileri?.yatirimAdresi1 || '',
            yatirimAdresi2: backendData.yatirimBilgileri?.yatirimAdresi2 || '',
            yatirimAdresi3: backendData.yatirimBilgileri?.yatirimAdresi3 || '',
            ossBelgeMudavimi: backendData.yatirimBilgileri?.osbIseMudurluk || '',
            ilBazliBolge: backendData.yatirimBilgileri?.ilBazliBolge || '',
            ilceBazliBolge: backendData.yatirimBilgileri?.ilceBazliBolge || '',
            serbsetBolge: backendData.yatirimBilgileri?.serbsetBolge || ''
          },

          // 🛠️ Makine Listeleri (backend → frontend mapping)
          makineListeleri: {
            yerli: (backendData.makineListeleri?.yerli || []).map(r => ({
              makineId: r.makineId || '',
              gtipKodu: r.gtipKodu || '',
              gtipAciklamasi: r.gtipAciklamasi || '',
              adiVeOzelligi: r.adiVeOzelligi || '',
              miktar: r.miktar?.toString() || '',
              birim: r.birim || '',
              birimFiyatiTl: r.birimFiyatiTl?.toString() || '',
              toplamTutariTl: r.toplamTutariTl?.toString() || '',
              kdvIstisnasi: r.kdvIstisnasi || ''
            })),
            ithal: (backendData.makineListeleri?.ithal || []).map(r => ({
              makineId: r.makineId || '',
              gtipKodu: r.gtipKodu || '',
              gtipAciklamasi: r.gtipAciklamasi || '',
              adiVeOzelligi: r.adiVeOzelligi || '',
              miktar: r.miktar?.toString() || '',
              birim: r.birim || '',
              birimFiyatiFob: r.birimFiyatiFob?.toString() || r.birimFiyatiTl?.toString() || '',
              gumrukDovizKodu: r.gumrukDovizKodu || '',
              toplamTutarFobUsd: r.toplamTutarFobUsd?.toString() || r.toplamTutariTl?.toString() || '',
              toplamTutarFobTl: r.toplamTutarFobTl?.toString() || r.toplamTutariTl?.toString() || '',
              kullanilmisMakine: r.kullanilmisMakine || '',
              ckdSkdMi: r.ckdSkdMi || '',
              aracMi: r.aracMi || '',
              kdvMuafiyeti: r.kdvMuafiyeti || '',
              gumrukVergisiMuafiyeti: r.gumrukVergisiMuafiyeti || ''
            }))
          },

          // Ürün bilgilerini çevir
          urunBilgileri: backendData.urunler?.map(urun => ({
            kod: urun.u97Kodu || '',
            aciklama: urun.urunAdi || '',
            mevcut: urun.mevcutKapasite || 0,
            ilave: urun.ilaveKapasite || 0,
            toplam: urun.toplamKapasite || 0,
            kapasite_birimi: urun.kapasiteBirimi || ''
          })) || [],

          // 📝 Künye Bilgileri - Backend'den mapping (Excel formatına uygun)
          kunyeBilgileri: {
            // 🔧 Tüm problematik değerleri temizle
            talepSonuc: cleanProblematicValue(backendData.kunyeBilgileri?.talepSonuc),
            revizeId: cleanProblematicValue(backendData.kunyeBilgileri?.revizeId),
            sorguBaglantisi: backendData.kunyeBilgileri?.sorguBaglantisi || '',
            yatirimci: backendData.kunyeBilgileri?.yatirimci || '',
            yatirimciUnvan: backendData.kunyeBilgileri?.yatirimciUnvan || backendData.yatirimciUnvan || '',
            // 🔧 EKSİK ALANLAR EKLENDİ
            sgkSicilNo: backendData.kunyeBilgileri?.sgkSicilNo || '',
            sermayeTuru: backendData.kunyeBilgileri?.sermayeTuru || backendData.firmaBilgileri?.sermayeTuru || '',
            // 🔧 YENİ ALANLAR - Excel detayları (Date formatları düzeltildi) 
            kararTarihi: formatDateForInput(backendData.kunyeBilgileri?.kararTarihi) || '',
            kararSayisi: cleanProblematicValue(backendData.kunyeBilgileri?.kararSayisi),
            yonetmelikMaddesi: cleanProblematicValue(backendData.kunyeBilgileri?.yonetmelikMaddesi),
            basvuruTarihi: formatDateForInput(backendData.kunyeBilgileri?.basvuruTarihi) || '',
            dosyaNo: backendData.kunyeBilgileri?.dosyaNo || '',
            projeBedeli: backendData.kunyeBilgileri?.projeBedeli || 0,
            tesvikMiktari: backendData.kunyeBilgileri?.tesvikMiktari || 0,
            tesvikOrani: backendData.kunyeBilgileri?.tesvikOrani || 0
          },

          // 🎯 Destek Unsurları - BACKEND'DEN YÜKLE (Revize modunda mevcut veriler korunur)
          destekUnsurlari: (() => {
            console.log('📥 [DEBUG] Backend destekUnsurlari RAW:', JSON.stringify(backendData.destekUnsurlari, null, 2));
            if (backendData.destekUnsurlari && backendData.destekUnsurlari.length > 0) {
              const mapped = backendData.destekUnsurlari.map((destek, idx) => ({
                index: idx + 1,
                destekUnsuru: destek.destekUnsuru || '',
                sartlari: destek.sarti || '' // Backend: sarti → Frontend: sartlari
              }));
              console.log('✅ [DEBUG] Destek unsurları mapped:', mapped);
              return mapped;
            }
            console.log('⚠️ [DEBUG] Destek unsurları boş - default değer kullanılıyor');
            return [{ index: 1, destekUnsuru: '', sartlari: '' }];
          })(),

          // ⚖️ Özel Şartlar - BACKEND'DEN YÜKLE (Revize modunda mevcut veriler korunur)
          ozelSartlar: (() => {
            console.log('📥 [DEBUG] Backend ozelSartlar RAW:', JSON.stringify(backendData.ozelSartlar, null, 2));
            if (backendData.ozelSartlar && backendData.ozelSartlar.length > 0) {
              const mapped = backendData.ozelSartlar.map((sart, idx) => ({
                index: idx + 1,
                kisaltma: sart.koşulMetni || '', // Backend: koşulMetni → Frontend: kisaltma
                notu: sart.aciklamaNotu || '' // Backend: aciklamaNotu → Frontend: notu
              }));
              console.log('✅ [DEBUG] Özel şartlar mapped:', mapped);
              return mapped;
            }
            console.log('⚠️ [DEBUG] Özel şartlar boş - default değer kullanılıyor');
            return [{ index: 1, kisaltma: '', notu: '' }];
          })()
        };

        // 🔍 DEBUG: Tüm kritik alanları logla
        console.log('🔄 Backend data mapped to frontend format:', mappedData);
        console.log('🔍 DEBUG - Kritik Alanlar:');
        console.log('  - firma:', mappedData.firma);
        console.log('  - sermayeTuru:', mappedData.kunyeBilgileri?.sermayeTuru);
        console.log('  - sgkSicilNo:', mappedData.kunyeBilgileri?.sgkSicilNo);
        console.log('  - belgeBitisTarihi:', mappedData.belgeYonetimi?.belgeBitisTarihi);
        console.log('  - vergiIndirimsizDestekTalebi:', mappedData.yatirimBilgileri1?.vergiIndirimsizDestekTalebi);
        console.log('  - araziArsaBedeli.aciklama:', mappedData.finansalBilgiler?.araziArsaBedeli?.aciklama);
        console.log('  - binaInsaatGiderleri.aciklama:', mappedData.finansalBilgiler?.binaInsaatGiderleri?.aciklama);
        console.log('  - makinaTechizat.ithal:', mappedData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.ithal);
        console.log('  - makinaTechizat.yerli:', mappedData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.yerli);
        console.log('🔍 DEBUG - Raw Backend Data:');
        console.log('  - backendData.kunyeBilgileri:', backendData.kunyeBilgileri);
        console.log('  - backendData.belgeYonetimi:', backendData.belgeYonetimi);
        console.log('  - backendData.maliHesaplamalar:', backendData.maliHesaplamalar);
        setFormData(mappedData);

        // 🔢 Dinamik alan sayılarını hesapla
        // J-CNS alanları sayısını hesapla
        let cinsCount = 1;
        for (let i = 2; i <= 4; i++) {
          if (mappedData.yatirimBilgileri1?.[`cins${i}`]) {
            cinsCount = i;
          }
        }
        setCinsSayisi(cinsCount);

        // Yatırım adresi alanları sayısını hesapla
        let adresCount = 1;
        for (let i = 2; i <= 3; i++) {
          if (mappedData.yatirimBilgileri2?.[`yatirimAdresi${i}`]) {
            adresCount = i;
          }
        }
        setAdresSayisi(adresCount);

        // 🔧 FIX: Ürün bilgileri satır sayısını yüklenen ürün sayısına göre ayarla
        // Önceden 1'e sabitleniyordu, bu yüzden #1 hariç ürünler görünmüyordu
        const urunCount = Math.max(1, mappedData.urunBilgileri?.length || 1);
        setUrunSayisi(Math.min(10, urunCount));

        // 🎯 Destek unsurları - BACKEND'DEN GELEN VERİ SAYISINA GÖRE AYARLA
        const destekCount = mappedData.destekUnsurlari?.length || 1;
        setDestekSayisi(Math.max(1, destekCount));
        console.log('🎯 Destek unsurları backend\'den yüklendi:', destekCount, 'satır');

        // ⚖️ Özel şartlar - BACKEND'DEN GELEN VERİ SAYISINA GÖRE AYARLA
        const ozelSartCount = mappedData.ozelSartlar?.length || 1;
        setOzelSartSayisi(Math.max(1, ozelSartCount));
        console.log('⚖️ Özel şartlar backend\'den yüklendi:', ozelSartCount, 'satır');
      }
    } catch (error) {
      console.error('🚨 Teşvik data hatası:', error);
      setError('Teşvik verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 YENİ SEÇENEK EKLEME MODAL HANDLERS
  // const openAddOptionModal = (type, title) => {
  //   setAddOptionModal({
  //     open: true,
  //     type,
  //     title,
  //     newValue: '',
  //     newLabel: '',
  //     newKategori: '',
  //     newAciklama: '',
  //     newEkBilgi: {},
  //     adding: false
  //   });
  // };

  const closeAddOptionModal = () => {
    setAddOptionModal(prev => ({ ...prev, open: false }));
  };

  const handleAddOptionChange = (field, value) => {
    setAddOptionModal(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNewOption = async () => {
    try {
      setAddOptionModal(prev => ({ ...prev, adding: true }));

      const payload = {
        value: addOptionModal.newValue || addOptionModal.newLabel,
        label: addOptionModal.newLabel,
        kategori: addOptionModal.newKategori,
        aciklama: addOptionModal.newAciklama,
        ek_bilgi: addOptionModal.newEkBilgi
      };

      console.log(`🆕 Yeni seçenek ekleniyor: ${addOptionModal.type}`, payload);

      const response = await axios.post(`/yeni-tesvik/add-option/${addOptionModal.type}`, payload);

      if (response.data.success) {
        // Başarı mesajı
        setSuccess(`Yeni ${addOptionModal.title} başarıyla eklendi!`);

        // Template'i yeniden yükle
        await loadInitialData();

        // Formdaki değeri yeni eklenen seçenekle güncelle (otomatik seç)
        const newValue = response.data.data.value;

        // Type'a göre hangi form field'ini güncelleyeceğimizi belirle
        if (addOptionModal.type === 'yatirimTipleri') {
          // Hangi cins dropdown'ı açıksa ona ayarla (şimdilik cins1)
          handleFieldChange('yatirimBilgileri1.cins1', newValue);
        } else if (addOptionModal.type === 'destekSiniflari') {
          handleFieldChange('yatirimBilgileri1.destekSinifi', newValue);
        } else if (addOptionModal.type === 'dayandigiKanunlar') {
          handleFieldChange('belgeYonetimi.dayandigiKanun', newValue);
        } else if (addOptionModal.type === 'osbOptions') {
          handleFieldChange('yatirimBilgileri2.ossBelgeMudavimi', newValue);
        } else if (addOptionModal.type === 'destekUnsurlariOptions') {
          // İlk boş destek unsuru alanını bul ve doldur
          const emptyIndex = formData.destekUnsurlari.findIndex(d => !d.destekUnsuru);
          if (emptyIndex !== -1) {
            handleDestekChange(emptyIndex, 'destekUnsuru', newValue);
          }
        } else if (addOptionModal.type === 'ozelSartKisaltmalari') {
          // İlk boş özel şart alanını bul ve doldur  
          const emptyIndex = formData.ozelSartlar.findIndex(s => !s.kisaltma);
          if (emptyIndex !== -1) {
            handleOzelSartChange(emptyIndex, 'kisaltma', newValue);
          }
        }
        // Diğer type'lar için de benzer logic eklenebilir

        closeAddOptionModal();
        console.log(`✅ Yeni seçenek eklendi ve seçildi: ${newValue}`);
      }
    } catch (error) {
      console.error('❌ Seçenek ekleme hatası:', error);
      setError(error.response?.data?.message || 'Yeni seçenek eklenirken hata oluştu');
    } finally {
      setAddOptionModal(prev => ({ ...prev, adding: false }));
    }
  };

  // Form handlers
  const handleFieldChange = (path, value) => {
    const pathArray = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;

      for (let i = 0; i < pathArray.length - 1; i++) {
        current[pathArray[i]] = { ...current[pathArray[i]] };
        current = current[pathArray[i]];
      }

      current[pathArray[pathArray.length - 1]] = value;

      // Otomatik hesaplamalar
      if (path.includes('maliHesaplamalar')) {
        calculateMali(newData);
      }
      if (path.includes('istihdam')) {
        calculateIstihdam(newData);
      }
      if (path.includes('urunBilgileri')) {
        calculateUrunToplam(newData, pathArray);
      }
      // 🔧 FİNANSAL HESAPLAMALAR - YENİ EKLENEN
      if (path.includes('finansalBilgiler')) {
        console.log('💰 Finansal bilgi değişti:', path, '=', value);
        // calculateFinansalTotals zaten useEffect'te formData değişikliklerini dinliyor
        // Burada ayrıca çağırmaya gerek yok - state güncellemesi yeterli
      }

      return newData;
    });
  };

  // 🔢 Dinamik Alan Yönetimi - J-CNS ve Yatırım Adresi
  const addCinsField = () => {
    if (cinsSayisi < 4) {
      setCinsSayisi(prev => prev + 1);
    }
  };

  const removeCinsField = () => {
    if (cinsSayisi > 1) {
      setCinsSayisi(prev => {
        const newCount = prev - 1;
        // Son alanın değerini temizle
        setFormData(prevData => ({
          ...prevData,
          yatirimBilgileri1: {
            ...prevData.yatirimBilgileri1,
            [`cins${newCount + 1}`]: ''
          }
        }));
        return newCount;
      });
    }
  };

  const addAdresField = () => {
    if (adresSayisi < 3) {
      setAdresSayisi(prev => prev + 1);
    }
  };

  const removeAdresField = () => {
    if (adresSayisi > 1) {
      setAdresSayisi(prev => {
        const newCount = prev - 1;
        // Son alanın değerini temizle
        setFormData(prevData => ({
          ...prevData,
          yatirimBilgileri2: {
            ...prevData.yatirimBilgileri2,
            [`yatirimAdresi${newCount + 1}`]: ''
          }
        }));
        return newCount;
      });
    }
  };

  // 📦 Dinamik Ürün Yönetimi - 1 başlangıç, Max 10
  const addUrunField = () => {
    if (urunSayisi < 10) {
      setUrunSayisi(prev => prev + 1);
      setFormData(prevData => ({
        ...prevData,
        urunBilgileri: [
          ...prevData.urunBilgileri,
          { kod: '', aciklama: '', mevcut: '', ilave: '', toplam: '', kapsite: '', kapasite_birimi: '' }
        ]
      }));
    }
  };

  const removeUrunField = () => {
    if (urunSayisi > 1) {
      setUrunSayisi(prev => prev - 1);
      setFormData(prevData => ({
        ...prevData,
        urunBilgileri: prevData.urunBilgileri.slice(0, -1)
      }));
    }
  };

  // 🎯 Dinamik Destek Unsuru Yönetimi - 1 başlangıç, Max 8
  const addDestekField = () => {
    if (destekSayisi < 8) {
      setDestekSayisi(prev => prev + 1);
      setFormData(prevData => ({
        ...prevData,
        destekUnsurlari: [
          ...prevData.destekUnsurlari,
          { index: prevData.destekUnsurlari.length + 1, destekUnsuru: '', sartlari: '' }
        ]
      }));
    }
  };

  const removeDestekField = () => {
    if (destekSayisi > 1) {
      setDestekSayisi(prev => prev - 1);
      setFormData(prevData => ({
        ...prevData,
        destekUnsurlari: prevData.destekUnsurlari.slice(0, -1)
      }));
    }
  };

  // 🎯 Dinamik Özel Şart Yönetimi - 1 başlangıç, limit kaldırıldı
  const addOzelSartField = () => {
    setOzelSartSayisi(prev => prev + 1);
    setFormData(prevData => ({
      ...prevData,
      ozelSartlar: [
        ...prevData.ozelSartlar,
        { index: prevData.ozelSartlar.length + 1, kisaltma: '', notu: '' }
      ]
    }));
  };

  const removeOzelSartField = () => {
    if (ozelSartSayisi > 1) {
      setOzelSartSayisi(prev => prev - 1);
      setFormData(prevData => ({
        ...prevData,
        ozelSartlar: prevData.ozelSartlar.slice(0, -1)
      }));
    }
  };

  // 🔢 ÜRÜN BİLGİLERİ ARRAY HANDLER - BÜYÜK SAYI DESTEĞİ
  const handleUrunChange = (index, field, value) => {
    setFormData(prev => {
      const newData = { ...prev };

      // 🎯 SAYı ALANLARI İÇİN ÖZEL İŞLEM
      if (['mevcut', 'ilave', 'toplam', 'kapsite'].includes(field)) {
        // String'i temizle ve sayıya çevir
        const cleanValue = String(value).replace(/[^\d.-]/g, ''); // Sadece rakam, nokta, tire
        const numericValue = cleanValue === '' ? '' : Number(cleanValue);

        newData.urunBilgileri[index] = {
          ...newData.urunBilgileri[index],
          [field]: numericValue
        };
      } else {
        newData.urunBilgileri[index] = {
          ...newData.urunBilgileri[index],
          [field]: value
        };
      }

      // 🧮 TOPLAM HESAPLA - BÜYÜK SAYI SAFE
      const urun = newData.urunBilgileri[index];
      if (urun.mevcut !== undefined || urun.ilave !== undefined) {
        const mevcut = Number(urun.mevcut) || 0;
        const ilave = Number(urun.ilave) || 0;

        // Precision güvenliği için
        const toplam = Math.round((mevcut + ilave) * 100) / 100;
        urun.toplam = toplam;

        // 📊 Debug için console log (production'da kaldırılabilir)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔢 Büyük sayı hesaplama:', {
            mevcut: mevcut.toLocaleString('tr-TR'),
            ilave: ilave.toLocaleString('tr-TR'),
            toplam: toplam.toLocaleString('tr-TR'),
            field,
            originalValue: value,
            parsedValue: typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value
          });
        }
      }

      return newData;
    });
  };

  // 🔧 GELECEKTE EKLENEBİLİR - Excel Benzeri Copy-Paste Özelliği
  // const handleTablePaste = (e) => {
  //   e.preventDefault();
  //   const pasteData = e.clipboardData.getData('text');
  //   
  //   if (!pasteData) return;
  //   
  //   // Excel/CSV formatında veriyi parse et
  //   const rows = pasteData.split('\n').filter(row => row.trim());
  //   const parsedData = rows.map(row => {
  //     const cells = row.split('\t'); // Tab ile ayrılmış
  //     return {
  //       kod: cells[0] || '',
  //       aciklama: cells[1] || '',
  //       mevcut: parseFloat(cells[2]) || 0,
  //       ilave: parseFloat(cells[3]) || 0,
  //       // kapsite alanı kaldırıldı
  //       kapasite_birimi: cells[6] || ''
  //     };
  //   });
  //   
  //   // Mevcut ürün bilgilerine ekle
  //   setFormData(prev => {
  //     const newData = { ...prev };
  //     
  //     // Yeni satırları ekle
  //     parsedData.forEach((newUrun, index) => {
  //   
  //       newData.urunBilgileri.push({
  //         ...newUrun,
  //         toplam: newUrun.mevcut + newUrun.ilave
  //       });
  //     });
  //     
  //     return newData;
  //   });
  //   
  //   setSuccess(`${parsedData.length} satır başarıyla yapıştırıldı!`);
  // };

  // 🔧 YENİ EKLENDİ - Toplu Veri Temizleme
  const handleClearAllUrunData = () => {
    if (window.confirm('Tüm ürün verilerini temizlemek istediğinizden emin misiniz?')) {
      setFormData(prev => ({
        ...prev,
        urunBilgileri: [{ kod: '', aciklama: '', mevcut: '', ilave: '', toplam: '', kapsite: '', kapasite_birimi: '' }]
      }));
      setUrunSayisi(1); // Satır sayısını da 1'e sıfırla
      setSuccess('Tüm ürün verileri temizlendi!');
    }
  };

  // 🔧 YENİ EKLENDİ - Excel Formatında Veri Kopyalama
  const handleCopyTableData = () => {
    const headers = ['Kod', 'Açıklama', 'Mevcut', 'İlave', 'Toplam', 'Kapasite', 'Birim'];
    const rows = formData.urunBilgileri
      .filter(urun => urun.kod || urun.aciklama) // Sadece dolu satırları al
      .map(urun => [
        urun.kod,
        urun.aciklama,
        urun.mevcut,
        urun.ilave,
        urun.toplam,
        urun.kapsite,
        urun.kapasite_birimi
      ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');

    navigator.clipboard.writeText(csvContent).then(() => {
      setSuccess('Tablo verileri panoya kopyalandı! Excel\'e yapıştırabilirsiniz.');
    }).catch(() => {
      setError('Kopyalama işlemi başarısız oldu.');
    });
  };

  // 📅 parseClipboardDate artık doğrudan handleDatePaste içinden kullanılıyor (yukarıda tanımlı)

  // 📅 Gelişmiş tarih formatları parser - Excel copy-paste uyumlu
  const parseClipboardDate = (dateString) => {
    // Null/undefined kontrolü
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    // Boşlukları, tab ve satır sonlarını temizle, ayrıca Excel'den gelebilecek özel karakterleri de
    let cleaned = dateString.trim().replace(/[\s\n\r\t\u00A0\u2000-\u200F\u2028-\u202F]/g, '');

    // Boş string kontrolü
    if (!cleaned) {
      return null;
    }

    // Farklı tarih formatları - daha esnek regex'ler
    const formats = [
      // DD/MM/YYYY veya DD.MM.YYYY (Türk formatı)
      {
        regex: /^(\d{1,2})[/.,-](\d{1,2})[/.,-](\d{4})$/,
        type: 'DD_MM_YYYY'
      },
      // DD/MM/YY veya DD.MM.YY (Kısa yıl)
      {
        regex: /^(\d{1,2})[/.,-](\d{1,2})[/.,-](\d{2})$/,
        type: 'DD_MM_YY'
      },
      // YYYY-MM-DD (ISO formatı)
      {
        regex: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/,
        type: 'YYYY_MM_DD'
      },
      // YYYY/MM/DD veya YYYY.MM.DD
      {
        regex: /^(\d{4})[/.,-](\d{1,2})[/.,-](\d{1,2})$/,
        type: 'YYYY_MM_DD_ALT'
      },
      // MM/DD/YYYY (Amerikan formatı)
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        type: 'MM_DD_YYYY'
      },
      // DDMMYYYY (rakamlar yan yana)
      {
        regex: /^(\d{2})(\d{2})(\d{4})$/,
        type: 'DDMMYYYY'
      },
      // DD-MM-YYYY (tire ile)
      {
        regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        type: 'DD_MM_YYYY_DASH'
      }
    ];

    // Her formatı dene
    for (const format of formats) {
      const match = cleaned.match(format.regex);
      if (match) {
        let day, month, year;

        try {
          switch (format.type) {
            case 'DD_MM_YYYY':
            case 'DD_MM_YYYY_DASH':
            case 'DDMMYYYY':
              day = parseInt(match[1]);
              month = parseInt(match[2]);
              year = parseInt(match[3]);
              break;

            case 'DD_MM_YY':
              day = parseInt(match[1]);
              month = parseInt(match[2]);
              const yy = parseInt(match[3]);
              // 2000 sonrası için 00-30, 1900'ler için 31-99
              year = yy <= 30 ? 2000 + yy : 1900 + yy;
              break;

            case 'YYYY_MM_DD':
            case 'YYYY_MM_DD_ALT':
              year = parseInt(match[1]);
              month = parseInt(match[2]);
              day = parseInt(match[3]);
              break;

            case 'MM_DD_YYYY':
              month = parseInt(match[1]);
              day = parseInt(match[2]);
              year = parseInt(match[3]);
              break;

            default:
              continue;
          }

          // Tarih değerlerini doğrula
          if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
            continue;
          }

          // JavaScript Date objesi ile doğrula
          const date = new Date(year, month - 1, day);
          if (date.getFullYear() === year && date.getMonth() === (month - 1) && date.getDate() === day) {
            // YYYY-MM-DD formatında geri döndür
            const formattedMonth = month.toString().padStart(2, '0');
            const formattedDay = day.toString().padStart(2, '0');
            return `${year}-${formattedMonth}-${formattedDay}`;
          }

        } catch (error) {
          // Bu format çalışmadı, bir sonrakini dene
          continue;
        }
      }
    }

    return null; // Hiçbir format çalışmazsa
  };

  // Destek unsurları handler - Dinamik sistem + Otomatik Şart Eşleştirmesi
  const handleDestekChange = async (index, field, value) => {
    setFormData(prev => {
      const newData = { ...prev };

      // 🔧 Dinamik güvenlik kontrolü
      if (!newData.destekUnsurlari || !Array.isArray(newData.destekUnsurlari)) {
        newData.destekUnsurlari = [{ index: 1, destekUnsuru: '', sartlari: '' }];
      }

      // Belirli index için kontrol - dinamik olarak genişlet
      while (newData.destekUnsurlari.length <= index) {
        newData.destekUnsurlari.push({
          index: newData.destekUnsurlari.length + 1,
          destekUnsuru: '',
          sartlari: ''
        });
      }

      // Güvenli atama
      if (newData.destekUnsurlari[index] && typeof newData.destekUnsurlari[index] === 'object') {
        newData.destekUnsurlari[index][field] = value;
      }

      return newData;
    });

    // 🎯 OTOMATIK ŞART DOLDURMA - Destek unsuru seçildiğinde (ROBUST VERSİYON)
    if (field === 'destekUnsuru' && value && value.trim()) {
      try {
        console.log(`🎯 ${value} için otomatik şartlar getiriliyor...`);
        const sartlar = await destekSartService.getShartlarByDestekTuru(value.trim());

        if (sartlar && sartlar.length > 0) {
          console.log(`✅ ${sartlar.length} şart bulundu:`, sartlar);

          // İlk şartı otomatik doldur - async state update için setTimeout
          const ilkSart = sartlar[0];

          // State güncelleme işlemini biraz geciktir ki diğer field güncellemesi tamamlansın
          setTimeout(() => {
            setFormData(prev => {
              const newData = { ...prev };

              // Güvenli kontrol ve atama
              if (newData.destekUnsurlari && Array.isArray(newData.destekUnsurlari) && newData.destekUnsurlari[index]) {
                newData.destekUnsurlari[index].sartlari = ilkSart;
                console.log(`✅ Index ${index} için şart otomatik dolduruldu: ${ilkSart}`);
              } else {
                console.warn(`⚠️ Index ${index} bulunamadı:`, newData.destekUnsurlari);
              }

              return newData;
            });
          }, 150); // 150ms gecikme

          // Şart seçeneklerini template data'ya ekle
          if (sartlar.length > 0) {
            setTemplateData(prev => ({
              ...prev,
              destekSartlariOptions: [
                ...(prev.destekSartlariOptions || []),
                ...sartlar.filter(sart =>
                  !prev.destekSartlariOptions?.some(option =>
                    (typeof option === 'string' ? option : option.value || option.label) === sart
                  )
                )
              ]
            }));
            console.log(`📋 ${sartlar.length} şart seçeneklere eklendi`);
          }

        } else {
          console.log(`⚠️ ${value} için eşleştirme bulunamadı - kullanıcı manuel girebilir`);
        }
      } catch (error) {
        console.error(`❌ ${value} için şart getirme hatası:`, error);
        // Hata olursa sessizce devam et, kullanıcı manuel girebilir
      }
    }
  };

  // Özel şartlar handler - Dinamik sistem
  const handleOzelSartChange = (index, field, value) => {
    setFormData(prev => {
      const newData = { ...prev };

      // 🔧 Dinamik güvenlik kontrolü
      if (!newData.ozelSartlar || !Array.isArray(newData.ozelSartlar)) {
        newData.ozelSartlar = [{ index: 1, kisaltma: '', notu: '' }];
      }

      // Belirli index için kontrol - dinamik olarak genişlet
      while (newData.ozelSartlar.length <= index) {
        newData.ozelSartlar.push({
          index: newData.ozelSartlar.length + 1,
          kisaltma: '',
          notu: ''
        });
      }

      // Güvenli atama
      if (newData.ozelSartlar[index] && typeof newData.ozelSartlar[index] === 'object') {
        newData.ozelSartlar[index][field] = value;
      }

      return newData;
    });
  };

  // 🎯 ======== DİNAMİK ÖĞRENEN SİSTEM - VERİ EKLEME FONKSİYONLARI ========

  // 📚 Yeni Destek Unsuru Ekleme (Akıllı Öğrenme)
  const addNewDestekUnsuru = async (value) => {
    if (!value || value.length < 3) return; // En az 3 karakter

    try {
      console.log('🎓 Sistem yeni destek unsuru öğreniyor:', value);

      const response = await axios.post('/lookup/destek-unsuru', {
        value: value.trim(),
        label: value.trim(),
        kategori: 'Diğer',
        renk: '#6B7280'
      });

      if (response.data.success) {
        console.log('✅ Yeni destek unsuru sisteme kaydedildi:', response.data);

        // Template data'yı yenile
        try {
          const templateResponse = await axios.get('/yeni-tesvik/templates');
          if (templateResponse.data.success) {
            setTemplateData(templateResponse.data.data);
          }
        } catch (templateError) {
          console.error('🚨 Template data refresh hatası:', templateError);
        }

        // Şablonları yeniden yükle
        await loadInitialData();
        console.log('✅ Yeni destek unsuru eklendi:', value);
        setSuccess(`✅ "${value}" destek unsuru sisteme eklendi ve dropdown güncelllendi!`);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('🔄 Destek unsuru zaten mevcut:', value);
      } else {
        console.error('🚨 Destek unsuru ekleme hatası:', error);
        setError('Destek unsuru eklenirken hata oluştu');
      }
    }
  };

  // 📋 Yeni Destek Şartı Ekleme (Akıllı Öğrenme) - ✅ AKTİF
  const addNewDestekSarti = async (value) => {
    if (!value || value.length < 3) return;

    try {
      console.log('🎓 Sistem yeni destek şartı öğreniyor:', value);

      const response = await axios.post('/lookup/destek-sarti', {
        value: value.trim(),
        label: value.trim(),
        kategori: 'Diğer'
      });

      if (response.data.success) {
        console.log('✅ Yeni destek şartı sisteme kaydedildi:', response.data);

        // Template data'yı yenile
        await loadInitialData();
        setSuccess(`✅ "${value}" destek şartı sisteme eklendi!`);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('🔄 Destek şartı zaten mevcut:', value);
      } else {
        console.error('🚨 Destek şartı ekleme hatası:', error);
        setError('Destek şartı eklenirken hata oluştu');
      }
    }
  };

  // 🏷️ Yeni Özel Şart Ekleme (Akıllı Öğrenme)
  const addNewOzelSart = async (value) => {
    console.log(`🎓 Sistem yeni özel şart öğreniyor:`, { value, length: value?.length });

    if (!value || value.length < 2) {
      console.log(`⚠️ Değer çok kısa, minimum 2 karakter gerekli:`, value);
      return;
    }

    try {
      const kisaltma = value.trim().toUpperCase();
      const aciklama = value.length > 10 ? value.trim() : `${kisaltma} Açıklaması`;

      console.log(`📡 Backend'e POST isteği gönderiliyor:`, {
        endpoint: '/lookup/ozel-sart',
        data: { kisaltma, aciklama, kategori: 'Diğer' }
      });

      const response = await axios.post('/lookup/ozel-sart', {
        kisaltma: kisaltma,
        aciklama: aciklama,
        kategori: 'Diğer'
      });

      console.log(`✅ [DEBUG] Backend response:`, response.data);

      if (response.data.success) {
        console.log(`🔄 [DEBUG] Template data refresh başlatılıyor...`);

        // CRITICAL FIX: Template data'yı da yenile!
        try {
          const templateResponse = await axios.get('/yeni-tesvik/templates');
          if (templateResponse.data.success) {
            setTemplateData(templateResponse.data.data);
            console.log(`✅ [DEBUG] Template data yenilendi - Özel şart sayısı:`,
              templateResponse.data.data.ozelSartKisaltmalari?.length);
          }
        } catch (templateError) {
          console.error('🚨 Template data refresh hatası:', templateError);
        }

        // Form data'yı da güncelle (mevcut işlem)
        await loadInitialData();

        console.log('✅ Yeni özel şart eklendi:', kisaltma);
        setSuccess(`✅ "${kisaltma}" özel şartı sisteme eklendi ve dropdown güncelllendi!`);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('🔄 Özel şart zaten mevcut:', value);
      } else {
        console.error('🚨 [DEBUG] Özel şart ekleme hatası:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setError('Özel şart eklenirken hata oluştu');
      }
    }
  };

  // Yeni Özel Şart Notu Ekleme
  const addNewOzelSartNotu = async (value) => {
    if (!value || value.length < 5) return;

    try {
      const response = await axios.post('/yeni-tesvik/dynamic/ozel-sart-notu', {
        value: value.trim(),
        label: value.trim(),
        kategori: 'Diğer'
      });

      if (response.data.success) {
        await loadInitialData();
        console.log('✅ Yeni özel şart notu eklendi:', value);
        setSuccess(`✅ "${value}" özel şart notu sisteme eklendi!`);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('🔄 Özel şart notu zaten mevcut:', value);
      } else {
        console.error('🚨 Özel şart notu ekleme hatası:', error);
        setError('Özel şart notu eklenirken hata oluştu');
      }
    }
  };

  // Mali hesaplamalar
  const calculateMali = (data) => {
    const mali = data.maliHesaplamalar;

    // Bina inşaat toplam
    mali.binaInsaatGiderleri.toplamBinaInsaatGideri =
      mali.binaInsaatGiderleri.anaBinaInsaati + mali.binaInsaatGiderleri.yardimciBinaInsaati;

    // Makina teçhizat toplam
    mali.makinaTeçhizat.toplamIthalMakina =
      mali.makinaTeçhizat.ithalMakina + mali.makinaTeçhizat.kullanilmisMakina;

    // Toplam sabit yatırım
    mali.toplamSabitYatirimTutari =
      mali.binaInsaatGiderleri.toplamBinaInsaatGideri +
      mali.makinaTeçhizat.toplamIthalMakina +
      mali.digerGiderler.toplamDigerGiderler;
  };

  // İstihdam hesaplaması - Boş string'leri 0 olarak hesapla
  const calculateIstihdam = (data) => {
    const mevcut = parseInt(data.istihdam.mevcutKisi) || 0;
    const ilave = parseInt(data.istihdam.ilaveKisi) || 0;
    data.istihdam.toplamKisi = mevcut + ilave;
  };

  // 🧮 ÜRÜN TOPLAM HESAPLAMA - BÜYÜK SAYI GÜVENLİ
  const calculateUrunToplam = (data, pathArray) => {
    if (pathArray.length >= 2) {
      const index = parseInt(pathArray[1]);
      const urun = data.urunBilgileri[index];
      if (urun) {
        const mevcut = Number(urun.mevcut) || 0;
        const ilave = Number(urun.ilave) || 0;

        // Precision güvenliği ile hesaplama
        const toplam = Math.round((mevcut + ilave) * 100) / 100;
        urun.toplam = toplam;

        // 📊 Debug için console log (production'da kaldırılabilir)
        if (process.env.NODE_ENV === 'development') {
          console.log('🧮 calculateUrunToplam:', {
            index,
            mevcut: mevcut.toLocaleString('tr-TR'),
            ilave: ilave.toLocaleString('tr-TR'),
            toplam: toplam.toLocaleString('tr-TR')
          });
        }
      }
    }
  };

  // 🔧 YENİ EKLENDİ - Excel Export Handler
  const handleExcelExport = async (format = 'xlsx') => {
    try {
      // Teşvik ID'sini doğru şekilde belirle
      const tesvikId = id || formData._id || formData.tesvikId;

      if (!tesvikId || (!formData.gmId && !formData.tesvikId)) {
        setError('Excel çıktı alabilmek için teşvik kaydedilmiş olmalıdır.');
        return;
      }

      console.log('📊 Excel çıktı hazırlanıyor...', format, 'Teşvik ID:', tesvikId);
      setLoading(true);

      const response = await axios.get(`/yeni-tesvik/${tesvikId}/excel-export`, {
        responseType: 'blob',
        params: { format }
      });

      // Dosya indirme
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tesvik_${formData.gmId || formData.tesvikId}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Excel dosyası başarıyla indirildi!');
      console.log('✅ Excel dosyası indirildi');

    } catch (error) {
      console.error('🚨 Excel export hatası:', error);
      setError('Excel çıktı alınırken hata oluştu: ' + (error.response?.data?.message || error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };



  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      // 🔧 Frontend to Backend data mapping
      const mappedData = {
        ...formData,
        // Yatırım bilgilerini birleştir ve model formatına çevir
        yatirimBilgileri: {
          // Bölüm 1 alanları
          yatirimKonusu: formData.yatirimBilgileri1?.yatirimKonusu || '',
          // 🎯 YENİ PROFESYONEL ALANLAR - Backend mapping
          cazibeMerkeziMi: formData.yatirimBilgileri1?.cazibeMerkeziMi || '',
          savunmaSanayiProjesi: formData.yatirimBilgileri1?.savunmaSanayiProjesi || '',
          enerjiUretimKaynagi: formData.yatirimBilgileri1?.enerjiUretimKaynagi || '',
          cazibeMerkezi2018: formData.yatirimBilgileri1?.cazibeMerkezi2018 || '',
          cazibeMerkeziDeprem: formData.yatirimBilgileri1?.cazibeMerkeziDeprem || '',
          hamleMi: formData.yatirimBilgileri1?.hamleMi || '',
          vergiIndirimsizDestek: formData.yatirimBilgileri1?.vergiIndirimsizDestek || formData.yatirimBilgileri1?.vergiIndirimsizDestekTalebi || '',
          oecdKategori: formData.yatirimBilgileri1?.oecdKategori || '', // 🆕 OECD Kategori kaydı

          sCinsi1: formData.yatirimBilgileri1?.cins1 || '',
          tCinsi2: formData.yatirimBilgileri1?.cins2 || '',
          uCinsi3: formData.yatirimBilgileri1?.cins3 || '',
          vCinsi4: formData.yatirimBilgileri1?.cins4 || '',
          destekSinifi: formData.yatirimBilgileri1?.destekSinifi || '',

          // Bölüm 2 alanları  
          yerinIl: formData.yatirimBilgileri2?.yerinIl || '',
          yerinIlce: formData.yatirimBilgileri2?.yerinIlce || '',
          ada: formData.yatirimBilgileri2?.ada || '', // 🆕 YENİ ALAN
          parsel: formData.yatirimBilgileri2?.parsel || '', // 🆕 YENİ ALAN
          yatirimAdresi1: formData.yatirimBilgileri2?.yatirimAdresi1 || '',
          yatirimAdresi2: formData.yatirimBilgileri2?.yatirimAdresi2 || '',
          yatirimAdresi3: formData.yatirimBilgileri2?.yatirimAdresi3 || '',
          osbIseMudurluk: formData.yatirimBilgileri2?.ossBelgeMudavimi || '',
          ilBazliBolge: formData.yatirimBilgileri2?.ilBazliBolge || '', // 🆕 YENİ ALAN
          ilceBazliBolge: formData.yatirimBilgileri2?.ilceBazliBolge || '', // 🆕 YENİ ALAN
          serbsetBolge: formData.yatirimBilgileri2?.serbsetBolge || '' // 🆕 YENİ ALAN
        },

        // Ürün bilgilerini model formatına çevir
        urunler: formData.urunBilgileri?.map(urun => ({
          u97Kodu: urun.kod || '',
          urunAdi: urun.aciklama || '',
          mevcutKapasite: safeParseInt(urun.mevcut),
          ilaveKapasite: safeParseInt(urun.ilave),
          toplamKapasite: safeParseInt(urun.toplam),
          kapasiteBirimi: urun.kapasite_birimi || ''
        })) || [],

        // Mali hesaplamaları model formatına çevir (finansalBilgiler → maliHesaplamalar)
        maliHesaplamalar: {
          toplamSabitYatirim: formData.finansalBilgiler?.toplamSabitYatirimTutari || 0,
          yatiriminTutari: formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli || 0,
          araciArsaBedeli: formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli || 0,

          // Maliyetlenen (Arazi-Arsa Bedeli Detayları)
          maliyetlenen: {
            aciklama: formData.finansalBilgiler?.araziArsaBedeli?.aciklama || '',
            sl: formData.finansalBilgiler?.araziArsaBedeli?.metrekaresi || 0,
            sm: formData.finansalBilgiler?.araziArsaBedeli?.birimFiyatiTl || 0,
            sn: formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli || 0
          },

          // Bina İnşaat Giderleri
          binaInsaatGideri: {
            aciklama: formData.finansalBilgiler?.binaInsaatGiderleri?.aciklama || '',
            anaBinaGideri: formData.finansalBilgiler?.binaInsaatGiderleri?.anaBinaVeTesisleri || 0,
            yardimciBinaGideri: formData.finansalBilgiler?.binaInsaatGiderleri?.yardimciIsBinaVeIcareBinalari || 0,
            toplamBinaGideri: formData.finansalBilgiler?.binaInsaatGiderleri?.toplamBinaInsaatGideri || 0
          },

          // Makine Teçhizat
          makinaTechizat: {
            ithalMakina: formData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.ithal || 0,
            yerliMakina: formData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.yerli || 0,
            toplamMakina: formData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.toplamMakineTeç || 0,
            yeniMakina: formData.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.yeniMakine || 0,
            kullanimisMakina: formData.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.kullanilmisMakine || 0,
            toplamYeniMakina: formData.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.toplamIthalMakine || 0
          },

          // Yatırım Hesaplamaları (Diğer Yatırım Harcamaları)
          yatirimHesaplamalari: {
            eu: formData.finansalBilgiler?.digerYatirimHarcamalari?.yardimciIslMakTeçGid || 0,
            ev: formData.finansalBilgiler?.digerYatirimHarcamalari?.ithalatVeGumGiderleri || 0,
            ew: formData.finansalBilgiler?.digerYatirimHarcamalari?.tasimaVeSigortaGiderleri || 0,
            ex: formData.finansalBilgiler?.digerYatirimHarcamalari?.etudVeProjeGiderleri || 0,
            ey: formData.finansalBilgiler?.digerYatirimHarcamalari?.digerGiderleri || 0,
            ez: formData.finansalBilgiler?.digerYatirimHarcamalari?.toplamDigerYatirimHarcamalari || 0
          },

          // Finansman
          finansman: {
            yabanciKaynak: formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.toplamYabanciKaynak || 0,
            ozKaynak: formData.finansalBilgiler?.finansman?.ozkaynaklar?.ozkaynaklar || 0,
            toplamFinansman: formData.finansalBilgiler?.finansman?.toplamFinansman || 0
          }
        },

        // 🛠️ Makine Listeleri (frontend → backend mapping)
        makineListeleri: {
          yerli: ((formData.makineListeleri && formData.makineListeleri.yerli) || []).map(r => ({
            makineId: r.makineId || '',
            gtipKodu: r.gtipKodu || '',
            gtipAciklamasi: r.gtipAciklamasi || '',
            adiVeOzelligi: r.adiVeOzelligi || '',
            miktar: parseInt(r.miktar) || 0,
            birim: r.birim || '',
            birimFiyatiTl: parseInt(r.birimFiyatiTl) || 0,
            toplamTutariTl: parseInt(r.toplamTutariTl) || 0,
            kdvIstisnasi: r.kdvIstisnasi || ''
          })),
          ithal: ((formData.makineListeleri && formData.makineListeleri.ithal) || []).map(r => ({
            makineId: r.makineId || '',
            gtipKodu: r.gtipKodu || '',
            gtipAciklamasi: r.gtipAciklamasi || '',
            adiVeOzelligi: r.adiVeOzelligi || '',
            miktar: parseInt(r.miktar) || 0,
            birim: r.birim || '',
            birimFiyatiFob: parseInt(r.birimFiyatiFob) || 0,
            gumrukDovizKodu: r.gumrukDovizKodu || '',
            toplamTutarFobUsd: parseInt(r.toplamTutarFobUsd) || 0,
            toplamTutarFobTl: parseInt(r.toplamTutarFobTl) || 0,
            kullanilmisMakine: r.kullanilmisMakine || '',
            ckdSkdMi: r.ckdSkdMi || '',
            aracMi: r.aracMi || '',
            kdvMuafiyeti: r.kdvMuafiyeti || '',
            gumrukVergisiMuafiyeti: r.gumrukVergisiMuafiyeti || ''
          }))
        },

        // 🔧 Destek Unsurları model formatına çevir - ✅ FİXED: En az destekUnsuru dolu olmalı
        destekUnsurlari: (() => {
          console.log('📤 [DEBUG] formData.destekUnsurlari BEFORE filter:', JSON.stringify(formData.destekUnsurlari, null, 2));
          const filtered = formData.destekUnsurlari?.filter(d =>
            d && d.destekUnsuru && d.destekUnsuru.trim() !== ''
          ) || [];
          console.log('📤 [DEBUG] Destek unsurları AFTER filter:', filtered.length, 'kayıt');
          return filtered.map(destek => ({
            destekUnsuru: destek.destekUnsuru.trim(),
            sarti: (destek.sartlari?.trim() || '-'),
            aciklama: destek.aciklama?.trim() || ''
          }));
        })(),

        // 🔧 Özel Şartlar model formatına çevir - ✅ FİXED: kisaltma zorunlu (backend required)
        ozelSartlar: (() => {
          console.log('📤 [DEBUG] formData.ozelSartlar BEFORE filter:', JSON.stringify(formData.ozelSartlar, null, 2));
          const filtered = formData.ozelSartlar?.filter(s =>
            s && s.kisaltma && s.kisaltma.trim() !== ''
          ) || [];
          console.log('📤 [DEBUG] Özel şartlar AFTER filter:', filtered.length, 'kayıt');
          return filtered.map((sart, index) => ({
            koşulNo: index + 1,
            koşulMetni: sart.kisaltma.trim(),
            aciklamaNotu: (sart.notu?.trim() || '')
          }));
        })()
      };

      // Frontend-specific alanları kaldır
      delete mappedData.yatirimBilgileri1;
      delete mappedData.yatirimBilgileri2;
      delete mappedData.urunBilgileri;
      delete mappedData.finansalBilgiler;
      // Orijinal frontend array'leri kaldır (backend formatına çevrildi)
      delete mappedData.destekUnsurlari_frontend;
      delete mappedData.ozelSartlar_frontend;

      console.log('🔄 Mapped data to backend format:', mappedData);
      console.log('🔍 DEBUG SAVE - Kritik Alanlar:');
      console.log('  - belgeYonetimi.belgeBitisTarihi:', mappedData.belgeYonetimi?.belgeBitisTarihi);
      console.log('  - maliHesaplamalar.makinaTechizat:', mappedData.maliHesaplamalar?.makinaTechizat);
      console.log('  - formData.finansalBilgiler.makineTeçhizatGiderleri:', formData.finansalBilgiler?.makineTeçhizatGiderleri);

      const url = isEdit ? `/yeni-tesvik/${id}` : '/yeni-tesvik';
      const method = isEdit ? 'put' : 'post';

      const response = await axios[method](url, mappedData);

      if (response.data.success) {
        setSuccess(isEdit ? 'Teşvik başarıyla güncellendi' : 'Teşvik başarıyla oluşturuldu');
        setTimeout(() => {
          navigate('/yeni-tesvik/liste');
        }, 2000);
      }
    } catch (error) {
      console.error('🚨 Submit hatası:', error);
      console.error('❌ API Response Error:', error.response?.data);

      // Detaylı hata mesajları göster
      let errorMessage = 'Kaydetme sırasında hata oluştu';

      // 🔧 DUPLICATE_BELGE_ID hatası özel mesajı
      if (error.response?.data?.error === 'DUPLICATE_BELGE_ID') {
        const { existingTesvikId, existingTesvikFirma, suggestion } = error.response.data;
        errorMessage = `❌ Bu Belge ID ile zaten bir teşvik kaydı mevcut!\n\n` +
          `📋 Mevcut Teşvik: ${existingTesvikId}\n` +
          `🏢 Firma: ${existingTesvikFirma}\n\n` +
          `💡 ${suggestion || 'Mevcut teşvik kaydını düzenlemek için teşvik listesine gidin veya farklı bir Belge ID girin.'}`;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Validation errors
        const validationErrors = error.response.data.errors.map(err => `• ${err.msg || err.message}`).join('\n');
        errorMessage = `Girilen bilgilerde hatalar var:\n\n${validationErrors}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // 🆔 1. KÜNYE VE YATIRIM BİLGİLERİ - Devlet Sistemine Uyumlu Tek Sayfa Düzeni
  const renderKunyeBilgileri = () => (
    <Grid container spacing={2}>
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* SOL KOLON: YATIRIMCI İLE İLGİLİ BİLGİLER + YATIRIM İLE İLGİLİ BİLGİLER */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <Grid item xs={12} lg={6}>
        {/* 🏢 YATIRIMCI İLE İLGİLİ BİLGİLER */}
        <Paper
          elevation={1}
          sx={{
            mb: 2,
            border: '1px solid #cbd5e1',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <Box sx={{
            backgroundColor: '#f1f5f9',
            p: 1.5,
            borderBottom: '1px solid #cbd5e1'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#334155' }}>
              Yatırımcı ile ilgili bilgiler
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {/* Firma Adı */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 80, pt: 1 }}>
                    Firma Adı:
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={templateData.firmalar}
                      getOptionLabel={(option) => {
                        if (!option) return '';
                        return option.tamUnvan;
                      }}
                      value={templateData.firmalar.find(f => f._id === formData.firma) || null}
                      onChange={(event, newValue) => {
                        if (newValue) {
                          handleFieldChange('firma', newValue._id);
                          handleFieldChange('yatirimciUnvan', newValue.tamUnvan);
                        } else {
                          handleFieldChange('firma', '');
                          handleFieldChange('yatirimciUnvan', '');
                        }
                      }}
                      filterOptions={(options, { inputValue }) => {
                        const filtered = options.filter(option => {
                          return (
                            turkishIncludes(option.firmaId, inputValue) ||
                            turkishIncludes(option.tamUnvan, inputValue) ||
                            (option.vergiNoTC && turkishIncludes(option.vergiNoTC, inputValue))
                          );
                        });
                        return filtered;
                      }}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        return (
                          <Box
                            key={key}
                            component="li"
                            {...otherProps}
                            sx={{ p: 1.5, borderBottom: '1px solid #f0f0f0' }}
                          >
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                                {option.firmaId}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#2c3e50' }}>
                                {option.tamUnvan}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Firma seçiniz..."
                          variant="outlined"
                          sx={{ backgroundColor: '#fff' }}
                        />
                      )}
                      clearOnEscape
                      autoHighlight
                      openOnFocus
                    />
                  </Box>
                </Box>
              </Grid>

              {/* SGK Sicil No */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 80 }}>
                    SGK Sicil No:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={formData.kunyeBilgileri?.sgkSicilNo || ''}
                    onChange={(e) => handleFieldChange('kunyeBilgileri.sgkSicilNo', e.target.value)}
                    placeholder="SGK sicil no..."
                    sx={{ backgroundColor: '#fff' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* 📊 YATIRIM İLE İLGİLİ BİLGİLER */}
        <Paper
          elevation={1}
          sx={{
            border: '1px solid #cbd5e1',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <Box sx={{
            backgroundColor: '#f1f5f9',
            p: 1.5,
            borderBottom: '1px solid #cbd5e1'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#334155' }}>
              Yatırım ile ilgili bilgiler
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {/* Sermaye Türü */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 100 }}>
                    Sermaye Türü:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    value={formData.kunyeBilgileri?.sermayeTuru || ''}
                    onChange={(e) => handleFieldChange('kunyeBilgileri.sermayeTuru', e.target.value)}
                    sx={{ backgroundColor: '#fff' }}
                  >
                    <MenuItem value="">Seçiniz...</MenuItem>
                    <MenuItem value="Tamamı Yerli Firma">Tamamı Yerli Firma</MenuItem>
                    <MenuItem value="Tamamı Yabancı Firma">Tamamı Yabancı Firma</MenuItem>
                    <MenuItem value="Karma">Karma</MenuItem>
                  </TextField>
                </Box>
              </Grid>

              {/* Yatırımın Konusu (Nace4) */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 150 }}>
                    Yatırımın Konusu (Nace4):
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.yatirimBilgileri1.yatirimKonusu}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.yatirimKonusu', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">OECD 4 haneli kodu seçiniz...</MenuItem>
                      {templateData.yatirimKonusuKodlari && templateData.yatirimKonusuKodlari.map((item) => (
                        <MenuItem key={item.kod} value={item.kod}>
                          {item.kod} - {item.tanim.substring(0, 60)}{item.tanim.length > 60 && '...'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Kararname Tarih/Sayı */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 150 }}>
                    Kararname Tarih/Sayı:
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.belgeYonetimi.dayandigiKanun}
                      onChange={(e) => handleFieldChange('belgeYonetimi.dayandigiKanun', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="29.05.2025 -2025/9903">29/5/2025 tarih ve 2025/9903 sayılı</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* İl */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 30 }}>
                    İl:
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <EnhancedCitySelector
                      selectedCity={formData.yatirimBilgileri2.yerinIl}
                      selectedDistrict={formData.yatirimBilgileri2.yerinIlce}
                      onCityChange={(city, cityCode) => handleFieldChange('yatirimBilgileri2.yerinIl', city)}
                      onDistrictChange={(district, districtCode) => handleFieldChange('yatirimBilgileri2.yerinIlce', district)}
                      cityLabel=""
                      districtLabel=""
                      size="small"
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Dinamik Yatırım Adresi Alanları - Başlangıç 1, Max 3 */}
              {Array.from({ length: adresSayisi }, (_, index) => (
                <Grid item xs={12} key={`adres-${index + 1}`}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, position: 'relative' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 50, pt: 1 }}>
                      {index === 0 ? 'Adres:' : `Adres ${index + 1}:`}
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      value={formData.yatirimBilgileri2[`yatirimAdresi${index + 1}`] || ''}
                      onChange={(e) => handleFieldChange(`yatirimBilgileri2.yatirimAdresi${index + 1}`, e.target.value)}
                      placeholder={`${index === 0 ? 'Ana' : index === 1 ? 'Ek' : 'Detay'} yatırım adresi...`}
                      sx={{ backgroundColor: '#fff' }}
                    />
                    {/* Remove butonu - sadece birden fazla alan varsa ve son elemanda göster */}
                    {adresSayisi > 1 && index === adresSayisi - 1 && (
                      <IconButton
                        onClick={removeAdresField}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: '#ff4444',
                          color: 'white',
                          width: 24,
                          height: 24,
                          '&:hover': { backgroundColor: '#cc0000' }
                        }}
                      >
                        <RemoveIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                </Grid>
              ))}

              {/* Adres Ekle butonu - max 3'e ulaşılmamışsa göster */}
              {adresSayisi < 3 && (
                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={addAdresField}
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{
                      height: 40,
                      borderColor: '#16a085',
                      color: '#16a085',
                      borderStyle: 'dashed',
                      '&:hover': {
                        borderColor: '#0d7377',
                        backgroundColor: '#f0f9f0'
                      }
                    }}
                  >
                    Adres Ekle ({adresSayisi}/3)
                  </Button>
                </Grid>
              )}

              {/* OSB Adı */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 60 }}>
                    Osb Adı:
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.yatirimBilgileri2.ossBelgeMudavimi || ''}
                      onChange={(e) => handleFieldChange('yatirimBilgileri2.ossBelgeMudavimi', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">OSB seçiniz...</MenuItem>
                      {osbListesi.map((osb) => (
                        <MenuItem key={`${osb.il}-${osb.osb}`} value={osb.osb}>
                          {osb.osb} ({osb.il})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* SB Adı */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 50 }}>
                    SB Adı:
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.yatirimBilgileri2.serbsetBolge || ''}
                      onChange={(e) => handleFieldChange('yatirimBilgileri2.serbsetBolge', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Serbest bölge seçiniz...</MenuItem>
                      {serbestBolgeler.map((bolge) => (
                        <MenuItem key={bolge.id} value={bolge.bolge}>
                          {bolge.bolge}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* İl Bazlı Bölgesi */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 100 }}>
                    İl Bazlı Bölgesi:
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.yatirimBilgileri2.ilBazliBolge || ''}
                      onChange={(e) => handleFieldChange('yatirimBilgileri2.ilBazliBolge', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Bölge seçiniz...</MenuItem>
                      {[1, 2, 3, 4, 5, 6].map((bolge) => (
                        <MenuItem key={bolge} value={`${bolge}. Bölge`}>{bolge}. Bölge</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* İlçe Bazlı Bölgesi */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 150, fontSize: '0.8rem' }}>
                    İlçe Bazlı Bölgesi (01.01.2021 ve sonrası):
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.yatirimBilgileri2.ilceBazliBolge || ''}
                      onChange={(e) => handleFieldChange('yatirimBilgileri2.ilceBazliBolge', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Bölge seçiniz...</MenuItem>
                      {[1, 2, 3, 4, 5, 6].map((bolge) => (
                        <MenuItem key={bolge} value={`${bolge}. Bölge`}>{bolge}. Bölge</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Mevcut İstihdam */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 110 }}>
                    Mevcut İstihdam:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={formData.istihdam.mevcutKisi}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === '') {
                        handleFieldChange('istihdam.mevcutKisi', '');
                      } else {
                        const numValue = parseInt(inputValue);
                        const safeValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
                        handleFieldChange('istihdam.mevcutKisi', safeValue);
                      }
                    }}
                    sx={{ backgroundColor: '#fff' }}
                  />
                </Box>
              </Grid>

              {/* İlave İstihdam */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 100 }}>
                    İlave İstihdam:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={formData.istihdam.ilaveKisi}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === '') {
                        handleFieldChange('istihdam.ilaveKisi', '');
                      } else {
                        const numValue = parseInt(inputValue);
                        const safeValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
                        handleFieldChange('istihdam.ilaveKisi', safeValue);
                      }
                    }}
                    sx={{ backgroundColor: '#fff' }}
                  />
                </Box>
              </Grid>

              {/* CİNS Alanları */}
              {Array.from({ length: cinsSayisi }, (_, index) => (
                <Grid item xs={12} md={6} key={`cins-${index + 1}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 70 }}>
                      Cins({index + 1}):
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={formData.yatirimBilgileri1[`cins${index + 1}`] || ''}
                        onChange={(e) => handleFieldChange(`yatirimBilgileri1.cins${index + 1}`, e.target.value)}
                        sx={{ backgroundColor: '#fff' }}
                      >
                        {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                          <MenuItem key={`cins${index + 1}-${tip.value}-${tipIndex}`} value={tip.value}>
                            {tip.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {cinsSayisi > 1 && index === cinsSayisi - 1 && (
                      <IconButton onClick={removeCinsField} size="small" sx={{ color: '#ef4444' }}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Grid>
              ))}
              {cinsSayisi < 4 && (
                <Grid item xs={12} md={6}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={addCinsField}
                    startIcon={<AddIcon />}
                    sx={{ borderStyle: 'dashed' }}
                  >
                    CİNS Ekle ({cinsSayisi}/4)
                  </Button>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>
      </Grid>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* SAĞ KOLON: BELGE İLE İLGİLİ BİLGİLER */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <Grid item xs={12} lg={6}>
        <Paper
          elevation={1}
          sx={{
            border: '1px solid #cbd5e1',
            borderRadius: 1,
            overflow: 'hidden',
            height: '100%'
          }}
        >
          <Box sx={{
            backgroundColor: '#fef3c7',
            p: 1.5,
            borderBottom: '1px solid #f59e0b'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#92400e' }}>
              Belge ile ilgili bilgiler
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              {/* Belge Id */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 80, flexShrink: 0 }}>
                    Belge Id:
                  </Typography>
                  <TextField
                    size="small"
                    value={formData.belgeYonetimi.belgeId}
                    onChange={(e) => handleFieldChange('belgeYonetimi.belgeId', e.target.value)}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 120 }}
                  />
                </Box>
              </Grid>

              {/* Belge No */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 80, flexShrink: 0 }}>
                    Belge No:
                  </Typography>
                  <TextField
                    size="small"
                    value={formData.belgeYonetimi.belgeNo}
                    onChange={(e) => handleFieldChange('belgeYonetimi.belgeNo', e.target.value)}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 120 }}
                  />
                </Box>
              </Grid>

              {/* Belge Tarihi */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 90, flexShrink: 0 }}>
                    Belge Tarihi:
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    value={formData.belgeYonetimi.belgeTarihi}
                    onChange={(e) => handleFieldChange('belgeYonetimi.belgeTarihi', e.target.value)}
                    onPaste={(e) => handleDatePaste(e, 'belgeYonetimi.belgeTarihi')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 140, '& input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
                  />
                </Box>
              </Grid>

              {/* Müracaat Tarihi */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 110, flexShrink: 0 }}>
                    Müracaat Tarihi:
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    value={formData.belgeYonetimi.belgeMuracaatTarihi}
                    onChange={(e) => handleFieldChange('belgeYonetimi.belgeMuracaatTarihi', e.target.value)}
                    onPaste={(e) => handleDatePaste(e, 'belgeYonetimi.belgeMuracaatTarihi')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 140, '& input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
                  />
                </Box>
              </Grid>

              {/* Müracaat Sayısı */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 110, flexShrink: 0 }}>
                    Müracaat Sayısı:
                  </Typography>
                  <TextField
                    size="small"
                    value={formData.belgeYonetimi.belgeMuracaatNo}
                    onChange={(e) => handleFieldChange('belgeYonetimi.belgeMuracaatNo', e.target.value)}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 100 }}
                  />
                </Box>
              </Grid>

              {/* Belge Başlama Tarihi */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 130, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Belge Başlama Tarihi:
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    value={formData.belgeYonetimi.belgeBaslamaTarihi}
                    onChange={(e) => handleFieldChange('belgeYonetimi.belgeBaslamaTarihi', e.target.value)}
                    onPaste={(e) => handleDatePaste(e, 'belgeYonetimi.belgeBaslamaTarihi')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 140, '& input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
                  />
                </Box>
              </Grid>

              {/* Belge Bitiş Tarihi */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 115, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Belge Bitiş Tarihi:
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    value={formData.belgeYonetimi.belgeBitisTarihi}
                    onChange={(e) => handleFieldChange('belgeYonetimi.belgeBitisTarihi', e.target.value)}
                    onPaste={(e) => handleDatePaste(e, 'belgeYonetimi.belgeBitisTarihi')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 140, '& input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
                  />
                </Box>
              </Grid>

              {/* Süre Uzatım Tarihi */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 120, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Süre Uzatım Tarihi:
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    value={formData.belgeYonetimi.uzatimTarihi}
                    onChange={(e) => handleFieldChange('belgeYonetimi.uzatimTarihi', e.target.value)}
                    onPaste={(e) => handleDatePaste(e, 'belgeYonetimi.uzatimTarihi')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 140, '& input': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
                  />
                </Box>
              </Grid>

              {/* OECD (Orta-Yüksek) */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 110, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    OECD (Orta-Yüksek):
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                    <Select
                      value={formData.yatirimBilgileri1.oecdKategori || ''}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.oecdKategori', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      {templateData.oecdKategorileri?.map((kat) => (
                        <MenuItem key={(kat.value || kat.kod)} value={(kat.value || kat.kod)}>
                          {kat.label || kat.aciklama}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Destekleme Sınıfı */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 120, flexShrink: 0 }}>
                    Destekleme Sınıfı:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                    <Select
                      value={formData.yatirimBilgileri1.destekSinifi}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.destekSinifi', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      {templateData.destekSiniflari?.map((sinif) => (
                        <MenuItem key={sinif.value} value={sinif.value}>
                          {sinif.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Öncelikli Yatırım */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 110, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Öncelikli Yatırım:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                    <Select
                      value={formData.belgeYonetimi.oncelikliYatirim || ''}
                      onChange={(e) => {
                        handleFieldChange('belgeYonetimi.oncelikliYatirim', e.target.value);
                        if (e.target.value === 'hayır' || e.target.value === '') {
                          handleFieldChange('belgeYonetimi.oncelikliYatirimTuru', '');
                        }
                      }}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayır">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Büyük Ölçekli */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 90, flexShrink: 0 }}>
                    Büyük Ölçekli:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                    <Select
                      value={formData.yatirimBilgileri1.buyukOlcekli || ''}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.buyukOlcekli', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayir">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Cazibe Merkezi Mi */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 120, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Cazibe Merkezi Mi:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                    <Select
                      value={formData.yatirimBilgileri1.cazibeMerkeziMi}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.cazibeMerkeziMi', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayir">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Ada */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 40, flexShrink: 0 }}>
                    Ada:
                  </Typography>
                  <TextField
                    size="small"
                    value={formData.yatirimBilgileri2.ada || ''}
                    onChange={(e) => handleFieldChange('yatirimBilgileri2.ada', e.target.value)}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 80 }}
                  />
                </Box>
              </Grid>

              {/* Parsel */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 50, flexShrink: 0 }}>
                    Parsel:
                  </Typography>
                  <TextField
                    size="small"
                    value={formData.yatirimBilgileri2.parsel || ''}
                    onChange={(e) => handleFieldChange('yatirimBilgileri2.parsel', e.target.value)}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 80 }}
                  />
                </Box>
              </Grid>

              {/* Belge Müracaat Talep Tipi */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 160, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Belge Müracaat Talep Tipi:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                    <Select
                      value={formData.kunyeBilgileri?.talepSonuc || ''}
                      onChange={(e) => handleFieldChange('kunyeBilgileri.talepSonuc', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="Taslak">TASLAK</MenuItem>
                      <MenuItem value="Talep">TALEP</MenuItem>
                      <MenuItem value="Sonuç">YATIRIM TEŞVİK BELGESİ</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Enerji Üretim Kaynağı */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 130, flexShrink: 0, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Enerji Üretim Kaynağı:
                  </Typography>
                  <TextField
                    size="small"
                    value={formData.yatirimBilgileri1.enerjiUretimKaynagi}
                    onChange={(e) => handleFieldChange('yatirimBilgileri1.enerjiUretimKaynagi', e.target.value)}
                    sx={{ backgroundColor: '#fff', flex: 1, minWidth: 150 }}
                  />
                </Box>
              </Grid>

              {/* Cazibe Merkezi (2018/11201) */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: { xs: 140, sm: 170 }, flexShrink: 0, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Cazibe Merkezi Mi? (2018/11201):
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                    <Select
                      value={formData.yatirimBilgileri1.cazibeMerkezi2018}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.cazibeMerkezi2018', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayir">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Cazibe Merkezi Deprem Nedeni */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: { xs: 150, sm: 180 }, flexShrink: 0, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Cazibe Merkezi Deprem Nedeni:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                    <Select
                      value={formData.yatirimBilgileri1.cazibeMerkeziDeprem}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.cazibeMerkeziDeprem', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayir">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* HAMLE MI? */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 80, flexShrink: 0 }}>
                    HAMLE MI?:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                    <Select
                      value={formData.yatirimBilgileri1.hamleMi}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.hamleMi', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayir">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Vergi İndirimsiz Destek Talebi */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: { xs: 150, sm: 180 }, flexShrink: 0, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Vergi İndirimsiz Destek Talebi:
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                    <Select
                      value={formData.yatirimBilgileri1.vergiIndirimsizDestekTalebi || ''}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.vergiIndirimsizDestekTalebi', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayir">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Savunma Sanayi Projesi */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', minWidth: 150, fontSize: '0.75rem' }}>
                    Savunma Sanayi Projesi Mi?:
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.yatirimBilgileri1.savunmaSanayiProjesi}
                      onChange={(e) => handleFieldChange('yatirimBilgileri1.savunmaSanayiProjesi', e.target.value)}
                      sx={{ backgroundColor: '#fff' }}
                    >
                      <MenuItem value="">Seçiniz...</MenuItem>
                      <MenuItem value="evet">EVET</MenuItem>
                      <MenuItem value="hayir">HAYIR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  // 🏢 renderYatirimBilgileri fonksiyonu kaldırıldı - Künye sayfasına entegre edildi
  // DEPRECATED - Tüm yatırım bilgileri artık renderKunyeBilgileri içinde tek sayfada gösteriliyor
  const renderYatirimBilgileri_DEPRECATED = () => null;

  // ESKİ YATIRIM BİLGİLERİ KALDIRILDI - renderKunyeBilgileri'ne entegre edildi
  const OLD_CODE_REMOVED_PLACEHOLDER = () => (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Typography>Eski yatırım bilgileri kaldırıldı - renderKunyeBilgileri içinde gösteriliyor.</Typography>
      </Grid>
    </Grid>
  );

  // 📦 4. ÜRÜN BİLGİLERİ (US97 Kodları) - MINIMAL CORPORATE DESIGN
  const renderUrunBilgileri = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        {/* US97 Ürün Yönetim Paneli - Minimal Tasarım */}
        <Box sx={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          mb: 2,
          p: 2
        }}>
          <Box>
            {/* Ana Başlık */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px'
                }}>
                  📦
                </Box>
                <Box>
                  <Typography variant="h6" sx={{
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '1.25rem',
                    mb: 0
                  }}>
                    US97 Ürün Yönetim Paneli
                  </Typography>
                  <Typography variant="body2" sx={{
                    color: '#64748b',
                    fontWeight: 400
                  }}>
                    Ürün Bilgileri Yönetimi
                  </Typography>
                </Box>
              </Box>

              {/* Aktif Ürünler Sayacı */}
              <Box sx={{
                backgroundColor: '#dbeafe',
                borderRadius: 1,
                px: 2,
                py: 1,
                textAlign: 'center',
                border: '1px solid #bfdbfe'
              }}>
                <Typography variant="h6" sx={{ color: '#1e40af', fontWeight: 600, mb: 0 }}>
                  {formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.kod).length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#3b82f6' }}>
                  Aktif Ürünler
                </Typography>
              </Box>
            </Box>

            {/* İstatistikler */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {[
                { label: 'Kapasite Slotları', value: `${urunSayisi}/10` },
                { label: 'Kod Veritabanı', value: '2742 Öğe' },
                { label: 'Tamamlanan', value: `${formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.kod && u.aciklama).length}` },
                { label: 'Portföy Değeri', value: `${(formData.urunBilgileri.slice(0, urunSayisi).reduce((sum, u) => sum + (parseFloat(u.toplam) || 0), 0) / 1000000).toFixed(1)}M` }
              ].map((stat, index) => (
                <Box key={index} sx={{
                  flex: 1,
                  backgroundColor: 'white',
                  borderRadius: 1,
                  p: 1.5,
                  textAlign: 'center',
                  border: '1px solid #e2e8f0'
                }}>
                  <Typography variant="subtitle1" sx={{ color: '#1e293b', fontWeight: 600, mb: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* İşlem Butonları */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyTableData}
                variant="outlined"
                sx={{
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  fontWeight: 500,
                  py: 1,
                  px: 2,
                  '&:hover': {
                    borderColor: '#3b82f6',
                    backgroundColor: '#f1f5f9'
                  }
                }}
              >
                Akıllı Kopyala
              </Button>

              <Button
                startIcon={<CloudUploadIcon />}
                onClick={() => {
                  const urunData = formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.kod);
                  if (urunData.length === 0) {
                    alert('⚠️ Önce ürün bilgilerini ekleyin!');
                    return;
                  }

                  const excelData = [
                    ['US97 Kodu', 'Ürün Açıklaması', 'Mevcut Kapasite', 'İlave Kapasite', 'Toplam Kapasite', 'Birim', 'Oluşturulma Tarihi', 'Durum'],
                    ...urunData.map(urun => [
                      urun.kod || '',
                      urun.aciklama || '',
                      (parseFloat(urun.mevcut) || 0).toLocaleString('tr-TR'),
                      (parseFloat(urun.ilave) || 0).toLocaleString('tr-TR'),
                      (parseFloat(urun.toplam) || 0).toLocaleString('tr-TR'),
                      urun.kapasite_birimi || '',
                      new Date().toLocaleDateString('tr-TR'),
                      urun.kod && urun.aciklama ? 'Tamamlandı' : 'Eksik'
                    ])
                  ];

                  const csvContent = '\uFEFF' + excelData.map(row => row.join(';')).join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `US97_Enterprise_Export_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                }}
                variant="contained"
                sx={{
                  backgroundColor: '#22c55e',
                  color: 'white',
                  fontWeight: 500,
                  py: 1,
                  px: 2,
                  '&:hover': {
                    backgroundColor: '#16a34a'
                  }
                }}
              >
                Excel İndir
              </Button>

              <Button
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (window.confirm('Bu işlem TÜM ürün verilerini silecek. Emin misiniz?')) {
                    handleClearAllUrunData();
                  }
                }}
                variant="outlined"
                sx={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  fontWeight: 500,
                  py: 1,
                  px: 2,
                  '&:hover': {
                    borderColor: '#dc2626',
                    backgroundColor: '#fef2f2'
                  }
                }}
              >
                Tümünü Temizle
              </Button>

              {/* Akıllı Şablon butonu kaldırıldı - daha sade arayüz için */}
            </Box>
          </Box>
        </Box>
      </Grid>

      <Grid item xs={12}>
        {/* 🎯 ULTRA-MODERN CARD-BASED PRODUCT INTERFACE */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 📊 PROFESSIONAL HEADER BAR */}
          <Box sx={{
            background: 'linear-gradient(90deg, #f8fafc 0%, #e2e8f0 100%)',
            borderRadius: 2,
            p: 2,
            border: '1px solid #e2e8f0'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>
                Ürün Portföyü ({formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.kod).length}/{urunSayisi})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`${formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.kod && u.aciklama).length} Tamamlandı`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`${(formData.urunBilgileri.slice(0, urunSayisi).reduce((sum, u) => sum + (parseFloat(u.toplam) || 0), 0) / 1000).toFixed(0)}K Toplam`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>

          {/* 🚀 ENTERPRISE PRODUCT CARDS */}
          {formData.urunBilgileri.slice(0, urunSayisi).map((urun, index) => (
            <Card
              key={`product-card-${index}`}
              sx={{
                background: urun.kod ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                border: urun.kod ? '2px solid #e2e8f0' : '2px dashed #d1d5db',
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: urun.kod ? '#3b82f6' : '#6b7280',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* 🏷️ CARD HEADER */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 3,
                      background: urun.kod ? 'linear-gradient(45deg, #3b82f6, #1d4ed8)' : 'linear-gradient(45deg, #9ca3af, #6b7280)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.2rem'
                    }}>
                      {index + 1}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        Ürün #{index + 1}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Durum: {urun.kod && urun.aciklama ? '✅ Tamamlandı' : '⏳ Eksik'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* 🗑️ DELETE BUTTON */}
                  {urunSayisi > 1 && index === urunSayisi - 1 && (
                    <IconButton
                      onClick={removeUrunField}
                      sx={{
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        '&:hover': {
                          backgroundColor: '#fee2e2',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <RemoveIcon />
                    </IconButton>
                  )}
                </Box>

                {/* 📋 PRODUCT INFO GRID */}
                <Grid container spacing={3}>
                  {/* 🔍 US97 CODE SEARCH */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ color: '#374151', fontWeight: 600, mb: 1 }}>
                      🏷️ NACE Ürün Kodu
                    </Typography>
                    <NaceSuperSearch
                      value={urun.kod || ''}
                      onChange={(selectedKod, selectedAciklama) => {
                        handleUrunChange(index, 'kod', selectedKod);
                        // 🎯 AUTO DESCRIPTION FILL
                        if (selectedKod && selectedAciklama) {
                          handleUrunChange(index, 'aciklama', selectedAciklama);
                        } else if (!selectedKod) {
                          handleUrunChange(index, 'aciklama', '');
                        }
                      }}
                      size="medium"
                      placeholder="NACE kodları ara..."
                    />
                  </Grid>

                  {/* 📝 PRODUCT DESCRIPTION */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ color: '#374151', fontWeight: 600, mb: 1 }}>
                      📝 Ürün Açıklaması
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={urun.aciklama}
                      onChange={(e) => handleUrunChange(index, 'aciklama', e.target.value)}
                      placeholder="Kod seçtiğinizde ürün açıklaması otomatik doldurulacak..."
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#ffffff',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: '#e5e7eb'
                          },
                          '&:hover fieldset': {
                            borderColor: '#d1d5db'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#3b82f6',
                            borderWidth: '2px'
                          }
                        }
                      }}
                    />
                  </Grid>

                  {/* 💼 KAPASİTE & DURUM - TEK SATIR PROFESYONEL DÜZEN */}
                  <Grid item xs={12}>
                    <Box sx={{
                      background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)',
                      borderRadius: 2,
                      p: 2,
                      border: '1px solid #e2e8f0',
                      mt: 1
                    }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}>
                        {/* Mevcut Kapasite */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Mevcut:
                          </Typography>
                          <TextField
                            size="small"
                            type="text"
                            value={formatNumber(urun.mevcut)}
                            onChange={(e) => handleNumberChange(e, `urunBilgileri.${index}.mevcut`)}
                            placeholder="0"
                            variant="outlined"
                            inputProps={{
                              style: {
                                textAlign: 'right',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                padding: '6px 8px',
                                fontFamily: 'monospace',
                                width: '90px'
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#ffffff',
                                borderRadius: 1,
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#3b82f6' },
                                '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
                              }
                            }}
                          />
                        </Box>

                        {/* İlave Kapasite */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 130 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            İlave:
                          </Typography>
                          <TextField
                            size="small"
                            type="text"
                            value={formatNumber(urun.ilave)}
                            onChange={(e) => handleNumberChange(e, `urunBilgileri.${index}.ilave`)}
                            placeholder="0"
                            variant="outlined"
                            inputProps={{
                              style: {
                                textAlign: 'right',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                padding: '6px 8px',
                                fontFamily: 'monospace',
                                width: '90px'
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#ffffff',
                                borderRadius: 1,
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#10b981' },
                                '&.Mui-focused fieldset': { borderColor: '#10b981', borderWidth: '2px' }
                              }
                            }}
                          />
                        </Box>

                        {/* Toplam Kapasite */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
                          <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            Toplam:
                          </Typography>
                          <TextField
                            size="small"
                            type="text"
                            value={formatNumber(urun.toplam)}
                            InputProps={{
                              readOnly: true,
                              style: {
                                textAlign: 'right',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                padding: '6px 8px',
                                fontFamily: 'monospace',
                                color: '#059669',
                                width: '100px'
                              }
                            }}
                            variant="outlined"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                                borderRadius: 1,
                                '& fieldset': { borderColor: '#10b981', borderWidth: '2px' }
                              }
                            }}
                          />
                        </Box>

                        {/* Ayırıcı */}
                        <Box sx={{ borderLeft: '2px solid #e2e8f0', height: 32, mx: 1 }} />

                        {/* Kapasite Birimi */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Birim:
                          </Typography>
                          <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                              value={urun.kapasite_birimi || ''}
                              onChange={(e) => handleUrunChange(index, 'kapasite_birimi', e.target.value)}
                              displayEmpty
                              variant="outlined"
                              sx={{
                                backgroundColor: '#ffffff',
                                borderRadius: 1,
                                '& .MuiSelect-select': { py: 0.75, fontSize: '0.85rem' },
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#f59e0b' },
                                '&.Mui-focused fieldset': { borderColor: '#f59e0b', borderWidth: '2px' }
                              }}
                            >
                              <MenuItem value="">
                                <em style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Seçin...</em>
                              </MenuItem>
                              {kapasiteBirimleri?.map((birim) => (
                                <MenuItem key={birim} value={birim} sx={{ fontSize: '0.85rem' }}>
                                  {birim}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>

                        {/* Ayırıcı */}
                        <Box sx={{ borderLeft: '2px solid #e2e8f0', height: 32, mx: 1 }} />

                        {/* Tamamlanma Durumu */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {urun.kod && urun.aciklama ? (
                            <Chip
                              label="✅ Tamamlandı"
                              color="success"
                              variant="filled"
                              size="small"
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                          ) : (
                            <Chip
                              label="⏳ Eksik"
                              color="warning"
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* 🎛️ ULTRA-MODERN CONTROL PANEL */}
        <Box sx={{
          mt: 3,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: 3,
          p: 3,
          border: '2px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* ➕ ADD PRODUCT SECTION */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {urunSayisi < 10 ? (
                <Button
                  variant="contained"
                  onClick={addUrunField}
                  startIcon={<AddIcon />}
                  size="large"
                  sx={{
                    background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    fontWeight: 600,
                    py: 1.5,
                    px: 3,
                    borderRadius: 2,
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1d4ed8, #1e40af)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 8px 25px rgba(59, 130, 246, 0.6)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Ürün Ekle ({urunSayisi}/10)
                </Button>
              ) : (
                <Box sx={{
                  background: 'linear-gradient(45deg, #ef4444, #dc2626)',
                  color: 'white',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600
                }}>
                  🚫 Maksimum 10 ürün limiti
                </Box>
              )}
            </Box>

            {/* 📊 ADVANCED STATISTICS */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={`✅ Aktif: ${formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.kod).length}`}
                color="success"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`📝 Tamamlandı: ${formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.kod && u.aciklama).length}`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`💰 Portföy: ${(formData.urunBilgileri.slice(0, urunSayisi).reduce((sum, u) => sum + (parseFloat(u.toplam) || 0), 0) / 1000000).toFixed(1)}M`}
                color="warning"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  // 🎯 3. DESTEK UNSURLARI - Dinamik Sistem
  const renderDestekUnsurlari = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          🎯 Destek Unsurları
          <Chip
            label={`${destekSayisi}/8 Satır`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Dinamik sistem: İhtiyacınıza göre maksimum 8 destek unsuru satırı ekleyebilirsiniz - CSV'den {templateData.destekUnsurlariOptions?.length || 0} destek türü mevcut
        </Typography>
      </Grid>

      {/* Kategori İstatistikleri */}
      <Grid item xs={12}>
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['Sigorta', 'Vergi', 'Gümrük', 'Finansal', 'Yer'].map((kategori) => {
            const count = templateData.destekUnsurlariOptions?.filter(d => d.kategori === kategori).length || 0;
            return count > 0 ? (
              <Chip
                key={kategori}
                label={`${kategori} (${count})`}
                size="small"
                variant="outlined"
                color="primary"
              />
            ) : null;
          })}
        </Box>
      </Grid>

      {/* Dinamik Destek Unsuru Kartları */}
      {formData.destekUnsurlari.slice(0, destekSayisi).map((destek, index) => (
        <Grid item xs={12} key={`destek-${index}`}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              backgroundColor: index % 2 === 0 ? '#fdf2f8' : '#f0f9ff',
              border: '2px solid',
              borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6',
              borderRadius: 3,
              position: 'relative'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: index % 2 === 0 ? '#be185d' : '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                🎯 Destek Unsuru ({index + 1})
                {destekSayisi > 1 && index === destekSayisi - 1 && (
                  <IconButton
                    onClick={removeDestekField}
                    size="small"
                    sx={{
                      backgroundColor: '#ff4444',
                      color: 'white',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        backgroundColor: '#cc0000'
                      }
                    }}
                  >
                    <RemoveIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Destek Unsuru Seçimi - DİNAMİK VERİ DESTEKLİ */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  value={destek.destekUnsuru || ''}
                  onChange={(event, newValue) => {
                    if (newValue && typeof newValue === 'object') {
                      // Seçeneklerden biri seçildi
                      handleDestekChange(index, 'destekUnsuru', newValue.value);
                    } else if (newValue && typeof newValue === 'string') {
                      // Yeni değer girdi
                      handleDestekChange(index, 'destekUnsuru', newValue);

                      // Sadece mevcut listede YOKSA ekle (duplicate önleme)
                      const exists = templateData.destekUnsurlariOptions?.some(option =>
                        (typeof option === 'string' ? option : option.value || option.label) === newValue.trim()
                      );
                      if (!exists && newValue.trim().length >= 3) {
                        addNewDestekUnsuru(newValue.trim());
                      }
                    } else {
                      // Temizlendi
                      handleDestekChange(index, 'destekUnsuru', '');
                    }
                  }}
                  options={templateData.destekUnsurlariOptions || []}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.label || option.value || '';
                  }}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={`destek-${option.value || option.label}-${Math.random()}`} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={option.kategori}
                          size="small"
                          sx={{
                            backgroundColor: option.renk || '#6B7280',
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.875rem' }}>{option.label}</span>
                          {option.isDynamic && <Chip label="Özel" size="small" color="primary" sx={{ ml: 1 }} />}
                        </div>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Destek Unsuru 🏛️"
                      placeholder="Destek türü seçin veya yeni ekleyin..."
                      sx={{
                        backgroundColor: '#ffffff',
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6'
                          }
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Şartları Seçimi - DİNAMİK VERİ DESTEKLİ */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  value={destek.sartlari || ''}
                  onChange={(event, newValue) => {
                    if (newValue && typeof newValue === 'object') {
                      // Seçeneklerden biri seçildi
                      handleDestekChange(index, 'sartlari', newValue.value);
                    } else if (newValue && typeof newValue === 'string') {
                      // Yeni değer girdi
                      handleDestekChange(index, 'sartlari', newValue);

                      // Sadece mevcut listede YOKSA ekle (duplicate önleme)
                      const exists = templateData.destekSartlariOptions?.some(option =>
                        (typeof option === 'string' ? option : option.value || option.label) === newValue.trim()
                      );
                      if (!exists && newValue.trim().length >= 3) {
                        addNewDestekSarti(newValue.trim());
                      }
                    } else {
                      // Temizlendi
                      handleDestekChange(index, 'sartlari', '');
                    }
                  }}
                  options={templateData.destekSartlariOptions || []}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.label || option.value || '';
                  }}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={`sart-${option.value || option.label}-${Math.random()}`} {...otherProps} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{option.label}</span>
                          {option.isDynamic && <Chip label="Özel" size="small" color="primary" sx={{ ml: 1 }} />}
                        </div>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={option.kategori} size="small" variant="outlined" />
                          {option.yuzde && <Chip label={`%${option.yuzde}`} size="small" color="success" />}
                          {option.yil && <Chip label={`${option.yil} yıl`} size="small" color="info" />}
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Şartları ⚖️"
                      placeholder="Şart seçin veya yeni ekleyin..."
                      sx={{
                        backgroundColor: '#ffffff',
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6'
                          }
                        }
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      ))}

      {/* Add Destek Unsuru Butonu */}
      {destekSayisi < 8 && (
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={addDestekField}
              startIcon={<AddIcon />}
              sx={{
                borderColor: '#ec4899',
                color: '#ec4899',
                borderStyle: 'dashed',
                py: 1.5,
                px: 4,
                '&:hover': {
                  borderColor: '#be185d',
                  backgroundColor: '#fdf2f8'
                }
              }}
            >
              Destek Unsuru Ekle ({destekSayisi}/8)
            </Button>
          </Box>
        </Grid>
      )}



      {/* İstatistikler */}
      <Grid item xs={12}>
        <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            💡 <strong>Aktif Satır:</strong> {destekSayisi}/8 |
            <strong> Destek Doldurulmuş:</strong> {formData.destekUnsurlari.slice(0, destekSayisi).filter(d => d.destekUnsuru).length} |
            <strong> Şart Doldurulmuş:</strong> {formData.destekUnsurlari.slice(0, destekSayisi).filter(d => d.sartlari).length} |
            <strong> CSV'den Seçenek:</strong> {templateData.destekUnsurlariOptions?.length || 0} destek, {templateData.destekSartlariOptions?.length || 0} şart
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );

  // 🏷️ 4. ÖZEL ŞARTLAR - Excel Benzeri 7 Alan
  const renderOzelSartlar = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          🏷️ Özel Şartlar
          <Chip
            label={`${ozelSartSayisi} Satır`}
            size="small"
            color="warning"
            variant="outlined"
          />
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Dinamik sistem: İhtiyacınıza göre sınırsız özel şart satırı ekleyebilirsiniz - CSV'den {templateData.ozelSartKisaltmalari?.length || 0} kısaltma mevcut
        </Typography>
      </Grid>

      {/* Kategori İstatistikleri */}
      <Grid item xs={12}>
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['SGK', 'Bölge', 'Sigorta', 'Finansal', 'Zorunluluk', 'Ruhsat'].map((kategori) => {
            const count = templateData.ozelSartKisaltmalari?.filter(k => k.kategori?.includes(kategori) || k.kategori === kategori).length || 0;
            return count > 0 ? (
              <Chip
                key={kategori}
                label={`${kategori} (${count})`}
                size="small"
                variant="outlined"
                color="warning"
              />
            ) : null;
          })}
        </Box>
      </Grid>

      {/* Dinamik Özel Şart Kartları */}
      {formData.ozelSartlar.slice(0, ozelSartSayisi).map((sart, index) => (
        <Grid item xs={12} key={`ozel-sart-${index}`}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              backgroundColor: index % 2 === 0 ? '#fff7ed' : '#fef3f2',
              border: '2px solid',
              borderColor: index % 2 === 0 ? '#ea580c' : '#f97316',
              borderRadius: 3,
              position: 'relative'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: index % 2 === 0 ? '#ea580c' : '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                🏷️ Özel Şart ({index + 1})
                {ozelSartSayisi > 1 && index === ozelSartSayisi - 1 && (
                  <IconButton
                    onClick={removeOzelSartField}
                    size="small"
                    sx={{
                      backgroundColor: '#ff4444',
                      color: 'white',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        backgroundColor: '#cc0000'
                      }
                    }}
                  >
                    <RemoveIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {/* Özel Şart Kısaltma Seçimi - DİNAMİK VERİ DESTEKLİ */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  value={sart.kisaltma || ''}
                  onChange={(event, newValue) => {
                    if (newValue && typeof newValue === 'object') {
                      // Seçeneklerden biri seçildi
                      handleOzelSartChange(index, 'kisaltma', newValue.value);
                    } else if (newValue && typeof newValue === 'string') {
                      // Yeni değer girdi
                      handleOzelSartChange(index, 'kisaltma', newValue);

                      // Sadece mevcut listede YOKSA ekle (duplicate önleme)
                      const exists = templateData.ozelSartKisaltmalari?.some(option =>
                        (typeof option === 'string' ? option : option.value || option.label) === newValue.trim()
                      );
                      if (!exists && newValue.trim().length >= 2) {
                        addNewOzelSart(newValue.trim());
                      }
                    } else {
                      // Temizlendi
                      handleOzelSartChange(index, 'kisaltma', '');
                    }
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    // FreeSolo için: Kullanıcı yazarken veya blur olduğunda değeri kaydet
                    if (reason === 'input' || reason === 'clear') {
                      handleOzelSartChange(index, 'kisaltma', newInputValue || '');
                    }
                  }}
                  onBlur={(event) => {
                    // Blur olduğunda mevcut input değerini kaydet (freeSolo için kritik)
                    const inputValue = event.target.value;
                    if (inputValue && inputValue.trim()) {
                      handleOzelSartChange(index, 'kisaltma', inputValue.trim());
                    }
                  }}
                  options={templateData.ozelSartKisaltmalari || []}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.label || option.value || '';
                  }}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={`kisaltma-${option.value || option.label}-${Math.random()}`} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={option.kategori}
                          size="small"
                          sx={{ backgroundColor: option.renk || '#6B7280', color: 'white', fontSize: '0.7rem' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.875rem' }}>{option.label}</span>
                          {option.isDynamic && <Chip label="Özel" size="small" color="primary" sx={{ ml: 1 }} />}
                        </div>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Özel Şart Kısaltma"
                      placeholder="Kısaltma seçin veya yeni ekleyin (örn: Nakil, Ruhsat)..."
                      sx={{
                        backgroundColor: '#ffffff',
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                          }
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Özel Şart Notu Seçimi - DİNAMİK VERİ DESTEKLİ */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  value={sart.notu || ''}
                  onChange={(event, newValue) => {
                    if (newValue && typeof newValue === 'object') {
                      // Seçeneklerden biri seçildi
                      handleOzelSartChange(index, 'notu', newValue.value);
                    } else if (newValue && typeof newValue === 'string') {
                      // Yeni değer girdi
                      handleOzelSartChange(index, 'notu', newValue);

                      // Sadece mevcut listede YOKSA ekle (duplicate önleme)
                      const exists = templateData.ozelSartNotlari?.some(option =>
                        (typeof option === 'string' ? option : option.value || option.label) === newValue.trim()
                      );
                      if (!exists && newValue.trim().length >= 3) {
                        addNewOzelSartNotu(newValue.trim());
                      }
                    } else {
                      // Temizlendi
                      handleOzelSartChange(index, 'notu', '');
                    }
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    // FreeSolo için: Kullanıcı yazarken veya blur olduğunda değeri kaydet
                    if (reason === 'input' || reason === 'clear') {
                      handleOzelSartChange(index, 'notu', newInputValue || '');
                    }
                  }}
                  onBlur={(event) => {
                    // Blur olduğunda mevcut input değerini kaydet (freeSolo için kritik)
                    const inputValue = event.target.value;
                    if (inputValue && inputValue.trim()) {
                      handleOzelSartChange(index, 'notu', inputValue.trim());
                    }
                  }}
                  options={templateData.ozelSartNotlari || []}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.label || option.value || '';
                  }}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={`notu-${option.value || option.label || option}-${Math.random()}`} {...otherProps}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{typeof option === 'string' ? option : option.label}</span>
                          {option.isDynamic && <Chip label="Özel" size="small" color="primary" sx={{ ml: 1 }} />}
                        </div>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Özel Şart Notu / Açıklama 📝"
                      placeholder="Açıklama yazın veya seçin..."
                      sx={{
                        backgroundColor: '#ffffff',
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                          }
                        }
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      ))}

      {/* Add Özel Şart Butonu */}
      {true && (
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={addOzelSartField}
              startIcon={<AddIcon />}
              sx={{
                borderColor: '#ea580c',
                color: '#ea580c',
                borderStyle: 'dashed',
                py: 1.5,
                px: 4,
                '&:hover': {
                  borderColor: '#c2410c',
                  backgroundColor: '#fff7ed'
                }
              }}
            >
              Özel Şart Ekle ({ozelSartSayisi})
            </Button>
          </Box>
        </Grid>
      )}

      {/* İstatistikler */}
      <Grid item xs={12}>
        <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            🏷️ <strong>Aktif Satır:</strong> {ozelSartSayisi} |
            <strong> Kısaltma Doldurulmuş:</strong> {formData.ozelSartlar.slice(0, ozelSartSayisi).filter(s => s.kisaltma).length} |
            <strong> Not Doldurulmuş:</strong> {formData.ozelSartlar.slice(0, ozelSartSayisi).filter(s => s.notu).length} |
            <strong> CSV'den Seçenek:</strong> {templateData.ozelSartKisaltmalari?.length || 0} kısaltma, {templateData.ozelSartNotlari?.length || 0} not
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );



  // Finansal bilgiler handler - Excel yapısına uygun + Smart Input Management
  const handleFinansalChange = (section, field, value, subField = null) => {
    setFormData(prev => {
      const newData = { ...prev };

      if (subField) {
        // İç içe alanlar için (örn: araziArsaBedeli.aciklama)
        newData.finansalBilgiler[section][field][subField] = value;
      } else if (field.includes('.')) {
        // Noktalı alan adları için (örn: finansman.yabanciKaynaklar)
        const parts = field.split('.');
        let current = newData.finansalBilgiler[section];
        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        // Basit alanlar için
        newData.finansalBilgiler[section][field] = value;
      }

      return newData;
    });

    // 🔧 Hesaplamalar useEffect ile tetiklenecek - infinite loop önlenir
  };

  // Kullanılmayan fonksiyonlar kaldırıldı - handleNumberChange kullanılıyor

  // 🔧 Finansal otomatik hesaplamalar - DEVLET SİSTEMİ MANTIGI
  const calculateFinansalTotals = useCallback(() => {
    if (!formData.finansalBilgiler) return null; // Safety check

    const finansal = formData.finansalBilgiler;

    // Güvenli sayı dönüştürme fonksiyonu
    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    // 1. Arazi-Arsa Bedeli hesapla
    const araziTotal = toNumber(finansal.araziArsaBedeli?.metrekaresi) * toNumber(finansal.araziArsaBedeli?.birimFiyatiTl);

    // 2. Toplam Bina İnşaat Gideri hesapla
    const anaBina = toNumber(finansal.binaInsaatGiderleri?.anaBinaVeTesisleri);
    const yardimciBina = toNumber(finansal.binaInsaatGiderleri?.yardimciIsBinaVeIcareBinalari);
    const yeraltiBina = toNumber(finansal.binaInsaatGiderleri?.yeraltiAnaGalerileri);
    const toplamBina = anaBina + yardimciBina + yeraltiBina;

    // 3. Toplam Makine Teçhizat (TL) hesapla
    const makineIthal = toNumber(finansal.makineTeçhizatGiderleri?.tl?.ithal);
    const makineYerli = toNumber(finansal.makineTeçhizatGiderleri?.tl?.yerli);
    const toplamMakineTL = makineIthal + makineYerli;

    // 4. Toplam İthal Makine ($) hesapla → Kullanıcı talebi: sadece Yeni + Kullanılmış
    const makineYeni = toNumber(finansal.makineTeçhizatGiderleri?.dolar?.yeniMakine);
    const makineKullanilmis = toNumber(finansal.makineTeçhizatGiderleri?.dolar?.kullanilmisMakine);
    const toplamMakineDolar = makineYeni + makineKullanilmis;

    // 5. Toplam Diğer Yatırım Harcamaları hesapla
    const yardimciIsl = toNumber(finansal.digerYatirimHarcamalari?.yardimciIslMakTeçGid);
    const ithalatGum = toNumber(finansal.digerYatirimHarcamalari?.ithalatVeGumGiderleri);
    const tasimaSignorta = toNumber(finansal.digerYatirimHarcamalari?.tasimaVeSigortaGiderleri);
    const etudProje = toNumber(finansal.digerYatirimHarcamalari?.etudVeProjeGiderleri);
    const digerGider = toNumber(finansal.digerYatirimHarcamalari?.digerGiderleri);
    const toplamDiger = yardimciIsl + ithalatGum + tasimaSignorta + etudProje + digerGider;

    // 6. TOPLAM SABİT YATIRIM TUTARI = Arazi + Bina + Makine(TL) + Diğer
    const toplamSabitYatirim = araziTotal + toplamBina + toplamMakineTL + toplamDiger;

    // 7. DEVLET MANTIGI: Yabancı Kaynak alt kalemlerini topla
    const bankKredisi = toNumber(finansal.finansman?.yabanciKaynaklar?.bankKredisi);
    // Kaldırılan kalemler hesaplamadan çıkarıldı
    const toplamYabanciKaynak = bankKredisi;

    // 8. DEVLET MANTIGI: Özkaynak = Toplam Sabit Yatırım - Yabancı Kaynak (OTOMATIK HESAPLANAN!)
    const ozKaynakOtomatik = Math.max(0, toplamSabitYatirim - toplamYabanciKaynak); // Negatif olamaz

    // 9. DEVLET MANTIGI: Toplam Finansman = Toplam Sabit Yatırım (Dengeli olmalı)
    const toplamFinansman = toplamSabitYatirim; // Devlet mantığında her zaman eşit

    // 10. Finansman dengesi kontrolü
    const finansmanDengesi = toplamYabanciKaynak + ozKaynakOtomatik;
    const dengeDurumu = Math.abs(finansmanDengesi - toplamSabitYatirim) < 0.01; // 1 kuruş tolerans

    // Hesaplanan değerleri döndür - DEVLET MANTIGI ile
    return {
      araziTotal,
      toplamYabanciKaynak,
      ozKaynakOtomatik, // 🆕 Otomatik hesaplanan özkaynak
      toplamFinansman,
      toplamBina,
      toplamMakineTL,
      toplamMakineDolar,
      toplamDiger,
      toplamSabitYatirim,
      dengeDurumu // 🆕 Finansman dengesi
    };
  }, [formData.finansalBilgiler]);

  // 🔧 Finansal hesaplamalar - INFINITE LOOP FIX
  useEffect(() => {
    // ⚠️ INFINITE LOOP ÖNLEME: Sadece input field'lar değiştiğinde hesapla
    if (formData.finansalBilgiler) {
      const calculations = calculateFinansalTotals();

      // Önceki hesaplanan değerlerle karşılaştır - değişim varsa güncelle
      const currentCalculatedValues = {
        araziTotal: formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli || 0,
        toplamYabanciKaynak: formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.toplamYabanciKaynak || 0,
        ozkaynaklar: formData.finansalBilgiler?.finansman?.ozkaynaklar?.ozkaynaklar || 0,
        toplamSabitYatirimTutari: formData.finansalBilgiler?.toplamSabitYatirimTutari || 0,
        toplamMakineTL: formData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.toplamMakineTeç || 0,
        toplamMakineDolar: formData.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.toplamIthalMakine || 0
      };

      // Sadece anlamlı değişiklik varsa güncelle (1 TL tolerans)
      const hasChanged = (
        Math.abs(currentCalculatedValues.araziTotal - calculations.araziTotal) > 1 ||
        Math.abs(currentCalculatedValues.toplamYabanciKaynak - calculations.toplamYabanciKaynak) > 1 ||
        Math.abs(currentCalculatedValues.ozkaynaklar - calculations.ozKaynakOtomatik) > 1 ||
        Math.abs(currentCalculatedValues.toplamSabitYatirimTutari - calculations.toplamSabitYatirim) > 1 ||
        Math.abs(currentCalculatedValues.toplamMakineTL - calculations.toplamMakineTL) > 1 ||
        Math.abs(currentCalculatedValues.toplamMakineDolar - calculations.toplamMakineDolar) > 1
      );

      if (hasChanged) {
        setFormData(prev => ({
          ...prev,
          finansalBilgiler: {
            ...prev.finansalBilgiler,
            araziArsaBedeli: {
              ...prev.finansalBilgiler?.araziArsaBedeli,
              araziArsaBedeli: calculations.araziTotal
            },
            finansman: {
              ...prev.finansalBilgiler?.finansman,
              toplamFinansman: calculations.toplamFinansman,
              yabanciKaynaklar: {
                ...prev.finansalBilgiler?.finansman?.yabanciKaynaklar,
                toplamYabanciKaynak: calculations.toplamYabanciKaynak
              },
              ozkaynaklar: {
                ...prev.finansalBilgiler?.finansman?.ozkaynaklar,
                ozkaynaklar: calculations.ozKaynakOtomatik
              }
            },
            binaInsaatGiderleri: {
              ...prev.finansalBilgiler?.binaInsaatGiderleri,
              toplamBinaInsaatGideri: calculations.toplamBina
            },
            makineTeçhizatGiderleri: {
              ...prev.finansalBilgiler?.makineTeçhizatGiderleri,
              tl: {
                ...prev.finansalBilgiler?.makineTeçhizatGiderleri?.tl,
                toplamMakineTeç: calculations.toplamMakineTL
              },
              dolar: {
                ...prev.finansalBilgiler?.makineTeçhizatGiderleri?.dolar,
                toplamIthalMakine: calculations.toplamMakineDolar
              }
            },
            digerYatirimHarcamalari: {
              ...prev.finansalBilgiler?.digerYatirimHarcamalari,
              toplamDigerYatirimHarcamalari: calculations.toplamDiger
            },
            toplamSabitYatirimTutari: calculations.toplamSabitYatirim
          }
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.finansalBilgiler?.araziArsaBedeli?.metrekaresi,
    formData.finansalBilgiler?.araziArsaBedeli?.birimFiyatiTl,
    formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.bankKredisi,
    formData.finansalBilgiler?.finansman?.ozkaynaklar?.ozkaynaklar,
    formData.finansalBilgiler?.binaInsaatGiderleri?.anaBinaVeTesisleri,
    formData.finansalBilgiler?.binaInsaatGiderleri?.yardimciIsBinaVeIcareBinalari,
    formData.finansalBilgiler?.binaInsaatGiderleri?.yeraltiAnaGalerileri,
    formData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.ithal,
    formData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.yerli,
    formData.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.yeniMakine,
    formData.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.kullanilmisMakine,
    formData.finansalBilgiler?.digerYatirimHarcamalari?.yardimciIslMakTeçGid,
    formData.finansalBilgiler?.digerYatirimHarcamalari?.ithalatVeGumGiderleri,
    formData.finansalBilgiler?.digerYatirimHarcamalari?.tasimaVeSigortaGiderleri,
    formData.finansalBilgiler?.digerYatirimHarcamalari?.etudVeProjeGiderleri,
    formData.finansalBilgiler?.digerYatirimHarcamalari?.digerGiderleri
    // ⚠️ calculateFinansalTotals ve formData.finansalBilgiler KASITLI olarak eksik bırakıldı - infinite loop'u önlemek için
  ]);

  // 💰 Helper fonksiyon - Sıfır değerlerini temizlemek için - ENHANCED!
  const handleNumberFieldFocus = (e) => {
    // Kullanıcı tıklayınca 0 ise tamamen temizle (tip number olduğu için sadece value='')
    if (e.target.value === '0' || e.target.value === 0 || e.target.value === '0.00') {
      e.target.value = '';
      // Field'ı boşalttığımızı state'e de yansıt (blur beklemeden) → pasif toplam ve validasyonlar canlı çalışsın
      const nameAttr = e.target.getAttribute('name');
      const dataSection = e.target.getAttribute('data-section');
      const dataField = e.target.getAttribute('data-field');
      if (dataSection && dataField) {
        // Finansal alanlara özel: 0 yerine boş anlık state yaz
        handleFinansalChange(dataSection, dataField, '');
      } else if (nameAttr) {
        // Genel sayı alanları için destek (varsa)
        setFormData(prev => ({ ...prev, [nameAttr]: '' }));
      }
    }
  };

  const handleNumberFieldBlur = (e, changeHandler) => {
    // Boşsa sıfır yap
    if (e.target.value === '' || e.target.value === null) {
      changeHandler(0);
    }
  };

  // 💰 5. FİNANSAL BİLGİLER - Devlet Sistemine Uygun İki Kolonlu Düzen
  const renderFinansalBilgiler = () => (
    <Box sx={{ width: '100%' }}>
      {/* Başlık */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        💰 Finansal Bilgiler
        <Chip label="Devlet Formatı" size="small" color="primary" variant="outlined" />
      </Typography>

      {/* İKİ KOLONLU ANA YAPI */}
      <Grid container spacing={2}>

        {/* ═══════════════ SOL KOLON ═══════════════ */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* ARAZİ-ARSA BEDELİ */}
            <Paper sx={{ p: 2, backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#92400e', borderBottom: '2px solid #f59e0b', pb: 0.5 }}>
                Arazi-Arsa Bedeli
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 160, color: '#78716c' }}>Arazi-Arsa Bedeli Açıklaması:</Typography>
                  <TextField size="small" fullWidth multiline rows={2}
                    value={formData.finansalBilgiler.araziArsaBedeli.aciklama}
                    onChange={(e) => handleFinansalChange('araziArsaBedeli', 'aciklama', e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 160, color: '#78716c' }}>Metrekaresi:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.araziArsaBedeli.metrekaresi)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.araziArsaBedeli.metrekaresi')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 160, color: '#78716c' }}>Birim Fiyatı:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.araziArsaBedeli.birimFiyatiTl)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.araziArsaBedeli.birimFiyatiTl')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 160, color: '#78716c', fontWeight: 600 }}>Arazi-Arsa Bedeli:</Typography>
                  <TextField size="small" fullWidth
                    value={formData.finansalBilgiler.araziArsaBedeli.araziArsaBedeli.toLocaleString('tr-TR')}
                    InputProps={{ readOnly: true, style: { fontWeight: 'bold', backgroundColor: '#fef3c7' } }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* BİNA-İNŞAAT GİDERLERİ */}
            <Paper sx={{ p: 2, backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#166534', borderBottom: '2px solid #22c55e', pb: 0.5 }}>
                Bina-İnşaat Giderleri
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>Bina-İnşaat Giderleri Açıklama:</Typography>
                  <TextField size="small" fullWidth multiline rows={2}
                    value={formData.finansalBilgiler.binaInsaatGiderleri.aciklama}
                    onChange={(e) => handleFinansalChange('binaInsaatGiderleri', 'aciklama', e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>Ana bina ve tesisleri:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.binaInsaatGiderleri.anaBinaVeTesisleri)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.binaInsaatGiderleri.anaBinaVeTesisleri')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>Yardımcı iş. bina ve tesisleri:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.binaInsaatGiderleri.yardimciIsBinaVeIcareBinalari)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.binaInsaatGiderleri.yardimciIsBinaVeIcareBinalari')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>İdare binaları:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.binaInsaatGiderleri.yeraltiAnaGalerileri)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.binaInsaatGiderleri.yeraltiAnaGalerileri')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c', fontWeight: 600 }}>Toplam Bina İnşaat Giderleri:</Typography>
                  <TextField size="small" fullWidth
                    value={formData.finansalBilgiler.binaInsaatGiderleri.toplamBinaInsaatGideri.toLocaleString('tr-TR')}
                    InputProps={{ readOnly: true, style: { fontWeight: 'bold', backgroundColor: '#dcfce7' } }}
                  />
                </Box>
              </Box>
            </Paper>



            {/* DİĞER YATIRIM HARCAMALARI */}
            <Paper sx={{ p: 2, backgroundColor: '#faf5ff', border: '1px solid #d8b4fe' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#6b21a8', borderBottom: '2px solid #a855f7', pb: 0.5 }}>
                Diğer Yatırım Harcamaları
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>İthalat ve gümrükleme giderleri:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.digerYatirimHarcamalari.ithalatVeGumGiderleri)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.digerYatirimHarcamalari.ithalatVeGumGiderleri')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>Taşıma ve sigorta giderleri:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.digerYatirimHarcamalari.tasimaVeSigortaGiderleri)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.digerYatirimHarcamalari.tasimaVeSigortaGiderleri')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>Montaj giderleri:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.digerYatirimHarcamalari.yardimciIslMakTeçGid)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.digerYatirimHarcamalari.yardimciIslMakTeçGid')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>Etüd ve proje giderleri:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.digerYatirimHarcamalari.etudVeProjeGiderleri)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.digerYatirimHarcamalari.etudVeProjeGiderleri')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c' }}>Diğer giderler:</Typography>
                  <TextField size="small" fullWidth type="text"
                    value={formatNumber(formData.finansalBilgiler.digerYatirimHarcamalari.digerGiderleri)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.digerYatirimHarcamalari.digerGiderleri')}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c', fontWeight: 600 }}>Toplam Diğer Yatırım Harcamaları:</Typography>
                  <TextField size="small" fullWidth
                    value={formData.finansalBilgiler.digerYatirimHarcamalari.toplamDigerYatirimHarcamalari.toLocaleString('tr-TR')}
                    InputProps={{ readOnly: true, style: { fontWeight: 'bold', backgroundColor: '#f3e8ff' } }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* TOPLAM SABİT YATIRIM TUTARI */}
            <Paper sx={{ p: 2, backgroundColor: '#fef2f2', border: '2px solid #fca5a5' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#991b1b', borderBottom: '2px solid #ef4444', pb: 0.5 }}>
                TOPLAM SABİT YATIRIM TUTARI
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ minWidth: 180, color: '#78716c', fontWeight: 700 }}>TOPLAM SABİT YATIRIM TUTARI:</Typography>
                <TextField size="small" fullWidth
                  value={formData.finansalBilgiler.toplamSabitYatirimTutari.toLocaleString('tr-TR')}
                  InputProps={{ readOnly: true, style: { fontWeight: 'bold', fontSize: '1rem', backgroundColor: '#fee2e2', color: '#991b1b' } }}
                />
              </Box>
            </Paper>
          </Box>
        </Grid>

        {/* ═══════════════ SAĞ KOLON ═══════════════ */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* MAKİNA TEÇHİZAT GİDERLERİ */}
            <Paper sx={{ p: 2, backgroundColor: '#eff6ff', border: '1px solid #93c5fd' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#1e40af', borderBottom: '2px solid #3b82f6', pb: 0.5 }}>
                Makina Teçhizat Giderleri
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c' }}>İthal:</Typography>
                  <TextField size="small" fullWidth type="number"
                    value={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.ithal}
                    onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'tl.ithal', parseFloat(e.target.value) || 0)}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c' }}>Yerli:</Typography>
                  <TextField size="small" fullWidth type="number"
                    value={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.yerli}
                    onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'tl.yerli', parseFloat(e.target.value) || 0)}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c', fontWeight: 600 }}>Toplam Makine Techizat:</Typography>
                  <TextField size="small" fullWidth
                    value={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.toplamMakineTeç.toLocaleString('tr-TR')}
                    InputProps={{ readOnly: true, style: { fontWeight: 'bold', backgroundColor: '#dbeafe' } }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* İTHAL MAKİNE ($) */}
            <Paper sx={{ p: 2, backgroundColor: '#f0fdfa', border: '1px solid #5eead4' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#0f766e', borderBottom: '2px solid #14b8a6', pb: 0.5 }}>
                İthal Makine($)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c' }}>Yeni Makine:</Typography>
                  <TextField size="small" fullWidth type="number"
                    value={formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.yeniMakine}
                    onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'dolar.yeniMakine', parseFloat(e.target.value) || 0)}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c' }}>Kullanılmış Makine:</Typography>
                  <TextField size="small" fullWidth type="number"
                    value={formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.kullanilmisMakine}
                    onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'dolar.kullanilmisMakine', parseFloat(e.target.value) || 0)}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c', fontWeight: 600 }}>Toplam İthal Makine($):</Typography>
                  <TextField size="small" fullWidth
                    value={formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.toplamIthalMakine.toLocaleString('en-US')}
                    InputProps={{ readOnly: true, style: { fontWeight: 'bold', backgroundColor: '#ccfbf1' } }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* YABANCI KAYNAKLAR */}
            <Paper sx={{ p: 2, backgroundColor: '#fefce8', border: '1px solid #fde047' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#854d0e', borderBottom: '2px solid #eab308', pb: 0.5 }}>
                Yabancı Kaynaklar
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c', fontWeight: 600 }}>Toplam Yabancı Kaynak:</Typography>
                  <TextField size="small" fullWidth type="number"
                    value={formData.finansalBilgiler.finansman.yabanciKaynaklar.toplamYabanciKaynak}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleFinansalChange('finansman', 'yabanciKaynaklar.toplamYabanciKaynak', value);
                      handleFinansalChange('finansman', 'yabanciKaynaklar.bankKredisi', value);
                    }}
                    InputProps={{ style: { fontWeight: 'bold', backgroundColor: '#fef9c3' } }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* ÖZKAYNAKLAR */}
            <Paper sx={{ p: 2, backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#065f46', borderBottom: '2px solid #10b981', pb: 0.5 }}>
                Özkaynaklar
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c', fontWeight: 600 }}>Özkaynaklar:</Typography>
                <TextField size="small" fullWidth
                  value={formData.finansalBilgiler.finansman.ozkaynaklar.ozkaynaklar.toLocaleString('tr-TR')}
                  InputProps={{ readOnly: true, style: { fontWeight: 'bold', backgroundColor: '#d1fae5' } }}
                  helperText="Otomatik: Sabit Yatırım - Yabancı Kaynak"
                />
              </Box>
            </Paper>

            {/* TOPLAM FİNANSMAN */}
            <Paper sx={{ p: 2, backgroundColor: '#f0fdf4', border: '2px solid #4ade80' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#166534', borderBottom: '2px solid #22c55e', pb: 0.5 }}>
                TOPLAM FİNANSMAN
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ minWidth: 140, color: '#78716c', fontWeight: 700 }}>TOPLAM FİNANSMAN:</Typography>
                <TextField size="small" fullWidth
                  value={formData.finansalBilgiler.finansman.toplamFinansman.toLocaleString('tr-TR')}
                  InputProps={{ readOnly: true, style: { fontWeight: 'bold', fontSize: '1rem', backgroundColor: '#bbf7d0', color: '#166534' } }}
                />
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* DENGE KONTROLÜ */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 ? '#f0fdf4' : '#fef2f2', borderRadius: 1, border: Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 ? '2px solid #22c55e' : '2px solid #ef4444' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ⚖️ Finansman Denge Kontrolü
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Toplam Sabit Yatırım = Yabancı Kaynak + Özkaynak = Toplam Finansman
            </Typography>
          </Box>
          <Chip
            label={Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 ? '✅ Dengeli' : '❌ Dengesiz'}
            color={Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 ? 'success' : 'error'}
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderKunyeBilgileri(); // Künye + Yatırım + Belge Bilgileri birleşik tek sayfa
      case 1: return renderUrunBilgileri();
      case 2: return renderMakineListesi();
      case 3: return renderFinansalBilgiler();
      case 4: return renderOzelSartlar();
      case 5: return renderDestekUnsurlari();
      case 6: return isEdit && formData.tesvikId ? <RevisionTimeline tesvikId={formData.tesvikId} /> : <Typography>Revizyon geçmişi sadece kaydedilmiş teşvikler için görüntülenebilir.</Typography>;
      default: return renderKunyeBilgileri();
    }
  };

  if (loading) {
    return (
      <Box sx={{
        display: 'grid',
        gridTemplateRows: '64px 1fr',
        gridTemplateColumns: { xs: '1fr', lg: sidebarOpen ? '280px 1fr' : '1fr' },
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography>Yükleniyor... 📊</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateRows: '64px 1fr',
      gridTemplateColumns: {
        xs: '1fr',
        lg: sidebarOpen ? '280px 1fr' : '1fr'
      },
      gridTemplateAreas: {
        xs: '"header" "content"',
        lg: sidebarOpen ? '"header header" "sidebar content"' : '"header" "content"'
      },
      height: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <Box sx={{ gridArea: 'header', zIndex: 1201 }}>
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      </Box>

      {/* Sidebar */}
      {!isMobile && sidebarOpen && (
        <Box sx={{ gridArea: 'sidebar', zIndex: 1200 }}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="persistent" />
        </Box>
      )}

      {isMobile && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} variant="temporary" />
      )}

      {/* Main Content */}
      <Box component="main" sx={{
        gridArea: 'content',
        overflowX: 'visible', // 🎯 DROPDOWN İÇİN HORIZONTAL OVERFLOW VİSİBLE
        overflowY: 'auto', // 🎯 VERTİCAL SCROLL KORUNUYOR
        p: { xs: 1, sm: 2, md: 3 }, // 🎯 RESPONSIVE PADDING
        width: '100%',
        position: 'relative' // 🎯 DROPDOWN POSİTİONİNG İÇİN
      }}>
        <Container maxWidth="xl" sx={{
          px: { xs: 1, sm: 2, md: 3 }, // 🎯 RESPONSIVE PADDING
          width: '100%',
          overflow: 'visible', // 🎯 DROPDOWN İÇİN OVERFLOW VİSİBLE
          position: 'relative' // 🎯 DROPDOWN POSİTİONİNG İÇİN
        }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{
              fontWeight: 700,
              color: '#1f2937',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <EmojiEventsIcon sx={{ fontSize: 32, color: '#dc2626' }} />
              {isEdit ? 'Teşvik Düzenle' : 'Yeni Teşvik Ekle'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Excel formunun 1:1 aynısı - Kapsamlı teşvik belgesi oluşturma sistemi
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Form */}
          <Card>
            <CardContent sx={{ p: 4 }}>
              {/* Stepper */}
              <Stepper activeStep={activeStep} alternativeLabel>
                {stepLabels.map((label, index) => (
                  <Step key={index}>
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontSize: '0.9rem',
                          fontWeight: activeStep === index ? 600 : 400
                        }
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Step Content */}
              {renderStepContent()}

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep(prev => prev - 1)}
                  size="large"
                >
                  Geri
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {activeStep === stepLabels.length - 1 ? (
                    <>
                      {/* 🔧 YENİ EKLENDİ - Excel Export Butonları */}
                      <Button
                        variant="outlined"
                        onClick={() => handleExcelExport('xlsx')}
                        disabled={!formData.gmId || !formData.tesvikId}
                        startIcon={<TableViewIcon />}
                        size="large"
                        sx={{
                          color: '#16a34a',
                          borderColor: '#16a34a',
                          fontWeight: 600,
                          px: 3,
                          '&:hover': {
                            backgroundColor: '#f0fdf4',
                            borderColor: '#16a34a'
                          }
                        }}
                      >
                        📊 Excel Çıktı
                      </Button>



                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={saving}
                        startIcon={<SaveIcon />}
                        size="large"
                        sx={{
                          background: '#dc2626',
                          fontWeight: 600,
                          px: 4
                        }}
                      >
                        {saving ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : 'Kaydet')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(prev => prev + 1)}
                      size="large"
                      sx={{ px: 4 }}
                    >
                      İleri
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* 🆕 YENİ SEÇENEK EKLEME MODAL - DEVLET SİSTEMİ UI */}
      <Dialog
        open={addOptionModal.open}
        onClose={closeAddOptionModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            background: '#2563eb',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <AddIcon />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🏛️ Yeni {addOptionModal.title} Ekle
            </Typography>
          </Box>
          <IconButton
            onClick={closeAddOptionModal}
            size="small"
            sx={{
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{
          backgroundColor: 'white',
          color: '#1f2937',
          borderRadius: '0 0 12px 12px'
        }}>
          <Alert
            severity="info"
            sx={{ mb: 3, borderRadius: '8px' }}
            icon={<InfoIcon />}
          >
            <Typography variant="body2">
              <strong>📋 Devlet Sistemi Uyumlu:</strong> Eklediğiniz seçenek tüm sistem genelinde kullanılabilir hale gelecektir.
            </Typography>
          </Alert>

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Seçenek Adı"
                value={addOptionModal.newLabel}
                onChange={(e) => handleAddOptionChange('newLabel', e.target.value)}
                placeholder="Örn: Yeni Yatırım Türü"
                helperText="Bu ad dropdown'da görünecek"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#2563eb' },
                    '&.Mui-focused fieldset': { borderColor: '#2563eb' }
                  }
                }}
              />
            </Grid>

            {['osbOptions', 'u97Kodlari', 'destekUnsurlariOptions', 'ozelSartKisaltmalari'].includes(addOptionModal.type) && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Kategori"
                  value={addOptionModal.newKategori}
                  onChange={(e) => handleAddOptionChange('newKategori', e.target.value)}
                  placeholder="Örn: Genel, Bölgesel, vb."
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Açıklama (İsteğe Bağlı)"
                value={addOptionModal.newAciklama}
                onChange={(e) => handleAddOptionChange('newAciklama', e.target.value)}
                placeholder="Bu seçeneğin detaylı açıklaması..."
              />
            </Grid>

            {addOptionModal.type === 'osbOptions' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Şehir"
                  value={addOptionModal.newEkBilgi.sehir || ''}
                  onChange={(e) => handleAddOptionChange('newEkBilgi', { ...addOptionModal.newEkBilgi, sehir: e.target.value })}
                  placeholder="Örn: Adana, İstanbul"
                />
              </Grid>
            )}

            {addOptionModal.type === 'destekSartlariOptions' && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Yüzde (%)"
                    value={addOptionModal.newEkBilgi.yuzde || ''}
                    onChange={(e) => handleAddOptionChange('newEkBilgi', { ...addOptionModal.newEkBilgi, yuzde: parseInt(e.target.value) || null })}
                    placeholder="15, 20, 25..."
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Yıl"
                    value={addOptionModal.newEkBilgi.yil || ''}
                    onChange={(e) => handleAddOptionChange('newEkBilgi', { ...addOptionModal.newEkBilgi, yil: parseInt(e.target.value) || null })}
                    placeholder="2, 5, 7..."
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeAddOptionModal} color="inherit">
            İptal
          </Button>
          <Button
            onClick={handleAddNewOption}
            variant="contained"
            disabled={!addOptionModal.newLabel || addOptionModal.adding}
            startIcon={addOptionModal.adding ? null : <AddIcon />}
          >
            {addOptionModal.adding ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default YeniTesvikForm;