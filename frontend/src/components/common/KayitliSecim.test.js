// 🧪 Kayıtlı değer seçeneklerde birebir yoksa bile kutuda görünmeli
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MenuItem, Box } from '@mui/material';
import KayitliSecim from './KayitliSecim';

const goster = (value, secenekler) => render(
  <KayitliSecim value={value} onChange={() => {}}>
    {secenekler}
  </KayitliSecim>
);

describe('KayitliSecim', () => {
  test('birebir eşleşmede seçeneğin etiketi görünür', () => {
    goster('BOLGESEL', [<MenuItem key="1" value="BOLGESEL">Bölgesel</MenuItem>]);
    expect(screen.getByRole('combobox')).toHaveTextContent('Bölgesel');
  });

  test('yazım farklı kayıtlı değer, eşleşen seçeneğin etiketiyle görünür', () => {
    goster('BÖLGESEL', [
      <MenuItem key="1" value="BOLGESEL">Bölgesel</MenuItem>,
      <MenuItem key="2" value="GENEL">Genel</MenuItem>
    ]);
    expect(screen.getByRole('combobox')).toHaveTextContent('Bölgesel');
  });

  test('etiket bileşen içinde olsa da eşleşir (NACE)', () => {
    goster('2929 - DİĞER ÖZEL AMAÇLI MAKİNELERİN İMALATI', [
      <MenuItem key="1" value="2929"><Box><b>2929</b> - DİĞER ÖZEL AMAÇLI MAKİNELERİN İMALATI</Box></MenuItem>
    ]);
    expect(screen.getByRole('combobox')).toHaveTextContent('2929');
  });

  test('hiç eşleşmeyen kayıtlı değer ham haliyle gösterilir, gizlenmez', () => {
    goster('ESKİ KOD', [<MenuItem key="1" value="GENEL">Genel</MenuItem>]);
    expect(screen.getByRole('combobox')).toHaveTextContent('ESKİ KOD');
  });

  test('boş değer MUI davranışını bozmaz', () => {
    // displayEmpty yoksa MUI boş gösterir; varsa "Seçiniz" öğesi görünür — ikisi de dokunulmadan geçer
    const { unmount } = goster('', [
      <MenuItem key="0" value=""><em>Seçiniz</em></MenuItem>,
      <MenuItem key="1" value="GENEL">Genel</MenuItem>
    ]);
    expect(screen.getByRole('combobox')).not.toHaveTextContent('Seçiniz');
    unmount();
    render(
      <KayitliSecim displayEmpty value="" onChange={() => {}}>
        <MenuItem value=""><em>Seçiniz</em></MenuItem>
      </KayitliSecim>
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Seçiniz');
  });

  test('pasif başlık öğesi seçili değer sanılmaz', () => {
    goster('GENEL', [
      <MenuItem key="0" value="GEN" disabled>GENEL BAŞLIK</MenuItem>,
      <MenuItem key="1" value="GENEL">Genel Teşvik</MenuItem>
    ]);
    expect(screen.getByRole('combobox')).toHaveTextContent('Genel Teşvik');
  });

  test('çoklu seçim dizisi olduğu gibi geçer', () => {
    render(
      <KayitliSecim multiple value={['A']} onChange={() => {}}>
        <MenuItem value="A">A</MenuItem>
      </KayitliSecim>
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('A');
  });
});
