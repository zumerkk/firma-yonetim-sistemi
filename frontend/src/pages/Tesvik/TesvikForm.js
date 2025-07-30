// 🏆 TEŞVIK FORM - ENTERPRISE EDITION  
// Excel şablonu 1:1 aynısı - GM ID otomatik, tüm firmalar, U$97 kodları
// Mali hesaplamalar + ürün bilgileri + destek unsurları + özel şartlar

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  Tooltip,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Business as BusinessIcon,
  AutoFixHigh as AutoFixHighIcon,
  Engineering as EngineeringIcon,
  Settings as SettingsIcon,
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,
  Close as CloseIcon,
  SaveAlt as SaveAltIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AttachMoney as AttachMoneyIcon,
  TableView as TableViewIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import axios from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
// 🏙️ İl İlçe Seçici Import
import EnhancedCitySelector from '../../components/EnhancedCitySelector.tsx';
// 🔄 Revizyon Timeline Import
import RevisionTimeline from '../../components/RevisionTimeline';

// 🆕 Enhanced Components - CSV Integration (imports removed - not used in this form)

const TesvikForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  // 📊 State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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
      mucbirUzumaTarihi: ''
    },
    
    // 📝 Künye Bilgileri - Excel Formatına Uygun
    kunyeBilgileri: {
      talepSonuc: '',
      sorguBaglantisi: '',
      yatirimci: '',
      yatirimciUnvan: '',
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
    
    // 👥 İstihdam Bilgileri
    istihdam: {
      mevcutKisi: 0,
      ilaveKisi: 0,
      toplamKisi: 0
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
      destekSinifi: ''
    },
    
    // 💰 Yatırım İle İlgili Bilgiler - Bölüm 2  
    yatirimBilgileri2: {
      yerinIl: '',
      yerinIlce: '',
      yatirimAdresi1: '',
      yatirimAdresi2: '',
      yatirimAdresi3: '',
      ossBelgeMudavimi: ''
    },
    
    // 📦 Ürün Bilgileri (U$97 Kodları) - Excel'deki 9 satır
    urunBilgileri: [
      { kod: 'U$97_1', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_2', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_3', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_4', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_5', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_6', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_7', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_8', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
      { kod: 'U$97_9', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' }
    ],
    
    // 🎯 Destek Unsurları - Excel benzeri 8 alan yapısı
    destekUnsurlari: [
      { index: 1, destekUnsuru: '', sartlari: '' },
      { index: 2, destekUnsuru: '', sartlari: '' },
      { index: 3, destekUnsuru: '', sartlari: '' },
      { index: 4, destekUnsuru: '', sartlari: '' },
      { index: 5, destekUnsuru: '', sartlari: '' },
      { index: 6, destekUnsuru: '', sartlari: '' },
      { index: 7, destekUnsuru: '', sartlari: '' },
      { index: 8, destekUnsuru: '', sartlari: '' }
    ],
    
    // 🏷️ Özel Şartlar - Excel benzeri 7 alan yapısı
    ozelSartlar: [
      { index: 1, kisaltma: '', notu: '' },
      { index: 2, kisaltma: '', notu: '' },
      { index: 3, kisaltma: '', notu: '' },
      { index: 4, kisaltma: '', notu: '' },
      { index: 5, kisaltma: '', notu: '' },
      { index: 6, kisaltma: '', notu: '' },
      { index: 7, kisaltma: '', notu: '' }
    ],
    
    // 💰 FİNANSAL BİLGİLER - Excel Benzeri Kapsamlı Yapı
    finansalBilgiler: {
      // 1. TOPLAM SABİT YATIRIM TUTARI TL
      toplamSabitYatirimTutari: 0,
      
      // 2. YATIRIMIN TUTARI
      araziArsaBedeli: {
        aciklama: '',
        metrekaresi: 0,
        birimFiyatiTl: 0,
        araziArsaBedeli: 0
      },
      
      // 3. FİNANSMAN TL
      finansman: {
        yabanciKaynaklar: {
          // 🔧 EKSİK ALANLAR EKLENDİ - Excel formatına uygun
          bankKredisi: 0,
          ikinciElFiyatFarki: 0,
          kullanilmisTeçhizatBedeli: 0,
          digerDisKaynaklar: 0,
          digerYabanciKaynak: 0,
          toplamYabanciKaynak: 0
        },
        ozkaynaklar: {
          ozkaynaklar: 0
        },
        toplamFinansman: 0
      },
      
      // 4. BİNA İNŞAAT GİDERLERİ TL
      binaInsaatGiderleri: {
        aciklama: '',
        anaBinaVeTesisleri: 0,
        yardimciIsBinaVeIcareBinalari: 0,
        yeraltiAnaGalerileri: 0,
        toplamBinaInsaatGideri: 0
      },
      
      // 5. MAKİNE TEÇHİZAT GİDERLERİ
      makineTeçhizatGiderleri: {
        // TL Cinsinden
        tl: {
          ithal: 0,
          yerli: 0,
          toplamMakineTeç: 0
        },
        // Dolar Cinsinden
        dolar: {
          ithalMakine: 0,  // İTHAL MAKİNE ($)
          yeniMakine: 0,
          kullanilmisMakine: 0,
          toplamIthalMakine: 0  // TOPLAM İTHAL MAKİNE ($)
        }
      },
      
      // 6. DİĞER YATIRIM HARCAMALARI TL
      digerYatirimHarcamalari: {
        yardimciIslMakTeçGid: 0,        // Yardımcı İşl. Mak. Teç. Gid.
        ithalatVeGumGiderleri: 0,       // İthalat ve Güm.Giderleri
        tasimaVeSigortaGiderleri: 0,    // Taşıma ve Sigorta G.(Monta) Giderleri
        etudVeProjeGiderleri: 0,        // Etüd ve Proje Giderleri
        digerGiderleri: 0,              // Diğer Giderleri
        toplamDigerYatirimHarcamalari: 0 // TOPLAM DİĞER YATIRIM HARCAMALARI
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
    yatirimTipleri: [],
    kapasiteBirimleri: [],
    osbOptions: [],
    yatirimKonusuKategorileri: [],
    u97Kodlari: [],
    destekUnsurlariOptions: [],
    destekSartlariOptions: [],
    ozelSartKisaltmalari: [],
    ozelSartNotlari: [],
    nextGmId: '',
    nextTesvikId: ''
  });

  const [activeStep, setActiveStep] = useState(0);

  // Adım isimleri - Yeniden düzenlenmiş profesyonel yapı
  const stepLabels = [
    '📋 KÜNYE BİLGİLERİ',
    '🏢 YATIRIM İLE İLGİLİ BİLGİLER',
    '📦 ÜRÜN BİLGİLERİ',
    '🎯 DESTEK UNSURLARI',
    '⚖️ ÖZEL ŞARTLAR',
    '💰 FİNANSAL BİLGİLER',
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

  // 📊 Load initial data with new API endpoint
  useEffect(() => {
    loadInitialData();
    if (isEdit) {
      loadTesvikData();
    }
  }, [id, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔥 Loading template data from new API...');
      
      // YENİ API endpoint'i kullan - tüm veriler tek çağrıda!
      const response = await axios.get('/tesvik/templates/yeni-tesvik');

      if (response.data.success) {
        const data = response.data.data;
        console.log('✅ Template data loaded:', {
          firmalar: data.firmalar?.length,
          nextGmId: data.nextGmId,
          nextTesvikId: data.nextTesvikId
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
          u97Kodlari: data.u97Kodlari || [],
          destekUnsurlariOptions: data.destekUnsurlariOptions || [],
          destekSartlariOptions: data.destekSartlariOptions || [],
          ozelSartKisaltmalari: data.ozelSartKisaltmalari || [],
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

  const loadTesvikData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/tesvik/${id}`);
      
      if (response.data.success) {
        const backendData = response.data.data;
        
        // 🔄 Backend data'sını frontend formatına çevir
        const mappedData = {
          ...backendData,
          
          // Backend'deki maliHesaplamalar → Frontend'deki finansalBilgiler
          finansalBilgiler: {
            toplamSabitYatirimTutari: backendData.maliHesaplamalar?.toplamSabitYatirim || 0,
            
            araziArsaBedeli: {
              aciklama: '',
              metrekaresi: 0,
              birimFiyatiTl: 0,
              araziArsaBedeli: backendData.maliHesaplamalar?.araciArsaBedeli || 0
            },
            
            finansman: {
              yabanciKaynaklar: {
                toplamYabanciKaynak: backendData.maliHesaplamalar?.finansman?.yabanciKaynak || 0
              },
              ozkaynaklar: {
                ozkaynaklar: backendData.maliHesaplamalar?.finansman?.ozKaynak || 0
              },
              toplamFinansman: backendData.maliHesaplamalar?.finansman?.toplamFinansman || 0
            },
            
            binaInsaatGiderleri: {
              aciklama: '',
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
                ithalMakine: 0,
                yeniMakine: backendData.maliHesaplamalar?.makinaTechizat?.yeniMakina || 0,
                kullanilmisMakine: backendData.maliHesaplamalar?.makinaTechizat?.kullanimisMakina || 0,
                toplamIthalMakine: backendData.maliHesaplamalar?.makinaTechizat?.toplamYeniMakina || 0
              }
            },
            
            digerYatirimHarcamalari: {
              yardimciIslMakTeçGid: 0,
              ithalatVeGumGiderleri: 0,
              tasimaVeSigortaGiderleri: 0,
              etudVeProjeGiderleri: 0,
              digerGiderleri: 0,
              toplamDigerYatirimHarcamalari: 0
            }
          },
          
          // Yatırım bilgilerini böl (backend'deki yatirimBilgileri → frontend'deki 2 bölüm)
          yatirimBilgileri1: {
            yatirimKonusu: backendData.yatirimBilgileri?.yatirimKonusu || '',
            cins1: backendData.yatirimBilgileri?.sCinsi1 || '',
            cins2: backendData.yatirimBilgileri?.tCinsi2 || '',
            cins3: backendData.yatirimBilgileri?.uCinsi3 || '',
            cins4: backendData.yatirimBilgileri?.vCinsi4 || '',
            destekSinifi: backendData.yatirimBilgileri?.destekSinifi || ''
          },
          
          yatirimBilgileri2: {
            yerinIl: backendData.yatirimBilgileri?.yerinIl || '',
            yerinIlce: backendData.yatirimBilgileri?.yerinIlce || '',
            yatirimAdresi1: backendData.yatirimBilgileri?.yatirimAdresi1 || '',
            yatirimAdresi2: backendData.yatirimBilgileri?.yatirimAdresi2 || '',
            yatirimAdresi3: backendData.yatirimBilgileri?.yatirimAdresi3 || '',
            ossBelgeMudavimi: backendData.yatirimBilgileri?.osbIseMudurluk || ''
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
            talepSonuc: backendData.kunyeBilgileri?.talepSonuc || '',
            sorguBaglantisi: backendData.kunyeBilgileri?.sorguBaglantisi || '',
            yatirimci: backendData.kunyeBilgileri?.yatirimci || '',
            yatirimciUnvan: backendData.kunyeBilgileri?.yatirimciUnvan || backendData.yatirimciUnvan || '',
            // 🔧 YENİ ALANLAR - Excel detayları
            kararTarihi: backendData.kunyeBilgileri?.kararTarihi || '',
            kararSayisi: backendData.kunyeBilgileri?.kararSayisi || '',
            yonetmelikMaddesi: backendData.kunyeBilgileri?.yonetmelikMaddesi || '',
            basvuruTarihi: backendData.kunyeBilgileri?.basvuruTarihi || '',
            dosyaNo: backendData.kunyeBilgileri?.dosyaNo || '',
            projeBedeli: backendData.kunyeBilgileri?.projeBedeli || 0,
            tesvikMiktari: backendData.kunyeBilgileri?.tesvikMiktari || 0,
            tesvikOrani: backendData.kunyeBilgileri?.tesvikOrani || 0
          },
          
          // 🎯 Destek Unsurları - Backend formatından frontend formatına çevir
          destekUnsurlari: backendData.destekUnsurlari?.map(destek => ({
            index: destek._id || Math.random().toString(36).substr(2, 9),
            destekUnsuru: destek.destekUnsuru || '',
            sarti: destek.sarti || '',
            aciklama: destek.aciklama || ''
          })) || [],
          
          // ⚖️ Özel Şartlar - Backend formatından frontend formatına çevir 
          ozelSartlar: backendData.ozelSartlar?.map(sart => ({
            index: sart.koşulNo || Math.random().toString(36).substr(2, 9),
            kisaltma: `${sart.koşulNo}`, 
            notu: sart.koşulMetni || ''
          })) || []
        };
        
        console.log('🔄 Backend data mapped to frontend format:', mappedData);
        setFormData(mappedData);
      }
    } catch (error) {
      console.error('🚨 Teşvik data hatası:', error);
      setError('Teşvik verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 YENİ SEÇENEK EKLEME MODAL HANDLERS
  const openAddOptionModal = (type, title) => {
    setAddOptionModal({
      open: true,
      type,
      title,
      newValue: '',
      newLabel: '',
      newKategori: '',
      newAciklama: '',
      newEkBilgi: {},
      adding: false
    });
  };

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

      const response = await axios.post(`/tesvik/add-option/${addOptionModal.type}`, payload);

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

  // Ürün bilgileri array handler
  const handleUrunChange = (index, field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      newData.urunBilgileri[index] = {
        ...newData.urunBilgileri[index],
        [field]: field === 'aciklama' ? value : parseFloat(value) || 0
      };
      
      // Toplam hesapla
      const urun = newData.urunBilgileri[index];
      urun.toplam = urun.mevcut + urun.ilave;
      
      return newData;
    });
  };

  // 🔧 YENİ EKLENDİ - Excel Benzeri Copy-Paste Özelliği
  const handleTablePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    
    if (!pasteData) return;
    
    // Excel/CSV formatında veriyi parse et
    const rows = pasteData.split('\n').filter(row => row.trim());
    const parsedData = rows.map(row => {
      const cells = row.split('\t'); // Tab ile ayrılmış
      return {
        kod: cells[0] || '',
        aciklama: cells[1] || '',
        mevcut: parseFloat(cells[2]) || 0,
        ilave: parseFloat(cells[3]) || 0,
        kapsite: parseFloat(cells[5]) || 0,
        kapasite_birimi: cells[6] || ''
      };
    });
    
    // Mevcut ürün bilgilerine ekle
    setFormData(prev => {
      const newData = { ...prev };
      
      // Yeni satırları ekle
      parsedData.forEach((newUrun, index) => {
        const targetIndex = newData.urunBilgileri.length;
        newData.urunBilgileri.push({
          ...newUrun,
          toplam: newUrun.mevcut + newUrun.ilave
        });
      });
      
      return newData;
    });
    
    setSuccess(`${parsedData.length} satır başarıyla yapıştırıldı!`);
  };

  // 🔧 YENİ EKLENDİ - Toplu Veri Temizleme
  const handleClearAllUrunData = () => {
    if (window.confirm('Tüm ürün verilerini temizlemek istediğinizden emin misiniz?')) {
      setFormData(prev => ({
        ...prev,
        urunBilgileri: Array.from({ length: 10 }, (_, i) => ({
          kod: '',
          aciklama: '',
          mevcut: 0,
          ilave: 0,
          toplam: 0,
          kapsite: 0,
          kapasite_birimi: ''
        }))
      }));
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

  // Destek unsurları handler - Excel yapısına uygun
  const handleDestekChange = (index, field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      
      // 🔧 Güçlendirilmiş güvenlik kontrolü
      if (!newData.destekUnsurlari || !Array.isArray(newData.destekUnsurlari)) {
        newData.destekUnsurlari = Array.from({ length: 8 }, (_, i) => ({ 
          index: i + 1, 
          destekUnsuru: '', 
          sartlari: '' 
        }));
      }
      
      // Belirli index için kontrol
      if (!newData.destekUnsurlari[index]) {
        newData.destekUnsurlari[index] = { index: index + 1, destekUnsuru: '', sartlari: '' };
      }
      
      // Güvenli atama
      if (newData.destekUnsurlari[index] && typeof newData.destekUnsurlari[index] === 'object') {
        newData.destekUnsurlari[index][field] = value;
      }
      
      return newData;
    });
  };

  // Özel şartlar handler - Excel yapısına uygun
  const handleOzelSartChange = (index, field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      
      // 🔧 Güçlendirilmiş güvenlik kontrolü
      if (!newData.ozelSartlar || !Array.isArray(newData.ozelSartlar)) {
        newData.ozelSartlar = Array.from({ length: 7 }, (_, i) => ({ 
          index: i + 1, 
          kisaltma: '', 
          notu: '' 
        }));
      }
      
      // Belirli index için kontrol
      if (!newData.ozelSartlar[index]) {
        newData.ozelSartlar[index] = { index: index + 1, kisaltma: '', notu: '' };
      }
      
      // Güvenli atama
      if (newData.ozelSartlar[index] && typeof newData.ozelSartlar[index] === 'object') {
        newData.ozelSartlar[index][field] = value;
      }
      
      return newData;
    });
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

  // İstihdam hesaplaması
  const calculateIstihdam = (data) => {
    data.istihdam.toplamKisi = data.istihdam.mevcutKisi + data.istihdam.ilaveKisi;
  };

  // Ürün toplam hesaplama
  const calculateUrunToplam = (data, pathArray) => {
    if (pathArray.length >= 2) {
      const index = parseInt(pathArray[1]);
      const urun = data.urunBilgileri[index];
      if (urun) {
        urun.toplam = urun.mevcut + urun.ilave;
      }
    }
  };

  // 🔧 YENİ EKLENDİ - Excel Export Handler
  const handleExcelExport = async (format = 'xlsx') => {
    try {
      if (!formData.gmId || !formData.tesvikId) {
        setError('Excel çıktı alabilmek için teşvik kaydedilmiş olmalıdır.');
        return;
      }

      console.log('📊 Excel çıktı hazırlanıyor...', format);
      setLoading(true);
      
      const response = await axios.get(`/tesvik/${id}/excel-export`, {
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

  // 🔧 YENİ EKLENDİ - PDF Export Handler
  const handlePDFExport = async () => {
    try {
      if (!formData.gmId || !formData.tesvikId) {
        setError('PDF çıktı alabilmek için teşvik kaydedilmiş olmalıdır.');
        return;
      }

      console.log('📄 PDF çıktı hazırlanıyor...');
      setLoading(true);
      
      const response = await axios.get(`/tesvik/${id}/pdf-export`, {
        responseType: 'blob'
      });
      
      // Dosya indirme
      const blob = new Blob([response.data], {
        type: 'application/pdf'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tesvik_${formData.gmId || formData.tesvikId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('PDF dosyası başarıyla indirildi!');
      console.log('✅ PDF dosyası indirildi');
      
    } catch (error) {
      console.error('🚨 PDF export hatası:', error);
      setError('PDF çıktı alınırken hata oluştu: ' + (error.response?.data?.message || error.message || 'Bilinmeyen hata'));
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
          sCinsi1: formData.yatirimBilgileri1?.cins1 || '',
          tCinsi2: formData.yatirimBilgileri1?.cins2 || '',
          uCinsi3: formData.yatirimBilgileri1?.cins3 || '',
          vCinsi4: formData.yatirimBilgileri1?.cins4 || '',
          destekSinifi: formData.yatirimBilgileri1?.destekSinifi || '',
          
          // Bölüm 2 alanları  
          yerinIl: formData.yatirimBilgileri2?.yerinIl || '',
          yerinIlce: formData.yatirimBilgileri2?.yerinIlce || '',
          yatirimAdresi1: formData.yatirimBilgileri2?.yatirimAdresi1 || '',
          yatirimAdresi2: formData.yatirimBilgileri2?.yatirimAdresi2 || '',
          yatirimAdresi3: formData.yatirimBilgileri2?.yatirimAdresi3 || '',
          osbIseMudurluk: formData.yatirimBilgileri2?.ossBelgeMudavimi || ''
        },
        
        // Ürün bilgilerini model formatına çevir
        urunler: formData.urunBilgileri?.map(urun => ({
          u97Kodu: urun.kod || '',
          urunAdi: urun.aciklama || '',
          mevcutKapasite: parseInt(urun.mevcut) || 0,
          ilaveKapasite: parseInt(urun.ilave) || 0,
          toplamKapasite: parseInt(urun.toplam) || 0,
          kapasiteBirimi: urun.kapasite_birimi || ''
        })) || [],
        
        // Mali hesaplamaları model formatına çevir (finansalBilgiler → maliHesaplamalar)
        maliHesaplamalar: {
          toplamSabitYatirim: formData.finansalBilgiler?.toplamSabitYatirimTutari || 0,
          yatiriminTutari: formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli || 0,
          araciArsaBedeli: formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli || 0,
          
          finansman: {
            yabanciKaynak: formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.toplamYabanciKaynak || 0,
            ozKaynak: formData.finansalBilgiler?.finansman?.ozkaynaklar?.ozkaynaklar || 0,
            toplamFinansman: formData.finansalBilgiler?.finansman?.toplamFinansman || 0
          }
        },
        
        // 🔧 Destek Unsurları model formatına çevir - GÜÇLENLED
        destekUnsurlari: formData.destekUnsurlari?.filter(d => 
          d && d.destekUnsuru && d.destekUnsuru.trim() !== '' && d.sartlari && d.sartlari.trim() !== ''
        ).map(destek => ({
          destekUnsuru: destek.destekUnsuru.trim(),
          sarti: destek.sartlari.trim(), // Frontend: sartlari → Backend: sarti
          aciklama: destek.aciklama?.trim() || ''
        })) || [],
        
        // 🔧 Özel Şartlar model formatına çevir - GÜÇLENLED
        ozelSartlar: formData.ozelSartlar?.filter(s => 
          s && (s.kisaltma?.trim() || s.notu?.trim())
        ).map((sart, index) => ({
          koşulNo: index + 1, // Backend: koşulNo (required)
          koşulMetni: (sart.kisaltma?.trim() || sart.notu?.trim() || ''), // Backend: koşulMetni (required)
          aciklamaNotu: (sart.notu?.trim() || sart.kisaltma?.trim() || '') // Backend: aciklamaNotu
        })) || []
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
      
      const url = isEdit ? `/tesvik/${id}` : '/tesvik';
      const method = isEdit ? 'put' : 'post';
      
      const response = await axios[method](url, mappedData);
      
      if (response.data.success) {
        setSuccess(isEdit ? 'Teşvik başarıyla güncellendi' : 'Teşvik başarıyla oluşturuldu');
        setTimeout(() => {
          navigate('/tesvik/liste');
        }, 2000);
      }
    } catch (error) {
      console.error('🚨 Submit hatası:', error);
      console.error('❌ API Response Error:', error.response?.data);
      
      // Detaylı hata mesajları göster
      let errorMessage = 'Kaydetme sırasında hata oluştu';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
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

  // 🆔 1. KÜNYE BİLGİLERİ - Yatırımcı ve Belge Bilgileri Birleşik
  const renderKunyeBilgileri = () => (
    <Grid container spacing={4}>
      {/* Yatırımcı Bilgileri Bölümü */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', color: '#1e40af' }}>
            <BusinessIcon sx={{ mr: 1 }} />
            YATIRIMCI BİLGİLERİ
          </Typography>
          
          <Grid container spacing={3}>
      
      {/* GM ID */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="GM ID 🆔"
          value={formData.gmId}
          InputProps={{ 
            readOnly: true,
            style: { backgroundColor: '#e5f3ff', fontWeight: 600 }
          }}
          helperText="Otomatik atanan GM ID (Değiştirilemez)"
        />
      </Grid>
      
      {/* TALEP/SONUÇ */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="TALEP/SONUÇ"
          value={formData.kunyeBilgileri?.talepSonuc || ''}
          onChange={(e) => handleFieldChange('kunyeBilgileri.talepSonuc', e.target.value)}
          placeholder="Talep sonucu giriniz..."
        />
      </Grid>
      
      {/* REVIZE ID */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="REVIZE ID"
          value={formData.kunyeBilgileri?.revizeId || ''}
          onChange={(e) => handleFieldChange('kunyeBilgileri.revizeId', e.target.value)}
          placeholder="Revize ID giriniz..."
        />
      </Grid>
      
      {/* FIRMA ID */}
       <Grid item xs={12} md={6}>
         <TextField
           fullWidth
           label="FIRMA ID"
           value={formData.firma || ''}
           InputProps={{ 
             readOnly: true,
             style: { backgroundColor: '#f5f5f5' }
           }}
           helperText="Firma seçiminden otomatik doldurulur"
         />
       </Grid>
      
      {/* YATIRIMCI UNVAN */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="YATIRIMCI UNVAN 🏭"
          value={formData.yatirimciUnvan}
          onChange={(e) => handleFieldChange('yatirimciUnvan', e.target.value)}
          required
          helperText="Firma seçiminde otomatik doldurulur, isteğe bağlı değiştirilebilir"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          🏢 Firma Seçimi
        </Typography>
        <Autocomplete
          fullWidth
          options={templateData.firmalar}
          getOptionLabel={(option) => {
            if (!option) return '';
            return `${option.firmaId} - ${option.tamUnvan}`;
          }}
          value={templateData.firmalar.find(f => f._id === formData.firma) || null}
          onChange={(event, newValue) => {
            if (newValue) {
              handleFieldChange('firma', newValue._id);
              // Seçilen firmanın ünvanını otomatik ata
              handleFieldChange('yatirimciUnvan', newValue.tamUnvan);
            } else {
              handleFieldChange('firma', '');
              handleFieldChange('yatirimciUnvan', '');
            }
          }}
          filterOptions={(options, { inputValue }) => {
            // Çoklu arama: Firma ID, Ünvan, Vergi No
            const filtered = options.filter(option => {
              const searchText = inputValue.toLowerCase();
              return (
                option.firmaId.toLowerCase().includes(searchText) ||
                option.tamUnvan.toLowerCase().includes(searchText) ||
                (option.vergiNoTC && option.vergiNoTC.includes(searchText))
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
                sx={{
                  display: 'flex !important',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  p: 2,
                  borderBottom: '1px solid #f0f0f0',
                  '&:hover': {
                    backgroundColor: '#f8fafc'
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  {option.firmaId}
                </Typography>
                <Typography variant="body2" sx={{ color: '#2c3e50', lineHeight: 1.2 }}>
                  {option.tamUnvan}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Vergi No: {option.vergiNoTC} • İl: {option.firmaIl}
                </Typography>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Firma Seçimi 🏢"
              placeholder="Firma ID, ünvan veya vergi no yazın... (örn: A000001)"
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <BusinessIcon sx={{ color: '#1976d2', mr: 1 }} />
                ),
              }}
              helperText="💡 Klavye okları ile gezin, Enter ile seçin, Firma ID/Ünvan/Vergi No ile arayın"
            />
          )}
          loading={loading}
          loadingText="Firmalar yükleniyor..."
          noOptionsText="Firma bulunamadı. Arama kriterini değiştirin."
          clearOnEscape
          autoHighlight
          openOnFocus
          sx={{ mb: 2 }}
        />
        
        {/* Seçilen Firma Bilgisi */}
        {formData.firma && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              ✅ <strong>Seçilen Firma:</strong> {templateData.firmalar.find(f => f._id === formData.firma)?.firmaId} - {templateData.firmalar.find(f => f._id === formData.firma)?.tamUnvan}
            </Typography>
          </Alert>
        )}
        
        <Typography variant="caption" color="text.secondary">
          📊 Toplam {templateData.firmalar.length} firma mevcut • Güncel veri
        </Typography>
      </Grid>
      
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Yatırımcı Ünvanı 🏭"
                value={formData.yatirimciUnvan}
                onChange={(e) => handleFieldChange('yatirimciUnvan', e.target.value)}
                required
                helperText="Firma seçiminde otomatik doldurulur, isteğe bağlı değiştirilebilir"
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      {/* Belge Bilgileri Bölümü */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fef9e7', border: '1px solid #f59e0b' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', color: '#d97706' }}>
            <BusinessIcon sx={{ mr: 1 }} />
            BELGE BİLGİLERİ
          </Typography>
          
          <Grid container spacing={3}>
            {/* Teşvik ID */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teşvik ID 📋"
                value={formData.tesvikId}
                InputProps={{ 
                  readOnly: true,
                  style: { backgroundColor: '#fef3c7', fontWeight: 600 }
                }}
                helperText="Otomatik atanan Teşvik ID (Değiştirilemez)"
              />
            </Grid>
            
            {/* Belge No */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE NO"
                value={formData.belgeYonetimi.belgeNo}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeNo', e.target.value)}
                required
              />
            </Grid>
            
            {/* Belge Tarihi */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE TARIHI"
                type="date"
                value={formData.belgeYonetimi.belgeTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            {/* Belge Müracaat Tarihi */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE MÜRACAAT TARIHI"
                type="date"
                value={formData.belgeYonetimi.belgeMuracaatTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeMuracaatTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* Dayandığı Kanun */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>DAYANDIĞI KANUN</InputLabel>
                <Select
                  value={formData.belgeYonetimi.dayandigiKanun}
                  onChange={(e) => handleFieldChange('belgeYonetimi.dayandigiKanun', e.target.value)}
                  label="DAYANDIĞI KANUN"
                >
                  {templateData.dayandigiKanunlar?.map((kanun) => (
                    <MenuItem key={kanun.value} value={kanun.value}>
                      {kanun.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Belge Durumu */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>BELGE DURUMU</InputLabel>
                <Select
                  value={formData.belgeYonetimi.belgeDurumu}
                  onChange={(e) => handleFieldChange('belgeYonetimi.belgeDurumu', e.target.value)}
                  label="BELGE DURUMU"
                >
                  {templateData.belgeDurumlari?.map((durum) => (
                    <MenuItem key={durum.value} value={durum.value}>
                      {durum.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );

  // 📄 2. BELGE BİLGİLERİ  
  const renderBelgeBilgileri = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            <BusinessIcon sx={{ fontSize: 16, mr: 1 }} />
            BELGE BİLGİLERİ - Teşvik belgesi ile ilgili tüm bilgiler
          </Typography>
        </Alert>
      </Grid>
      
      {/* Belge Temel Bilgileri */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fef9e7' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ mr: 1 }} />
            Belge Temel Bilgileri
          </Typography>
          
          <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
                label="2-Yatırım Konusu"
                value={formData.yatirimBilgileri1.yatirimKonusu}
                onChange={(e) => handleFieldChange('yatirimBilgileri1.yatirimKonusu', e.target.value)}
          multiline
          rows={3}
          required
                placeholder="Yatırım konusu detayını giriniz..."
        />
      </Grid>
      
            {/* Cinsi Dropdownları */}
            <Grid item xs={12} md={3}>
        <FormControl fullWidth>
                <InputLabel>3-Cinsi(1)</InputLabel>
          <Select
                  value={formData.yatirimBilgileri1.cins1}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins1', e.target.value)}
                  label="3-Cinsi(1)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins1-${tip.value}-${tipIndex}`} value={tip.value}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tip.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tip.aciklama}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* 🆕 Yeni Cinsi Ekle Butonu */}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openAddOptionModal('yatirimTipleri', 'Yatırım Cinsi')}
                sx={{ mt: 1, fontSize: '0.75rem' }}
                color="primary"
                variant="outlined"
              >
                Yeni Cinsi Ekle
              </Button>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>3-Cinsi(2)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins2}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins2', e.target.value)}
                  label="3-Cinsi(2)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins2-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>3-Cinsi(3)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins3}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins3', e.target.value)}
                  label="3-Cinsi(3)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins3-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>3-Cinsi(4)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins4}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins4', e.target.value)}
                  label="3-Cinsi(4)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins4-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>4-Destek Sınıfı</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.destekSinifi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.destekSinifi', e.target.value)}
                  label="4-Destek Sınıfı"
          >
            {templateData.destekSiniflari?.map((sinif) => (
                    <MenuItem key={sinif.value} value={sinif.value}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {sinif.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sinif.aciklama}
                        </Typography>
                      </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
              {/* 🆕 Yeni Destek Sınıfı Ekle Butonu */}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openAddOptionModal('destekSiniflari', 'Destek Sınıfı')}
                sx={{ mt: 1, fontSize: '0.75rem' }}
                color="primary"
                variant="outlined"
              >
                Yeni Destek Sınıfı Ekle
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Yatırım İle İlgili Bilgiler - 2 */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0fdf4' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <EngineeringIcon sx={{ mr: 1 }} />
            Yatırım İle İlgili Bilgiler - 2
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {/* İl-İlçe Seçimi - EnhancedCitySelector Bileşeni ile */}
              <EnhancedCitySelector
                selectedCity={formData.yatirimBilgileri2.yerinIl || ''}
                selectedDistrict={formData.yatirimBilgileri2.yerinIlce || ''}
                onCityChange={(city) => {
                  handleFieldChange('yatirimBilgileri2.yerinIl', city);
                  // İl değişince ilçeyi sıfırla
                  handleFieldChange('yatirimBilgileri2.yerinIlce', '');
                }}
                onDistrictChange={(district) => {
                  handleFieldChange('yatirimBilgileri2.yerinIlce', district);
                }}
                required={true}
                showCodes={true}
                // Z-index sorununu çözmek için özel stiller
                popperProps={{
                  style: {
                    zIndex: 9999,
                    position: 'absolute'
                  }
                }}
                paperProps={{
                  elevation: 8,
                  style: {
                    maxHeight: '300px', 
                    overflow: 'auto'
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                ℹ️ İl-İlçe Seçimi Hakkında
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  Türkiye'nin tüm il ve ilçelerini içeren gelişmiş seçici kullanılmaktadır. 
                  Önce il sonra ilçe seçilmelidir.
                </Typography>
              </Alert>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (1)"
                value={formData.yatirimBilgileri2.yatirimAdresi1}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi1', e.target.value)}
              />
    </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (2)"
                value={formData.yatirimBilgileri2.yatirimAdresi2}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi2', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (3)"
                value={formData.yatirimBilgileri2.yatirimAdresi3}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi3', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>OSB İse Müdürlük</InputLabel>
                <Select
                  value={formData.yatirimBilgileri2.ossBelgeMudavimi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri2.ossBelgeMudavimi', e.target.value)}
                  label="OSB İse Müdürlük"
                >
                  {templateData.osbOptions?.map((osb, index) => (
                    <MenuItem key={index} value={osb.osb}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {osb.osb}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {osb.il}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* 🆕 Yeni OSB Ekle Butonu */}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openAddOptionModal('osbOptions', 'OSB Müdürlük')}
                sx={{ mt: 1, fontSize: '0.75rem' }}
                color="primary"
                variant="outlined"
              >
                Yeni OSB Ekle
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Belge Yönetimi */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fef9e7' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ mr: 1 }} />
            Belge Bilgileri
          </Typography>
          
          {/* İlk Satır Belge Bilgileri */}
          <Grid container spacing={2}>
            {/* BELGE ID */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE ID"
                value={formData.belgeYonetimi.belgeId}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeId', e.target.value)}
                required
              />
            </Grid>
            
            {/* BELGE NO */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE NO"
                value={formData.belgeYonetimi.belgeNo}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeNo', e.target.value)}
                required
              />
            </Grid>
            
            {/* BELGE TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE TARIHI"
                type="date"
                value={formData.belgeYonetimi.belgeTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            {/* BELGE MURACAAT TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE MURACAAT TARIHI"
                type="date"
                value={formData.belgeYonetimi.belgeMuracaatTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeMuracaatTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* MÜRACAAT SAYISI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="MÜRACAAT SAYISI"
                value={formData.belgeYonetimi.belgeMuracaatNo}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeMuracaatNo', e.target.value)}
              />
            </Grid>
            
            {/* BELGE BASLAMA TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE BASLAMA TARIHI"
                type="date"
                value={formData.belgeYonetimi.belgeBaslamaTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeBaslamaTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
      
            {/* BELGE BITIS TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE BITIS TARIHI"
                type="date"
                value={formData.belgeYonetimi.belgeBitisTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeBitisTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* SÜRE UZATIM TARİHİ */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SÜRE UZATIM TARİHİ"
                type="date"
                value={formData.belgeYonetimi.uzatimTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.uzatimTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* ÖZELLİKLİ YATIRIM İSE */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>ÖZELLİKLİ YATIRIM İSE</InputLabel>
                <Select
                  value={formData.belgeYonetimi.ozellikliYatirim || ''}
                  onChange={(e) => handleFieldChange('belgeYonetimi.ozellikliYatirim', e.target.value)}
                  label="ÖZELLİKLİ YATIRIM İSE"
                >
                  <MenuItem key="evet" value="evet">Evet</MenuItem>
                  <MenuItem key="hayir" value="hayir">Hayır</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* DAYANDIĞI KANUN */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>DAYANDIĞI KANUN</InputLabel>
                <Select
                  value={formData.belgeYonetimi.dayandigiKanun}
                  onChange={(e) => handleFieldChange('belgeYonetimi.dayandigiKanun', e.target.value)}
                  label="DAYANDIĞI KANUN"
                >
                  {templateData.dayandigiKanunlar?.map((kanun) => (
                    <MenuItem key={kanun.value} value={kanun.value}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {kanun.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {kanun.aciklama}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openAddOptionModal('dayandigiKanunlar', 'Dayandığı Kanun')}
                sx={{ mt: 1, fontSize: '0.75rem' }}
                color="primary"
                variant="outlined"
              >
                Yeni Kanun Ekle
              </Button>
            </Grid>
            
            {/* BELGE DURUMU */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>BELGE DURUMU</InputLabel>
                <Select
                  value={formData.belgeYonetimi.belgeDurumu}
                  onChange={(e) => handleFieldChange('belgeYonetimi.belgeDurumu', e.target.value)}
                  label="BELGE DURUMU"
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center'
                    }
                  }}
                >
                  {templateData.belgeDurumlari?.map((durum) => (
                    <MenuItem key={durum.value} value={durum.value}>
                      <Chip
                        label={durum.label}
                        size="small"
                        sx={{
                          backgroundColor: durum.backgroundColor,
                          color: durum.color,
                          fontWeight: 600
                        }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
      </Grid>
        </Paper>
      </Grid>

      {/* Yatırım İle İlgili Bilgiler - 1 */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f8fafc' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <EngineeringIcon sx={{ mr: 1 }} />
            Yatırım İle İlgili Bilgiler - 1
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Yatırım Konusu"
                value={formData.yatirimBilgileri1.yatirimKonusu}
                onChange={(e) => handleFieldChange('yatirimBilgileri1.yatirimKonusu', e.target.value)}
                placeholder="Yatırım konusunu giriniz..."
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(1)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins1}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins1', e.target.value)}
                  label="Cinsi(1)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins1-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(2)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins2}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins2', e.target.value)}
                  label="Cinsi(2)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins2-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(3)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins3}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins3', e.target.value)}
                  label="Cinsi(3)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins3-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(4)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins4}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins4', e.target.value)}
                  label="Cinsi(4)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins4-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Destek Sınıfı</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.destekSinifi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.destekSinifi', e.target.value)}
                  label="Destek Sınıfı"
                >
                  {templateData.destekSiniflari?.map((sinif) => (
                    <MenuItem key={sinif.value} value={sinif.value}>
                      {sinif.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      {/* Yatırım İle İlgili Bilgiler - 2 */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0f9ff' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📍 Yatırım Yeri Bilgileri
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırımın Yapılacağı İl"
                value={formData.yatirimBilgileri2.yerinIl}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yerinIl', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırımın Yapılacağı İlçe"
                value={formData.yatirimBilgileri2.yerinIlce}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yerinIlce', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (1)"
                value={formData.yatirimBilgileri2.yatirimAdresi1}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi1', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (2)"
                value={formData.yatirimBilgileri2.yatirimAdresi2}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi2', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (3)"
                value={formData.yatirimBilgileri2.yatirimAdresi3}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi3', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>OSB Müdürlük</InputLabel>
                <Select
                  value={formData.yatirimBilgileri2.osbMudurluk}
                  onChange={(e) => handleFieldChange('yatirimBilgileri2.osbMudurluk', e.target.value)}
                  label="OSB Müdürlük"
                >
                  {templateData.osbOptions?.map((osb) => (
                    <MenuItem key={osb.value} value={osb.value}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {osb.label}
                        </Typography>
                        {osb.sehir && (
                          <Typography variant="caption" color="text.secondary">
                            {osb.sehir}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      {/* İstihdam */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0fdf4' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            👥 İstihdam Bilgileri
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Mevcut Kişi"
                type="number"
                value={formData.istihdam.mevcutKisi}
                onChange={(e) => handleFieldChange('istihdam.mevcutKisi', parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="İlave Kişi"
                type="number"
                value={formData.istihdam.ilaveKisi}
                onChange={(e) => handleFieldChange('istihdam.ilaveKisi', parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Toplam Kişi"
                type="number"
                value={formData.istihdam.toplamKisi}
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: '#dcfce7' }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );

  // 🏢 2. YATIRIM İLE İLGİLİ BİLGİLER - Yatırım Konusu, Cinsi, Destek Sınıfı, Yer Bilgileri ve İstihdam
  const renderYatirimBilgileri = () => (
    <Grid container spacing={3}>
      {/* Yatırım İle İlgili Bilgiler - 1 */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f8fafc' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <EngineeringIcon sx={{ mr: 1 }} />
            Yatırım İle İlgili Bilgiler - 1
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Yatırım Konusu"
                value={formData.yatirimBilgileri1.yatirimKonusu}
                onChange={(e) => handleFieldChange('yatirimBilgileri1.yatirimKonusu', e.target.value)}
                placeholder="Yatırım konusunu giriniz..."
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(1)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins1}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins1', e.target.value)}
                  label="Cinsi(1)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins1-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(2)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins2}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins2', e.target.value)}
                  label="Cinsi(2)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins2-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(3)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins3}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins3', e.target.value)}
                  label="Cinsi(3)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins3-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cinsi(4)</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.cins4}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cins4', e.target.value)}
                  label="Cinsi(4)"
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                    <MenuItem key={`cins4-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Destek Sınıfı</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.destekSinifi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.destekSinifi', e.target.value)}
                  label="Destek Sınıfı"
                >
                  {templateData.destekSiniflari?.map((sinif) => (
                    <MenuItem key={sinif.value} value={sinif.value}>
                      {sinif.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      {/* Yatırım İle İlgili Bilgiler - 2 */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0f9ff' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📍 Yatırım Yeri Bilgileri
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırımın Yapılacağı İl"
                value={formData.yatirimBilgileri2.yerinIl}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yerinIl', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırımın Yapılacağı İlçe"
                value={formData.yatirimBilgileri2.yerinIlce}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yerinIlce', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (1)"
                value={formData.yatirimBilgileri2.yatirimAdresi1}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi1', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (2)"
                value={formData.yatirimBilgileri2.yatirimAdresi2}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi2', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Yatırım Adresi (3)"
                value={formData.yatirimBilgileri2.yatirimAdresi3}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yatirimAdresi3', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>OSB Müdürlük</InputLabel>
                <Select
                  value={formData.yatirimBilgileri2.osbMudurluk || ''}
                  onChange={(e) => handleFieldChange('yatirimBilgileri2.osbMudurluk', e.target.value)}
                  label="OSB Müdürlük"
                >
                  {templateData.osbOptions?.map((osb) => (
                    <MenuItem key={osb.value} value={osb.value}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {osb.label}
                        </Typography>
                        {osb.sehir && (
                          <Typography variant="caption" color="text.secondary">
                            {osb.sehir}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      {/* İstihdam */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0fdf4' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            👥 İstihdam Bilgileri
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Mevcut Kişi"
                type="number"
                value={formData.istihdam.mevcutKisi}
                onChange={(e) => handleFieldChange('istihdam.mevcutKisi', parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="İlave Kişi"
                type="number"
                value={formData.istihdam.ilaveKisi}
                onChange={(e) => handleFieldChange('istihdam.ilaveKisi', parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Toplam Kişi"
                type="number"
                value={formData.istihdam.toplamKisi}
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: '#dcfce7' }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );

  // 📦 4. ÜRÜN BİLGİLERİ (U$97 Kodları) - Excel Benzeri
  const renderUrunBilgileri = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          📦 Ürün Bilgileri (U$97 Kodları)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Excel formundaki U$97 kodlarına karşılık gelen ürün bilgileri - CSV'den {templateData.u97Kodlari?.length || 0} adet ürün kodu
        </Typography>
        
        {/* Kategori İstatistikleri */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['Tahıl', 'Sebze', 'Meyve', 'Büyükbaş', 'Küçükbaş', 'Yağlı Tohum'].map((kategori) => {
            const count = templateData.u97Kodlari?.filter(u => u.kategori === kategori).length || 0;
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
      
      {/* 🔧 Excel Benzeri Araç Çubuğu */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyTableData}
            variant="outlined"
            color="primary"
          >
            📋 Tabloyu Kopyala
          </Button>
          <Button
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleClearAllUrunData}
            variant="outlined"
            color="error"
          >
            🗑️ Tümünü Temizle
          </Button>
          <Typography variant="body2" sx={{ ml: 'auto', alignSelf: 'center', color: '#6b7280' }}>
            💡 Excel'den kopyalayıp tabloya yapıştırabilirsiniz (Ctrl+V)
          </Typography>
        </Box>
      </Grid>
      
      <Grid item xs={12}>
        <TableContainer 
          component={Paper}
          onPaste={handleTablePaste}
          tabIndex={0}
          sx={{ 
            '&:focus': { outline: '2px solid #3b82f6', outlineOffset: '2px' },
            cursor: 'text'
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                <TableCell sx={{ fontWeight: 600 }}>U$97 Kodu</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Ürün Açıklaması</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Mevcut</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>İlave</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Toplam</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Kapasite</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Kapasite Birimi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formData.urunBilgileri.map((urun, index) => (
                <TableRow key={urun.kod}>
                  <TableCell>
                    <FormControl size="small" sx={{ width: 160 }}>
                      <Select
                        value={urun.kod}
                        onChange={(e) => {
                          const selectedU97 = templateData.u97Kodlari?.find(u => u.kod === e.target.value);
                          handleUrunChange(index, 'kod', e.target.value);
                          if (selectedU97) {
                            handleUrunChange(index, 'aciklama', selectedU97.aciklama);
                          }
                        }}
                        displayEmpty
                        size="small"
                      >
                        <MenuItem key={`urun-${urun.kod}`} value={urun.kod}>
                          <Chip 
                            label={urun.kod} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </MenuItem>
                        {templateData.u97Kodlari?.map((u97) => (
                          <MenuItem key={u97.kod} value={u97.kod}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                                {u97.kod}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                                {u97.aciklama}
                              </Typography>
                              <Chip 
                                label={u97.kategori} 
                                size="small" 
                                variant="outlined" 
                                sx={{ mt: 0.5, fontSize: '0.7rem', height: '16px' }}
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={urun.aciklama}
                      onChange={(e) => handleUrunChange(index, 'aciklama', e.target.value)}
                      placeholder="Ürün açıklaması girin..."
                      sx={{ minWidth: 200 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={urun.mevcut}
                      onChange={(e) => handleUrunChange(index, 'mevcut', e.target.value)}
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={urun.ilave}
                      onChange={(e) => handleUrunChange(index, 'ilave', e.target.value)}
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={urun.toplam}
                      InputProps={{ readOnly: true }}
                      sx={{ width: 80, backgroundColor: '#e5f3ff' }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={urun.kapsite}
                      onChange={(e) => handleUrunChange(index, 'kapsite', e.target.value)}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ width: 120 }}>
                      <Select
                        value={urun.kapasite_birimi || ''}
                        onChange={(e) => handleUrunChange(index, 'kapasite_birimi', e.target.value)}
                        displayEmpty
                      >
                        <MenuItem key="empty-kapasite" value="">
                          <em>Seçiniz</em>
                        </MenuItem>
                        {templateData.kapasiteBirimleri?.map((birim) => (
                          <MenuItem key={birim} value={birim}>
                            {birim}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 🆕 Yeni U$97 Kodu Ekle Butonu */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => openAddOptionModal('u97Kodlari', 'U$97 Ürün Kodu')}
            color="primary"
            variant="outlined"
          >
            Yeni U$97 Kodu Ekle
          </Button>
        </Box>

        {/* İstatistikler */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            💡 <strong>Toplam Satır:</strong> {formData.urunBilgileri.length} | 
            <strong> Doldurulmuş:</strong> {formData.urunBilgileri.filter(u => u.aciklama).length} | 
            <strong> CSV'den Seçenek:</strong> {templateData.u97Kodlari?.length || 0} adet
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );

  // 🎯 3. DESTEK UNSURLARI - Excel Benzeri Grid Yapısı
  const renderDestekUnsurlari = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          🎯 Destek Unsurları
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Excel formundaki 8 adet destek unsuru ve şartları - CSV'den {templateData.destekUnsurlariOptions?.length || 0} destek türü
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

      {/* Excel Benzeri Grid - İlk 6 Alan (2x3) */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fdf2f8' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Destek Unsurları (1-6)
          </Typography>
          
          <Grid container spacing={2}>
            {/* İlk Satır */}
            {[0, 1, 2].map((col) => (
              <Grid item xs={12} md={4} key={col}>
                <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 1, p: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
                    Destek Unsurları({col + 1})
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <Select
                      value={formData.destekUnsurlari[col]?.destekUnsuru || ''}
                      onChange={(e) => handleDestekChange(col, 'destekUnsuru', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem key="empty-destek-1" value="">
                        <em>Seçiniz</em>
                      </MenuItem>
                      {templateData.destekUnsurlariOptions?.map((destek, destekIndex) => (
                        <MenuItem key={`destek-row1-col${col}-${destekIndex}-${destek.value}`} value={destek.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={destek.kategori}
                              size="small"
                              sx={{ backgroundColor: destek.renk, color: 'white', fontSize: '0.7rem' }}
                            />
                            <Typography variant="body2">{destek.label}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
                    Şartları({col + 1})
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.destekUnsurlari[col]?.sartlari || ''}
                      onChange={(e) => handleDestekChange(col, 'sartlari', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem key="empty-destek-sart-1" value="">
                        <em>Seçiniz</em>
                      </MenuItem>
                      {templateData.destekSartlariOptions?.map((sart, sartIndex) => (
                        <MenuItem key={`sart-row1-col${col}-${sartIndex}-${sart.value}`} value={sart.value}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {sart.label}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip label={sart.kategori} size="small" variant="outlined" />
                              {sart.yuzde && <Chip label={`%${sart.yuzde}`} size="small" color="success" />}
                              {sart.yil && <Chip label={`${sart.yil} yıl`} size="small" color="info" />}
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            ))}

            {/* İkinci Satır */}
            {[3, 4, 5].map((col) => (
              <Grid item xs={12} md={4} key={col}>
                <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 1, p: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
                    Destek Unsurları({col + 1})
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <Select
                      value={formData.destekUnsurlari[col]?.destekUnsuru || ''}
                      onChange={(e) => handleDestekChange(col, 'destekUnsuru', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem key={`empty-destek-${col}`} value="">
                        <em>Seçiniz</em>
                      </MenuItem>
                      {templateData.destekUnsurlariOptions?.map((destek, destekIndex) => (
                        <MenuItem key={`destek-row2-col${col}-${destekIndex}-${destek.value}`} value={destek.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={destek.kategori}
                              size="small"
                              sx={{ backgroundColor: destek.renk, color: 'white', fontSize: '0.7rem' }}
                            />
                            <Typography variant="body2">{destek.label}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
                    Şartları({col + 1})
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.destekUnsurlari[col]?.sartlari || ''}
                      onChange={(e) => handleDestekChange(col, 'sartlari', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem key={`empty-sart-${col}`} value="">
                        <em>Seçiniz</em>
                      </MenuItem>
                      {templateData.destekSartlariOptions?.map((sart, sartIndex) => (
                        <MenuItem key={`sart-row2-col${col}-${sartIndex}-${sart.value}`} value={sart.value}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {sart.label}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip label={sart.kategori} size="small" variant="outlined" />
                              {sart.yuzde && <Chip label={`%${sart.yuzde}`} size="small" color="success" />}
                              {sart.yil && <Chip label={`${sart.yil} yıl`} size="small" color="info" />}
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      {/* Son 2 Alan (7-8) */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0f9ff' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Destek Unsurları (7-8)
          </Typography>
          
          <Grid container spacing={2}>
            {[6, 7].map((col) => (
              <Grid item xs={12} md={6} key={col}>
                <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 1, p: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
                    Destek Unsurları({col + 1})
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <Select
                      value={formData.destekUnsurlari[col]?.destekUnsuru || ''}
                      onChange={(e) => handleDestekChange(col, 'destekUnsuru', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Seçiniz</em>
                      </MenuItem>
                      {templateData.destekUnsurlariOptions?.map((destek, destekIndex) => (
                        <MenuItem key={`destek-row3-col${col}-${destekIndex}-${destek.value}`} value={destek.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={destek.kategori}
                              size="small"
                              sx={{ backgroundColor: destek.renk, color: 'white', fontSize: '0.7rem' }}
                            />
                            <Typography variant="body2">{destek.label}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
                    Şartları({col + 1})
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.destekUnsurlari[col]?.sartlari || ''}
                      onChange={(e) => handleDestekChange(col, 'sartlari', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Seçiniz</em>
                      </MenuItem>
                      {templateData.destekSartlariOptions?.map((sart, sartIndex) => (
                        <MenuItem key={`sart-row3-col${col}-${sartIndex}-${sart.value}`} value={sart.value}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {sart.label}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip label={sart.kategori} size="small" variant="outlined" />
                              {sart.yuzde && <Chip label={`%${sart.yuzde}`} size="small" color="success" />}
                              {sart.yil && <Chip label={`${sart.yil} yıl`} size="small" color="info" />}
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
        
        {/* 🆕 Yeni Destek Unsuru Ekle Butonu */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => openAddOptionModal('destekUnsurlariOptions', 'Destek Unsuru')}
            color="primary"
            variant="outlined"
          >
            Yeni Destek Unsuru Ekle
          </Button>
        </Box>
      </Grid>

      {/* İstatistikler */}
      <Grid item xs={12}>
        <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            💡 <strong>Toplam Alan:</strong> 8 | 
            <strong> Doldurulmuş:</strong> {formData.destekUnsurlari.filter(d => d.destekUnsuru).length} | 
            <strong> Şart Doldurulmuş:</strong> {formData.destekUnsurlari.filter(d => d.sartlari).length} |
            <strong> CSV'den Seçenek:</strong> {templateData.destekUnsurlariOptions?.length || 0} destek, {templateData.destekSartlariOptions?.length || 0} şart
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );

  // 🏷️ 4. ÖZEL ŞARTLAR - Excel Benzeri 7 Alan
  const renderOzelSartlar = () => (
    <Grid container spacing={3}>
      {/* Özel Şartlar - Excel Benzeri 7 Alan */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fff7ed' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            🏷️ Özel Şartlar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Excel formundaki 7 adet özel şart alanı - CSV'den {templateData.ozelSartKisaltmalari?.length || 0} kısaltma
          </Typography>

          {/* Kategori İstatistikleri */}
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

          {/* İlk 6 Alan (2x3 Grid) */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box sx={{ border: '1px solid #fed7aa', borderRadius: 1, p: 2, backgroundColor: '#fef3f2' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#ea580c' }}>
                    Özel Şart Kısaltma {index + 1}
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <Select
                      value={formData.ozelSartlar[index]?.kisaltma || ''}
                      onChange={(e) => handleOzelSartChange(index, 'kisaltma', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Seçiniz</em>
                      </MenuItem>
                      {templateData.ozelSartKisaltmalari?.map((kisaltma) => (
                        <MenuItem key={kisaltma.value} value={kisaltma.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={kisaltma.kategori}
                              size="small"
                              sx={{ backgroundColor: kisaltma.renk, color: 'white', fontSize: '0.7rem' }}
                            />
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {kisaltma.label}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#ea580c' }}>
                    Özel Şart Notu {index + 1}
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.ozelSartlar[index]?.notu || ''}
                      onChange={(e) => handleOzelSartChange(index, 'notu', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Seçiniz veya yazınız</em>
                      </MenuItem>
                      {templateData.ozelSartNotlari?.map((not, notIndex) => (
                        <MenuItem key={notIndex} value={not}>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {not}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* 7. Alan (Tek Başına) */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ border: '1px solid #fed7aa', borderRadius: 1, p: 2, backgroundColor: '#fef3f2' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#ea580c' }}>
                  Özel Şart Kısaltma 7
                </Typography>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <Select
                    value={formData.ozelSartlar[6]?.kisaltma || ''}
                    onChange={(e) => handleOzelSartChange(6, 'kisaltma', e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Seçiniz</em>
                    </MenuItem>
                    {templateData.ozelSartKisaltmalari?.map((kisaltma) => (
                      <MenuItem key={kisaltma.value} value={kisaltma.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={kisaltma.kategori}
                            size="small"
                            sx={{ backgroundColor: kisaltma.renk, color: 'white', fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {kisaltma.label}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#ea580c' }}>
                  Özel Şart Notu 7
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={formData.ozelSartlar[6]?.notu || ''}
                    onChange={(e) => handleOzelSartChange(6, 'notu', e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Seçiniz veya yazınız</em>
                    </MenuItem>
                    {templateData.ozelSartNotlari?.map((not, notIndex) => (
                      <MenuItem key={notIndex} value={not}>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                          {not}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>

          {/* 🆕 Yeni Özel Şart Ekle Butonu */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => openAddOptionModal('ozelSartKisaltmalari', 'Özel Şart Kısaltması')}
              color="primary"
              variant="outlined"
            >
              Yeni Özel Şart Ekle
            </Button>
          </Box>

          {/* İstatistikler */}
          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              🏷️ <strong>Toplam Alan:</strong> 7 | 
              <strong> Kısaltma Doldurulmuş:</strong> {formData.ozelSartlar.filter(s => s.kisaltma).length} | 
              <strong> Not Doldurulmuş:</strong> {formData.ozelSartlar.filter(s => s.notu).length} |
              <strong> CSV'den Seçenek:</strong> {templateData.ozelSartKisaltmalari?.length || 0} kısaltma, {templateData.ozelSartNotlari?.length || 0} not
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );



  // Finansal bilgiler handler - Excel yapısına uygun
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
     
    // 🔧 Finansal değişiklikten sonra hesaplamaları tetikle
    setTimeout(() => {
      calculateFinansalTotals();
    }, 0);
  };

  // 🔧 Finansal otomatik hesaplamalar - TAMAMEN DÜZELTİLDİ
  const calculateFinansalTotals = useCallback(() => {
    if (!formData.finansalBilgiler) return; // Safety check

    const finansal = formData.finansalBilgiler;
    
    // Güvenli sayı dönüştürme fonksiyonu
    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };
    
    console.log('💰 Finansal hesaplama başladı:', finansal);
    
    // 1. Arazi-Arsa Bedeli hesapla
    const araziTotal = toNumber(finansal.araziArsaBedeli?.metrekaresi) * toNumber(finansal.araziArsaBedeli?.birimFiyatiTl);
    console.log('🏞️ Arazi Total:', araziTotal);
    
          // 2. Toplam Yabancı Kaynak hesapla - EXCEL'E UYGUN KAPSAMLI
      const bankKredisi = toNumber(finansal.finansman?.yabanciKaynaklar?.bankKredisi);
      const ikinciElFiyat = toNumber(finansal.finansman?.yabanciKaynaklar?.ikinciElFiyatFarki);
      const kullanilmisTeçhizat = toNumber(finansal.finansman?.yabanciKaynaklar?.kullanilmisTeçhizatBedeli);
      const digerDisKaynak = toNumber(finansal.finansman?.yabanciKaynaklar?.digerDisKaynaklar);
      const digerYabanci = toNumber(finansal.finansman?.yabanciKaynaklar?.digerYabanciKaynak);
      
      // Excel'deki gibi alt kalemler toplamı
      const toplamYabanciKaynak = bankKredisi + ikinciElFiyat + kullanilmisTeçhizat + digerDisKaynak + digerYabanci;
      console.log('💸 Yabancı Kaynak Breakdown:', { bankKredisi, ikinciElFiyat, kullanilmisTeçhizat, digerDisKaynak, digerYabanci });
      console.log('💸 Yabancı Kaynak Total:', toplamYabanciKaynak);
    
    // 3. Toplam Finansman hesapla (Özkaynak + Yabancı Kaynak)
    const ozKaynak = toNumber(finansal.finansman?.ozkaynaklar?.ozkaynaklar);
    const toplamFinansman = ozKaynak + toplamYabanciKaynak;
    console.log('💼 Öz Kaynak:', ozKaynak, 'Toplam Finansman:', toplamFinansman);
    
    // 4. Toplam Bina İnşaat Gideri hesapla
    const anaBina = toNumber(finansal.binaInsaatGiderleri?.anaBinaVeTesisleri);
    const yardimciBina = toNumber(finansal.binaInsaatGiderleri?.yardimciIsBinaVeIcareBinalari);
    const yeraltiBina = toNumber(finansal.binaInsaatGiderleri?.yeraltiAnaGalerileri);
    const toplamBina = anaBina + yardimciBina + yeraltiBina;
    console.log('🏗️ Bina Total:', toplamBina, '=', anaBina, '+', yardimciBina, '+', yeraltiBina);
    
    // 5. Toplam Makine Teçhizat (TL) hesapla
    const makineIthal = toNumber(finansal.makineTeçhizatGiderleri?.tl?.ithal);
    const makineYerli = toNumber(finansal.makineTeçhizatGiderleri?.tl?.yerli);
    const toplamMakineTL = makineIthal + makineYerli;
    console.log('🏭 Makine TL Total:', toplamMakineTL, '=', makineIthal, '+', makineYerli);
    
    // 6. Toplam İthal Makine ($) hesapla
    const makineYeni = toNumber(finansal.makineTeçhizatGiderleri?.dolar?.yeniMakine);
    const makineKullanilmis = toNumber(finansal.makineTeçhizatGiderleri?.dolar?.kullanilmisMakine);
    const toplamMakineDolar = makineYeni + makineKullanilmis;
    console.log('💲 Makine Dolar Total:', toplamMakineDolar, '=', makineYeni, '+', makineKullanilmis);
    
    // 7. Toplam Diğer Yatırım Harcamaları hesapla
    const yardimciIsl = toNumber(finansal.digerYatirimHarcamalari?.yardimciIslMakTeçGid);
    const ithalatGum = toNumber(finansal.digerYatirimHarcamalari?.ithalatVeGumGiderleri);
    const tasimaSignorta = toNumber(finansal.digerYatirimHarcamalari?.tasimaVeSigortaGiderleri);
    const etudProje = toNumber(finansal.digerYatirimHarcamalari?.etudVeProjeGiderleri);
    const digerGider = toNumber(finansal.digerYatirimHarcamalari?.digerGiderleri);
    const toplamDiger = yardimciIsl + ithalatGum + tasimaSignorta + etudProje + digerGider;
    console.log('📊 Diğer Harcamalar Total:', toplamDiger);
    
    // 8. TOPLAM SABİT YATIRIM TUTARI = Arazi + Bina + Makine(TL) + Diğer (Finansman ayrı)
    const toplamSabitYatirim = araziTotal + toplamBina + toplamMakineTL + toplamDiger;
    console.log('🎯 TOPLAM SABİT YATIRIM:', toplamSabitYatirim, '=', araziTotal, '+', toplamBina, '+', toplamMakineTL, '+', toplamDiger);
    
    // Güncellemeleri uygula - Sadece hesaplanan alanları güncelle
    setFormData(prev => ({
      ...prev,
      finansalBilgiler: {
        ...prev.finansalBilgiler,
        araziArsaBedeli: {
          ...prev.finansalBilgiler?.araziArsaBedeli,
          araziArsaBedeli: araziTotal
        },
        finansman: {
          ...prev.finansalBilgiler?.finansman,
          toplamFinansman,
          yabanciKaynaklar: {
            ...prev.finansalBilgiler?.finansman?.yabanciKaynaklar,
            toplamYabanciKaynak: toplamYabanciKaynak // 🔧 Excel detaylarından hesaplanan toplam
          }
        },
        binaInsaatGiderleri: {
          ...prev.finansalBilgiler?.binaInsaatGiderleri, // 🔧 Optional chaining eklendi
          toplamBinaInsaatGideri: toplamBina
        },
        makineTeçhizatGiderleri: {
          ...prev.finansalBilgiler?.makineTeçhizatGiderleri, // 🔧 Optional chaining eklendi
          tl: {
            ...prev.finansalBilgiler?.makineTeçhizatGiderleri?.tl, // 🔧 Optional chaining eklendi
            toplamMakineTeç: toplamMakineTL
          },
          dolar: {
            ...prev.finansalBilgiler?.makineTeçhizatGiderleri?.dolar, // 🔧 Optional chaining eklendi
            toplamIthalMakine: toplamMakineDolar
          }
        },
        digerYatirimHarcamalari: {
          ...prev.finansalBilgiler?.digerYatirimHarcamalari, // 🔧 Optional chaining eklendi
          toplamDigerYatirimHarcamalari: toplamDiger
        },
        toplamSabitYatirimTutari: toplamSabitYatirim
      }
    }));
  }, []); // 🔧 Dependency kaldırıldı - Infinite loop önlendi

  // 🔧 Finansal hesaplamalar artık handleFinansalChange içinde tetikleniyor - useEffect kaldırıldı

  // 💰 5. FİNANSAL BİLGİLER - Excel Benzeri Kapsamlı Tablo
  const renderFinansalBilgiler = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          💰 Finansal Bilgiler
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Excel formundaki detaylı finansal hesaplamalar - Otomatik toplam hesaplama
        </Typography>
      </Grid>

      {/* 1. TOPLAM SABİT YATIRIM TUTARI TL */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0f9ff', border: '2px solid #dbeafe' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1e40af' }}>
            📊 TOPLAM SABİT YATIRIM TUTARI TL
          </Typography>
          <TextField
            fullWidth
            label="Toplam Sabit Yatırım Tutarı (TL)"
            value={formData.finansalBilgiler.toplamSabitYatirimTutari.toLocaleString('tr-TR')}
            InputProps={{
              readOnly: true,
              style: { fontSize: '1.2rem', fontWeight: 'bold', color: '#1e40af' }
            }}
            sx={{ backgroundColor: '#eff6ff' }}
          />
        </Paper>
      </Grid>

      {/* 2. YATIRIMIN TUTARI */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fef3f2' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#dc2626' }}>
            🏗️ YATIRIMIN TUTARI
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Arazi-Arsa Bedeli Açıklaması"
                value={formData.finansalBilgiler.araziArsaBedeli.aciklama}
                onChange={(e) => handleFinansalChange('araziArsaBedeli', 'aciklama', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Metrekaresi"
                type="number"
                value={formData.finansalBilgiler.araziArsaBedeli.metrekaresi}
                onChange={(e) => handleFinansalChange('araziArsaBedeli', 'metrekaresi', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: 'm²' }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Birim Fiyatı TL"
                type="number"
                value={formData.finansalBilgiler.araziArsaBedeli.birimFiyatiTl}
                onChange={(e) => handleFinansalChange('araziArsaBedeli', 'birimFiyatiTl', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺/m²' }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="ARAZİ ARSA BEDELİ"
                value={formData.finansalBilgiler.araziArsaBedeli.araziArsaBedeli.toLocaleString('tr-TR')}
                InputProps={{
                  readOnly: true,
                  style: { fontWeight: 'bold', color: '#dc2626' }
                }}
                sx={{ backgroundColor: '#fef2f2' }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* 3. FİNANSMAN TL */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f0fdf4' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#16a34a' }}>
            💵 FİNANSMAN TL
          </Typography>
          
          <Grid container spacing={2}>
            {/* 🔧 YABANCI KAYNAKLAR - EXCEL DETAYINA UYGUN */}
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: '#16a34a' }}>YABANCI KAYNAKLAR - Detaylı Breakdown</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={2.4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Bank Kredisi"
                    type="number"
                    value={formData.finansalBilgiler.finansman.yabanciKaynaklar.bankKredisi}
                    onChange={(e) => handleFinansalChange('finansman', 'yabanciKaynaklar.bankKredisi', parseFloat(e.target.value) || 0)}
                    InputProps={{ endAdornment: '₺' }}
                  />
                </Grid>
                <Grid item xs={12} md={2.4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="İkinci El Fiyat Farkı"
                    type="number"
                    value={formData.finansalBilgiler.finansman.yabanciKaynaklar.ikinciElFiyatFarki}
                    onChange={(e) => handleFinansalChange('finansman', 'yabanciKaynaklar.ikinciElFiyatFarki', parseFloat(e.target.value) || 0)}
                    InputProps={{ endAdornment: '₺' }}
                  />
                </Grid>
                <Grid item xs={12} md={2.4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Kullanılmış Teçhizat Bedeli"
                    type="number"
                    value={formData.finansalBilgiler.finansman.yabanciKaynaklar.kullanilmisTeçhizatBedeli}
                    onChange={(e) => handleFinansalChange('finansman', 'yabanciKaynaklar.kullanilmisTeçhizatBedeli', parseFloat(e.target.value) || 0)}
                    InputProps={{ endAdornment: '₺' }}
                  />
                </Grid>
                <Grid item xs={12} md={2.4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Diğer Dış Kaynaklar"
                    type="number"
                    value={formData.finansalBilgiler.finansman.yabanciKaynaklar.digerDisKaynaklar}
                    onChange={(e) => handleFinansalChange('finansman', 'yabanciKaynaklar.digerDisKaynaklar', parseFloat(e.target.value) || 0)}
                    InputProps={{ endAdornment: '₺' }}
                  />
                </Grid>
                <Grid item xs={12} md={2.4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Diğer Yabancı Kaynak"
                    type="number"
                    value={formData.finansalBilgiler.finansman.yabanciKaynaklar.digerYabanciKaynak}
                    onChange={(e) => handleFinansalChange('finansman', 'yabanciKaynaklar.digerYabanciKaynak', parseFloat(e.target.value) || 0)}
                    InputProps={{ endAdornment: '₺' }}
                  />
                </Grid>
              </Grid>
              
              {/* Toplam Yabancı Kaynak */}
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="TOPLAM YABANCI KAYNAK"
                  value={formData.finansalBilgiler.finansman.yabanciKaynaklar.toplamYabanciKaynak.toLocaleString('tr-TR')}
                  InputProps={{
                    readOnly: true,
                    style: { fontWeight: 'bold', color: '#16a34a', fontSize: '1.1rem' }
                  }}
                  sx={{ backgroundColor: '#f0fdf4' }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>ÖZKAYNAKLAR</Typography>
              <TextField
                fullWidth
                label="Özkaynaklar"
                type="number"
                value={formData.finansalBilgiler.finansman.ozkaynaklar.ozkaynaklar}
                onChange={(e) => handleFinansalChange('finansman', 'ozkaynaklar.ozkaynaklar', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>TOPLAM FİNANSMAN</Typography>
              <TextField
                fullWidth
                label="Toplam Finansman"
                value={formData.finansalBilgiler.finansman.toplamFinansman.toLocaleString('tr-TR')}
                InputProps={{
                  readOnly: true,
                  style: { fontWeight: 'bold', color: '#16a34a' }
                }}
                sx={{ backgroundColor: '#f0fdf4' }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* 4. BİNA İNŞAAT GİDERLERİ TL */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fefce8' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#ca8a04' }}>
            🏢 BİNA İNŞAAT GİDERLERİ TL
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Bina İnşaat Gideri Açıklama"
                value={formData.finansalBilgiler.binaInsaatGiderleri.aciklama}
                onChange={(e) => handleFinansalChange('binaInsaatGiderleri', 'aciklama', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Ana Bina ve Tesisleri"
                type="number"
                value={formData.finansalBilgiler.binaInsaatGiderleri.anaBinaVeTesisleri}
                onChange={(e) => handleFinansalChange('binaInsaatGiderleri', 'anaBinaVeTesisleri', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Yardımcı İş. Bina ve İcare Binaları"
                type="number"
                value={formData.finansalBilgiler.binaInsaatGiderleri.yardimciIsBinaVeIcareBinalari}
                onChange={(e) => handleFinansalChange('binaInsaatGiderleri', 'yardimciIsBinaVeIcareBinalari', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Yeraltı Ana Galerileri"
                type="number"
                value={formData.finansalBilgiler.binaInsaatGiderleri.yeraltiAnaGalerileri}
                onChange={(e) => handleFinansalChange('binaInsaatGiderleri', 'yeraltiAnaGalerileri', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="TOPLAM BİNA İNŞAAT GİDERİ"
                value={formData.finansalBilgiler.binaInsaatGiderleri.toplamBinaInsaatGideri.toLocaleString('tr-TR')}
                InputProps={{
                  readOnly: true,
                  style: { fontWeight: 'bold', color: '#ca8a04' }
                }}
                sx={{ backgroundColor: '#fefce8' }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* 5. MAKİNE TEÇHİZAT GİDERLERİ */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f3e8ff' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#7c3aed' }}>
            ⚙️ MAKİNE TEÇHİZAT GİDERLERİ
          </Typography>
          
          {/* TL Cinsinden */}
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>MAKİNE TEÇHİZAT GİDERLERİ (TL)</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="İthal"
                type="number"
                value={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.ithal}
                onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'tl.ithal', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Yerli"
                type="number"
                value={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.yerli}
                onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'tl.yerli', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Toplam Makine Teç."
                value={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.toplamMakineTeç.toLocaleString('tr-TR')}
                InputProps={{
                  readOnly: true,
                  style: { fontWeight: 'bold', color: '#7c3aed' }
                }}
                sx={{ backgroundColor: '#f3e8ff' }}
              />
            </Grid>
          </Grid>

          {/* Dolar Cinsinden */}
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>İTHAL MAKİNE ($)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="İthal Makine"
                type="number"
                value={formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.ithalMakine}
                onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'dolar.ithalMakine', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Yeni Makine"
                type="number"
                value={formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.yeniMakine}
                onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'dolar.yeniMakine', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Kullanılmış Makine"
                type="number"
                value={formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.kullanilmisMakine}
                onChange={(e) => handleFinansalChange('makineTeçhizatGiderleri', 'dolar.kullanilmisMakine', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="TOPLAM İTHAL MAKİNE ($)"
                value={formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.toplamIthalMakine.toLocaleString('en-US')}
                InputProps={{
                  readOnly: true,
                  style: { fontWeight: 'bold', color: '#7c3aed' }
                }}
                sx={{ backgroundColor: '#f3e8ff' }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* 6. DİĞER YATIRIM HARCAMALARI TL */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fdf2f8' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#be185d' }}>
            📋 DİĞER YATIRIM HARCAMALARI TL
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Yardımcı İşl. Mak. Teç. Gid."
                type="number"
                value={formData.finansalBilgiler.digerYatirimHarcamalari.yardimciIslMakTeçGid}
                onChange={(e) => handleFinansalChange('digerYatirimHarcamalari', 'yardimciIslMakTeçGid', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="İthalat ve Güm.Giderleri"
                type="number"
                value={formData.finansalBilgiler.digerYatirimHarcamalari.ithalatVeGumGiderleri}
                onChange={(e) => handleFinansalChange('digerYatirimHarcamalari', 'ithalatVeGumGiderleri', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Taşıma ve Sigorta G."
                type="number"
                value={formData.finansalBilgiler.digerYatirimHarcamalari.tasimaVeSigortaGiderleri}
                onChange={(e) => handleFinansalChange('digerYatirimHarcamalari', 'tasimaVeSigortaGiderleri', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Etüd ve Proje Giderleri"
                type="number"
                value={formData.finansalBilgiler.digerYatirimHarcamalari.etudVeProjeGiderleri}
                onChange={(e) => handleFinansalChange('digerYatirimHarcamalari', 'etudVeProjeGiderleri', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Diğer Giderleri"
                type="number"
                value={formData.finansalBilgiler.digerYatirimHarcamalari.digerGiderleri}
                onChange={(e) => handleFinansalChange('digerYatirimHarcamalari', 'digerGiderleri', parseFloat(e.target.value) || 0)}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="TOPLAM DİĞER YATIRIM HARCAMALARI"
                value={formData.finansalBilgiler.digerYatirimHarcamalari.toplamDigerYatirimHarcamalari.toLocaleString('tr-TR')}
                InputProps={{
                  readOnly: true,
                  style: { fontWeight: 'bold', color: '#be185d' }
                }}
                sx={{ backgroundColor: '#fdf2f8' }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Finansal Özet */}
      <Grid item xs={12}>
        <Box sx={{ p: 3, backgroundColor: '#f8fafc', borderRadius: 2, border: '2px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📊 Finansal Özet
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="body2">
                💰 <strong>Arazi-Arsa:</strong> {formData.finansalBilgiler.araziArsaBedeli.araziArsaBedeli.toLocaleString('tr-TR')} ₺
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2">
                💵 <strong>Finansman:</strong> {formData.finansalBilgiler.finansman.toplamFinansman.toLocaleString('tr-TR')} ₺
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2">
                🏢 <strong>Bina İnşaat:</strong> {formData.finansalBilgiler.binaInsaatGiderleri.toplamBinaInsaatGideri.toLocaleString('tr-TR')} ₺
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2">
                ⚙️ <strong>Makine Teçhizat:</strong> {formData.finansalBilgiler.makineTeçhizatGiderleri.tl.toplamMakineTeç.toLocaleString('tr-TR')} ₺
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e40af' }}>
            🎯 <strong>TOPLAM SABİT YATIRIM:</strong> {formData.finansalBilgiler.toplamSabitYatirimTutari.toLocaleString('tr-TR')} ₺
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderKunyeBilgileri(); // Künye + Belge Bilgileri birleşik
      case 1: return renderYatirimBilgileri(); // Yatırım + İstihdam Bilgileri birleşik
      case 2: return renderUrunBilgileri();
      case 3: return renderDestekUnsurlari();
      case 4: return renderOzelSartlar();
      case 5: return renderFinansalBilgiler();
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
        overflow: 'auto',
        p: 3
      }}>
        <Container maxWidth="xl">
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
                        variant="outlined"
                        onClick={() => handlePDFExport()}
                        disabled={!formData.gmId || !formData.tesvikId}
                        startIcon={<PictureAsPdfIcon />}
                        size="large"
                        sx={{ 
                          color: '#dc2626',
                          borderColor: '#dc2626',
                          fontWeight: 600,
                          px: 3,
                          '&:hover': {
                            backgroundColor: '#fef2f2',
                            borderColor: '#dc2626'
                          }
                        }}
                      >
                        📄 PDF Çıktı
                      </Button>
                      
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={saving}
                      startIcon={<SaveIcon />}
                        size="large"
                      sx={{
                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
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

      {/* 🆕 YENİ SEÇENEK EKLEME MODAL */}
      <Dialog 
        open={addOptionModal.open} 
        onClose={closeAddOptionModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            🆕 Yeni {addOptionModal.title} Ekle
          </Typography>
          <IconButton onClick={closeAddOptionModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Seçenek Adı"
                value={addOptionModal.newLabel}
                onChange={(e) => handleAddOptionChange('newLabel', e.target.value)}
                placeholder="Örn: Yeni Yatırım Türü"
                helperText="Bu ad dropdown'da görünecek"
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

export default TesvikForm;