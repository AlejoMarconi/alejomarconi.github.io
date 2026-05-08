import React from 'react';
import { Box, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

import { urquizaColors } from '../theme';

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <Box
      component="header"
      sx={{
        py: { xs: 2, md: 3 },
        px: { xs: 2, md: 4 },
        background: `linear-gradient(135deg, ${urquizaColors.surface} 0%, ${urquizaColors.surfaceElevated} 100%)`,
        borderBottom: `1px solid ${urquizaColors.border}`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: urquizaColors.yellow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 0 4px ${urquizaColors.yellow}22`,
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: '1.5rem',
                color: '#000',
                fontFamily: '"Roboto Mono", monospace',
                lineHeight: 1,
              }}
            >
              U
            </Typography>
          </Box>
          <Stack>
            <Typography
              variant="overline"
              sx={{ color: urquizaColors.yellow, lineHeight: 1, fontWeight: 700 }}
            >
              Línea Urquiza
            </Typography>
            <Typography variant={isMobile ? 'h2' : 'h1'} sx={{ lineHeight: 1.1 }}>
              {isMobile ? 'Próximos trenes' : 'Próximos trenes y alarmas'}
            </Typography>
          </Stack>
        </Stack>
      </motion.div>
    </Box>
  );
};

export default Header;
