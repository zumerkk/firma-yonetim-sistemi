// 🧩 İŞLEM VE EVRAK YÖNETİMİ - Talep detayı sayfası (/islem-evrak/:id)
// Ekranın kendisi components/IslemEvrak/IslemEvrakTalepPaneli'nde: aynı bileşen Belge Takip › Firma Maili
// sekmesindeki "Evrak Talebi" penceresinde de çalışıyor (müşteri: "iki alanda da birebir aynı olsun").

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import IslemEvrakTalepPaneli from '../../components/IslemEvrak/IslemEvrakTalepPaneli';

const IslemEvrakDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <LayoutWrapper>
      <IslemEvrakTalepPaneli talepId={id} onGeri={() => navigate('/islem-evrak')} />
    </LayoutWrapper>
  );
};

export default IslemEvrakDetail;
