// 🎯 Yatırım Konusu Seçici Bileşeni
// Eski Excel sistemindeki yatırım konusu seçimini modern arayüzle sağlar

import React, { useState, useEffect } from 'react';
import { Search, Target, X, TrendingUp } from 'lucide-react';
import YATIRIM_DATA from '../data/yatirimData';

interface YatirimSelectorProps {
  value?: string;
  onChange: (yatirimKonusu: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const YatirimSelector: React.FC<YatirimSelectorProps> = ({
  value = '',
  onChange,
  placeholder = 'Yatırım konusu seçin...',
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredKonular, setFilteredKonular] = useState<string[]>([]);
  const [selectedKonu, setSelectedKonu] = useState(value);

  useEffect(() => {
    setSelectedKonu(value);
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      const results = YATIRIM_DATA.searchYatirim(searchTerm);
      setFilteredKonular(results);
    }
  }, [searchTerm, isOpen]);

  const handleSelect = (konu: string) => {
    setSelectedKonu(konu);
    onChange(konu);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedKonu('');
    onChange('');
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Popüler yatırım konuları
  const popularKonular = [
    'Makine ve Teçhizat Yatırımı',
    'Teknoloji Geliştirme',
    'Ar-Ge Faaliyetleri',
    'İmalat Sanayi',
    'Bilişim Teknolojileri'
  ];

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Target className="inline w-4 h-4 mr-1" />
        Yatırım Konusu {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer bg-white flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center flex-1">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <span className={selectedKonu ? 'text-gray-900' : 'text-gray-500'}>
              {selectedKonu || placeholder}
            </span>
          </div>
          
          {selectedKonu && (
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
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleInputChange}
                  placeholder="Yatırım konusu ara..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Popüler konular */}
            {!searchTerm && (
              <div className="p-3 border-b border-gray-200 bg-green-50">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm font-medium text-green-700">Popüler Konular</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {popularKonular.map((konu, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelect(konu)}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      {konu}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto">
              {filteredKonular.length > 0 ? (
                filteredKonular.map((konu, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelect(konu)}
                    className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start">
                      <Target className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{konu}</div>
                        {konu.length > 50 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {konu.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Yatırım konusu bulunamadı</p>
                  <p className="text-xs mt-1">Farklı anahtar kelimeler deneyin</p>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                💡 İpucu: Anahtar kelimelerle arama yapabilirsiniz (örn: "makine", "teknoloji")
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Seçili konu bilgisi */}
      {selectedKonu && (
        <div className="mt-2 p-3 bg-green-50 rounded-md">
          <div className="flex items-start text-sm text-green-700">
            <Target className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Seçili Yatırım Konusu:</div>
              <div className="mt-1">{selectedKonu}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="yatirimKonusu"
        value={selectedKonu}
      />
    </div>
  );
};

export default YatirimSelector;