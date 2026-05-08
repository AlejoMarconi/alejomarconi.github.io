import React from 'react';
import { Box, Typography } from '@mui/material';

import { urquizaColors } from '../theme';

const Footer = () => (
  <Box
    component="footer"
    sx={{
      mt: 4,
      py: 2,
      textAlign: 'center',
      borderTop: `1px solid ${urquizaColors.border}`,
    }}
  >
    <Typography variant="caption" color="text.secondary">
      © {new Date().getFullYear()} · Tren Urquiza · Hecho con React
    </Typography>
  </Box>
);

export default Footer;
