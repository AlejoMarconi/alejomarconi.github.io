import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Link, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { motion } from 'framer-motion';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TrainIcon from '@mui/icons-material/Train';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useStationDetector from '../hooks/useStationDetector';

const StationDetector = ({ 
  setCurrentLocation, 
  setNearestStation, 
  setError, 
  setLoading, 
  loading, 
  error, 
  nearestStation 
}) => {
  const { 
    detectStation, 
    forcePermissionRequest, 
    attemptCount, 
    continuousTracking,
    startContinuousTracking,
    stopContinuousTracking,
    debugInfo
  } = useStationDetector({
    setCurrentLocation,
    setNearestStation,
    setError,
    setLoading
  });

  const [showDebug, setShowDebug] = useState(false);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <TrainIcon sx={{ mr: 1 }} /> Detector de Estación
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {nearestStation ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h6" gutterBottom>
            Estación más cercana:
          </Typography>
          <Typography variant="h4" gutterBottom color="primary">
            {nearestStation.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Distancia: {nearestStation.distance.toFixed(2)} km
          </Typography>
        </motion.div>
      ) : (
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Presiona el botón para detectar la estación más cercana.
        </Typography>
      )}
      
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MyLocationIcon />}
          onClick={detectStation}
          disabled={loading}
          fullWidth
        >
          {loading ? 'Detectando...' : 'Detectar Estación'}
        </Button>
        
        <FormControlLabel
          control={
            <Switch
              checked={continuousTracking}
              onChange={(e) => {
                if (e.target.checked) {
                  startContinuousTracking();
                } else {
                  stopContinuousTracking();
                }
              }}
              disabled={loading}
            />
          }
          label="Seguimiento continuo"
        />
        
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<RefreshIcon />}
          onClick={forcePermissionRequest}
          disabled={loading}
          fullWidth
        >
          Reintentar
        </Button>
        
        <FormControlLabel
          control={
            <Switch
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
            />
          }
          label="Mostrar información de depuración"
        />
        
        {showDebug && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Información de depuración</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="div">
                <strong>Intentos:</strong> {attemptCount}<br />
                <strong>Coordenadas:</strong> {debugInfo.userCoordinates ? 
                  `Lat: ${debugInfo.userCoordinates.latitude}, Lon: ${debugInfo.userCoordinates.longitude}` : 
                  'No disponible'}<br />
                <strong>Estación más cercana:</strong> {debugInfo.nearestStationName || 'No detectada'}<br />
                <strong>Distancia:</strong> {debugInfo.nearestStationDistance ? `${debugInfo.nearestStationDistance} km` : 'No calculada'}<br />
                
                {debugInfo.allDistances && (
                  <>
                    <strong>Distancias a todas las estaciones:</strong>
                    <ul style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.8rem' }}>
                      {Object.entries(debugInfo.allDistances)
                        .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))
                        .map(([station, distance]) => (
                          <li key={station}>
                            {station}: {distance} km
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.8rem' }}>
        Para obtener mejores resultados, asegúrate de tener activada la ubicación en tu dispositivo.
        {error && error.includes('denegado') && (
          <Link 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              forcePermissionRequest();
            }}
            sx={{ display: 'block', mt: 1 }}
          >
            Habilitar permisos de ubicación
          </Link>
        )}
      </Typography>
    </Paper>
  );
};

export default StationDetector;