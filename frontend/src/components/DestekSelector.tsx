// 🎁 Destek Türü Seçici Bileşeni
// Eski Excel sistemindeki destek türü seçimini modern arayüzle sağlar

import React, { useState, useEffect } from 'react';
import { Search, Gift, X, Star, MapPin, Building } from 'lucide-react';
import DESTEK_DATA from '../data/destekData';

interface DestekSelectorProps {
  value?: string;
  onChange: (destekTuru: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  showCategories?: boolean;
}

const DestekSelector: React.FC<DestekSelectorProps> = ({
  value = '',
  onChange,
  placeholder = 'Destek türü seçin...',
  className = '',
  required = false,
  showCategories = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDestek, setFilteredDestek] = useState<string[]>([]);
  const [selectedDestek, setSelectedDestek] = useState(value);
  const [activeTab, setActiveTab] = useState<'destek' | 'bolge' | 'firma'>('destek');

  useEffect(() => {
    setSelectedDestek(value);
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      let results: string[] = [];
      const term = searchTerm.toLowerCase();
      
      switch (activeTab) {
        case 'destek':
          results = DESTEK_DATA.searchDestek(searchTerm);
          break;
        case 'bolge':
          results = DESTEK_DATA.searchBolgesel(searchTerm);
          break;
        case 'firma':
          results = DESTEK_DATA.searchFirmaSinifi(searchTerm);
          break;
      }
      
      setFilteredDestek(results);
    }
  }, [searchTerm, isOpen, activeTab]);

  const handleSelect = (destek: string) => {
    setSelectedDestek(destek);
    onChange(destek);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedDestek('');
    onChange('');
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'destek': return <Gift className="w-4 h-4" />;
      case 'bolge': return <MapPin className="w-4 h-4" />;
      case 'firma': return <Building className="w-4 h-4" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'destek': return 'Destek Türleri';
      case 'bolge': return 'Bölgesel Kategoriler';
      case 'firma': return 'Firma Sınıfları';
      default: return 'Destek Türleri';
    }
  };

  // Popüler destek türleri
  const popularDestek = [
    'Ar-Ge Desteği',
    'Yatırım Teşviki',
    'İstihdam Desteği',
    'İhracat Desteği',
    'Teknoloji Geliştirme'
  ];

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Gift className="inline w-4 h-4 mr-1" />
        Destek Türü {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer bg-white flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center flex-1">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <span className={selectedDestek ? 'text-gray-900' : 'text-gray-500'}>
              {selectedDestek || placeholder}
            </span>
          </div>
          
          {selectedDestek && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Kategoriler */}
            {showCategories && (
              <div className="border-b border-gray-200">
                <div className="flex">
                  {(['destek', 'bolge', 'firma'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab
                          ? 'border-purple-500 text-purple-600 bg-purple-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        {getTabIcon(tab)}
                        <span className="ml-1 hidden sm:inline">{getTabLabel(tab)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleInputChange}
                  placeholder={`${getTabLabel(activeTab)} ara...`}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Popüler destekler (sadece destek sekmesinde) */}
            {!searchTerm && activeTab === 'destek' && (
              <div className="p-3 border-b border-gray-200 bg-purple-50">
                <div className="flex items-center mb-2">
                  <Star className="w-4 h-4 text-purple-600 mr-1" />
                  <span className="text-sm font-medium text-purple-700">Popüler Destekler</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {popularDestek.map((destek, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelect(destek)}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                    >
                      {destek}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto">
              {filteredDestek.length > 0 ? (
                filteredDestek.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelect(item)}
                    className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start">
                      {getTabIcon(activeTab)}
                      <div className="ml-2 flex-1">
                        <div className="text-sm font-medium text-gray-900">{item}</div>
                        {item.length > 50 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  {getTabIcon(activeTab)}
                  <p className="mt-2">Sonuç bulunamadı</p>
                  <p className="text-xs mt-1">Farklı anahtar kelimeler deneyin</p>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                💡 İpucu: Kategoriler arasında geçiş yaparak farklı türleri keşfedin
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Seçili destek bilgisi */}
      {selectedDestek && (
        <div className="mt-2 p-3 bg-purple-50 rounded-md">
          <div className="flex items-start text-sm text-purple-700">
            <Gift className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Seçili Destek:</div>
              <div className="mt-1">{selectedDestek}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="destekTuru"
        value={selectedDestek}
      />
    </div>
  );
};

export default DestekSelector;