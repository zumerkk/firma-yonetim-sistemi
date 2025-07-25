// 🏷️ GTIP Kodu Seçici Bileşeni
// Eski Excel sistemindeki GTIP kod seçimini modern arayüzle sağlar

import React, { useState, useEffect } from 'react';
import { Search, Package, X } from 'lucide-react';
import GTIP_DATA from '../data/gtipData';

interface GTIPSelectorProps {
  value?: string;
  onChange: (gtipCode: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const GTIPSelector: React.FC<GTIPSelectorProps> = ({
  value = '',
  onChange,
  placeholder = 'GTIP kodu seçin veya arayın...',
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCodes, setFilteredCodes] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState(value);

  useEffect(() => {
    setSelectedCode(value);
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      const results = GTIP_DATA.searchGTIP(searchTerm);
      setFilteredCodes(results);
    }
  }, [searchTerm, isOpen]);

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    onChange(code);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedCode('');
    onChange('');
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    // Direkt GTIP kodu girişi
    if (term.length >= 8 && /^\d+$/.test(term)) {
      setSelectedCode(term);
      onChange(term);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Package className="inline w-4 h-4 mr-1" />
        GTIP Kodu {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer bg-white flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center flex-1">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <span className={selectedCode ? 'text-gray-900' : 'text-gray-500'}>
              {selectedCode || placeholder}
            </span>
          </div>
          
          {selectedCode && (
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
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleInputChange}
                  placeholder="GTIP kodu ara..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {filteredCodes.length > 0 ? (
                filteredCodes.map((code, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelect(code)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-mono text-sm text-blue-600">{code}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>GTIP kodu bulunamadı</p>
                  <p className="text-xs mt-1">En az 3 karakter girin</p>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                💡 İpucu: Direkt 8+ haneli GTIP kodunu yazabilirsiniz
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Seçili kod bilgisi */}
      {selectedCode && (
        <div className="mt-2 p-2 bg-blue-50 rounded-md">
          <div className="flex items-center text-sm text-blue-700">
            <Package className="w-4 h-4 mr-1" />
            <span className="font-mono">{selectedCode}</span>
          </div>
        </div>
      )}
      
      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="gtipCode"
        value={selectedCode}
      />
    </div>
  );
};

export default GTIPSelector;