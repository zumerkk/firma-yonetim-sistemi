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
// 🏭 Yatırım Konusu NACE Kodları Import
import { yatirimKonusuKodlari, yatirimKonusuKategorileri } from '../../data/yatirimKonusuData';
// 🏭 OSB (Organize Sanayi Bölgeleri) Import
import { osbListesi, osbIlleri } from '../../data/osbData';
// 🏪 Serbest Bölgeler Import
import { serbestBolgeler, serbestBolgeKategorileri } from '../../data/serbestBolgeData';
// 🚀 US 97 Kodları ULTRA-FAST Search Component
import US97SuperSearch from '../../components/US97SuperSearch';
// 📏 Kapasite Birimleri Import  
import { kapasiteBirimleri } from '../../data/kapasiteData';

// 🆕 Enhanced Components - CSV Integration (imports removed - not used in this form)

const TesvikForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  // 🔢 NUMBER FORMATTING UTILITIES
  const formatNumber = (value) => {
    if (!value || value === '') return '';
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
      vergiIndirimsizDestek: '' // Vergi İndirimsiz Destek Talebi (Evet/Hayır)
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

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // console.log('🔥 Loading template data from new API...');
      
      // YENİ API endpoint'i kullan - tüm veriler tek çağrıda!
      const response = await axios.get('/tesvik/templates/yeni-tesvik');

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
          destekSartlariOptions: data.destekSartlariOptions?.map(d => d.value)
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
      const response = await axios.get(`/tesvik/${id}`);
      
      if (response.data.success) {
        const backendData = response.data.data;
        
        // 🔄 Backend data'sını frontend formatına çevir
        const mappedData = {
          ...backendData,
          
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
            belgeBitisTarihi: formatDateForInput(backendData.belgeYonetimi?.belgeBitisTarihi) || '',
            uzatimTarihi: formatDateForInput(backendData.belgeYonetimi?.uzatimTarihi) || '',
            mucbirUzumaTarihi: formatDateForInput(backendData.belgeYonetimi?.mucbirUzumaTarihi) || '',
            oncelikliYatirim: backendData.belgeYonetimi?.oncelikliYatirim || '', // 🏆 Öncelikli Yatırım
            oncelikliYatirimTuru: backendData.belgeYonetimi?.oncelikliYatirimTuru || '' // 🏆 Öncelikli Yatırım Türü
          },
          
          // Backend'deki maliHesaplamalar → Frontend'deki finansalBilgiler
          finansalBilgiler: {
            toplamSabitYatirimTutari: backendData.maliHesaplamalar?.toplamSabitYatirim || 0,
            
            araziArsaBedeli: {
              aciklama: 'Arazi Arsa Bedeli Açıklaması',
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
              aciklama: 'Bina İnşaat Gideri Açıklaması',
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
          
          // 🎯 Destek Unsurları - Backend formatından frontend formatına çevir
          destekUnsurlari: backendData.destekUnsurlari?.map(destek => ({
            index: destek._id || Math.random().toString(36).substr(2, 9),
            // 🔧 Problematik değerleri temizle
            destekUnsuru: cleanProblematicValue(destek.destekUnsuru),
            sartlari: cleanProblematicValue(destek.sarti),
            aciklama: destek.aciklama || ''
          })) || [],
          
          // ⚖️ Özel Şartlar - Backend formatından frontend formatına çevir 
          ozelSartlar: backendData.ozelSartlar?.map(sart => ({
            index: sart.koşulNo || Math.random().toString(36).substr(2, 9),
            // 🔧 DOĞRU MAPPİNG: Backend koşulMetni → Frontend kisaltma (Ana metin)
            kisaltma: cleanProblematicValue(sart.koşulMetni) || '',
            // 🔧 DOĞRU MAPPİNG: Backend aciklamaNotu → Frontend notu (Açıklama)
            notu: cleanProblematicValue(sart.aciklamaNotu) || ''
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
        
        // Ürün bilgileri satır sayısını ayarla - DÜZELTME: Single row olmalı edit'te
        setUrunSayisi(1); // ✅ Kullanıcı isteği: Edit'te 1 satır başlasın
        
        // Destek unsurları satır sayısını hesapla
        const destekCount = Math.max(1, mappedData.destekUnsurlari?.length || 1);
        setDestekSayisi(destekCount);
        console.log('🎯 Destek unsurları yüklendi:', {
          count: destekCount,
          data: mappedData.destekUnsurlari
        });

        // Özel şartlar satır sayısını hesapla
        const ozelSartCount = Math.max(1, Math.min(mappedData.ozelSartlar?.length || 1, 7));
        setOzelSartSayisi(ozelSartCount);
        console.log('⚖️ Özel şartlar yüklendi:', {
          count: ozelSartCount,
          data: mappedData.ozelSartlar
        });
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

  // 📅 YENİ EKLENDİ - TARİH ALANLARI KOPYALA-YAPIŞTIR ÖZELLİĞİ
  // Clipboard'dan tarih verisi okuma ve format dönüştürme
  const handleDatePaste = async (fieldPath) => {
    try {
      // Clipboard'dan veri oku
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText || !clipboardText.trim()) {
        setError('Panoda tarih verisi bulunamadı!');
        return;
      }

      // Tarih formatlarını parse et
      const dateValue = parseClipboardDate(clipboardText.trim());
      
      if (dateValue) {
        // Form alanını güncelle
        handleFieldChange(fieldPath, dateValue);
        setSuccess(`📅 Tarih başarıyla yapıştırıldı: ${dateValue}`);
      } else {
        setError('Geçerli bir tarih formatı tanınmadı! (DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD destekleniyor)');
      }
    } catch (error) {
      setError('Kopyalama izni reddedildi veya hata oluştu!');
      console.error('Clipboard okuma hatası:', error);
    }
  };

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

    // 🎯 OTOMATIK ŞART DOLDURMA - Destek unsuru seçildiğinde
    if (field === 'destekUnsuru' && value && value.trim()) {
      try {
        console.log(`🎯 ${value} için otomatik şartlar getiriliyor...`);
        const sartlar = await destekSartService.getShartlarByDestekTuru(value.trim());
        
        if (sartlar && sartlar.length > 0) {
          console.log(`✅ ${sartlar.length} şart bulundu, otomatik doldurulacak`);
          
          // İlk şartı otomatik olarak doldur
          const ilkSart = sartlar[0];
          
          setFormData(prev => {
            const newData = { ...prev };
            if (newData.destekUnsurlari[index]) {
              newData.destekUnsurlari[index].sartlari = ilkSart;
            }
            return newData;
          });
          
          // Kullanıcıya bilgi ver
          console.log(`🎯 Otomatik şart dolduruldu: ${ilkSart}`);
          
          // Eğer birden fazla şart varsa, kullanıcıya seçenekleri göster (templateData'yı güncelle)
          if (sartlar.length > 1) {
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
          console.log(`⚠️ ${value} için eşleştirme bulunamadı, kullanıcı manuel girebilir`);
        }
      } catch (error) {
        console.error('❌ Otomatik şart getirme hatası:', error);
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

  // 🎯 ======== DİNAMİK VERİ EKLEME FONKSİYONLARI ========

  // Yeni Destek Unsuru Ekleme
  const addNewDestekUnsuru = async (value) => {
    if (!value || value.length < 3) return; // En az 3 karakter
    
    try {
      const response = await axios.post('/tesvik/dynamic/destek-unsuru', {
        value: value.trim(),
        label: value.trim(),
        kategori: 'Diğer',
        renk: '#6B7280'
      });

      if (response.data.success) {
        // CRITICAL FIX: Template data'yı yenile!
        try {
          const templateResponse = await axios.get('/tesvik/form-template');
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

  // Yeni Destek Şartı Ekleme
  const addNewDestekSarti = async (value) => {
    if (!value || value.length < 3) return;
    
    try {
      const response = await axios.post('/tesvik/dynamic/destek-sarti', {
        value: value.trim(),
        label: value.trim(),
        kategori: 'Diğer'
      });

      if (response.data.success) {
        await loadInitialData();
        console.log('✅ Yeni destek şartı eklendi:', value);
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

  // Yeni Özel Şart Ekleme - ENHANCED DEBUG
  const addNewOzelSart = async (value) => {
    console.log(`🆕 [DEBUG] addNewOzelSart çağrıldı:`, { value, length: value?.length });
    
    if (!value || value.length < 2) {
      console.log(`❌ [DEBUG] Value çok kısa, eklenmedi:`, value);
      return;
    }
    
    try {
      const kisaltma = value.trim().toUpperCase();
      const aciklama = value.length > 10 ? value.trim() : `${kisaltma} Açıklaması`;
      
      console.log(`📡 [DEBUG] Backend'e POST isteği gönderiliyor:`, {
        endpoint: '/tesvik/dynamic/ozel-sart',
        data: { kisaltma, aciklama, kategori: 'Diğer' }
      });
      
      const response = await axios.post('/tesvik/dynamic/ozel-sart', {
        kisaltma: kisaltma,
        aciklama: aciklama,
        kategori: 'Diğer'
      });

      console.log(`✅ [DEBUG] Backend response:`, response.data);

      if (response.data.success) {
        console.log(`🔄 [DEBUG] Template data refresh başlatılıyor...`);
        
        // CRITICAL FIX: Template data'yı da yenile!
        try {
          const templateResponse = await axios.get('/tesvik/form-template');
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
      const response = await axios.post('/tesvik/dynamic/ozel-sart-notu', {
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
      
      const response = await axios.get(`/tesvik/${tesvikId}/excel-export`, {
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
          vergiIndirimsizDestek: formData.yatirimBilgileri1?.vergiIndirimsizDestek || '',

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
          
          // Maliyetlenen (Araç Arsa Bedeli Detayları)
          maliyetlenen: {
            sl: formData.finansalBilgiler?.araziArsaBedeli?.metrekaresi || 0,
            sm: formData.finansalBilgiler?.araziArsaBedeli?.birimFiyatiTl || 0,
            sn: formData.finansalBilgiler?.araziArsaBedeli?.araziArsaBedeli || 0
          },
          
          // Bina İnşaat Giderleri
          binaInsaatGideri: {
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
        
        // 🔧 Destek Unsurları model formatına çevir - GÜÇLENLED
        destekUnsurlari: formData.destekUnsurlari?.filter(d => 
          d && d.destekUnsuru && d.destekUnsuru.trim() !== '' && d.sartlari && d.sartlari.trim() !== ''
        ).map(destek => ({
          destekUnsuru: destek.destekUnsuru.trim(),
          sarti: destek.sartlari.trim(), // Frontend: sartlari → Backend: sarti
          aciklama: destek.aciklama?.trim() || ''
        })) || [],
        
        // 🔧 Özel Şartlar model formatına çevir - DOĞRU MAPPİNG
        ozelSartlar: formData.ozelSartlar?.filter(s => 
          s && (s.kisaltma?.trim() || s.notu?.trim())
        ).map((sart, index) => ({
          koşulNo: index + 1, // Backend: koşulNo (required) - otomatik ID
          koşulMetni: (sart.kisaltma?.trim() || ''), // Frontend kisaltma → Backend koşulMetni
          aciklamaNotu: (sart.notu?.trim() || '') // Frontend notu → Backend aciklamaNotu
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
          elevation={1}
          sx={{ 
            p: 3, 
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 1,
            borderLeft: '4px solid #2563eb'
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 1, 
              fontWeight: 600, 
              textAlign: 'left',
              color: '#1e293b'
            }}
          >
            KÜNYE BİLGİLERİ
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              textAlign: 'left', 
              color: '#64748b',
              fontWeight: 400
            }}
          >
            T.C. Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı standartlarına uygun form
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
          id="tesvikForm-gmId"
          name="gmId"
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
          id="tesvikForm-talepSonuc"
          name="talepSonuc"
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
          id="tesvikForm-revizeId"
          name="revizeId"
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
           id="tesvikForm-firmaId"
           name="firmaId"
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
                      Firma Seçimi
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
                              label="Firma Seçimi"
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
                id="tesvikForm-yatirimciUnvan2"
                name="yatirimciUnvan2"
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
                id="tesvikForm-sgkSicilNo"
                name="sgkSicilNo"
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
                label="BELGE ID"
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
              <Box sx={{ position: 'relative' }}>
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
                {/* YAPIŞTIR BUTONU */}
                <IconButton
                  onClick={() => handleDatePaste('belgeYonetimi.belgeTarihi')}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    '&:hover': { backgroundColor: '#d97706' },
                    width: 28,
                    height: 28
                  }}
                  title="Panodan tarihi yapıştır (DD/MM/YYYY, YYYY-MM-DD formatları desteklenir)"
                >
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
            
            {/* BELGE MÜRACAAT TARIHI */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
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
                {/* YAPIŞTIR BUTONU */}
                <IconButton
                  onClick={() => handleDatePaste('belgeYonetimi.belgeMuracaatTarihi')}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    '&:hover': { backgroundColor: '#d97706' },
                    width: 28,
                    height: 28
                  }}
                  title="Panodan tarihi yapıştır (DD/MM/YYYY, YYYY-MM-DD formatları desteklenir)"
                >
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              </Box>
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
              <Box sx={{ position: 'relative' }}>
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
                {/* YAPIŞTIR BUTONU */}
                <IconButton
                  onClick={() => handleDatePaste('belgeYonetimi.belgeBaslamaTarihi')}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#10b981',
                    color: 'white',
                    '&:hover': { backgroundColor: '#059669' },
                    width: 28,
                    height: 28
                  }}
                  title="Panodan tarihi yapıştır (DD/MM/YYYY, YYYY-MM-DD formatları desteklenir)"
                >
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
      
            {/* BELGE BITIŞ TARIHI */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
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
                {/* YAPIŞTIR BUTONU */}
                <IconButton
                  onClick={() => handleDatePaste('belgeYonetimi.belgeBitisTarihi')}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    '&:hover': { backgroundColor: '#b91c1c' },
                    width: 28,
                    height: 28
                  }}
                  title="Panodan tarihi yapıştır (DD/MM/YYYY, YYYY-MM-DD formatları desteklenir)"
                >
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
            
            {/* SÜRE UZATIM TARIHI */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
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
                {/* YAPIŞTIR BUTONU */}
                <IconButton
                  onClick={() => handleDatePaste('belgeYonetimi.uzatimTarihi')}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    '&:hover': { backgroundColor: '#7c3aed' },
                    width: 28,
                    height: 28
                  }}
                  title="Panodan tarihi yapıştır (DD/MM/YYYY, YYYY-MM-DD formatları desteklenir)"
                >
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
            
            {/* 🏆 ÖNCELİKLİ YATIRIM ALANLARI */}
            <Grid item xs={12} sm={6} md={6}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-oncelikliYatirim-belge-label">
                  🎯 Öncelikli Yatırım mı?
                </InputLabel>
                <Select
                  id="tesvikForm-oncelikliYatirim-belge"
                  name="oncelikliYatirim"
                  labelId="tesvikForm-oncelikliYatirim-belge-label"
                  value={formData.belgeYonetimi.oncelikliYatirim || ''}
                  onChange={(e) => {
                    console.log('🏆 Öncelikli Yatırım seçildi (BELGE):', e.target.value);
                    handleFieldChange('belgeYonetimi.oncelikliYatirim', e.target.value);
                    console.log('🔄 FormData güncellemesi sonrası (BELGE):', formData.belgeYonetimi.oncelikliYatirim);
                    // Hayır seçilirse öncelikli yatırım türünü temizle
                    if (e.target.value === 'hayır' || e.target.value === '') {
                      handleFieldChange('belgeYonetimi.oncelikliYatirimTuru', '');
                    }
                  }}
                  label="🎯 Öncelikli Yatırım mı?"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' }
                  }}
                >
                  <MenuItem value="">
                    <em>Seçiniz...</em>
                  </MenuItem>
                  <MenuItem value="evet">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmojiEventsIcon sx={{ color: '#f39c12', fontSize: 18 }} />
                      <Typography>Evet</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="hayır">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloseIcon sx={{ color: '#e74c3c', fontSize: 18 }} />
                      <Typography>Hayır</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 🏆 ÖNCELİKLİ YATIRIM TÜRÜ DROPDOWN - Sadece "evet" seçilirse görünür */}
            {console.log('🔍 Conditional check (BELGE) - oncelikliYatirim:', formData.belgeYonetimi.oncelikliYatirim, 'equals evet?', formData.belgeYonetimi.oncelikliYatirim === 'evet')}
            {formData.belgeYonetimi.oncelikliYatirim === 'evet' && (
              <Grid item xs={12} sm={6} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="tesvikForm-oncelikliYatirimTuru-belge-label">
                    🎖️ Öncelikli Yatırım Türü
                  </InputLabel>
                  <Select
                    id="tesvikForm-oncelikliYatirimTuru-belge"
                    name="oncelikliYatirimTuru"
                    labelId="tesvikForm-oncelikliYatirimTuru-belge-label"
                    value={formData.belgeYonetimi.oncelikliYatirimTuru || ''}
                    onChange={(e) => handleFieldChange('belgeYonetimi.oncelikliYatirimTuru', e.target.value)}
                    label="🎖️ Öncelikli Yatırım Türü"
                    sx={{
                      backgroundColor: '#f8f9fa',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d97706' }
                    }}
                  >
                    <MenuItem value="">
                      <em>Öncelikli yatırım türünü seçiniz...</em>
                    </MenuItem>
                    {oncelikliYatirimKategorileri.map((kategori) => [
                      <MenuItem key={`kategori-${kategori.value}`} disabled sx={{ 
                        fontWeight: 'bold', 
                        color: kategori.renk,
                        fontSize: '0.9rem',
                        backgroundColor: '#f5f5f5'
                      }}>
                        {kategori.label}
                      </MenuItem>,
                      ...oncelikliYatirimTurleri
                        .filter(tur => tur.kategori === kategori.value)
                        .map((tur) => (
                          <MenuItem key={tur.id} value={tur.id} sx={{ pl: 3 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {tur.id.toUpperCase()}) {tur.baslik}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                {tur.aciklama}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                    ]).flat()}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
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
          elevation={0}
          sx={{ 
            p: 2, 
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#475569', 
                fontWeight: 500,
                textAlign: 'center' 
              }}
            >
              Bu form T.C. resmi standartlarına uygun olarak tasarlanmıştır. 
              Tüm alanlar mevzuat gereksinimlerine göre düzenlenmiştir.
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
            
            {/* ROW 1: YATIRIM KONUI - 290 NACE Kodu Dropdown */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-yatirimKonusu-label">
                  🏭 YATIRIM KONUI (NACE Kodu Seçiniz)
                </InputLabel>
                <Select
                id="tesvikForm-yatirimKonusu"
                name="yatirimKonusu"
                  labelId="tesvikForm-yatirimKonusu-label"
                value={formData.yatirimBilgileri1.yatirimKonusu}
                onChange={(e) => handleFieldChange('yatirimBilgileri1.yatirimKonusu', e.target.value)}
                  label="🏭 YATIRIM KONUI (NACE Kodu Seçiniz)"
                sx={{
                    backgroundColor: '#ffffff',
                    fontWeight: 500,
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' }
                  }}
                >
                  <MenuItem value="">
                    <em>NACE kodunu seçiniz...</em>
                  </MenuItem>
                  {yatirimKonusuKategorileri.map((kategori) => [
                    <MenuItem key={`kategori-${kategori}`} disabled sx={{ 
                      fontWeight: 'bold', 
                      color: '#16a085',
                      fontSize: '0.9rem',
                      backgroundColor: '#f0f9f0',
                      textTransform: 'uppercase'
                    }}>
                      📂 {kategori}
                    </MenuItem>,
                    ...yatirimKonusuKodlari
                      .filter(item => item.kategori === kategori)
                      .map((item) => (
                        <MenuItem key={item.kod} value={item.kod} sx={{ pl: 3 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2563eb' }}>
                              {item.kod} - {item.aciklama.substring(0, 60)}
                              {item.aciklama.length > 60 && '...'}
                            </Typography>
                            {item.aciklama.length > 60 && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                {item.aciklama.substring(60)}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))
                  ]).flat()}
                </Select>
              </FormControl>
            </Grid>
            
            {/* ROW 2: DİNAMİK J-CNS ALANLARI - Başlangıç 1, Max 4 */}
            {Array.from({ length: cinsSayisi }, (_, index) => (
              <Grid item xs={12} sm={6} md={3} key={`cins-${index + 1}`}>
                <Box sx={{ position: 'relative' }}>
              <FormControl fullWidth>
                    <InputLabel id={`tesvikForm-cins${index + 1}-label`} htmlFor={`tesvikForm-cins${index + 1}`}>J-CNS({index + 1})</InputLabel>
                <Select
                      id={`tesvikForm-cins${index + 1}`}
                      name={`cins${index + 1}`}
                      labelId={`tesvikForm-cins${index + 1}-label`}
                      value={formData.yatirimBilgileri1[`cins${index + 1}`] || ''}
                      onChange={(e) => handleFieldChange(`yatirimBilgileri1.cins${index + 1}`, e.target.value)}
                      label={`J-CNS(${index + 1})`}
                      sx={{
                        backgroundColor: '#ffffff',
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' }
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
                <InputLabel id="tesvikForm-destekSinifi-label" htmlFor="tesvikForm-destekSinifi">DESTEK SINIFI 🎯</InputLabel>
                <Select
                  id="tesvikForm-destekSinifi"
                  name="destekSinifi"
                  labelId="tesvikForm-destekSinifi-label"
                  value={formData.yatirimBilgileri1.destekSinifi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.destekSinifi', e.target.value)}
                  label="DESTEK SINIFI 🎯"
                  sx={{
                    backgroundColor: '#ffffff',
                                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' }
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
            
            {/* ✨ YENİ PROFESYONEL ALANLAR - Resimden Eklenenler */}
            
            {/* ROW 3.1: CAZİBE MERKEZİ Mİ? */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-cazibeMerkeziMi-label">🌟 Cazibe Merkezi Mi?</InputLabel>
                <Select
                  id="tesvikForm-cazibeMerkeziMi"
                  name="cazibeMerkeziMi"
                  labelId="tesvikForm-cazibeMerkeziMi-label"
                  value={formData.yatirimBilgileri1.cazibeMerkeziMi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cazibeMerkeziMi', e.target.value)}
                  label="🌟 Cazibe Merkezi Mi?"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#16a085' }
                  }}
                >
                  <MenuItem value="">Seçiniz...</MenuItem>
                  <MenuItem value="evet">✅ EVET</MenuItem>
                  <MenuItem value="hayir">❌ HAYIR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* ROW 3.2: SAVUNMA SANAYİ PROJESİ Mİ? */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-savunmaSanayiProjesi-label">🛡️ Savunma Sanayi Projesi Mi?</InputLabel>
                <Select
                  id="tesvikForm-savunmaSanayiProjesi"
                  name="savunmaSanayiProjesi"
                  labelId="tesvikForm-savunmaSanayiProjesi-label"
                  value={formData.yatirimBilgileri1.savunmaSanayiProjesi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.savunmaSanayiProjesi', e.target.value)}
                  label="🛡️ Savunma Sanayi Projesi Mi?"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' }
                  }}
                >
                  <MenuItem value="">Seçiniz...</MenuItem>
                  <MenuItem value="evet">✅ EVET</MenuItem>
                  <MenuItem value="hayir">❌ HAYIR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* ROW 3.3: ENERJİ ÜRETİM KAYNAĞI */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                id="tesvikForm-enerjiUretimKaynagi"
                name="enerjiUretimKaynagi"
                fullWidth
                label="⚡ Enerji Üretim Kaynağı"
                value={formData.yatirimBilgileri1.enerjiUretimKaynagi}
                onChange={(e) => handleFieldChange('yatirimBilgileri1.enerjiUretimKaynagi', e.target.value)}
                placeholder="Enerji türünü giriniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    '&:hover': { borderColor: '#f59e0b' },
                    '&.Mui-focused': { borderColor: '#f59e0b' }
                  }
                }}
              />
            </Grid>

            {/* ROW 3.4: CAZİBE MERKEZİ (2018/11201) */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-cazibeMerkezi2018-label">📋 Cazibe Merkezi (2018/11201)</InputLabel>
                <Select
                  id="tesvikForm-cazibeMerkezi2018"
                  name="cazibeMerkezi2018"
                  labelId="tesvikForm-cazibeMerkezi2018-label"
                  value={formData.yatirimBilgileri1.cazibeMerkezi2018}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cazibeMerkezi2018', e.target.value)}
                  label="📋 Cazibe Merkezi (2018/11201)"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#dc2626' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#dc2626' }
                  }}
                >
                  <MenuItem value="">Seçiniz...</MenuItem>
                  <MenuItem value="evet">✅ EVET</MenuItem>
                  <MenuItem value="hayir">❌ HAYIR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* ROW 3.5: CAZİBE MERKEZİ DEPREM NEDENİ */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-cazibeMerkeziDeprem-label">🏗️ Cazibe Merkezi Deprem Nedeni</InputLabel>
                <Select
                  id="tesvikForm-cazibeMerkeziDeprem"
                  name="cazibeMerkeziDeprem"
                  labelId="tesvikForm-cazibeMerkeziDeprem-label"
                  value={formData.yatirimBilgileri1.cazibeMerkeziDeprem}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.cazibeMerkeziDeprem', e.target.value)}
                  label="🏗️ Cazibe Merkezi Deprem Nedeni"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ea580c' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ea580c' }
                  }}
                >
                  <MenuItem value="">Seçiniz...</MenuItem>
                  <MenuItem value="evet">✅ EVET</MenuItem>
                  <MenuItem value="hayir">❌ HAYIR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* ROW 3.6: HAMLE Mİ? */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-hamleMi-label">🚀 HAMLE MI?</InputLabel>
                <Select
                  id="tesvikForm-hamleMi"
                  name="hamleMi"
                  labelId="tesvikForm-hamleMi-label"
                  value={formData.yatirimBilgileri1.hamleMi}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.hamleMi', e.target.value)}
                  label="🚀 HAMLE MI?"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#059669' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#059669' }
                  }}
                >
                  <MenuItem value="">Seçiniz...</MenuItem>
                  <MenuItem value="evet">✅ EVET</MenuItem>
                  <MenuItem value="hayir">❌ HAYIR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* ROW 3.7: VERGİ İNDİRİMSİZ DESTEK TALEBİ */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-vergiIndirimsizDestek-label">💰 Vergi İndirimsiz Destek Talebi</InputLabel>
                <Select
                  id="tesvikForm-vergiIndirimsizDestek"
                  name="vergiIndirimsizDestek"
                  labelId="tesvikForm-vergiIndirimsizDestek-label"
                  value={formData.yatirimBilgileri1.vergiIndirimsizDestek}
                  onChange={(e) => handleFieldChange('yatirimBilgileri1.vergiIndirimsizDestek', e.target.value)}
                  label="💰 Vergi İndirimsiz Destek Talebi"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' }
                  }}
                >
                  <MenuItem value="">Seçiniz...</MenuItem>
                  <MenuItem value="evet">✅ EVET</MenuItem>
                  <MenuItem value="hayir">❌ HAYIR</MenuItem>
                </Select>
              </FormControl>
            </Grid>
      
            {/* ROW 4: YER İL, YER İLÇE - Otomatik Seçim */}
            <Grid item xs={12} sm={12} md={6}>
              <EnhancedCitySelector
                selectedCity={formData.yatirimBilgileri2.yerinIl}
                selectedDistrict={formData.yatirimBilgileri2.yerinIlce}
                onCityChange={(city, cityCode) => handleFieldChange('yatirimBilgileri2.yerinIl', city)}
                onDistrictChange={(district, districtCode) => handleFieldChange('yatirimBilgileri2.yerinIlce', district)}
                cityLabel="Yatırım Yeri İl"
                districtLabel="Yatırım Yeri İlçe"
              />
            </Grid>
            
            {/* ROW 5: ADA, PARSEL - YENİ ALANLAR */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                id="tesvikForm-ada"
                name="ada"
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
                id="tesvikForm-parsel"
                name="parsel"
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
                id={`tesvikForm-yatirimAdresi${index + 1}`}
                name={`yatirimAdresi${index + 1}`}
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
            
            {/* ROW 7: OSB İSE MÜDÜRLÜK - 411 OSB'den Seçim */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-osbMudurluk-label">
                  🏭 OSB İSE MÜDÜRLÜK (411 OSB)
                </InputLabel>
                <Select
                  id="tesvikForm-osbMudurluk"
                  name="osbMudurluk"
                  labelId="tesvikForm-osbMudurluk-label"
                  value={formData.yatirimBilgileri2.ossBelgeMudavimi || ''}
                  onChange={(e) => handleFieldChange('yatirimBilgileri2.ossBelgeMudavimi', e.target.value)}
                  label="🏭 OSB İSE MÜDÜRLÜK (411 OSB)"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#e67e22' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#e67e22' }
                  }}
                >
                  <MenuItem value="">
                    <em>OSB seçiniz...</em>
                  </MenuItem>
                  {osbIlleri.map((il) => [
                    <MenuItem key={`il-${il}`} disabled sx={{ 
                      fontWeight: 'bold', 
                      color: '#e67e22',
                      fontSize: '0.9rem',
                      backgroundColor: '#fef8f0',
                      textTransform: 'uppercase'
                    }}>
                      📍 {il} İLİ
                    </MenuItem>,
                    ...osbListesi
                      .filter(item => item.il === il)
                      .map((osb) => (
                        <MenuItem key={`${osb.il}-${osb.osb}`} value={osb.osb} sx={{ pl: 3 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#c0392b' }}>
                              {osb.osb}
                        </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                              {osb.il} İli
                          </Typography>
                          </Box>
                        </MenuItem>
                      ))
                  ]).flat()}
                </Select>
              </FormControl>
            </Grid>
      
            {/* ROW 8: BÖLGESİ VE İLÇE BAZLI BÖLGE - 1-6 Bölge Seçimi */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-bolgesi-label">
                  🗺️ BÖLGESİ
                </InputLabel>
                <Select
                  id="tesvikForm-bolgesi"
                  name="bolgesi"
                  labelId="tesvikForm-bolgesi-label"
                  value={formData.yatirimBilgileri2.ilBazliBolge || ''}
                  onChange={(e) => handleFieldChange('yatirimBilgileri2.ilBazliBolge', e.target.value)}
                  label="🗺️ BÖLGESİ"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3498db' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3498db' }
                  }}
                >
                  <MenuItem value="">
                    <em>Bölge seçiniz...</em>
                  </MenuItem>
                  {[1, 2, 3, 4, 5, 6].map((bolge) => (
                    <MenuItem key={bolge} value={`${bolge}. Bölge`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#2980b9' }}>
                          {bolge}. Bölge
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
      
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-ilceBazliBolge-label">
                  🏘️ İlçe Bazlı Bölge
                </InputLabel>
                <Select
                  id="tesvikForm-ilceBazliBolge"
                  name="ilceBazliBolge"
                  labelId="tesvikForm-ilceBazliBolge-label"
                  value={formData.yatirimBilgileri2.ilceBazliBolge || ''}
                  onChange={(e) => handleFieldChange('yatirimBilgileri2.ilceBazliBolge', e.target.value)}
                  label="🏘️ İlçe Bazlı Bölge"
                  sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#27ae60' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#27ae60' }
                  }}
                >
                  <MenuItem value="">
                    <em>İlçe bölgesi seçiniz...</em>
                  </MenuItem>
                  {[1, 2, 3, 4, 5, 6].map((bolge) => (
                    <MenuItem key={bolge} value={`${bolge}. Bölge`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#229954' }}>
                          {bolge}. Bölge
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
          </Grid>
      
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="tesvikForm-serbestBolge-label">
                  🏪 SERBEST BÖLGE (19 Müdürlük)
                </InputLabel>
                <Select
                  id="tesvikForm-serbestBolge"
                  name="serbestBolge"
                  labelId="tesvikForm-serbestBolge-label"
                value={formData.yatirimBilgileri2.serbsetBolge || ''}
                onChange={(e) => handleFieldChange('yatirimBilgileri2.serbsetBolge', e.target.value)}
                  label="🏪 SERBEST BÖLGE (19 Müdürlük)"
                sx={{
                    backgroundColor: '#ffffff',
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8e44ad' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8e44ad' }
                  }}
                >
                  <MenuItem value="">
                    <em>Serbest bölge seçiniz...</em>
                  </MenuItem>
                  {serbestBolgeKategorileri.map((kategori) => [
                    <MenuItem key={`kategori-${kategori}`} disabled sx={{ 
                      fontWeight: 'bold', 
                      color: '#8e44ad',
                      fontSize: '0.9rem',
                      backgroundColor: '#f8f4fd',
                      textTransform: 'uppercase'
                    }}>
                      🏷️ {kategori}
                    </MenuItem>,
                    ...serbestBolgeler
                      .filter(item => item.kategori === kategori)
                      .map((bolge) => (
                        <MenuItem key={bolge.id} value={bolge.bolge} sx={{ pl: 3 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#6c3483' }}>
                              {bolge.bolge}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                              {bolge.il} • {bolge.kategori}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))
                  ]).flat()}
                </Select>
              </FormControl>
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
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Boş string ise boş bırak, değer varsa parse et
                  if (inputValue === '') {
                    handleFieldChange('istihdam.mevcutKisi', '');
                  } else {
                    const numValue = parseInt(inputValue);
                    // Geçerli sayı değilse veya negatifse 0 yap
                    const safeValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
                    handleFieldChange('istihdam.mevcutKisi', safeValue);
                  }
                }}
                onFocus={(e) => {
                  // Input'a focus olduğunda 0 ise temizle
                  if (e.target.value === '0') {
                    handleFieldChange('istihdam.mevcutKisi', '');
                  }
                }}
                onBlur={(e) => {
                  // Focus kaybında boşsa 0 yap
                  if (e.target.value === '') {
                    handleFieldChange('istihdam.mevcutKisi', 0);
                  }
                }}
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
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Boş string ise boş bırak, değer varsa parse et
                  if (inputValue === '') {
                    handleFieldChange('istihdam.ilaveKisi', '');
                  } else {
                    const numValue = parseInt(inputValue);
                    // Geçerli sayı değilse veya negatifse 0 yap
                    const safeValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
                    handleFieldChange('istihdam.ilaveKisi', safeValue);
                  }
                }}
                onFocus={(e) => {
                  // Input'a focus olduğunda 0 ise temizle
                  if (e.target.value === '0') {
                    handleFieldChange('istihdam.ilaveKisi', '');
                  }
                }}
                onBlur={(e) => {
                  // Focus kaybında boşsa 0 yap
                  if (e.target.value === '') {
                    handleFieldChange('istihdam.ilaveKisi', 0);
                  }
                }}
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
                      🏷️ US97 Ürün Kodu
                    </Typography>
                    <US97SuperSearch
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
                      placeholder="US97 kodları ara..."
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
                  
                  {/* 💼 CAPACITY MANAGEMENT SECTION */}
                  <Grid item xs={12}>
                    <Box sx={{ 
                      background: 'linear-gradient(90deg, #f1f5f9, #e2e8f0)',
                      borderRadius: 2,
                      p: 3,
                      border: '1px solid #e2e8f0',
                      mt: 2
                    }}>
                      <Typography variant="subtitle1" sx={{ color: '#1e293b', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        📊 Kapasite Yönetimi
                        {urun.toplam > 0 && (
                          <Chip 
                            label={`Toplam: ${(parseFloat(urun.toplam) || 0).toLocaleString('tr-TR')}`}
                      size="small"
                            color="success"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {/* Current Capacity */}
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
                            Mevcut Kapasite
                          </Typography>
                          <TextField
                            fullWidth
                      type="text"
                            value={formatNumber(urun.mevcut)}
                      onChange={(e) => handleNumberChange(e, `urunBilgileri.${index}.mevcut`)}
                            placeholder="500.000.000"
                      variant="outlined"
                            inputProps={{ 
                              min: 0,
                              max: 999999999999,
                              style: { 
                                textAlign: 'center', 
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                padding: '12px',
                                fontFamily: 'monospace',
                                letterSpacing: '0.5px'
                              } 
                            }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                                backgroundColor: '#ffffff',
                                borderRadius: 2,
                                '& fieldset': {
                                  borderColor: '#e5e7eb'
                                },
                                '&:hover fieldset': {
                                  borderColor: '#3b82f6'
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#3b82f6',
                                  borderWidth: '2px'
                                }
                        }
                      }}
                    />
                        </Grid>
                  
                        {/* Additional Capacity */}
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
                            İlave Kapasite
                          </Typography>
                    <TextField
                            fullWidth
                      type="text"
                            value={formatNumber(urun.ilave)}
                      onChange={(e) => handleNumberChange(e, `urunBilgileri.${index}.ilave`)}
                            placeholder="120.000.000"
                      variant="outlined"
                            inputProps={{ 
                              min: 0,
                              max: 999999999999,
                              style: { 
                                textAlign: 'center', 
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                padding: '12px',
                                fontFamily: 'monospace',
                                letterSpacing: '0.5px'
                              } 
                            }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                                backgroundColor: '#ffffff',
                                borderRadius: 2,
                                '& fieldset': {
                                  borderColor: '#e5e7eb'
                                },
                                '&:hover fieldset': {
                                  borderColor: '#10b981'
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#10b981',
                                  borderWidth: '2px'
                                }
                        }
                      }}
                    />
                        </Grid>
                  
                        {/* Total Capacity */}
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
                            Toplam Kapasite (Otomatik hesaplanır)
                          </Typography>
                    <TextField
                            fullWidth
                      type="text"
                            value={formatNumber(urun.toplam)}
                      InputProps={{ 
                        readOnly: true,
                              style: { 
                                textAlign: 'center', 
                                fontWeight: 700,
                                fontSize: '1.2rem',
                                padding: '12px',
                                fontFamily: 'monospace',
                                color: '#059669',
                                letterSpacing: '1px'
                              }
                      }}
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                                borderRadius: 2,
                                '& fieldset': {
                                  borderColor: '#10b981',
                                  borderWidth: '2px'
                          }
                        }
                      }}
                    />
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                  
                  {/* 🏷️ UNIT SELECTOR & STATUS */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: '#374151', fontWeight: 600, mb: 1 }}>
                      🏷️ Kapasite Birimi
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={urun.kapasite_birimi || ''}
                        onChange={(e) => handleUrunChange(index, 'kapasite_birimi', e.target.value)}
                        displayEmpty
                        variant="outlined"
                        sx={{
                          backgroundColor: '#ffffff',
                          borderRadius: 2,
                          '& .MuiSelect-select': {
                            py: 1.5
                          },
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
                        }}
                      >
                        <MenuItem value="">
                          <em style={{ color: '#9ca3af' }}>Birim seçin...</em>
                        </MenuItem>
                        {kapasiteBirimleri?.map((birim) => (
                          <MenuItem key={birim} value={birim}>
                            {birim}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* 📈 STATUS INDICATORS */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: '#374151', fontWeight: 600, mb: 1 }}>
                      📈 Tamamlanma Durumu
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      {urun.kod && urun.aciklama ? (
                        <Chip 
                          label="✅ Tamamlandı" 
                          color="success" 
                          variant="filled"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Chip 
                          label="⏳ Eksik" 
                          color="warning" 
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      {urun.toplam > 0 && (
                        <Chip 
                          label={`💼 Değer: ${(parseFloat(urun.toplam) || 0).toLocaleString('tr-TR')}`}
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      )}
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
                      placeholder="Kısaltma seçin veya yeni ekleyin..."
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
                      label="Özel Şart Notu 📝"
                      placeholder="Not seçin veya yeni ekleyin..."
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
    
    // 4. Toplam İthal Makine ($) hesapla
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
    const ikinciElFiyat = toNumber(finansal.finansman?.yabanciKaynaklar?.ikinciElFiyatFarki);
    const kullanilmisTeçhizat = toNumber(finansal.finansman?.yabanciKaynaklar?.kullanilmisTeçhizatBedeli);
    const digerDisKaynak = toNumber(finansal.finansman?.yabanciKaynaklar?.digerDisKaynaklar);
    const digerYabanci = toNumber(finansal.finansman?.yabanciKaynaklar?.digerYabanciKaynak);
    const toplamYabanciKaynak = bankKredisi + ikinciElFiyat + kullanilmisTeçhizat + digerDisKaynak + digerYabanci;
    
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
        toplamSabitYatirimTutari: formData.finansalBilgiler?.toplamSabitYatirimTutari || 0
      };

      // Sadece anlamlı değişiklik varsa güncelle (1 TL tolerans)
      const hasChanged = (
        Math.abs(currentCalculatedValues.araziTotal - calculations.araziTotal) > 1 ||
        Math.abs(currentCalculatedValues.toplamYabanciKaynak - calculations.toplamYabanciKaynak) > 1 ||
        Math.abs(currentCalculatedValues.ozkaynaklar - calculations.ozKaynakOtomatik) > 1 ||
        Math.abs(currentCalculatedValues.toplamSabitYatirimTutari - calculations.toplamSabitYatirim) > 1
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
    formData.finansalBilgiler?.digerYatirimHarcamalari?.digerGiderleri
    // ⚠️ calculateFinansalTotals ve formData.finansalBilgiler KASITLI olarak eksik bırakıldı - infinite loop'u önlemek için
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

      {/* 2. ARAZI ARSA BEDELİ */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#fef3f2' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#dc2626' }}>
            Arazi Arsa Bedeli
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
                type="text"
                value={formatNumber(formData.finansalBilgiler.araziArsaBedeli.metrekaresi)}
                onChange={(e) => handleNumberChange(e, 'finansalBilgiler.araziArsaBedeli.metrekaresi')}
                InputProps={{ endAdornment: 'm²' }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Birim Fiyatı TL"
                type="text"
                value={formatNumber(formData.finansalBilgiler.araziArsaBedeli.birimFiyatiTl)}
                onChange={(e) => handleNumberChange(e, 'finansalBilgiler.araziArsaBedeli.birimFiyatiTl')}
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

      {/* 3. BİNA İNŞAAT GİDERLERİ TL */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
            BİNA İNŞAAT GİDERLERİ (TL)
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
                type="text"
                value={formatNumber(formData.finansalBilgiler.binaInsaatGiderleri.anaBinaVeTesisleri)}
                onChange={(e) => handleNumberChange(e, 'finansalBilgiler.binaInsaatGiderleri.anaBinaVeTesisleri')}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Yardımcı İş. Bina ve İcare Binaları"
                type="text"
                value={formatNumber(formData.finansalBilgiler.binaInsaatGiderleri.yardimciIsBinaVeIcareBinalari)}
                onChange={(e) => handleNumberChange(e, 'finansalBilgiler.binaInsaatGiderleri.yardimciIsBinaVeIcareBinalari')}
                InputProps={{ endAdornment: '₺' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Yeraltı Ana Galerileri"
                type="text"
                value={formatNumber(formData.finansalBilgiler.binaInsaatGiderleri.yeraltiAnaGalerileri)}
                onChange={(e) => handleNumberChange(e, 'finansalBilgiler.binaInsaatGiderleri.yeraltiAnaGalerileri')}
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

      {/* 4. FİNANSMAN TL */}
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
                    type="text"
                    value={formatNumber(formData.finansalBilgiler.finansman.yabanciKaynaklar.bankKredisi)}
                    onChange={(e) => handleNumberChange(e, 'finansalBilgiler.finansman.yabanciKaynaklar.bankKredisi')}
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
        <Paper sx={{ p: 3, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
            DİĞER YATIRIM HARCAMALARI (TL)
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

export default TesvikForm;