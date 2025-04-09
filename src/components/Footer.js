import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import { motion } from 'framer-motion';

const Footer = () => {
  return (
    <Box component="footer" sx={{ mt: 6, mb: 3, textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Detector de Estaciones - Tren Urquiza
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Desarrollado con React, Material-UI y Framer Motion
        </Typography>
      </motion.div>
    </Box>
  );
};

export default Footer;