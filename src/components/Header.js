import React from 'react';
import { Typography, Box } from '@mui/material';
import { motion } from 'framer-motion';

const Header = () => {
  return (
    <Box component="header" sx={{ textAlign: 'center', mb: 4 }}>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
      >
        <Typography variant="h1" component="h1" gutterBottom>
          Detector de Estaciones
        </Typography>
        <Typography variant="h2" component="h2" gutterBottom>
          Tren Urquiza
        </Typography>
      </motion.div>
    </Box>
  );
};

export default Header;