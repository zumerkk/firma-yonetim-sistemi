#!/usr/bin/env python3
# CSV'yi JavaScript array'e çevir

import csv
import json

def convert_csv_to_js():
    u97_kodlari = []
    
    # CSV dosyasını oku (ilk 2 satırı atla)
    with open('csv/listeler gm teşvik sistemi - ikaplist.csv', 'r', encoding='utf-8') as file:
        lines = file.readlines()
        
        # İlk 2 satırı atla ve son satırdaki % işaretini temizle
        for line in lines[2:]:
            line = line.strip().replace('%', '')
            if ',' in line and len(line.split(',')) >= 2:
                parts = line.split(',', 1)  # Sadece ilk virgülde böl
                kod = parts[0].strip()
                tanim = parts[1].strip().strip('"')
                
                if kod and tanim:  # Boş satırları atla
                    # Kategori belirle (ilk 4 rakamdan)
                    kategori = "Diğer"
                    if kod.startswith('0111'):
                        kategori = "Tarım"
                    elif kod.startswith('0112'):
                        kategori = "Sebze/Bitki"
                    elif kod.startswith('0113'):
                        kategori = "Meyve/Baharat"
                    elif kod.startswith('0121'):
                        kategori = "Hayvancılık"
                    elif kod.startswith('0122'):
                        kategori = "Hayvan Ürünleri"
                    elif kod.startswith('0130'):
                        kategori = "Karma Çiftçilik"
                    elif kod.startswith('0140'):
                        kategori = "Tarım Hizmetleri"
                    elif kod.startswith('0150'):
                        kategori = "Avcılık"
                    elif kod.startswith('0200'):
                        kategori = "Ormancılık"
                    elif kod.startswith('0500'):
                        kategori = "Su Ürünleri"
                    elif kod.startswith('1'):
                        kategori = "Madencilik/Enerji"
                    elif kod.startswith('2'):
                        kategori = "İmalat"
                    elif kod.startswith('3'):
                        kategori = "Elektrik/Su"
                    elif kod.startswith('4'):
                        kategori = "İnşaat"
                    elif kod.startswith('5'):
                        kategori = "Ticaret"
                    elif kod.startswith('6'):
                        kategori = "Ulaştırma/İletişim"
                    elif kod.startswith('7'):
                        kategori = "Mali/Hizmet"
                    elif kod.startswith('8'):
                        kategori = "Kamu/Eğitim"
                    elif kod.startswith('9'):
                        kategori = "Sosyal Hizmetler"
                    
                    u97_kodlari.append({
                        'kod': kod,
                        'aciklama': tanim,
                        'kategori': kategori
                    })
    
    print(f"Toplam {len(u97_kodlari)} adet kod işlendi")
    
    # JavaScript dosyası oluştur
    js_content = f"""// 📦 US 97 KODLARI VERİTABANI
// GM Teşvik Sistemi - {len(u97_kodlari)} adet US 97 kodu

export const us97Kodlari = [
"""
    
    for i, kod in enumerate(u97_kodlari):
        virgul = "," if i < len(u97_kodlari) - 1 else ""
        js_content += f"  {{ kod: '{kod['kod']}', aciklama: '{kod['aciklama'].replace("'", "\\'")}', kategori: '{kod['kategori']}' }}{virgul}\n"
    
    js_content += """];

// 📊 Kategoriler
export const us97Kategorileri = [
  'Tarım', 'Sebze/Bitki', 'Meyve/Baharat', 'Hayvancılık', 'Hayvan Ürünleri', 'Karma Çiftçilik',
  'Tarım Hizmetleri', 'Avcılık', 'Ormancılık', 'Su Ürünleri', 'Madencilik/Enerji', 'İmalat',
  'Elektrik/Su', 'İnşaat', 'Ticaret', 'Ulaştırma/İletişim', 'Mali/Hizmet', 'Kamu/Eğitim', 
  'Sosyal Hizmetler', 'Diğer'
];

// 🔍 Arama ve filtreleme fonksiyonları
export const searchUS97 = (query) => {
  if (!query) return us97Kodlari;
  
  const lowerQuery = query.toLowerCase();
  return us97Kodlari.filter(item => 
    item.kod.toLowerCase().includes(lowerQuery) ||
    item.aciklama.toLowerCase().includes(lowerQuery) ||
    item.kategori.toLowerCase().includes(lowerQuery)
  );
};

export const getUS97ByKategori = (kategori) => {
  return us97Kodlari.filter(item => item.kategori === kategori);
};

export const getUS97ByKod = (kod) => {
  return us97Kodlari.find(item => item.kod === kod);
};

export const getUS97Count = () => us97Kodlari.length;

export default us97Kodlari;
"""
    
    # Dosyayı yaz
    with open('frontend/src/data/us97Data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print("✅ US 97 kodları data dosyası oluşturuldu: frontend/src/data/us97Data.js")

if __name__ == "__main__":
    convert_csv_to_js()