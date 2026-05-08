          {/* ========================================================= */}
          {/* 10 BÖLÜMLÜ DOCX ŞABLONU ACCORDION YAPISI (ESKİ BELGE)  */}
          {/* ========================================================= */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            
            {/* 1. GMdigi BİLGİLERİ */}
            <Accordion defaultExpanded sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>GMdigi BİLGİLERİ</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>GM ID</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.gmId || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>FİRMA ID</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaId || tesvik.firma?.firmaId || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>UNVAN</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaBilgileri?.unvan || tesvik.firma?.tamUnvan || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>TALEP SONUÇ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.durumBilgileri?.genelDurum || '-'}</Typography></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Sorgu Bağlantısı Seç</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 2. Yatırımcı İle İlgili Bilgiler */}
            <Accordion defaultExpanded sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Yatırımcı İle İlgili Bilgiler</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Firma Adı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaBilgileri?.unvan || tesvik.firma?.tamUnvan || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>SGK Sicil No</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 3. Yatırım İle İlgili Bilgiler */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Yatırım İle İlgili Bilgiler</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Destekleme Sınıfı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.destekSinifi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Sermaye Türü</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firma?.yabanciSermayeli ? 'Yabancı Sermayeli' : 'Tamamı Yerli'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Yatırımın Konusu(US97)</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimKonusu || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Kararname Tarih/Sayı:</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.dayandigiKanun || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İli</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yerinIl || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İlçesi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yerinIlce || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Adres 1</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimAdresi1 || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Adres 2 (varsa)</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimAdresi2 || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Adres 3 (varsa)</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimAdresi3 || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>OSB Adı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Serbest Bölge Adı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İl Bazlı Bölgesi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İlçe Bazlı Bölgesi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Mevcut İstihdam</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.istihdam?.mevcutKisi || '0'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>İlave İstihdam</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.istihdam?.ilaveKisi || '0'}</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 4. Belge İle İlgili Bilgiler */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Belge İle İlgili Bilgiler</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge ID</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge NO</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.belgeNo || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.belgeTarihi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Müracaat Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.basvuruTarihi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Müracaat Sayısı</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge Başlama Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.baslamaTarihi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Belge Bitiş Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.bitisTarihi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Süre Uzatım Tarihi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Özellikli Yatırım İse</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Ada</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Parsel</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Yatırım Cinsi</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimCinsi || '-'}</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 5. Ürün Bilgileri (ESKİ BELGE - US97 KODU) */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Ürün Bilgileri</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>US97 Kodu</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Ürün Adı</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Mevcut Kap.</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>İlave Kap.</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Toplam Kap.</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Kap. Birim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tesvik.urunler && tesvik.urunler.length > 0 ? (
                      tesvik.urunler.map((urun, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{urun.us97Kodu || urun.u97Kodu || urun.naceKodu || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{urun.urunAdi || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{(Number(urun.mevcutKapasite) || 0).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{(Number(urun.ilaveKapasite) || 0).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{(Number(urun.toplamKapasite) || 0).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{urun.kapasiteBirimi || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Ürün bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </AccordionDetails>
            </Accordion>

            {/* 6. Finansal Bilgiler */}
            {(() => {
              const mali = tesvik.maliHesaplamalar || {};
              const araziArsa = Number(mali.araciArsaBedeli || mali.araziArsaBedeli || mali.maliyetlenen?.sn || 0);
              const binaInsaat = Number(mali.binaInsaatGideri?.toplamBinaGideri || 0);
              const ithalMak = Number(mali.makinaTechizat?.ithalMakina || 0);
              const yerliMak = Number(mali.makinaTechizat?.yerliMakina || 0);
              const toplamMak = Number(mali.makinaTechizat?.toplamMakina || 0);
              const yeniMakUsd = Number(mali.makinaTechizat?.yeniMakine || 0);
              const kullMakUsd = Number(mali.makinaTechizat?.kullanimisMakina || 0);
              const topMakUsd = yeniMakUsd + kullMakUsd;
              
              // ESKİ BELGE - 6 Kalem
              const yardimciIsletmeMakGider = 0; // Şemada ayrı bir alan yok, genelde 0
              const ithalatGider = Number(mali.yatirimHesaplamalari?.ev || 0); 
              const tasimaGider = Number(mali.yatirimHesaplamalari?.ew || 0);  
              const montajGider = Number(mali.yatirimHesaplamalari?.et || 0);  
              const etudGider = Number(mali.yatirimHesaplamalari?.ex || 0);    
              const digerGider = Number(mali.yatirimHesaplamalari?.ey || 0);   
              const toplamDigerHarcama = yardimciIsletmeMakGider + ithalatGider + tasimaGider + montajGider + etudGider + digerGider;
              
              let topSabit = Number(mali.toplamSabitYatirim || 0);
              if (!topSabit) topSabit = araziArsa + binaInsaat + toplamMak + toplamDigerHarcama;

              const yabanci = Number(mali.finansman?.yabanciKaynak || 0);
              const ozkaynak = Number(mali.finansman?.ozKaynak || 0);
              const topFin = Number(mali.finansman?.toplamFinansman || 0);

              return (
                <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Finansal Bilgiler</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>Arazi-Arsa Gideri</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Arazi-Arsa Bedeli Açıklama:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{mali.maliyetlenen?.aciklama || '-'}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Metrekaresi</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{Number(mali.maliyetlenen?.sl || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Birim Fiyatı</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.maliyetlenen?.sm || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Arazi Arsa Bedeli</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{araziArsa.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>Bina İnşaat Gideri</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Bina-İnşaat Giderleri Açıklama:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{mali.binaInsaatGideri?.aciklama || '-'}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Ana bina ve tesisleri:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.binaInsaatGideri?.anaBinaGideri || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yardımcı işletmeler bina ve tesisleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.binaInsaatGideri?.yardimciBinaGideri || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İdare binaları</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺0</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Bina İnşaat Giderleri:</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{binaInsaat.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>Diğer Yatırım Harcamaları</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yardımcı işletme makine teçhizat giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yardimciIsletmeMakGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İthalat ve gümrükleme giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ithalatGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Taşıma ve sigorta giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{tasimaGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Montaj giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{montajGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Etüd ve proje giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{etudGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Diğer giderler</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{digerGider.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Diğer Yatırım Harcamaları</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{toplamDigerHarcama.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#fef3c7', p: 1, borderRadius: 1, display: 'block', textAlign: 'center', mt: 1 }}>TOPLAM SABİT YATIRIM TUTARI : ₺{topSabit.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>Makina ve Teçhizat Giderleri</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İthal</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ithalMak.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yerli</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yerliMak.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Makine Teçhizat</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{toplamMak.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>İthal Makine ($)</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yeni Makine</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>${yeniMakUsd.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Kullanılmış Makine</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>${kullMakUsd.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Top. İthal. Mak. ($)</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>${topMakUsd.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>Yabancı Kaynaklar</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Top. Yabancı Kaynak</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yabanci.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>Özkaynaklar</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Özkaynaklar</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ozkaynak.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#e0f2fe', p: 0.5, borderRadius: 1, display: 'block', mt: 1 }}>TOPLAM FİNANSMAN</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Finansman</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', color: '#0369a1' }}>₺{topFin.toLocaleString('tr-TR')}</Typography></Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })()}

            {/* 7. Özel Şartlar */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Özel Şartlar</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '20%' }}>Kısaltma</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '80%' }}>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tesvik.ozelSartlar && tesvik.ozelSartlar.length > 0 ? (
                      tesvik.ozelSartlar.map((sart, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', verticalAlign: 'top' }}>{sart?.kisaltma || `Şart ${i+1}`}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{sart?.koşulMetni || sart?.sart || sart?.metin || sart?.aciklama || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="2" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Özel şart bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </AccordionDetails>
            </Accordion>

            {/* 8. Destek Unsurları */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Destek Unsurları</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0 ? (
                    tesvik.destekUnsurlari.map((destek, i) => (
                      <Box key={i} sx={{ p: 1.5, backgroundColor: '#fef7ff', border: '1px solid #e9d5ff', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#7c3aed' }}>{destek.destekUnsuru || '-'}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>Destek unsuru bulunamadı</Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* 9. Proje Tanıtım */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Proje Tanıtım</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Proje tanıtım bilgisi bulunmuyor.</Typography>
              </AccordionDetails>
            </Accordion>

            {/* 10. Evrak Listesi */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>Evrak Listesi</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ backgroundColor: '#f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '15%' }}>ID</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '35%' }}>Evrak Tipi</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e2e8f0', width: '50%' }}>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan="3" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Evrak listesi boş</td></tr>
                  </tbody>
                </table>
              </AccordionDetails>
            </Accordion>

          </Box>
