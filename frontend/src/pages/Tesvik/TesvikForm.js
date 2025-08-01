// 🏆 TEŞVIK FORM - ENTERPRISE EDITION  
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
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Sidebar from '../../components/Layout/Sidebar';
import axios from '../../utils/axios';

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
  
  // 🔢 Dinamik Alan Sayıları
  const [cinsSayisi, setCinsSayisi] = useState(1); // J-CNS alanları (max 4)
  const [adresSayisi, setAdresSayisi] = useState(1); // Yatırım Adresi alanları (max 3)
  const [urunSayisi, setUrunSayisi] = useState(1); // Ürün bilgileri satır sayısı (max 10)
  const [destekSayisi, setDestekSayisi] = useState(1); // Destek unsurları satır sayısı (max 8)
  const [ozelSartSayisi, setOzelSartSayisi] = useState(1); // Özel şartlar satır sayısı (max 7)
  
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
      ozellikliYatirim: '' // 🆕 YENİ ALAN - Excel'den eklendi
    },
    
    // 📝 Künye Bilgileri - Excel Formatına Uygun
    kunyeBilgileri: {
      talepSonuc: '',
      revizeId: '',
      sorguBaglantisi: '',
      yatirimci: '',
      yatirimciUnvan: '',
      sgkSicilNo: '', // 🆕 YENİ ALAN - Excel'den eklendi
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
      ada: '', // 🆕 Excel'den eklendi
      parsel: '', // 🆕 Excel'den eklendi
      yatirimAdresi1: '',
      yatirimAdresi2: '',
      yatirimAdresi3: '',
      ossBelgeMudavimi: '',
      ilBazliBolge: '', // 🆕 Excel'den eklendi
      ilceBazliBolge: '', // 🆕 Excel'den eklendi
      serbsetBolge: '' // 🆕 Excel'den eklendi
    },
    
    // 📦 Ürün Bilgileri (U$97 Kodları) - Dinamik, başlangıçta 1 satır
    urunBilgileri: [
      { kod: '', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' }
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
        
        // Ürün bilgileri satır sayısını hesapla
        const urunCount = Math.max(1, mappedData.urunBilgileri?.length || 1);
        setUrunSayisi(Math.min(urunCount, 10)); // Max 10 ile sınırla
        
        // Destek unsurları satır sayısını hesapla
        const destekCount = Math.max(1, Math.min(mappedData.destekUnsurlari?.length || 1, 8));
        setDestekSayisi(destekCount);
        
        // Özel şartlar satır sayısını hesapla
        const ozelSartCount = Math.max(1, Math.min(mappedData.ozelSartlar?.length || 1, 7));
        setOzelSartSayisi(ozelSartCount);
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
          { kod: '', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' }
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

  // 🎯 Dinamik Özel Şart Yönetimi - 1 başlangıç, Max 7
  const addOzelSartField = () => {
    if (ozelSartSayisi < 7) {
      setOzelSartSayisi(prev => prev + 1);
      setFormData(prevData => ({
        ...prevData,
        ozelSartlar: [
          ...prevData.ozelSartlar,
          { index: prevData.ozelSartlar.length + 1, kisaltma: '', notu: '' }
        ]
      }));
    }
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
        urunBilgileri: [{ kod: '', aciklama: '', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' }]
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

  // Destek unsurları handler - Dinamik sistem
  const handleDestekChange = (index, field, value) => {
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

  // 🆔 1. KÜNYE BİLGİLERİ - Excel Şablonuna Uygun Professional Layout
  const renderKunyeBilgileri = () => (
    <Grid container spacing={4}>
      {/* Excel Header - KÜNYE BİLGİLERİ Ana Başlık */}
      <Grid item xs={12}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 4, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 1, 
              fontWeight: 700, 
              textAlign: 'center',
              letterSpacing: '0.5px'
            }}
          >
            📋 KÜNYE BİLGİLERİ
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              textAlign: 'center', 
              opacity: 0.9,
              fontWeight: 400
            }}
          >
            Excel Template Based - Government Standard Form
          </Typography>
        </Paper>
      </Grid>

      {/* YATIRIMCI BİLGİLERİ Bölümü - Excel Sol Taraf */}
      <Grid item xs={12} lg={6}>
        <Paper 
          elevation={2}
          sx={{ 
            p: 4, 
            backgroundColor: '#f8fafc', 
            border: '2px solid #e2e8f0',
            borderRadius: 3,
            height: '100%'
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3, 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              color: '#1e40af',
              borderBottom: '2px solid #e2e8f0',
              pb: 2
            }}
          >
            <BusinessIcon sx={{ mr: 2, fontSize: 28 }} />
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
          label="YATIRIMCI ÜNVAN 🏭"
                value={formData.yatirimciUnvan}
                onChange={(e) => handleFieldChange('yatirimciUnvan', e.target.value)}
                required
                helperText="Firma seçiminde otomatik doldurulur, isteğe bağlı değiştirilebilir"
              />
            </Grid>
      
      {/* SGK SİCİL NO - YENİ ALAN */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="SGK SİCİL NO 🏥"
          value={formData.kunyeBilgileri?.sgkSicilNo || ''}
          onChange={(e) => handleFieldChange('kunyeBilgileri.sgkSicilNo', e.target.value)}
          placeholder="SGK sicil numarasını giriniz..."
          helperText="İsteğe bağlı - Sosyal Güvenlik Kurumu sicil numarası"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#ffffff',
              '&:hover': { borderColor: '#1e40af' },
              '&.Mui-focused': { borderColor: '#1e40af' }
            }
          }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      {/* BELGE BİLGİLERİ Bölümü - Excel Sağ Taraf */}
      <Grid item xs={12} lg={6}>
        <Paper 
          elevation={2}
          sx={{ 
            p: 4, 
            backgroundColor: '#fef9e7', 
            border: '2px solid #f59e0b',
            borderRadius: 3,
            height: '100%'
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3, 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              color: '#d97706',
              borderBottom: '2px solid #f59e0b',
              pb: 2
            }}
          >
            <BusinessIcon sx={{ mr: 2, fontSize: 28 }} />
            BELGE BİLGİLERİ
          </Typography>
          
          <Grid container spacing={3}>
            {/* BELGE ID */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="BELGE ID 📋"
                value={formData.belgeYonetimi.belgeId}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeId', e.target.value)}
                placeholder="Belge ID'sini giriniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
              />
            </Grid>
            
            {/* BELGE NO */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="BELGE NO 📄"
                value={formData.belgeYonetimi.belgeNo}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeNo', e.target.value)}
                required
                placeholder="Belge numarasını giriniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
              />
            </Grid>
            
            {/* BELGE TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE TARIHI 📅"
                type="date"
                value={formData.belgeYonetimi.belgeTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
              />
            </Grid>
            
            {/* BELGE MÜRACAAT TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE MÜRACAAT TARIHI 📅"
                type="date"
                value={formData.belgeYonetimi.belgeMuracaatTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeMuracaatTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
              />
            </Grid>
            
            {/* MÜRACAAT SAYISI */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="MÜRACAAT SAYISI 📊"
                value={formData.belgeYonetimi.belgeMuracaatNo}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeMuracaatNo', e.target.value)}
                placeholder="Müracaat sayısını giriniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
              />
            </Grid>
            
            {/* BELGE BAŞLAMA TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE BAŞLAMA TARIHI 🟢"
                type="date"
                value={formData.belgeYonetimi.belgeBaslamaTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeBaslamaTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
              />
            </Grid>
            
            {/* BELGE BITIŞ TARIHI */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="BELGE BITIŞ TARIHI 🔴"
                type="date"
                value={formData.belgeYonetimi.belgeBitisTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.belgeBitisTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
              />
      </Grid>
      
            {/* SÜRE UZATIM TARIHI */}
            <Grid item xs={12} md={6}>
        <TextField
          fullWidth
                label="SÜRE UZATIM TARIHI ⏰"
                type="date"
                value={formData.belgeYonetimi.uzatimTarihi}
                onChange={(e) => handleFieldChange('belgeYonetimi.uzatimTarihi', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#d97706' },
                    '&.Mui-focused': { borderColor: '#d97706' }
                  }
                }}
        />
      </Grid>
      
            {/* ÖZELLİKLİ YATIRIM İSE */}
            <Grid item xs={12} md={6}>
        <FormControl fullWidth>
                <InputLabel>ÖZELLİKLİ YATIRIM İSE ⭐</InputLabel>
          <Select
                  value={formData.belgeYonetimi.ozellikliYatirim || ''}
                  onChange={(e) => handleFieldChange('belgeYonetimi.ozellikliYatirim', e.target.value)}
                  label="ÖZELLİKLİ YATIRIM İSE ⭐"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' }
                  }}
                >
                  <MenuItem value="evet">✅ Evet</MenuItem>
                  <MenuItem value="hayir">❌ Hayır</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* DAYANDIĞI KANUN */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>DAYANDIĞI KANUN ⚖️</InputLabel>
                <Select
                  value={formData.belgeYonetimi.dayandigiKanun}
                  onChange={(e) => handleFieldChange('belgeYonetimi.dayandigiKanun', e.target.value)}
                  label="DAYANDIĞI KANUN ⚖️"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' }
                  }}
                >
                  {templateData.dayandigiKanunlar?.map((kanun) => (
                    <MenuItem key={kanun.value} value={kanun.value}>
                      {kanun.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* BELGE DURUMU */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>BELGE DURUMU 📊</InputLabel>
                <Select
                  value={formData.belgeYonetimi.belgeDurumu}
                  onChange={(e) => handleFieldChange('belgeYonetimi.belgeDurumu', e.target.value)}
                  label="BELGE DURUMU 📊"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' }
                  }}
                >
                  {templateData.belgeDurumlari?.map((durum) => (
                    <MenuItem key={durum.value} value={durum.value}>
                      <Chip
                        label={durum.label}
                        size="small"
                        sx={{
                          backgroundColor: durum.backgroundColor || '#e2e8f0',
                          color: durum.color || '#1f2937',
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

      {/* Excel Template Info Banner */}
      <Grid item xs={12}>
        <Paper 
          elevation={1}
          sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #0ea5e9',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#0369a1', 
                fontWeight: 500,
                textAlign: 'center' 
              }}
            >
              ℹ️ Bu form Excel şablonuna tam uyumlu olarak tasarlanmıştır. 
              Tüm alanlar government standards'a göre düzenlenmiştir.
                        </Typography>
                      </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  // 🏢 2. YATIRIM İLE İLGİLİ BİLGİLER - Excel Şablonuna Uygun Tablo Formatı
  const renderYatirimBilgileri = () => (
    <Grid container spacing={4}>
      {/* Excel Ana Başlık - YATIRIM İLE İLGİLİ BİLGİLER */}
      <Grid item xs={12}>
        <Paper 
          elevation={4}
          sx={{ 
            p: 4, 
            background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f9f0 50%, #e8f5e8 100%)',
            border: '3px solid #16a085',
            borderRadius: 3,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #16a085 0%, #27ae60 50%, #16a085 100%)',
              borderRadius: '3px 3px 0 0'
            }
          }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 4, 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#16a085',
              textShadow: '0 2px 4px rgba(22,160,133,0.3)',
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}
          >
            <EngineeringIcon sx={{ mr: 2, fontSize: { xs: 32, md: 40 } }} />
            YATIRIM İLE İLGİLİ BİLGİLER
          </Typography>
          
          {/* Excel Tablo Formatı - Kompakt ve Professional Tek Tablo */}
          <Grid container spacing={3}>
            
            {/* ROW 1: YATIRIM KONUI - Excel'deki gibi tam genişlik */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="YATIRIM KONUI 🏭"
                value={formData.yatirimBilgileri1.yatirimKonusu}
                onChange={(e) => handleFieldChange('yatirimBilgileri1.yatirimKonusu', e.target.value)}
                placeholder="Yatırım konusunu detaylı giriniz..."
                multiline
                rows={2}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    fontWeight: 500,
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
            </Grid>
            
            {/* ROW 2: DİNAMİK J-CNS ALANLARI - Başlangıç 1, Max 4 */}
            {Array.from({ length: cinsSayisi }, (_, index) => (
              <Grid item xs={12} sm={6} md={3} key={`cins-${index + 1}`}>
                <Box sx={{ position: 'relative' }}>
              <FormControl fullWidth>
                    <InputLabel>J-CNS({index + 1}) 📋</InputLabel>
                <Select
                      value={formData.yatirimBilgileri1[`cins${index + 1}`] || ''}
                      onChange={(e) => handleFieldChange(`yatirimBilgileri1.cins${index + 1}`, e.target.value)}
                      label={`J-CNS(${index + 1}) 📋`}
                      sx={{
                        backgroundColor: '#ffffff',
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' }
                      }}
                >
                  {templateData.yatirimTipleri?.map((tip, tipIndex) => (
                        <MenuItem key={`cins${index + 1}-${tip.value}-${tipIndex}`} value={tip.value}>
                      {tip.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
                  
                  {/* Remove butonu - sadece birden fazla alan varsa göster */}
                  {cinsSayisi > 1 && index === cinsSayisi - 1 && (
                    <IconButton
                      onClick={removeCinsField}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: '#ff4444',
                        color: 'white',
                        width: 24,
                        height: 24,
                        '&:hover': {
                          backgroundColor: '#cc0000'
                        }
                      }}
                    >
                      <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
            </Grid>
            ))}
            
            {/* Add J-CNS butonu - sadece max sayıya ulaşılmamışsa göster */}
            {cinsSayisi < 4 && (
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={addCinsField}
                  startIcon={<AddIcon />}
                  sx={{
                    height: 56, // Select alanıyla aynı yükseklik
                    borderColor: '#16a085',
                    color: '#16a085',
                    borderStyle: 'dashed',
                    '&:hover': {
                      borderColor: '#0d7377',
                      backgroundColor: '#f0f9f0'
                    }
                  }}
                >
                  J-CNS Ekle ({cinsSayisi}/4)
                </Button>
            </Grid>
            )}
            
            {/* ROW 3: DESTEK SINIFI */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>DESTEK SINIFI 🎯</InputLabel>
                <Select
                  value={formData.yatirimBilgileri1.destekSinifi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.destekSinifi', e.target.value)}
                  label="DESTEK SINIFI 🎯"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' }
                  }}
                >
                  {templateData.destekSiniflari?.map((sinif) => (
                    <MenuItem key={sinif.value} value={sinif.value}>
                      {sinif.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
      </Grid>
      
            {/* ROW 4: YER İL, YER İLÇE */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="YER İL 🏢"
                value={formData.yatirimBilgileri2.yerinIl}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yerinIl', e.target.value)}
                placeholder="İl seçiniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="YER İLÇE 🏛️"
                value={formData.yatirimBilgileri2.yerinIlce}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.yerinIlce', e.target.value)}
                placeholder="İlçe seçiniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
            </Grid>
            
            {/* ROW 5: ADA, PARSEL - YENİ ALANLAR */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="ADA 🗺️"
                value={formData.yatirimBilgileri2.ada || ''}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.ada', e.target.value)}
                placeholder="Ada numarası..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="PARSEL 📄"
                value={formData.yatirimBilgileri2.parsel || ''}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.parsel', e.target.value)}
                placeholder="Parsel numarası..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
            </Grid>
            
            {/* ROW 6: DİNAMİK YATIRIM ADRESİ ALANLARI - Başlangıç 1, Max 3 */}
            {Array.from({ length: adresSayisi }, (_, index) => (
              <Grid item xs={12} md={4} key={`adres-${index + 1}`}>
                <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                    label={`YATIRIM ADRESİ(${index + 1}) 📍`}
                    value={formData.yatirimBilgileri2[`yatirimAdresi${index + 1}`] || ''}
                    onChange={(e) => handleFieldChange(`yatirimBilgileri2.yatirimAdresi${index + 1}`, e.target.value)}
                    placeholder={`${index === 0 ? 'Ana' : index === 1 ? 'Ek' : 'Detay'} adres bilgisi...`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#ffffff',
                        '&:hover': { borderColor: '#16a085' },
                        '&.Mui-focused': { borderColor: '#16a085' }
                      }
                    }}
                  />
                  
                  {/* Remove butonu - sadece birden fazla alan varsa göster */}
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
                        '&:hover': {
                          backgroundColor: '#cc0000'
                        }
                      }}
                    >
                      <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
            </Grid>
            ))}
            
            {/* Add Adres butonu - sadece max sayıya ulaşılmamışsa göster */}
            {adresSayisi < 3 && (
            <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={addAdresField}
                  startIcon={<AddIcon />}
                  sx={{
                    height: 56, // TextField alanıyla aynı yükseklik
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
            
            {/* ROW 7: OSB İSE MÜDÜRLÜK */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>OSB İSE MÜDÜRLÜK 🏭</InputLabel>
                <Select
                  value={formData.yatirimBilgileri2.ossBelgeMudavimi || ''}
                  onChange={(e) => handleFieldChange('yatirimBilgileri2.ossBelgeMudavimi', e.target.value)}
                  label="OSB İSE MÜDÜRLÜK 🏭"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' }
                  }}
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
            
            {/* ROW 8: İL BAZLI BÖLGE, İLÇE BAZLI BÖLGE, SERBEST BÖLGE - YENİ ALANLAR */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="İL BAZLI BÖLGE 🌍"
                value={formData.yatirimBilgileri2.ilBazliBolge || ''}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.ilBazliBolge', e.target.value)}
                placeholder="İl bazlı bölge bilgisi..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
          </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="İLÇE BAZLI BÖLGE 🗺️"
                value={formData.yatirimBilgileri2.ilceBazliBolge || ''}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.ilceBazliBolge', e.target.value)}
                placeholder="İlçe bazlı bölge bilgisi..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
      </Grid>
      
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="SERBEST BÖLGE 🏢"
                value={formData.yatirimBilgileri2.serbsetBolge || ''}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.serbsetBolge', e.target.value)}
                placeholder="Serbest bölge bilgisi..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#16a085' },
                    '&.Mui-focused': { borderColor: '#16a085' }
                  }
                }}
              />
            </Grid>
            
            {/* ROW 9: İSTİHDAM - MEVCUT KİŞİ, İLAVE KİŞİ (Excel'den entegre) */}
      <Grid item xs={12}>
              <Paper 
                elevation={2}
                sx={{ 
                  p: 3, 
                  backgroundColor: '#f0fdf4', 
                  border: '2px solid #22c55e',
                  borderRadius: 2
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 3, 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center',
                    color: '#16a34a'
                  }}
                >
                  <PeopleIcon sx={{ mr: 1, fontSize: 28 }} />
                  İSTİHDAM BİLGİLERİ
          </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                      label="MEVCUT KİŞİ 👥"
                type="number"
                value={formData.istihdam.mevcutKisi}
                onChange={(e) => handleFieldChange('istihdam.mevcutKisi', parseInt(e.target.value) || 0)}
                      placeholder="Mevcut personel sayısı..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#ffffff',
                          '&:hover': { borderColor: '#22c55e' },
                          '&.Mui-focused': { borderColor: '#22c55e' }
                        }
                      }}
              />
            </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                      label="İLAVE KİŞİ ➕"
                type="number"
                value={formData.istihdam.ilaveKisi}
                onChange={(e) => handleFieldChange('istihdam.ilaveKisi', parseInt(e.target.value) || 0)}
                      placeholder="İlave personel sayısı..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#ffffff',
                          '&:hover': { borderColor: '#22c55e' },
                          '&.Mui-focused': { borderColor: '#22c55e' }
                        }
                      }}
              />
            </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                      label="TOPLAM KİŞİ 🎯"
                type="number"
                value={formData.istihdam.toplamKisi}
                      InputProps={{ 
                        readOnly: true,
                        style: { 
                          backgroundColor: '#dcfce7', 
                          fontWeight: 600,
                          fontSize: '1.1rem'
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover': { borderColor: '#22c55e' }
                        }
                      }}
              />
            </Grid>
          </Grid>
              </Paper>
            </Grid>
            
          </Grid>
        </Paper>
      </Grid>
      
      {/* Excel Template Info Banner */}
      <Grid item xs={12}>
        <Paper 
          elevation={1}
          sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f9f0 100%)',
            border: '1px solid #16a085',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#16a085', 
                fontWeight: 500,
                textAlign: 'center' 
              }}
            >
              ✅ <strong>Excel Şablonu Uyumlu:</strong> Bu bölüm Excel tablosundaki 
              "YATIRIM İLE İLGİLİ BİLGİLER" kısmına tam uyumludur. 
              İstihdam bilgileri de dahil tüm alanlar eksiksiz eklenmiştir.
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  // 📦 4. ÜRÜN BİLGİLERİ (U$97 Kodları) - Dinamik Sistem
  const renderUrunBilgileri = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          📦 Ürün Bilgileri (U$97 Kodları)
          <Chip 
            label={`${urunSayisi}/10 Satır`} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Dinamik sistem: İhtiyacınıza göre 1-10 satır arası ürün ekleyebilirsiniz - CSV'den {templateData.u97Kodlari?.length || 0} adet ürün kodu mevcut
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
              {formData.urunBilgileri.slice(0, urunSayisi).map((urun, index) => (
                <TableRow key={`urun-row-${index}`}>
                  <TableCell>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl size="small" sx={{ width: 160 }}>
                      <Select
                          value={urun.kod || ''}
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
                          <MenuItem value="">
                            <em>U$97 Kod Seç</em>
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
                      
                      {/* Remove butonu - sadece birden fazla satır varsa göster */}
                      {urunSayisi > 1 && index === urunSayisi - 1 && (
                        <IconButton
                          onClick={removeUrunField}
                          size="small"
                          sx={{
                            backgroundColor: '#ff4444',
                            color: 'white',
                            width: 24,
                            height: 24,
                            '&:hover': {
                              backgroundColor: '#cc0000'
                            }
                          }}
                        >
                          <RemoveIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
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
        
        {/* Dinamik Ürün Satırı Yönetimi */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, mt: 2 }}>
          {/* Add Ürün Satırı butonu - sadece max sayıya ulaşılmamışsa göster */}
          {urunSayisi < 10 && (
            <Button
              variant="outlined"
              onClick={addUrunField}
              startIcon={<AddIcon />}
              sx={{
                borderColor: '#16a085',
                color: '#16a085',
                borderStyle: 'dashed',
                '&:hover': {
                  borderColor: '#0d7377',
                  backgroundColor: '#f0f9f0'
                }
              }}
            >
              Ürün Satırı Ekle ({urunSayisi}/10)
            </Button>
          )}
        
        {/* 🆕 Yeni U$97 Kodu Ekle Butonu */}
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
            💡 <strong>Aktif Satır:</strong> {urunSayisi}/10 | 
            <strong> Doldurulmuş:</strong> {formData.urunBilgileri.slice(0, urunSayisi).filter(u => u.aciklama).length} | 
            <strong> CSV'den Seçenek:</strong> {templateData.u97Kodlari?.length || 0} adet
          </Typography>
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
              {/* Destek Unsuru Seçimi */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Destek Unsuru 🏛️</InputLabel>
                    <Select
                    value={destek.destekUnsuru || ''}
                    onChange={(e) => handleDestekChange(index, 'destekUnsuru', e.target.value)}
                    label="Destek Unsuru 🏛️"
                    sx={{
                      backgroundColor: '#ffffff',
                      '&:hover .MuiOutlinedInput-notchedOutline': { 
                        borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6' 
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                        borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6' 
                      }
                    }}
                    >
                      <MenuItem value="">
                      <em>Destek türü seçiniz...</em>
                      </MenuItem>
                    {templateData.destekUnsurlariOptions?.map((destekOption, destekIndex) => (
                      <MenuItem key={`destek-${index}-${destekIndex}-${destekOption.value}`} value={destekOption.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                            label={destekOption.kategori}
                              size="small"
                            sx={{ backgroundColor: destekOption.renk, color: 'white', fontSize: '0.7rem' }}
                            />
                          <Typography variant="body2">{destekOption.label}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
              </Grid>

              {/* Şartları Seçimi */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Şartları ⚖️</InputLabel>
                    <Select
                    value={destek.sartlari || ''}
                    onChange={(e) => handleDestekChange(index, 'sartlari', e.target.value)}
                    label="Şartları ⚖️"
                    sx={{
                      backgroundColor: '#ffffff',
                      '&:hover .MuiOutlinedInput-notchedOutline': { 
                        borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6' 
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                        borderColor: index % 2 === 0 ? '#ec4899' : '#3b82f6' 
                      }
                    }}
                    >
                      <MenuItem value="">
                      <em>Şart seçiniz...</em>
                      </MenuItem>
                      {templateData.destekSartlariOptions?.map((sart, sartIndex) => (
                      <MenuItem key={`sart-${index}-${sartIndex}-${sart.value}`} value={sart.value}>
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
            label={`${ozelSartSayisi}/7 Satır`} 
            size="small" 
            color="warning" 
            variant="outlined" 
          />
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Dinamik sistem: İhtiyacınıza göre maksimum 7 özel şart satırı ekleyebilirsiniz - CSV'den {templateData.ozelSartKisaltmalari?.length || 0} kısaltma mevcut
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
              {/* Özel Şart Kısaltma Seçimi */}
            <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Özel Şart Kısaltma 📋</InputLabel>
                  <Select
                    value={sart.kisaltma || ''}
                    onChange={(e) => handleOzelSartChange(index, 'kisaltma', e.target.value)}
                    label="Özel Şart Kısaltma 📋"
                    sx={{
                      backgroundColor: '#ffffff',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>Kısaltma seçiniz...</em>
                    </MenuItem>
                    {templateData.ozelSartKisaltmalari?.map((kisaltma, kisaltmaIndex) => (
                      <MenuItem key={`kisaltma-${index}-${kisaltmaIndex}-${kisaltma.value}`} value={kisaltma.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={kisaltma.kategori}
                            size="small"
                            sx={{ backgroundColor: kisaltma.renk, color: 'white', fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2">{kisaltma.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Özel Şart Notu Seçimi */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Özel Şart Notu 📝</InputLabel>
                  <Select
                    value={sart.notu || ''}
                    onChange={(e) => handleOzelSartChange(index, 'notu', e.target.value)}
                    label="Özel Şart Notu 📝"
                    sx={{
                      backgroundColor: '#ffffff',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: index % 2 === 0 ? '#ea580c' : '#f97316'
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>Not seçiniz...</em>
                    </MenuItem>
                    {templateData.ozelSartNotlari?.map((not, notIndex) => (
                      <MenuItem key={`not-${index}-${notIndex}-${not}`} value={not}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {not}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
            </Grid>
          </Grid>
          </Paper>
        </Grid>
      ))}

      {/* Add Özel Şart Butonu */}
      {ozelSartSayisi < 7 && (
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
              Özel Şart Ekle ({ozelSartSayisi}/7)
            </Button>
          </Box>
        </Grid>
      )}

          {/* İstatistikler */}
      <Grid item xs={12}>
        <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
            🏷️ <strong>Aktif Satır:</strong> {ozelSartSayisi}/7 |
            <strong> Kısaltma Doldurulmuş:</strong> {formData.ozelSartlar.slice(0, ozelSartSayisi).filter(s => s.kisaltma).length} |
            <strong> Not Doldurulmuş:</strong> {formData.ozelSartlar.slice(0, ozelSartSayisi).filter(s => s.notu).length} |
              <strong> CSV'den Seçenek:</strong> {templateData.ozelSartKisaltmalari?.length || 0} kısaltma, {templateData.ozelSartNotlari?.length || 0} not
            </Typography>
          </Box>
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
     
    // 🔧 Hesaplamalar useEffect ile tetiklenecek - infinite loop önlenir
  };

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
    
    console.log('💰 Finansal hesaplama başladı (DEVLET MANTIGI):', finansal);
    
    // 1. Arazi-Arsa Bedeli hesapla
    const araziTotal = toNumber(finansal.araziArsaBedeli?.metrekaresi) * toNumber(finansal.araziArsaBedeli?.birimFiyatiTl);
    console.log('🏞️ Arazi Total:', araziTotal);
    
    // 2. Toplam Bina İnşaat Gideri hesapla
    const anaBina = toNumber(finansal.binaInsaatGiderleri?.anaBinaVeTesisleri);
    const yardimciBina = toNumber(finansal.binaInsaatGiderleri?.yardimciIsBinaVeIcareBinalari);
    const yeraltiBina = toNumber(finansal.binaInsaatGiderleri?.yeraltiAnaGalerileri);
    const toplamBina = anaBina + yardimciBina + yeraltiBina;
    console.log('🏗️ Bina Total:', toplamBina, '=', anaBina, '+', yardimciBina, '+', yeraltiBina);
    
    // 3. Toplam Makine Teçhizat (TL) hesapla
    const makineIthal = toNumber(finansal.makineTeçhizatGiderleri?.tl?.ithal);
    const makineYerli = toNumber(finansal.makineTeçhizatGiderleri?.tl?.yerli);
    const toplamMakineTL = makineIthal + makineYerli;
    console.log('🏭 Makine TL Total:', toplamMakineTL, '=', makineIthal, '+', makineYerli);
    
    // 4. Toplam İthal Makine ($) hesapla
    const makineYeni = toNumber(finansal.makineTeçhizatGiderleri?.dolar?.yeniMakine);
    const makineKullanilmis = toNumber(finansal.makineTeçhizatGiderleri?.dolar?.kullanilmisMakine);
    const toplamMakineDolar = makineYeni + makineKullanilmis;
    console.log('💲 Makine Dolar Total:', toplamMakineDolar, '=', makineYeni, '+', makineKullanilmis);
    
    // 5. Toplam Diğer Yatırım Harcamaları hesapla
    const yardimciIsl = toNumber(finansal.digerYatirimHarcamalari?.yardimciIslMakTeçGid);
    const ithalatGum = toNumber(finansal.digerYatirimHarcamalari?.ithalatVeGumGiderleri);
    const tasimaSignorta = toNumber(finansal.digerYatirimHarcamalari?.tasimaVeSigortaGiderleri);
    const etudProje = toNumber(finansal.digerYatirimHarcamalari?.etudVeProjeGiderleri);
    const digerGider = toNumber(finansal.digerYatirimHarcamalari?.digerGiderleri);
    const toplamDiger = yardimciIsl + ithalatGum + tasimaSignorta + etudProje + digerGider;
    console.log('📊 Diğer Harcamalar Total:', toplamDiger);
    
    // 6. TOPLAM SABİT YATIRIM TUTARI = Arazi + Bina + Makine(TL) + Diğer
    const toplamSabitYatirim = araziTotal + toplamBina + toplamMakineTL + toplamDiger;
    console.log('🎯 TOPLAM SABİT YATIRIM (Otomatik):', toplamSabitYatirim, '=', araziTotal, '+', toplamBina, '+', toplamMakineTL, '+', toplamDiger);
    
    // 7. 🆕 DEVLET MANTIGI: Yabancı Kaynak alt kalemlerini topla
    const bankKredisi = toNumber(finansal.finansman?.yabanciKaynaklar?.bankKredisi);
    const ikinciElFiyat = toNumber(finansal.finansman?.yabanciKaynaklar?.ikinciElFiyatFarki);
    const kullanilmisTeçhizat = toNumber(finansal.finansman?.yabanciKaynaklar?.kullanilmisTeçhizatBedeli);
    const digerDisKaynak = toNumber(finansal.finansman?.yabanciKaynaklar?.digerDisKaynaklar);
    const digerYabanci = toNumber(finansal.finansman?.yabanciKaynaklar?.digerYabanciKaynak);
    
    const toplamYabanciKaynak = bankKredisi + ikinciElFiyat + kullanilmisTeçhizat + digerDisKaynak + digerYabanci;
    console.log('💸 Yabancı Kaynak Total:', toplamYabanciKaynak);
    
    // 8. 🆕 DEVLET MANTIGI: Özkaynak = Toplam Sabit Yatırım - Yabancı Kaynak (OTOMATIK HESAPLANAN!)
    const ozKaynakOtomatik = Math.max(0, toplamSabitYatirim - toplamYabanciKaynak); // Negatif olamaz
    console.log('💼 🆕 ÖZKAYNAK (Otomatik Hesaplanan):', ozKaynakOtomatik, '=', toplamSabitYatirim, '-', toplamYabanciKaynak);
    
    // 9. 🆕 DEVLET MANTIGI: Toplam Finansman = Toplam Sabit Yatırım (Dengeli olmalı)
    const toplamFinansman = toplamSabitYatirim; // Devlet mantığında her zaman eşit
    console.log('💰 TOPLAM FİNANSMAN (= Toplam Sabit Yatırım):', toplamFinansman);
    
    // 10. Finansman dengesi kontrolü
    const finansmanDengesi = toplamYabanciKaynak + ozKaynakOtomatik;
    const dengeDurumu = Math.abs(finansmanDengesi - toplamSabitYatirim) < 0.01; // 1 kuruş tolerans
    console.log('⚖️ FİNANSMAN DENGESİ:', { 
      toplamSabitYatirim, 
      toplamYabanciKaynak, 
      ozKaynakOtomatik, 
      finansmanDengesi, 
      dengeDurumu: dengeDurumu ? '✅ Dengeli' : '❌ Dengesiz' 
    });
    
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

  // 🔧 Finansal hesaplamalar - useEffect ile güvenli tetikleme
  useEffect(() => {
    // Sadece finansal verilerde değişiklik olduğunda hesapla
    if (formData.finansalBilgiler) {
      const calculations = calculateFinansalTotals();
      
              if (calculations) {
          const {
            araziTotal,
            toplamYabanciKaynak,
            ozKaynakOtomatik,
            toplamFinansman,
            toplamBina,
            toplamMakineTL,
            toplamMakineDolar,
            toplamDiger,
            toplamSabitYatirim,
            dengeDurumu
          } = calculations;
        
        // Sadece hesaplanan değerleri güncelle
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
                  toplamYabanciKaynak
                },
                ozkaynaklar: {
                  ...prev.finansalBilgiler?.finansman?.ozkaynaklar,
                  ozkaynaklar: ozKaynakOtomatik // 🆕 Otomatik hesaplanan özkaynak
          }
        },
        binaInsaatGiderleri: {
              ...prev.finansalBilgiler?.binaInsaatGiderleri,
          toplamBinaInsaatGideri: toplamBina
        },
        makineTeçhizatGiderleri: {
              ...prev.finansalBilgiler?.makineTeçhizatGiderleri,
          tl: {
                ...prev.finansalBilgiler?.makineTeçhizatGiderleri?.tl,
            toplamMakineTeç: toplamMakineTL
          },
          dolar: {
                ...prev.finansalBilgiler?.makineTeçhizatGiderleri?.dolar,
            toplamIthalMakine: toplamMakineDolar
          }
        },
        digerYatirimHarcamalari: {
              ...prev.finansalBilgiler?.digerYatirimHarcamalari,
          toplamDigerYatirimHarcamalari: toplamDiger
        },
        toplamSabitYatirimTutari: toplamSabitYatirim
      }
    }));
      }
    }
  }, [
    formData.finansalBilgiler?.araziArsaBedeli?.metrekaresi,
    formData.finansalBilgiler?.araziArsaBedeli?.birimFiyatiTl,
    formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.bankKredisi,
    formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.ikinciElFiyatFarki,
    formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.kullanilmisTeçhizatBedeli,
    formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.digerDisKaynaklar,
    formData.finansalBilgiler?.finansman?.yabanciKaynaklar?.digerYabanciKaynak,
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
    formData.finansalBilgiler?.digerYatirimHarcamalari?.digerGiderleri,
    calculateFinansalTotals
  ]);

  // 💰 5. FİNANSAL BİLGİLER - Excel Benzeri Kapsamlı Tablo
  const renderFinansalBilgiler = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          💰 Finansal Bilgiler
          <Chip 
            label="Excel Uyumlu" 
            size="small" 
            color="success" 
            variant="outlined" 
          />
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Excel formundaki detaylı finansal hesaplamalar - Otomatik toplam hesaplama ve real-time validation sistemi aktif 🧮
        </Typography>
      </Grid>

      {/* Finansal İstatistikler */}
      <Grid item xs={12}>
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Arazi: ${formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli?.toLocaleString('tr-TR') || '0'} ₺`}
            size="small"
            variant="outlined"
            color="error"
            sx={{ minWidth: 120 }}
          />
          <Chip
            label={`Finansman: ${formData.finansalBilgiler?.finansman?.toplamFinansman?.toLocaleString('tr-TR') || '0'} ₺`}
            size="small"
            variant="outlined"
            color="success"
            sx={{ minWidth: 120 }}
          />
          <Chip
            label={`Bina: ${formData.finansalBilgiler?.binaInsaatGiderleri?.toplamBinaInsaatGideri?.toLocaleString('tr-TR') || '0'} ₺`}
            size="small"
            variant="outlined"
            color="warning"
            sx={{ minWidth: 120 }}
          />
          <Chip
            label={`Makine: ${formData.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.toplamMakineTeç?.toLocaleString('tr-TR') || '0'} ₺`}
            size="small"
            variant="outlined"
            color="info"
            sx={{ minWidth: 120 }}
          />
          <Chip
            label={`TOPLAM: ${formData.finansalBilgiler?.toplamSabitYatirimTutari?.toLocaleString('tr-TR') || '0'} ₺`}
            size="small"
            variant="filled"
            color="primary"
            sx={{ minWidth: 140, fontWeight: 600 }}
          />
        </Box>
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
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>ÖZKAYNAKLAR (Otomatik Hesaplanan)</Typography>
              <TextField
                fullWidth
                label="Özkaynaklar (= Sabit Yatırım - Yabancı Kaynak)"
                type="number"
                value={formData.finansalBilgiler.finansman.ozkaynaklar.ozkaynaklar}
                InputProps={{
                  readOnly: true,
                  endAdornment: '₺',
                  style: { 
                    fontWeight: 'bold', 
                    color: '#059669',
                    backgroundColor: '#f0fdf4'
                  }
                }}
                helperText="🔄 Devlet Sistemi: Otomatik hesaplanan (manuel değiştirilemez)"
                sx={{ 
                  backgroundColor: '#f0fdf4',
                  '& .MuiInputBase-root': {
                    backgroundColor: '#f0fdf4'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>TOPLAM FİNANSMAN</Typography>
              <TextField
                fullWidth
                label="Toplam Finansman (= Toplam Sabit Yatırım)"
                value={formData.finansalBilgiler.finansman.toplamFinansman.toLocaleString('tr-TR')}
                InputProps={{
                  readOnly: true,
                  endAdornment: '₺',
                  style: { fontWeight: 'bold', color: '#16a34a' }
                }}
                helperText="⚖️ Devlet Sistemi: Her zaman toplam sabit yatırım ile eşit"
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

      {/* Enhanced Finansal Özet */}
      <Grid item xs={12}>
        <Box sx={{ p: 3, backgroundColor: '#f8fafc', borderRadius: 2, border: '2px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            📊 Finansal Özet & Validasyon
            <Chip 
              label="Real-time" 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Typography>
          
          {/* Ana Kategoriler Grid */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <Typography variant="body2">
                💰 <strong>Arazi-Arsa:</strong> {formData.finansalBilgiler.araziArsaBedeli.araziArsaBedeli.toLocaleString('tr-TR')} ₺
              </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formData.finansalBilgiler.araziArsaBedeli.metrekaresi} m² × {formData.finansalBilgiler.araziArsaBedeli.birimFiyatiTl} ₺/m²
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Typography variant="body2">
                💵 <strong>Finansman:</strong> {formData.finansalBilgiler.finansman.toplamFinansman.toLocaleString('tr-TR')} ₺
              </Typography>
                <Typography variant="caption" color="text.secondary">
                  Yabancı: {formData.finansalBilgiler.finansman.yabanciKaynaklar.toplamYabanciKaynak.toLocaleString('tr-TR')} + Öz: {formData.finansalBilgiler.finansman.ozkaynaklar.ozkaynaklar.toLocaleString('tr-TR')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#fefce8', border: '1px solid #fde68a' }}>
              <Typography variant="body2">
                🏢 <strong>Bina İnşaat:</strong> {formData.finansalBilgiler.binaInsaatGiderleri.toplamBinaInsaatGideri.toLocaleString('tr-TR')} ₺
              </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ana Bina + Yardımcı + Yeraltı Galerileri
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe' }}>
              <Typography variant="body2">
                ⚙️ <strong>Makine Teçhizat:</strong> {formData.finansalBilgiler.makineTeçhizatGiderleri.tl.toplamMakineTeç.toLocaleString('tr-TR')} ₺
              </Typography>
                <Typography variant="caption" color="text.secondary">
                  TL: {formData.finansalBilgiler.makineTeçhizatGiderleri.tl.toplamMakineTeç.toLocaleString('tr-TR')} | $: {formData.finansalBilgiler.makineTeçhizatGiderleri.dolar.toplamIthalMakine.toLocaleString('tr-TR')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Validation Durumu */}
          <Box sx={{ mb: 2, p: 2, backgroundColor: '#eff6ff', borderRadius: 1, border: '1px solid #dbeafe' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ✅ Finansal Validasyon Durumu:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={formData.finansalBilgiler.araziArsaBedeli.araziArsaBedeli > 0 ? '✅ Arazi OK' : '⚠️ Arazi Eksik'}
                size="small"
                color={formData.finansalBilgiler.araziArsaBedeli.araziArsaBedeli > 0 ? 'success' : 'warning'}
                variant="outlined"
              />
              <Chip
                label={formData.finansalBilgiler.finansman.toplamFinansman > 0 ? '✅ Finansman OK' : '⚠️ Finansman Eksik'}
                size="small"
                color={formData.finansalBilgiler.finansman.toplamFinansman > 0 ? 'success' : 'warning'}
                variant="outlined"
              />
              <Chip
                label={formData.finansalBilgiler.binaInsaatGiderleri.toplamBinaInsaatGideri > 0 ? '✅ Bina OK' : '⚠️ Bina Eksik'}
                size="small"
                color={formData.finansalBilgiler.binaInsaatGiderleri.toplamBinaInsaatGideri > 0 ? 'success' : 'warning'}
                variant="outlined"
              />
              <Chip
                label={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.toplamMakineTeç > 0 ? '✅ Makine OK' : '⚠️ Makine Eksik'}
                size="small"
                color={formData.finansalBilgiler.makineTeçhizatGiderleri.tl.toplamMakineTeç > 0 ? 'success' : 'warning'}
                variant="outlined"
              />
              
              {/* 🆕 Finansman Dengesi Göstergesi */}
              <Chip
                label={
                  Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 
                    ? '⚖️ Finansman Dengeli' 
                    : '🚨 Finansman Dengesiz'
                }
                size="small"
                color={
                  Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 
                    ? 'success' 
                    : 'error'
                }
                variant="filled"
                sx={{ 
                  fontWeight: 600,
                  backgroundColor: Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 
                    ? '#22c55e' 
                    : '#ef4444',
                  color: 'white'
                }}
              />
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af' }}>
            🎯 <strong>TOPLAM SABİT YATIRIM:</strong> {formData.finansalBilgiler.toplamSabitYatirimTutari.toLocaleString('tr-TR')} ₺
          </Typography>
              <Chip
                label={formData.finansalBilgiler.toplamSabitYatirimTutari > 0 ? 'Hazır ✅' : 'Eksik ⚠️'}
                color={formData.finansalBilgiler.toplamSabitYatirimTutari > 0 ? 'success' : 'warning'}
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            
            {/* 🆕 Devlet Sistemi Finansman Dengesi Açıklaması */}
            <Box sx={{ 
              p: 2, 
              backgroundColor: Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 
                ? '#dcfce7' 
                : '#fef2f2',
              borderRadius: 1,
              border: `1px solid ${Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 
                ? '#bbf7d0' 
                : '#fecaca'}`
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                🏛️ <strong>Devlet Sistemi Mantığı:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📊 Toplam Sabit Yatırım: {formData.finansalBilgiler.toplamSabitYatirimTutari.toLocaleString('tr-TR')} ₺<br/>
                💸 Yabancı Kaynak: {formData.finansalBilgiler.finansman.yabanciKaynaklar.toplamYabanciKaynak.toLocaleString('tr-TR')} ₺<br/>
                💼 Özkaynak (Otomatik): {formData.finansalBilgiler.finansman.ozkaynaklar.ozkaynaklar.toLocaleString('tr-TR')} ₺<br/>
                ⚖️ Finansman Dengesi: {Math.abs(formData.finansalBilgiler.toplamSabitYatirimTutari - formData.finansalBilgiler.finansman.toplamFinansman) < 0.01 ? '✅ Dengeli' : '❌ Dengesiz'}
              </Typography>
            </Box>
          </Box>
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

      {/* 🆕 YENİ SEÇENEK EKLEME MODAL - DEVLET SİSTEMİ UI */}
      <Dialog 
        open={addOptionModal.open} 
        onClose={closeAddOptionModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                    '&:hover fieldset': { borderColor: '#667eea' },
                    '&.Mui-focused fieldset': { borderColor: '#667eea' }
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

export default TesvikForm;