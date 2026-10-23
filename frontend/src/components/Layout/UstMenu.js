// Masaüstünde sayfaların üstündeki yatay ana menü (E-TUYS düzeni). Dar ekranda gizlenir;
// orada Header'daki menü düğmesi aynı öğeleri çekmece (Sidebar) olarak açar.
import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { aktifMenuOgesi, menuYetkili, ustMenuOgeleri } from './menuOgeleri';

export const UST_MENU_KIRILIMI = 1024;
export const masaustuSorgusu = `@media (min-width:${UST_MENU_KIRILIMI}px)`;

const UstMenu = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const ogeler = ustMenuOgeleri.filter((oge) => menuYetkili(oge, user));
  const aktif = aktifMenuOgesi(pathname, ogeler);

  return (
    <Box component="nav" aria-label="Ana menü"
      sx={{ display: 'none', [masaustuSorgusu]: { display: 'block' }, borderTop: '1px solid #e5e7eb', bgcolor: '#f8fafc', px: 2 }}>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
        {ogeler.map((oge) => {
          const secili = aktif === oge;
          return (
            <Box component="li" key={oge.path} sx={{ display: 'flex' }}>
              <ButtonBase component={RouterLink} to={oge.path} aria-current={secili ? 'page' : undefined}
                sx={{
                  height: 42, px: 1.25, gap: 0.75, whiteSpace: 'nowrap',
                  fontSize: '0.8125rem', fontWeight: secili ? 700 : 600, color: secili ? '#0f172a' : '#334155',
                  bgcolor: secili ? '#fff' : 'transparent',
                  borderTop: '3px solid transparent', borderBottom: '3px solid', borderBottomColor: secili ? oge.color : 'transparent',
                  transition: 'background-color .15s, color .15s',
                  '&:hover': { bgcolor: '#fff', color: '#0f172a' },
                  '&.Mui-focusVisible': { outline: '2px solid #2563eb', outlineOffset: -2 }
                }}>
                <Box component="span" aria-hidden="true"
                  sx={{ display: 'none', '@media (min-width:1440px)': { display: 'inline-flex' }, color: oge.color, '& svg': { fontSize: 18 } }}>
                  {oge.icon}
                </Box>
                {oge.kisaAd || oge.text}
              </ButtonBase>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default UstMenu;
