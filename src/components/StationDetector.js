import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import { motion } from 'framer-motion';

import useStationDetector from '../hooks/useStationDetector';
import { urquizaColors } from '../theme';

const StationDetector = ({
  setCurrentLocation,
  setNearestStation,
  setError,
  setLoading,
  loading,
  error,
  nearestStation,
}) => {
  const {
    detectStation,
    forcePermissionRequest,
    continuousTracking,
    startContinuousTracking,
    stopContinuousTracking,
  } = useStationDetector({
    setCurrentLocation,
    setNearestStation,
    setError,
    setLoading,
  });

  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        bgcolor: urquizaColors.surface,
        border: `1px solid ${urquizaColors.border}`,
        borderRadius: 3,
        p: 2.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <LocationSearchingIcon sx={{ color: urquizaColors.yellow }} />
        <Typography variant="h3" sx={{ fontSize: '1.05rem' }}>
          Mi estación
        </Typography>
        {continuousTracking && (
          <Chip
            size="small"
            label="seguimiento ON"
            color="primary"
            sx={{ height: 20, ml: 'auto', color: '#000', fontWeight: 700 }}
          />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
          {error.includes('denegado') && (
            <Button size="small" onClick={forcePermissionRequest} sx={{ ml: 1 }}>
              Reintentar permisos
            </Button>
          )}
        </Alert>
      )}

      {nearestStation ? (
        <Stack
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          spacing={0.25}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="overline" color="text.secondary">
            Estación más cercana
          </Typography>
          <Typography
            variant="h2"
            sx={{
              color: urquizaColors.yellow,
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            {nearestStation.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {nearestStation.distance < 0.05
              ? `Estás en la estación`
              : `${nearestStation.distance.toFixed(2)} km de tu ubicación`}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Tocá "Detectar" para encontrar tu estación más cercana.
        </Typography>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MyLocationIcon />}
          onClick={detectStation}
          disabled={loading}
        >
          {loading ? 'Detectando...' : nearestStation ? 'Actualizar' : 'Detectar estación'}
        </Button>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={forcePermissionRequest}
          disabled={loading}
        >
          Permisos
        </Button>
      </Stack>

      <Box sx={{ mt: 1.5 }}>
        <FormControlLabel
          control={
            <Switch
              checked={continuousTracking}
              onChange={(e) =>
                e.target.checked ? startContinuousTracking() : stopContinuousTracking()
              }
              disabled={loading}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              Seguimiento continuo (actualiza al moverte)
            </Typography>
          }
        />
      </Box>
    </Card>
  );
};

export default StationDetector;
