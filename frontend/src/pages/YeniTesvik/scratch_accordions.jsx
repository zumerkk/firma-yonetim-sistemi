          {/* ========================================================= */}
          {/* 6 BÖLÜMLÜ EXCEL ŞABLONU ACCORDION YAPISI                 */}
          {/* ========================================================= */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            
            {/* 1- YATIRIMCI İLE İLGİLİ BİLGİLER */}
            <Accordion defaultExpanded sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>1- YATIRIMCI İLE İLGİLİ BİLGİLER</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>1- FİRMA ADI VE UNVANI :</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaBilgileri?.unvan || tesvik.firma?.tamUnvan || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>2- ADRESİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaBilgileri?.adres || tesvik.firma?.adres || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>3- VERGİ NO</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firmaBilgileri?.vergiNo || tesvik.firma?.vergiNoTC || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>4- TELEFON VE FAX</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firma?.firmaTelefon || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>5- E-POSTA ADRESİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firma?.firmaEmail || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>6- SGK İŞYERİ SİCİL NO</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>7- SERMAYE TÜRÜ :</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.firma?.yabanciSermayeli ? 'Yabancı Sermayeli' : 'Tamamı Yerli'}</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 2- YATIRIM İLE İLGİLİ BİLGİLER */}
            <Accordion defaultExpanded sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>2- YATIRIM İLE İLGİLİ BİLGİLER</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>1- SEKTÖRÜ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>2- KONUSU</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimKonusu || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>3- CİNSİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.yatirimBilgileri?.yatirimCinsi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>4- YERİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{(tesvik.yatirimBilgileri?.yerinIl || '-')} / {(tesvik.yatirimBilgileri?.yerinIlce || '-')}</Typography></Grid>

                  {/* İstihdam Tablosu */}
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>5- İLAVE İSTİHDAM</Typography>
                    <Grid container sx={{ border: '1px solid #e2e8f0', borderRadius: 1, overflow: 'hidden' }}>
                      <Grid item xs={4} sx={{ p: 1, backgroundColor: '#f1f5f9', borderRight: '1px solid #e2e8f0' }}><Typography variant="caption" sx={{ fontWeight: 600 }}>Mevcut (kişi)</Typography></Grid>
                      <Grid item xs={4} sx={{ p: 1, backgroundColor: '#f1f5f9', borderRight: '1px solid #e2e8f0' }}><Typography variant="caption" sx={{ fontWeight: 600 }}>İlave (kişi)</Typography></Grid>
                      <Grid item xs={4} sx={{ p: 1, backgroundColor: '#f1f5f9' }}><Typography variant="caption" sx={{ fontWeight: 600 }}>TOPLAM (kişi)</Typography></Grid>
                      
                      <Grid item xs={4} sx={{ p: 1, borderRight: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.istihdam?.mevcutKisi || '0'}</Typography></Grid>
                      <Grid item xs={4} sx={{ p: 1, borderRight: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.istihdam?.ilaveKisi || '0'}</Typography></Grid>
                      <Grid item xs={4} sx={{ p: 1, borderTop: '1px solid #e2e8f0' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.istihdam?.toplamKisi || '0'}</Typography></Grid>
                    </Grid>
                  </Grid>

                  {/* Kapasite / Ürünler Tablosu */}
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>6- KAPASİTE</Typography>
                    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead style={{ backgroundColor: '#f1f5f9' }}>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Kod</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Ürün Adı</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Mevcut</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>İlave</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>TOPLAM</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Birim</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tesvik.urunler && tesvik.urunler.length > 0 ? (
                            tesvik.urunler.map((urun, i) => (
                              <tr key={i}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{urun.u97Kodu || urun.us97Kodu || urun.naceKodu || '-'}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{urun.urunAdi || '-'}</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{(Number(urun.mevcutKapasite) || 0).toLocaleString('tr-TR')}</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{(Number(urun.ilaveKapasite) || 0).toLocaleString('tr-TR')}</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{(Number(urun.toplamKapasite) || 0).toLocaleString('tr-TR')}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{urun.kapasiteBirimi || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="6" style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>Ürün bulunamadı</td></tr>
                          )}
                        </tbody>
                      </table>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>7- BAŞLAMA TARİHİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.baslamaTarihi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>8- BİTİŞ TARİHİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.bitisTarihi || '-'}</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>9- İŞLETMEYE GEÇİŞ TARİHİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 3- YATIRIMIN YARARLANACAĞI DESTEK UNSURLARI */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>3- YATIRIMIN YARARLANACAĞI DESTEK UNSURLARI</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={1}>
                  {tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0 ? (
                    tesvik.destekUnsurlari.map((destek, i) => (
                      <React.Fragment key={i}>
                        <Grid item xs={12} sm={6}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>{destek.destekUnsuru || '-'}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography variant="body2" sx={{ fontWeight: 600 }}>VAR</Typography></Grid>
                        <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>
                      </React.Fragment>
                    ))
                  ) : (
                    <Grid item xs={12}><Typography variant="body2" sx={{ color: '#94a3b8' }}>Destek unsuru bulunamadı</Typography></Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 4- YATIRIMIN TUTARI */}
            {(() => {
              const mali = tesvik.maliHesaplamalar || {};
              const araziArsa = Number(mali.araciArsaBedeli || mali.araziArsaBedeli || mali.maliyetlenen?.sn || 0);
              const binaInsaat = Number(mali.binaInsaatGideri?.toplamBinaGideri || 0);
              const digerYatirim = Number(mali.yatirimHesaplamalari?.ez || 0);
              const ithalMak = Number(mali.makinaTechizat?.ithalMakina || 0);
              const yerliMak = Number(mali.makinaTechizat?.yerliMakina || 0);
              const toplamMak = Number(mali.makinaTechizat?.toplamMakina || 0);
              const yeniMakUsd = Number(mali.makinaTechizat?.yeniMakine || 0);
              const kullMakUsd = Number(mali.makinaTechizat?.kullanimisMakina || 0);
              const topMakUsd = yeniMakUsd + kullMakUsd;
              let topSabit = Number(mali.toplamSabitYatirim || 0);
              if (!topSabit) topSabit = araziArsa + binaInsaat + toplamMak + digerYatirim;

              return (
                <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>4- YATIRIMIN TUTARI</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>Arazi-Arsa Bedeli</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Arazi-Arsa Bedeli Toplamı</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{araziArsa.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>BİNA İNŞAAT GİDERLERİ</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Ana Bina ve Tesisleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.binaInsaatGideri?.anaBinaGideri || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yardımcı İş. Bina ve Tesisleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.binaInsaatGideri?.yardimciBinaGideri || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Bina İnşaat Gideri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{binaInsaat.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>DİĞER YATIRIM HARCAMALARI</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İthalat ve Gümrükleme Giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.yatirimHesaplamalari?.ev || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Taşıma ve Sigorta Giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.yatirimHesaplamalari?.ew || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Montaj Giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.yatirimHesaplamalari?.et || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Etüd ve Proje Giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.yatirimHesaplamalari?.ex || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Faiz veya Kâr Payı Giderleri</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.yatirimHesaplamalari?.eu || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Kur Farkı Giderleri / Maddi Olmayan Duran Varlık</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺0</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Diğer Giderler</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{Number(mali.yatirimHesaplamalari?.ey || 0).toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Diğer Yatırım Harc.</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{digerYatirim.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#fef3c7', p: 1, borderRadius: 1, display: 'block', textAlign: 'center', mt: 1 }}>TOPLAM SABİT YATIRIM TUTARI : ₺{topSabit.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>MAKİNE TEÇHİZAT GİDERLERİ</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>İthal</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ithalMak.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yerli</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yerliMak.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Makine Teçhizat</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>₺{toplamMak.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>İTHAL MAKİNE ($)</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Yeni Makine</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>${yeniMakUsd.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Kullanılmış Makine</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>${kullMakUsd.toLocaleString('tr-TR')}</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam İthal Makine ($)</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>${topMakUsd.toLocaleString('tr-TR')}</Typography></Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })()}

            {/* 5- FİNANSMAN */}
            {(() => {
              const mali = tesvik.maliHesaplamalar || {};
              const yabanci = Number(mali.finansman?.yabanciKaynak || 0);
              const ozkaynak = Number(mali.finansman?.ozKaynak || 0);
              const topFin = Number(mali.finansman?.toplamFinansman || 0);

              return (
                <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>5- FİNANSMAN</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>YABANCI KAYNAKLAR</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Toplam Yabancı Kaynak</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{yabanci.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>ÖZKAYNAKLAR</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#475569' }}>Özkaynaklar</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>₺{ozkaynak.toLocaleString('tr-TR')}</Typography></Grid>

                      <Grid item xs={12}><Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', bgcolor: '#e0f2fe', p: 0.5, borderRadius: 1, display: 'block' }}>TOPLAM FİNANSMAN</Typography></Grid>
                      <Grid item xs={8}><Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>Toplam Finansman</Typography></Grid>
                      <Grid item xs={4}><Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right', color: '#0369a1' }}>₺{topFin.toLocaleString('tr-TR')}</Typography></Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })()}

            {/* 6- ÖZEL ŞARTLAR */}
            <Accordion sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>6- ÖZEL ŞARTLAR</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
                <Grid container spacing={2}>
                  {tesvik.ozelSartlar && tesvik.ozelSartlar.length > 0 ? (
                    tesvik.ozelSartlar.map((sart, i) => (
                      <Grid item xs={12} key={i}>
                        <Box sx={{ p: 1.5, backgroundColor: '#fffbeb', borderRadius: 1, border: '1px solid #fef3c7' }}>
                          <Typography variant="body2" sx={{ color: '#92400e', lineHeight: 1.6 }}>
                            {sart?.koşulMetni || sart?.kisaltma || sart?.sart || sart?.metin || '-'}
                          </Typography>
                        </Box>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}><Typography variant="body2" sx={{ color: '#94a3b8' }}>Özel şart bulunamadı</Typography></Grid>
                  )}
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  
                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>DAYANDIĞI KANUN</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography></Grid>

                  <Grid item xs={12} sm={4}><Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>BELGE MÜRACAAT TARİHİ</Typography></Grid>
                  <Grid item xs={12} sm={8}><Typography variant="body2" sx={{ fontWeight: 600 }}>{tesvik.kunyeBilgileri?.basvuruTarihi || '-'}</Typography></Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
