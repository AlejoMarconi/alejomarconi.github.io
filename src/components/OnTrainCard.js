import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import CloseIcon from '@mui/icons-material/Close';
import { motion } from 'framer-motion';

import { stations } from '../data/stations';
import { computeTrip } from '../lib/etaCalc';
import { shareTripICS } from '../lib/calendar';
import { urquizaColors } from '../theme';

function formatHM(epoch) {
  const d = new Date(epoch);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesUntil(epoch, now) {
  return Math.max(0, Math.round((epoch - now.getTime()) / 60000));
}

const OnTrainCard = ({ nearestStation, trip, setTrip }) => {
  const [destination, setDestination] = useState(trip?.destinationName || '');
  const [now, setNow] = useState(() => new Date());

  // 1-minute tick for the live countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-clear once the trip is 10 min past arrival.
  useEffect(() => {
    if (trip && Date.now() > trip.arrivalEpoch + 10 * 60 * 1000) {
      setTrip(null);
      setDestination('');
    }
  }, [trip, now, setTrip]);

  // When the user picks a destination, compute and lift the trip.
  useEffect(() => {
    if (!nearestStation || !destination) {
      if (trip) setTrip(null);
      return;
    }
    if (destination === nearestStation.name) return;
    const t = computeTrip(nearestStation.name, destination, new Date());
    setTrip(t);
  }, [nearestStation, destination, setTrip, trip]);

  const stationOptions = useMemo(
    () =>
      stations
        .map((s) => s[2])
        .filter((name) => !nearestStation || name !== nearestStation.name),
    [nearestStation],
  );

  const cancel = () => {
    setDestination('');
    setTrip(null);
  };

  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      sx={{
        bgcolor: urquizaColors.surface,
        border: `1px solid ${urquizaColors.border}`,
        borderRadius: 3,
        p: 2,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <DirectionsTransitIcon sx={{ color: urquizaColors.yellow }} />
        <Typography variant="h3" sx={{ fontSize: '1.05rem' }}>
          En el tren
        </Typography>
      </Stack>

      {!nearestStation && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Detectá tu estación primero para usar este modo.
        </Alert>
      )}

      {nearestStation && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Origen: <strong>{nearestStation.name}</strong>
          </Typography>

          <Select
            size="small"
            fullWidth
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            displayEmpty
            sx={{ mt: 1 }}
          >
            <MenuItem value="" disabled>
              Elegí destino
            </MenuItem>
            {stationOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>

          {destination && !trip && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              No hay trenes próximos a {destination} desde {nearestStation.name}{' '}
              en este momento.
            </Alert>
          )}

          {trip && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                <Chip
                  size="small"
                  label={`Salida ${trip.trainTime}`}
                  sx={{ bgcolor: urquizaColors.surfaceElevated }}
                />
                <Chip
                  size="small"
                  label={`Llegada ${formatHM(trip.arrivalEpoch)}`}
                  sx={{ bgcolor: urquizaColors.surfaceElevated }}
                />
                <Chip
                  size="small"
                  label={`llegás en ${minutesUntil(trip.arrivalEpoch, now)} min`}
                  sx={{
                    bgcolor: urquizaColors.yellow,
                    color: '#000',
                    fontWeight: 700,
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<EventAvailableIcon />}
                  onClick={() => shareTripICS(trip)}
                >
                  Programar avisos en Calendario
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={cancel}
                  color="inherit"
                >
                  Cancelar viaje
                </Button>
              </Stack>
            </Box>
          )}
        </>
      )}
    </Card>
  );
};

export default OnTrainCard;
