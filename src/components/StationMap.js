import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import { stations as stationsData } from '../data/stations';
import { routeStationsBetween } from '../lib/etaCalc';
import useTrainSchedule, { formatWait } from '../hooks/useTrainSchedule';
import { urquizaColors } from '../theme';

// stationsData rows: [lat, lng, name]
const STATION_ROUTE = stationsData.map(([lat, lng]) => [lat, lng]);

const ROUTE_BOUNDS = (() => {
  const lats = stationsData.map((s) => s[0]);
  const lngs = stationsData.map((s) => s[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
})();

const stationIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${urquizaColors.yellow};border:2px solid #0D1117;box-shadow:0 0 0 2px ${urquizaColors.yellow}33;"></div>`,
  className: 'urquiza-station-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const nearestStationIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${urquizaColors.red};border:3px solid #fff;box-shadow:0 0 12px ${urquizaColors.red};"></div>`,
  className: 'urquiza-nearest-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationStationIcon = L.divIcon({
  html: `<div style="position:relative;width:22px;height:22px;">
    <div style="position:absolute;inset:0;width:22px;height:22px;border-radius:50%;background:${urquizaColors.yellow};border:3px solid ${urquizaColors.red};box-shadow:0 0 12px ${urquizaColors.red}66;"></div>
  </div>`,
  className: 'urquiza-destination-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitToRoute({ currentLocation, nearestStation, autoCenter }) {
  const map = useMap();
  const fittedRef = useRef(false);

  // Initial fit to the whole line.
  useEffect(() => {
    if (fittedRef.current) return;
    map.fitBounds(ROUTE_BOUNDS, { padding: [30, 30] });
    fittedRef.current = true;
  }, [map]);

  // When the nearest station changes (and autoCenter is on), focus on it.
  useEffect(() => {
    if (!autoCenter || !nearestStation) return;
    const station = stationsData.find((s) => s[2] === nearestStation.name);
    if (!station) return;
    map.flyTo([station[0], station[1]], Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
  }, [nearestStation, autoCenter, map]);

  // No-op for currentLocation (handled outside via marker)
  return null;
}

function StationPopup({ stationName }) {
  const { available, aLemos, aLacroze } = useTrainSchedule(stationName, { count: 1 });
  if (!available) {
    return <Typography variant="body2">Sin horarios</Typography>;
  }
  const next = (label, list) => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ width: 6, height: 18, bgcolor: urquizaColors.yellow, borderRadius: 0.5 }} />
      <Typography variant="caption">
        <strong>{label}:</strong>{' '}
        {list[0] ? `${list[0].time} (${formatWait(list[0].minutesUntil)})` : '--'}
      </Typography>
    </Stack>
  );
  return (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
        {stationName}
      </Typography>
      <Stack spacing={0.5}>
        {next('A Lemos', aLemos)}
        {next('A Lacroze', aLacroze)}
      </Stack>
    </Box>
  );
}

const StationMap = ({
  currentLocation,
  nearestStation,
  trip = null,
  autoCenter = true,
  height = 360,
}) => {
  const stations = useMemo(() => stationsData, []);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const tripRoute = useMemo(() => {
    if (!trip) return null;
    const seg = routeStationsBetween(trip.originName, trip.destinationName);
    if (!seg) return null;
    return seg.map(([lat, lng]) => [lat, lng]);
  }, [trip]);

  const minutesUntilArrival = trip
    ? Math.max(0, Math.round((trip.arrivalEpoch - now.getTime()) / 60000))
    : null;

  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      sx={{
        bgcolor: urquizaColors.surface,
        border: `1px solid ${urquizaColors.border}`,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${urquizaColors.border}` }}
      >
        <Typography variant="h3" sx={{ fontSize: '1rem', fontWeight: 700 }}>
          Mapa de la línea
        </Typography>
        {nearestStation && (
          <Chip
            size="small"
            label={`Cerca: ${nearestStation.name}`}
            sx={{
              bgcolor: urquizaColors.yellow,
              color: '#000',
              fontWeight: 700,
            }}
          />
        )}
      </Stack>

      <Box sx={{ position: 'relative', height, width: '100%' }}>
        {trip && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 500,
              bgcolor: urquizaColors.yellow,
              color: '#000',
              px: 1.25,
              py: 0.75,
              borderRadius: 2,
              boxShadow: 3,
              fontWeight: 700,
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            → {trip.destinationName} · llegás en {minutesUntilArrival} min
          </Box>
        )}
        <MapContainer
          bounds={ROUTE_BOUNDS}
          boundsOptions={{ padding: [30, 30] }}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', background: urquizaColors.background }}
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <Polyline
            positions={STATION_ROUTE}
            pathOptions={{ color: urquizaColors.yellow, weight: 4, opacity: 0.9 }}
          />

          {tripRoute && (
            <Polyline
              positions={tripRoute}
              pathOptions={{
                color: urquizaColors.red,
                weight: 6,
                opacity: 0.95,
              }}
            />
          )}

          {stations.map((station) => {
            const [lat, lng, name] = station;
            const isNearest = nearestStation?.name === name;
            const isDestination = trip?.destinationName === name;
            const icon = isDestination
              ? destinationStationIcon
              : isNearest
              ? nearestStationIcon
              : stationIcon;
            return (
              <Marker key={name} position={[lat, lng]} icon={icon}>
                <Popup>
                  <StationPopup stationName={name} />
                </Popup>
              </Marker>
            );
          })}

          {currentLocation && (
            <CircleMarker
              center={[currentLocation.latitude, currentLocation.longitude]}
              radius={7}
              pathOptions={{
                color: urquizaColors.red,
                fillColor: urquizaColors.red,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>Estás aquí</Popup>
            </CircleMarker>
          )}

          <FitToRoute
            currentLocation={currentLocation}
            nearestStation={nearestStation}
            autoCenter={autoCenter}
          />
        </MapContainer>
      </Box>
    </Card>
  );
};

export default StationMap;
