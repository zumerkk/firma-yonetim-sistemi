// 👤 Profile Page
// Kullanıcı profil sayfası (Placeholder)

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Profile = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        👤 Profil Ayarları
      </Typography>
      
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          🚧 Bu sayfa henüz geliştirilme aşamasında...
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Kullanıcı profil ayarları yakında burada olacak!
        </Typography>
      </Paper>
    </Box>
  );
};

export default Profile; 