import React from 'react';
import { Paper, Typography, Box, Grid, Card, CardContent } from '@mui/material';
import { motion } from 'framer-motion';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrainIcon from '@mui/icons-material/Train';
import InfoIcon from '@mui/icons-material/Info';

const InfoSection = () => {
  const features = [
    {
      icon: <LocationOnIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Geolocalización Precisa',
      description: 'Utiliza el GPS de tu dispositivo para determinar tu ubicación exacta.'
    },
    {
      icon: <TrainIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Estaciones del Tren Urquiza',
      description: 'Base de datos actualizada con todas las estaciones del recorrido.'
    },
    {
      icon: <InfoIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Información en Tiempo Real',
      description: 'Conoce la distancia exacta a la estación más cercana en metros o kilómetros.'
    }
  ];

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
      <Typography variant="h5" component="h3" gutterBottom>
        Sobre esta aplicación
      </Typography>
      <Typography variant="body1" paragraph>
        Esta aplicación utiliza tu ubicación GPS para determinar en qué estación del Tren Urquiza te encuentras actualmente.
        Para un funcionamiento óptimo, asegúrate de tener activada la ubicación en tu dispositivo.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Box sx={{ mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" component="h4" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default InfoSection;