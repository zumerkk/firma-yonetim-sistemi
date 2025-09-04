#!/usr/bin/env python3
# Kapasite CSV'sini JavaScript array'e çevir

def convert_kapasite_csv():
    kapasite_birimleri = []
    
    # CSV dosyasını oku
    with open('csv/listeler gm teşvik sistemi - ikapasite.csv', 'r', encoding='utf-8') as file:
        lines = file.readlines()
        
        # İlk satırı atla
        for line in lines[1:]:
            line = line.strip()
            if ',' in line:
                parts = line.split(',', 1)
                if len(parts) >= 2:
                    birim = parts[1].strip()
                    if birim:  # Boş olmayan birimler
                        kapasite_birimleri.append(birim)
    
    # Benzersiz değerleri al ve alfabetik sırala
    kapasite_birimleri = sorted(list(set(kapasite_birimleri)))
    
    print(f"Toplam {len(kapasite_birimleri)} adet kapasite birimi işlendi")
    
    # JavaScript dosyası oluştur
    js_content = f"""// 📏 KAPASİTE BİRİMLERİ VERİTABANI
// GM Teşvik Sistemi - {len(kapasite_birimleri)} adet kapasite birimi

export const kapasiteBirimleri = [
"""
    
    for i, birim in enumerate(kapasite_birimleri):
        virgul = "," if i < len(kapasite_birimleri) - 1 else ""
        js_content += f"  '{birim.replace("'", "\\'")}'{virgul}\n"
    
    js_content += """];

// 🔍 Arama fonksiyonu
export const searchKapasiteBirimi = (query) => {
  if (!query) return kapasiteBirimleri;
  
  const lowerQuery = query.toLowerCase();
  return kapasiteBirimleri.filter(birim => 
    birim.toLowerCase().includes(lowerQuery)
  );
};

export const getKapasiteBirimiCount = () => kapasiteBirimleri.length;

export default kapasiteBirimleri;
"""
    
    # Dosyayı yaz
    with open('frontend/src/data/kapasiteData.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print("✅ Kapasite birimları data dosyası oluşturuldu: frontend/src/data/kapasiteData.js")

if __name__ == "__main__":
    convert_kapasite_csv()