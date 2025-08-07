// 🎯 Destek-Şart Eşleştirmesi Service
// Backend'den destek ve şart ilişkilerini yöneten servis

import axios from '../utils/axios';

const destekSartService = {
  
  // 📋 Tüm destek-şart eşleştirmelerini getir
  async getTumEslesmeler() {
    try {
      console.log('📋 Destek-şart eşleştirmeleri getiriliyor...');
      const response = await axios.get('/destek-sart/eslesmeler');
      
      if (response.data.success) {
        console.log(`✅ ${response.data.count} eşleştirme alındı`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Eşleştirmeler alınamadı');
      }
    } catch (error) {
      console.error('❌ Eşleştirme getirme hatası:', error);
      throw error;
    }
  },
  
  // 🎯 Belirli bir destek türü için şartları getir
  async getShartlarByDestekTuru(destekTuru) {
    try {
      if (!destekTuru) {
        return [];
      }
      
      console.log(`🔍 ${destekTuru} için şartlar getiriliyor...`);
      const encodedDestekTuru = encodeURIComponent(destekTuru);
      const response = await axios.get(`/destek-sart/sartlar/${encodedDestekTuru}`);
      
      if (response.data.success) {
        console.log(`✅ ${response.data.data.sartlar.length} şart bulundu`);
        return response.data.data.sartlar;
      } else {
        console.log(`⚠️ ${destekTuru} için şart bulunamadı`);
        return [];
      }
    } catch (error) {
      console.error(`❌ ${destekTuru} için şart getirme hatası:`, error);
      // 404 hatası normal olabilir (eşleştirme yok)
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },
  
  // 📝 Destek türleri listesini getir (otomatik tamamlama için)
  async getDestekTurleri() {
    try {
      console.log('📝 Destek türleri listesi getiriliyor...');
      const response = await axios.get('/destek-sart/destek-turleri');
      
      if (response.data.success) {
        console.log(`✅ ${response.data.count} destek türü alındı`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Destek türleri alınamadı');
      }
    } catch (error) {
      console.error('❌ Destek türleri getirme hatası:', error);
      throw error;
    }
  },
  
  // ➕ Yeni şart ekle (Admin)
  async sartEkle(destekTuru, yeniSart) {
    try {
      console.log(`➕ ${destekTuru} için yeni şart ekleniyor...`);
      const response = await axios.post('/destek-sart/sart-ekle', {
        destekTuru,
        yeniSart
      });
      
      if (response.data.success) {
        console.log(`✅ Şart eklendi: ${yeniSart}`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Şart eklenemedi');
      }
    } catch (error) {
      console.error('❌ Şart ekleme hatası:', error);
      throw error;
    }
  },
  
  // ➖ Şart kaldır (Admin)
  async sartKaldir(destekTuru, sart) {
    try {
      console.log(`➖ ${destekTuru} için şart kaldırılıyor...`);
      const response = await axios.delete('/destek-sart/sart-kaldir', {
        data: { destekTuru, sart }
      });
      
      if (response.data.success) {
        console.log(`✅ Şart kaldırıldı: ${sart}`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Şart kaldırılamadı');
      }
    } catch (error) {
      console.error('❌ Şart kaldırma hatası:', error);
      throw error;
    }
  },
  
  // 🆕 Yeni eşleştirme oluştur (Admin)
  async eslesmeOlustur(destekTuru, sartlar, aciklama = '') {
    try {
      console.log(`🆕 Yeni eşleştirme oluşturuluyor: ${destekTuru}`);
      const response = await axios.post('/destek-sart/esleme-olustur', {
        destekTuru,
        sartlar,
        aciklama
      });
      
      if (response.data.success) {
        console.log(`✅ Eşleştirme oluşturuldu: ${destekTuru} (${sartlar.length} şart)`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Eşleştirme oluşturulamadı');
      }
    } catch (error) {
      console.error('❌ Eşleştirme oluşturma hatası:', error);
      throw error;
    }
  }
};

export default destekSartService;
