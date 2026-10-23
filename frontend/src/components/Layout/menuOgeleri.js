// Uygulamanın ana menüsü — üst menü (masaüstü) ve çekmece menü (mobil) aynı listeyi kullanır.
// Müşteri (23.10.2026): "sol menüyü üst tarafa alabilir miyiz? Etuysda üst tarafta olduğu için".
import React from 'react';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  List as ListIcon,
  Settings as SettingsIcon,
  EmojiEvents as EmojiEventsIcon,
  Assignment as AssignmentIcon,
  ImportExport as ImportExportIcon,
  PrecisionManufacturing as PrecisionManufacturingIcon,
  FactCheck as FactCheckIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon
} from '@mui/icons-material';

const dashboard = {
  text: 'Dashboard',
  kisaAd: 'Dashboard',
  icon: <DashboardIcon />,
  path: '/dashboard',
  aktifYollar: ['/dashboard'],
  color: '#1e40af',
  gradient: '#1e3a8a',
  description: 'Ana kontrol paneli'
};

const excelYukleme = {
  text: 'Akıllı Excel Yükleme',
  kisaAd: 'Excel Yükleme',
  icon: <ImportExportIcon />,
  path: '/import',
  aktifYollar: ['/import', '/tesvik/import', '/yeni-tesvik/import'],
  color: '#7c3aed',
  gradient: '#5b21b6',
  description: 'Dosya analiz & toplu import',
  isNew: true
};

export const anaMenu = [dashboard, excelYukleme];

// 🏢 FİRMA (konsolide grup) — müşteri krokisi: tek ana başlık altında
// Yatırımcı Bilgileri / Teşvik Listesi / Makine Listesi / Ekipman Takip / Belge Takip
export const firmaMenusu = [
  {
    text: 'Yatırımcı Bilgileri',
    icon: <BusinessIcon />,
    path: '/firmalar',
    aktifYollar: ['/firmalar'],
    color: '#059669',
    gradient: '#064e3b',
    description: 'Firma listesi'
  },
  {
    text: 'Teşvik Listesi',
    icon: <EmojiEventsIcon />,
    path: '/tesvik/liste',
    aktifYollar: ['/tesvik', '/yeni-tesvik'],
    color: '#dc2626',
    gradient: '#7f1d1d',
    description: 'Eski + yeni belgeler (firma araması birleşik)'
  },
  // Müşteri (13.10.2026): "makine listesi ve ekipman takip'in icon'unu değiştirebilir miyiz alt altalar
  // ya karışıyor, renklerini de değiştirsek ok" — ikisi de kupa/mor idi.
  {
    text: 'Makine Listesi',
    icon: <PrecisionManufacturingIcon />,
    path: '/yeni-tesvik/makine-yonetimi',
    aktifYollar: ['/yeni-tesvik/makine-yonetimi', '/tesvik/makine-yonetimi'],
    color: '#7c3aed',
    gradient: '#4c1d95',
    description: 'Makine teçhizat yönetimi'
  },
  {
    text: 'Ekipman Takip',
    icon: <FactCheckIcon />,
    path: '/tesvikler',
    aktifYollar: ['/tesvikler'],
    color: '#0d9488',
    gradient: '#134e4a',
    description: 'Süreç, mail, evrak takibi'
  },
  // "Ara Kontrol Maili" sayfası kaldırıldı (müşteri, 13.10.2026: "komple kaldırabiliriz"); mail Ekipman
  // Takip › İşlem penceresindeki şablon listesinden gönderiliyor, firmanın elindeki linkler çalışıyor.
  {
    text: 'İşlem & Evrak',
    icon: <AssignmentIcon />,
    path: '/islem-evrak',
    aktifYollar: ['/islem-evrak'],
    color: '#0891b2',
    gradient: '#164e63',
    description: 'Firmadan işlem bazlı evrak talebi'
  },
  {
    text: 'Belge Takip',
    icon: <ListIcon />,
    path: '/dosya-takip/liste',
    aktifYollar: ['/dosya-takip'],
    color: '#d97706',
    gradient: '#92400e',
    description: 'Dosya iş akış talepleri'
  },
  {
    // müşteri: "Sol sütunda belge takip'in altına Cari hesaplar/faturalar-ödeme takip gibi bir modül"
    text: 'Cari / Ödeme Takip',
    icon: <AccountBalanceWalletIcon />,
    path: '/cari-takip',
    aktifYollar: ['/cari-takip'],
    color: '#d97706',
    gradient: '#92400e',
    description: 'Firma bazlı fatura, ödeme ve bakiye',
    isNew: true
  }
];

export const ayarlarMenusu = [
  {
    text: 'Ayarlar',
    icon: <SettingsIcon />,
    path: '/ayarlar',
    aktifYollar: ['/ayarlar'],
    color: '#64748b',
    gradient: '#475569',
    description: 'Sistem ayarları'
  }
];

// Üst menü sırası: ana iş ekranları önde, seyrek kullanılanlar sonda.
export const ustMenuOgeleri = [dashboard, ...firmaMenusu, excelYukleme, ...ayarlarMenusu];

export const menuYetkili = (oge, user) => (
  !oge.permission || Boolean(user?.yetkiler?.[oge.permission]) || user?.rol === 'admin'
);

const yolEslesir = (yol, onek) => yol === onek || yol.startsWith(`${onek}/`);

/** Bulunulan sayfaya en uzun yol önekiyle eşleşen menü öğesi ("/tesvikler" ≠ "/tesvik"). */
export const aktifMenuOgesi = (yol, ogeler = ustMenuOgeleri) => {
  if (yol === '/') return ogeler.find((o) => o.path === '/dashboard') || null;
  let bulunan = null;
  let uzunluk = -1;
  ogeler.forEach((oge) => {
    (oge.aktifYollar || [oge.path]).forEach((onek) => {
      if (yolEslesir(yol, onek) && onek.length > uzunluk) { bulunan = oge; uzunluk = onek.length; }
    });
  });
  return bulunan;
};
