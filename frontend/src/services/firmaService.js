// 🏢 Firma Service - Excel Formatına Uygun
// Excel sisteminin modern API çağrıları
// Gelişmiş arama, Excel export, tam uyum

import api from '../utils/axios';

// 🎯 Response Handler - Standardized Error Handling
const handleResponse = (response) => {
  if (response?.data?.success) {
    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } else {
    throw new Error(response?.data?.message || 'Beklenmeyen bir hata oluştu');
  }
};

const handleError = (error) => {
  console.error('🚨 Service Error:', error);
  
  if (error.response) {
    // Server responded with error status
    return {
      success: false,
      message: error.response.data?.message || 'Sunucu hatası',
      errors: error.response.data?.errors || null,
      status: error.response.status
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      success: false,
      message: 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.',
      status: 0
    };
  } else {
    // Something else happened
    return {
      success: false,
      message: error.message || 'Beklenmeyen bir hata oluştu'
    };
  }
};

// 📋 Get Firmalar with Advanced Filtering
export const getFirmalar = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/firmalar?${queryString}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 👁️ Get Single Firma
export const getFirma = async (id) => {
  try {
    if (!id) {
      throw new Error('Firma ID gereklidir');
    }
    
    const response = await api.get(`/firmalar/${id}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 📝 Create New Firma
export const createFirma = async (firmaData) => {
  try {
    if (!firmaData) {
      throw new Error('Firma verileri gereklidir');
    }
    
    // Validate required fields before sending
    const requiredFields = ['vergiNoTC', 'tamUnvan', 'adres', 'firmaIl', 'ilkIrtibatKisi', 'yetkiliKisiler'];
    for (const field of requiredFields) {
      if (!firmaData[field]) {
        throw new Error(`${field} zorunlu bir alandır`);
      }
    }
    
    // Validate yetkiliKisiler
    if (!Array.isArray(firmaData.yetkiliKisiler) || firmaData.yetkiliKisiler.length === 0) {
      throw new Error('En az bir yetkili kişi bilgisi gereklidir');
    }
    
    const response = await api.post('/firmalar', firmaData);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// ✏️ Update Firma
export const updateFirma = async (id, firmaData) => {
  try {
    if (!id) {
      throw new Error('Firma ID gereklidir');
    }
    
    if (!firmaData) {
      throw new Error('Güncellenecek veriler gereklidir');
    }
    
    const response = await api.put(`/firmalar/${id}`, firmaData);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 🗑️ Delete Firma (Soft Delete)
export const deleteFirma = async (id) => {
  try {
    if (!id) {
      throw new Error('Firma ID gereklidir');
    }
    
    const response = await api.delete(`/firmalar/${id}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 🔍 Search Firmalar - General Search
export const searchFirmalar = async (searchTerm, field = null) => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      throw new Error('Arama terimi en az 2 karakter olmalıdır');
    }
    
    let url = `/firmalar/search?q=${encodeURIComponent(searchTerm)}`;
    if (field) {
      url += `&field=${field}`;
    }
    
    const response = await api.get(url);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 🔍 Search by Specific Field
export const searchByField = async (field, value) => {
  try {
    if (!field || !value) {
      throw new Error('Arama alanı ve değeri gereklidir');
    }
    
    const validFields = ['vergiNoTC', 'firmaId', 'tamUnvan'];
    if (!validFields.includes(field)) {
      throw new Error('Geçersiz arama alanı');
    }
    
    const response = await api.get(`/firmalar/search/${field}/${encodeURIComponent(value)}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 📊 Get Firma Statistics
export const getFirmaStats = async () => {
  try {
    const response = await api.get('/firmalar/stats');
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 📍 Get İl/İlçe/Faaliyet Lists
export const getIlIlceListesi = async () => {
  try {
    const response = await api.get('/firmalar/il-ilce');
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 📊 Get Excel Export Data
export const getExcelData = async (filter = {}) => {
  try {
    const queryString = new URLSearchParams(filter).toString();
    const response = await api.get(`/firmalar/excel-data?${queryString}`);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 📥 Download Excel File
export const downloadExcel = async (filter = {}) => {
  try {
    const result = await getExcelData(filter);
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    // Convert to CSV format
    const csvContent = convertToCSV(result.data.firmalar);
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `firmalar-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Excel dosyası başarıyla indirildi' };
  } catch (error) {
    return handleError(error);
  }
};

// 🔧 CSV Converter Helper
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = [
    'Firma ID', 'Vergi No/TC', 'Tam Ünvan', 'Adres', 'Firma İli', 'Firma İlçesi',
    'KEP Adresi', 'Yabancı Sermayeli', 'Ana Faaliyet Konusu', 
    'ETUYS Yetki Bitiş', 'İlk İrtibat Kişisi', 'Firma Telefon', 'Firma Email',
    'Yetkili 1 Ad Soyad', 'Yetkili 1 Telefon', 'Yetkili 1 Email',
    'Yetkili 2 Ad Soyad', 'Yetkili 2 Telefon', 'Yetkili 2 Email',
    'Notlar', 'Oluşturma Tarihi'
  ];
  
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  data.forEach(firma => {
    const yetkili1 = firma.yetkiliKisiler?.[0] || {};
    const yetkili2 = firma.yetkiliKisiler?.[1] || {};
    
    const row = [
      firma.firmaId || '',
      firma.vergiNoTC || '',
      `"${(firma.tamUnvan || '').replace(/"/g, '""')}"`,
      `"${(firma.adres || '').replace(/"/g, '""')}"`,
      firma.firmaIl || '',
      firma.firmaIlce || '',
      firma.kepAdresi || '',
      firma.yabanciSermayeli ? 'EVET' : 'HAYIR',
      `"${(firma.anaFaaliyetKonusu || '').replace(/"/g, '""')}"`,
      firma.etuysYetkiBitisTarihi ? new Date(firma.etuysYetkiBitisTarihi).toLocaleDateString('tr-TR') : '',
      `"${(firma.ilkIrtibatKisi || '').replace(/"/g, '""')}"`,
      firma.firmaTelefon || '',
      firma.firmaEmail || '',
      `"${(yetkili1.adSoyad || '').replace(/"/g, '""')}"`,
      yetkili1.telefon1 || '',
      yetkili1.eposta1 || '',
      `"${(yetkili2.adSoyad || '').replace(/"/g, '""')}"`,
      yetkili2.telefon1 || '',
      yetkili2.eposta1 || '',
      `"${(firma.notlar || '').replace(/"/g, '""')}"`,
      firma.olusturmaTarihi ? new Date(firma.olusturmaTarihi).toLocaleDateString('tr-TR') : ''
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

// 📤 Import Excel File
export const importExcel = async (file) => {
  try {
    if (!file) {
      throw new Error('Dosya seçilmedi');
    }
    
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Sadece Excel (.xlsx, .xls) ve CSV dosyaları desteklenmektedir');
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Dosya boyutu 10MB\'dan büyük olamaz');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// 📥 Download Excel Template
export const downloadTemplate = async () => {
  try {
    const response = await api.get('/import/template', {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'firma-template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true, message: 'Template başarıyla indirildi' };
  } catch (error) {
    return handleError(error);
  }
};

// 🧪 Validate Firma Data (Frontend Validation)
export const validateFirmaData = (firmaData) => {
  const errors = [];
  
  // Required fields validation
  if (!firmaData.vergiNoTC) {
    errors.push('Vergi No/TC zorunludur');
  } else if (!/^\d{10}$|^\d{11}$/.test(firmaData.vergiNoTC)) {
    errors.push('Vergi No (10 hane) veya TC No (11 hane) formatında olmalıdır');
  }
  
  if (!firmaData.tamUnvan || firmaData.tamUnvan.length < 3) {
    errors.push('Tam ünvan en az 3 karakter olmalıdır');
  }
  
  if (!firmaData.adres || firmaData.adres.length < 10) {
    errors.push('Adres en az 10 karakter olmalıdır');
  }
  
  if (!firmaData.firmaIl) {
    errors.push('Firma ili zorunludur');
  }
  
  if (!firmaData.ilkIrtibatKisi) {
    errors.push('İlk irtibat kişisi zorunludur');
  }
  
  // Yetkili kişiler validation
  if (!firmaData.yetkiliKisiler || !Array.isArray(firmaData.yetkiliKisiler) || firmaData.yetkiliKisiler.length === 0) {
    errors.push('En az bir yetkili kişi bilgisi gereklidir');
  } else {
    const birincYetkili = firmaData.yetkiliKisiler[0];
    if (!birincYetkili.adSoyad) {
      errors.push('Birinci yetkili kişi ad soyad zorunludur');
    }
    if (!birincYetkili.telefon1) {
      errors.push('Birinci yetkili kişi telefon 1 zorunludur');
    }
    if (!birincYetkili.eposta1) {
      errors.push('Birinci yetkili kişi e-posta 1 zorunludur');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(birincYetkili.eposta1)) {
      errors.push('Geçerli bir e-posta adresi giriniz');
    }
  }
  
  // Email validations
  if (firmaData.firmaEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firmaData.firmaEmail)) {
    errors.push('Geçerli bir firma e-posta adresi giriniz');
  }
  
  if (firmaData.kepAdresi && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firmaData.kepAdresi)) {
    errors.push('Geçerli bir KEP adresi giriniz');
  }
  
  // Phone validations
  if (firmaData.firmaTelefon && !/^[0-9+\s\-()]{10,20}$/.test(firmaData.firmaTelefon)) {
    errors.push('Geçerli bir firma telefon numarası giriniz');
  }
  
  // Website validation
  if (firmaData.firmaWebsite && !/^https?:\/\/.+/.test(firmaData.firmaWebsite)) {
    errors.push('Website http:// veya https:// ile başlamalıdır');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 🏢 Default Service Object
const firmaService = {
  getFirmalar,
  getFirma,
  createFirma,
  updateFirma,
  deleteFirma,
  searchFirmalar,
  searchByField,
  getFirmaStats,
  getIlIlceListesi,
  getExcelData,
  downloadExcel,
  importExcel,
  downloadTemplate,
  validateFirmaData
};

export default firmaService; 