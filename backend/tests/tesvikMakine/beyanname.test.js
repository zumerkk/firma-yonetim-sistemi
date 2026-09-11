// 🧪 İthal makineler için Beyanname isteme sistemi
//
// Müşteri: "Birde İthal makineler için Beyanname isteyeceğiz aynı yerli listedeki
// faturalar gibi ithal liste için Beyanname isteme sistemi yapabilir miyiz?"
//
// Süreç altyapısı (MachineProcess.listType, klasörler, upload linki) ithali zaten
// destekliyordu; eksik olan üç şeydi: belge türü, mail şablonu ve firmaya SUNULAN
// tür listesinin liste tipine göre değişmesi.

const {
  DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS, getDocumentTypeFolder,
  PUBLIC_DOCUMENT_TYPES, PUBLIC_DOCUMENT_TYPES_IMPORT, publicDocumentTypes,
  DEFAULT_TEMPLATES, MAIL_TEMPLATE_CODE
} = require('../../constants/tesvikMakineMail');

describe('Gümrük Beyannamesi belge türü', () => {
  test('belge türleri arasında var', () => {
    expect(DOCUMENT_TYPE_KEYS).toContain('beyanname');
  });

  // Etiket KULLANICIYA görünüyor; Türkçe karakterleri bozulmamalı
  test('etiketi doğru yazılmış', () => {
    const b = DOCUMENT_TYPES.find((d) => d.key === 'beyanname');
    expect(b.label).toBe('Gümrük Beyannamesi');
  });

  test('kendi klasörü var (fatura klasörüne karışmaz)', () => {
    expect(getDocumentTypeFolder('beyanname')).toBe('Beyanname');
    expect(getDocumentTypeFolder('beyanname')).not.toBe(getDocumentTypeFolder('fatura_taslak'));
  });
});

describe('publicDocumentTypes - firmaya sunulan türler liste tipine göre', () => {
  // Asıl ayrım: ithalde fatura değil beyanname isteniyor
  test('ithal makinede yalnızca beyanname sunulur', () => {
    expect(publicDocumentTypes('import').map((d) => d.key)).toEqual(['beyanname']);
  });

  test('yerli makinede fatura türleri sunulur', () => {
    expect(publicDocumentTypes('local').map((d) => d.key)).toEqual(['fatura_taslak', 'fatura_onayli']);
  });

  // Belge geneli (Ara Kontrol) linkinde makine yok; eski davranış korunmalı
  test('liste tipi bilinmiyorsa yerli varsayılır', () => {
    expect(publicDocumentTypes(undefined)).toBe(PUBLIC_DOCUMENT_TYPES);
    expect(publicDocumentTypes('')).toBe(PUBLIC_DOCUMENT_TYPES);
    expect(publicDocumentTypes(null)).toBe(PUBLIC_DOCUMENT_TYPES);
  });

  test('ithal listesi beyanname dışında bir şey içermiyor', () => {
    expect(PUBLIC_DOCUMENT_TYPES_IMPORT).toHaveLength(1);
  });

  // Yükleme doğrulaması TÜM türleri kabul etmeye devam etmeli: eski linkler
  // ve kayıtlar bozulmasın (sunulan liste daralıyor, kabul edilen liste değil)
  test('doğrulama listesi daraltılmadı', () => {
    expect(DOCUMENT_TYPE_KEYS).toContain('fatura_taslak');
    expect(DOCUMENT_TYPE_KEYS).toContain('kdv_muafiyet');
    expect(DOCUMENT_TYPE_KEYS).toContain('beyanname');
  });
});

describe('Beyanname talep maili şablonu', () => {
  const tpl = () => DEFAULT_TEMPLATES.find((t) => t.code === MAIL_TEMPLATE_CODE.SUPPLIER_BEYANNAME_REQUEST);

  test('şablon tanımlı', () => {
    expect(tpl()).toBeDefined();
    expect(tpl().name).toMatch(/Beyanname/);
  });

  // Yükleme linki olmadan firma belgeyi nereye koyacağını bilemez
  test('yükleme linki yer tutucusu içeriyor', () => {
    expect(tpl().bodyTemplate).toContain('{uploadLink}');
  });

  test('makine kimliği ve belge bilgisi yer tutucuları var', () => {
    const g = tpl().bodyTemplate;
    expect(g).toContain('{makineId}');
    expect(g).toContain('{siraNo}');
    expect(g).toContain('{belgeNo}');
  });

  test('konu belge numarasını taşıyor', () => {
    expect(tpl().subjectTemplate).toContain('{belgeNo}');
  });

  // Fatura şablonuyla karıştırılmamalı: metin beyannameden bahsetmeli
  test('metin fatura değil beyanname istiyor', () => {
    expect(tpl().bodyTemplate).toMatch(/BEYANNAME/i);
  });
});
