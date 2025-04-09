import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { stations } from '../data/stations';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DirectionsIcon from '@mui/icons-material/Directions';
// Import train schedules
import trainSchedules from '../data/trainSchedules.json';

const StationMap = ({ currentLocation, nearestStation }) => {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedStation, setSelectedStation] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [destinationStation, setDestinationStation] = useState(null);
  const [isNearStation, setIsNearStation] = useState(false);
  const [isOnTrainRoute, setIsOnTrainRoute] = useState(false);
  const [nextTrainTime, setNextTrainTime] = useState(null);
  // Add new state for next trains in both directions
  const [nextTrains, setNextTrains] = useState({
    toLemos: null,
    toLacroze: null
  });
  
  // Function to get the day type (lunes_a_viernes, sabados, domingos)
  const getDayType = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    if (day === 0) return 'domingos';
    if (day === 6) return 'sabados';
    return 'lunes_a_viernes';
  };
  
  // Function to parse time string to minutes since midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    
    // Add more robust validation
    const timeRegex = /^([0-2][0-9]):([0-5][0-9])$/;
    if (!timeRegex.test(timeStr)) {
      console.warn(`Invalid time format: ${timeStr}`);
      return null;
    }
  
    try {
      const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
      // Allow times up to 23:59
      if (hours >= 24 || minutes >= 60) {
        console.warn(`Invalid time values: ${timeStr}`);
        return null;
      }
      return hours * 60 + minutes;
    } catch (error) {
      console.error("Error parsing time:", timeStr, error);
      return null;
    }
  };
  
  // Function to convert minutes to formatted time string (HH:MM)
  const minutesToTimeString = (minutes) => {
    if (minutes === null || isNaN(minutes)) return '--:--';
    
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Function to calculate minutes until next train
  const getMinutesUntil = (timeInMinutes) => {
    if (timeInMinutes === null) return null;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // If the train time is earlier than current time, it's for tomorrow
    if (timeInMinutes < currentMinutes) {
      return (24 * 60 - currentMinutes) + timeInMinutes;
    }
    
    return timeInMinutes - currentMinutes;
  };
  
  // Function to find the next train times for a station
  const findNextTrains = (stationName) => {
  if (!stationName || !trainSchedules[stationName]) {
    return { toLemos: null, toLacroze: null };
  }
  const dayType = getDayType();
  const stationSchedule = trainSchedules[stationName][dayType];
  if (!stationSchedule) {
    return { toLemos: null, toLacroze: null };
  }
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let nextToLemos = null;
  if (stationSchedule.a_lemos && Array.isArray(stationSchedule.a_lemos)) {
    const validTimes = stationSchedule.a_lemos
      .filter(time => time && typeof time === 'string' && time.length === 5 && time.indexOf(':') === 2)
      .map(time => parseTimeToMinutes(time))
      .filter(minutes => minutes !== null && minutes >= 0 && minutes < 24 * 60);
    nextToLemos = validTimes.find(minutes => minutes > currentMinutes);
    if (nextToLemos === undefined && validTimes.length > 0) {
      nextToLemos = validTimes[0] + (24 * 60);
    }
  }
  let nextToLacroze = null;
  if (stationSchedule.a_lacroze && Array.isArray(stationSchedule.a_lacroze)) {
    const validTimes = stationSchedule.a_lacroze
      .filter(time => time && typeof time === 'string' && time.length === 5 && time.indexOf(':') === 2)
      .map(time => parseTimeToMinutes(time))
      .filter(minutes => minutes !== null && minutes >= 0 && minutes < 24 * 60);
    nextToLacroze = validTimes.find(minutes => minutes > currentMinutes);
    if (nextToLacroze === undefined && validTimes.length > 0) {
      nextToLacroze = validTimes[0] + (24 * 60);
    }
  }
  return {
    toLemos: nextToLemos,
    toLacroze: nextToLacroze
  };
};
  
  // Update next train times when nearest station changes or every minute
  useEffect(() => {
    if (nearestStation) {
      const updateTrainTimes = () => {
        const nextTrainTimes = findNextTrains(nearestStation.name);
        setNextTrains(nextTrainTimes);
        
        // Also update the legacy nextTrainTime for compatibility
        const nextInMinutes = Math.min(
          nextTrainTimes.toLemos !== null ? getMinutesUntil(nextTrainTimes.toLemos) : Infinity,
          nextTrainTimes.toLacroze !== null ? getMinutesUntil(nextTrainTimes.toLacroze) : Infinity
        );
        
        setNextTrainTime(nextInMinutes !== Infinity ? nextInMinutes : null);
      };
      
      // Update immediately
      updateTrainTimes();
      
      // Then update every minute
      const intervalId = setInterval(updateTrainTimes, 60000);
      
      return () => clearInterval(intervalId);
    }
  }, [nearestStation]);
  
  // Función para calcular la distancia entre dos puntos usando la fórmula de Haversine
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (degrees) => degrees * Math.PI / 180;
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en km
    return distance;
  };
  
  // Función para calcular el tiempo estimado de llegada (ETA)
  const calculateETA = (fromStation, toStation) => {
    // Velocidad promedio del tren en km/h
    const avgTrainSpeed = 30;
    
    // Encontrar las coordenadas de las estaciones
    const fromCoords = stations.find(s => s[2] === fromStation.name);
    const toCoords = stations.find(s => s[2] === toStation.name);
    
    if (!fromCoords || !toCoords) return null;
    
    const distance = calculateDistance(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1]);
    
    // Calcular tiempo en minutos
    const timeInMinutes = (distance / avgTrainSpeed) * 60;
    
    return Math.round(timeInMinutes);
  };
  
  // Verificar si el usuario está cerca de una estación (menos de 30m) o en la ruta del tren
  useEffect(() => {
    if (currentLocation && nearestStation) {
      // Convertir 30m a km
      const thresholdDistance = 0.03; // 30 metros en kilómetros
      
      // Verificar si está cerca de una estación
      setIsNearStation(nearestStation.distance <= thresholdDistance);
      
      // Verificar si está en la ruta del tren (dentro de un margen de 30m siguiendo la línea)
      const isOnRoute = isUserOnTrainRoute(currentLocation.latitude, currentLocation.longitude);
      setIsOnTrainRoute(isOnRoute);
      
      // Calcular tiempo para el próximo tren
      calculateNextTrainTime();
    } else {
      setIsNearStation(false);
      setIsOnTrainRoute(false);
    }
  }, [currentLocation, nearestStation]);
  
  // Función para verificar si el usuario está en la ruta del tren
  const isUserOnTrainRoute = (userLat, userLon) => {
    // Margen de 30m en kilómetros
    const routeMargin = 0.03;
    
    // Verificar si el usuario está cerca de algún segmento de la ruta del tren
    for (let i = 0; i < stations.length - 1; i++) {
      const station1 = stations[i];
      const station2 = stations[i + 1];
      
      // Calcular la distancia del usuario al segmento de línea entre dos estaciones
      const distance = distanceToLineSegment(
        userLat, userLon,
        station1[0], station1[1],
        station2[0], station2[1]
      );
      
      if (distance <= routeMargin) {
        return true;
      }
    }
    
    return false;
  };
  
  // Función para calcular la distancia de un punto a un segmento de línea
  const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) {
      param = dot / len_sq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return calculateDistance(px, py, xx, yy);
  };
  
  // Función para calcular el tiempo para el próximo tren
  const calculateNextTrainTime = () => {
    // Simulación de horarios de trenes (en la vida real, esto vendría de una API)
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTimeInMinutes = hour * 60 + minute;
    
    // Horarios de trenes simplificados (cada 20 minutos en horas pico, cada 30 en horas valle)
    let nextTrainInMinutes = 0;
    
    if (hour >= 5 && hour < 9) {
      // Hora pico mañana (cada 20 minutos)
      nextTrainInMinutes = 20 - (currentTimeInMinutes % 20);
    } else if (hour >= 16 && hour < 20) {
      // Hora pico tarde (cada 20 minutos)
      nextTrainInMinutes = 20 - (currentTimeInMinutes % 20);
    } else if (hour >= 5 && hour < 23) {
      // Hora valle (cada 30 minutos)
      nextTrainInMinutes = 30 - (currentTimeInMinutes % 30);
    } else {
      // Fuera de servicio
      nextTrainInMinutes = null;
    }
    
    setNextTrainTime(nextTrainInMinutes);
  };
  
  // Función para manejar el zoom
  const handleZoom = (zoomIn) => {
    setScale(prevScale => {
      const newScale = zoomIn ? prevScale * 1.2 : prevScale / 1.2;
      // Limitar el zoom entre 0.5 y 5
      return Math.min(Math.max(newScale, 0.5), 5);
    });
  };
  
  // Función para centrar el mapa en la ubicación actual
  const centerOnCurrentLocation = () => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };
  
  // Manejadores de eventos para arrastrar el mapa
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Manejadores de eventos táctiles para dispositivos móviles
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    
    setOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  // Función para manejar clics en el mapa
  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Encontrar los límites del mapa
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    stations.forEach(station => {
      minLat = Math.min(minLat, station[0]);
      maxLat = Math.max(maxLat, station[0]);
      minLon = Math.min(minLon, station[1]);
      maxLon = Math.max(maxLon, station[1]);
    });
    
    // Añadir padding
    const padding = 0.01;
    minLat -= padding;
    maxLat += padding;
    minLon -= padding;
    maxLon += padding;
    
    // Función para convertir posición del canvas a coordenadas
    const canvasToCoord = (x, y, width, height) => {
      // Ajustar por zoom y desplazamiento
      const adjustedX = (x - offset.x) / scale;
      const adjustedY = (y - offset.y) / scale;
      
      const lon = minLon + (adjustedX / width) * (maxLon - minLon);
      const lat = maxLat - (adjustedY / height) * (maxLat - minLat);
      return { lat, lon };
    };
    
    // Función para convertir coordenadas a posición del canvas
    const coordToCanvas = (lat, lon, width, height) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * width;
      const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
      
      // Ajustar por zoom y desplazamiento
      return { 
        x: x * scale + offset.x, 
        y: y * scale + offset.y 
      };
    };
    
    // Verificar si se hizo clic en alguna estación
    const stationRadius = 10; // Radio de detección de clic en píxeles
    let clickedStation = null;
    
    stations.forEach(station => {
      const pos = coordToCanvas(station[0], station[1], canvas.width, canvas.height);
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      
      if (distance <= stationRadius) {
        clickedStation = {
          name: station[2],
          coordinates: [station[0], station[1]]
        };
      }
    });
    
    if (clickedStation) {
      setSelectedStation(clickedStation);
      setOpenDialog(true);
    }
  };
  
  // Función para cerrar el diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  // Función para establecer la estación seleccionada como destino
  const handleSetAsDestination = () => {
    setDestinationStation(selectedStation);
    setOpenDialog(false);
  };
  
  useEffect(() => {
    if (!canvasRef.current || !currentLocation) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Find map boundaries
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    stations.forEach(station => {
      minLat = Math.min(minLat, station[0]);
      maxLat = Math.max(maxLat, station[0]);
      minLon = Math.min(minLon, station[1]);
      maxLon = Math.max(maxLon, station[1]);
    });
    
    // Add some padding
    const padding = 0.01;
    minLat -= padding;
    maxLat += padding;
    minLon -= padding;
    maxLon += padding;
    
    // Function to convert coordinates to canvas position with zoom and offset
    const coordToCanvas = (lat, lon) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * width;
      const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
      
      // Apply zoom and offset
      return { 
        x: x * scale + offset.x, 
        y: y * scale + offset.y 
      };
    };
    
    // Draw train line
    ctx.beginPath();
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 4 * scale; // Adjust line width based on zoom
    
    const firstStation = coordToCanvas(stations[0][0], stations[0][1]);
    ctx.moveTo(firstStation.x, firstStation.y);
    
    stations.forEach((station, index) => {
      if (index === 0) return;
      const pos = coordToCanvas(station[0], station[1]);
      ctx.lineTo(pos.x, pos.y);
    });
    
    ctx.stroke();
    
    // Draw stations
    stations.forEach(station => {
      const pos = coordToCanvas(station[0], station[1]);
      
      // Station circle
      ctx.beginPath();
      ctx.fillStyle = '#2c3e50';
      ctx.arc(pos.x, pos.y, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight nearest station
      if (nearestStation && station[2] === nearestStation.name) {
        ctx.beginPath();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2 * scale;
        ctx.arc(pos.x, pos.y, 8 * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Highlight destination station if set
      if (destinationStation && station[2] === destinationStation.name) {
        ctx.beginPath();
        ctx.strokeStyle = '#27ae60'; // Green color for destination
        ctx.lineWidth = 3 * scale;
        ctx.arc(pos.x, pos.y, 10 * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add a destination flag or icon
        ctx.beginPath();
        ctx.fillStyle = '#27ae60';
        ctx.moveTo(pos.x, pos.y - 15 * scale);
        ctx.lineTo(pos.x + 10 * scale, pos.y - 5 * scale);
        ctx.lineTo(pos.x, pos.y + 5 * scale);
        ctx.lineTo(pos.x - 10 * scale, pos.y - 5 * scale);
        ctx.closePath();
        ctx.fill();
      }
      
      // Mejorar la visualización de los nombres de estaciones
      if (scale > 1.5) {
        // Aumentar el tamaño de la fuente y mejorar el espaciado
        ctx.font = `bold ${14 * scale}px Arial`;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        
        // Añadir un fondo blanco semi-transparente para mejorar la legibilidad
        const textWidth = ctx.measureText(station[2]).width;
        const textHeight = 14 * scale;
        const padding = 4 * scale;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(
          pos.x - textWidth/2 - padding, 
          pos.y - 20 * scale - textHeight, 
          textWidth + padding * 2, 
          textHeight + padding
        );
        
        // Dibujar el texto con más espacio vertical
        ctx.fillStyle = '#333';
        ctx.fillText(station[2], pos.x, pos.y - 20 * scale);
      }
    });
    
    // Draw user location
    if (currentLocation) {
      const userPos = coordToCanvas(currentLocation.latitude, currentLocation.longitude);
      ctx.beginPath();
      ctx.fillStyle = '#e74c3c';
      ctx.arc(userPos.x, userPos.y, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw accuracy circle
      if (currentLocation.accuracy) {
        const accuracyInDegrees = currentLocation.accuracy / 111000; // Aproximadamente 111km por grado
        const accuracyRadius = ((accuracyInDegrees / (maxLat - minLat)) * height) * scale;
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
        ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.lineWidth = 1 * scale;
        ctx.arc(userPos.x, userPos.y, accuracyRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      // Draw line between user and nearest station
      if (nearestStation) {
        const nearestStationData = stations.find(s => s[2] === nearestStation.name);
        if (nearestStationData) {
          const stationPos = coordToCanvas(nearestStationData[0], nearestStationData[1]);
          
          ctx.beginPath();
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 2 * scale;
          ctx.setLineDash([5 * scale, 3 * scale]);
          ctx.moveTo(userPos.x, userPos.y);
          ctx.lineTo(stationPos.x, stationPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      
      // Draw line between user and destination station if set
      if (destinationStation) {
        const destStationData = stations.find(s => s[2] === destinationStation.name);
        if (destStationData) {
          const stationPos = coordToCanvas(destStationData[0], destStationData[1]);
          
          ctx.beginPath();
          ctx.strokeStyle = '#27ae60'; // Green color for destination
          ctx.lineWidth = 2 * scale;
          ctx.setLineDash([8 * scale, 4 * scale]);
          ctx.moveTo(userPos.x, userPos.y);
          ctx.lineTo(stationPos.x, stationPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    
  }, [currentLocation, nearestStation, scale, offset, destinationStation]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Mapa de Estaciones
        </Typography>
        
        {/* Mostrar información de destino solo cuando estamos cerca de una estación */}
        {destinationStation && nearestStation && (isNearStation || destinationStation.name === nearestStation.name) && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(39, 174, 96, 0.1)', borderRadius: 1 }}>
            <Typography variant="body1" fontWeight="bold">
              Destino: {destinationStation.name}
            </Typography>
            {nearestStation && (
              <Typography variant="body2">
                Tiempo estimado: {calculateETA(nearestStation, destinationStation) || '?'} minutos
              </Typography>
            )}
          </Box>
        )}
        
        <Box sx={{ position: 'relative', width: '100%', height: 400, mb: 2 }}>
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600}
            style={{ 
              width: '100%', 
              height: '100%', 
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none' // Prevent default touch actions
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          
          {/* Zoom controls */}
          <Box sx={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 10, 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 1,
            boxShadow: 1
          }}>
            <IconButton onClick={() => handleZoom(true)} size="small">
              <AddIcon />
            </IconButton>
            <IconButton onClick={() => handleZoom(false)} size="small">
              <RemoveIcon />
            </IconButton>
            <IconButton onClick={centerOnCurrentLocation} size="small">
              <MyLocationIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Haz clic en cualquier estación para ver más información o establecerla como destino.
        </Typography>
      </Paper>
      
      {/* Dialog for station information */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          Estación {selectedStation?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Esta es la estación {selectedStation?.name} del Tren Urquiza.
          </Typography>
          
          {nearestStation && selectedStation && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Distancia desde tu ubicación: {
                calculateDistance(
                  currentLocation.latitude, 
                  currentLocation.longitude, 
                  selectedStation.coordinates[0], 
                  selectedStation.coordinates[1]
                ).toFixed(2)
              } km
            </Typography>
          )}
          
          {nearestStation && selectedStation && nearestStation.name !== selectedStation.name && (
            <Typography variant="body2">
              Tiempo estimado desde tu estación actual: {
                calculateETA(nearestStation, selectedStation) || '?'
              } minutos
            </Typography>
          )}
          
          {/* Add train schedule information to the dialog */}
          {selectedStation && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Próximos trenes:
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="body2" color="primary">
                    A Lemos: {
                      findNextTrains(selectedStation.name).toLemos !== null 
                        ? `${minutesToTimeString(findNextTrains(selectedStation.name).toLemos)} (en ${getMinutesUntil(findNextTrains(selectedStation.name).toLemos)} min)`
                        : 'No disponible'
                    }
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="success.main">
                    A Lacroze: {
                      findNextTrains(selectedStation.name).toLacroze !== null 
                        ? `${minutesToTimeString(findNextTrains(selectedStation.name).toLacroze)} (en ${getMinutesUntil(findNextTrains(selectedStation.name).toLacroze)} min)`
                        : 'No disponible'
                    }
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cerrar</Button>
          <Button 
            onClick={handleSetAsDestination} 
            startIcon={<DirectionsIcon />}
            variant="contained" 
            color="primary"
          >
            Establecer como destino
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default StationMap;