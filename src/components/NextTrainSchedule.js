import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import trainSchedules from '../data/trainSchedules.json';

const NextTrainSchedule = ({ nearestStation }) => {
  const [nextTrains, setNextTrains] = useState({ a_lemos: null, a_lacroze: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!nearestStation) return;

    setLoading(true);
    setError(null);

    try {
      // Obtener el día de la semana actual
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
      
      // Determinar qué horario usar basado en el día de la semana
      let scheduleType;
      if (dayOfWeek === 0) {
        scheduleType = "domingos_feriados";
      } else if (dayOfWeek === 6) {
        scheduleType = "sabados";
      } else {
        scheduleType = "lunes_a_viernes";
      }
      
      console.log('Debug - Día de la semana:', dayOfWeek, 'Tipo de horario:', scheduleType);
      console.log('Debug - Estación para buscar horarios:', nearestStation.name);
      
      // Buscar la estación en el archivo de horarios
      const stationSchedules = trainSchedules[nearestStation.name];
      
      if (!stationSchedules) {
        console.log('Debug - No se encontraron horarios para la estación:', nearestStation.name);
        console.log('Debug - Estaciones disponibles:', Object.keys(trainSchedules));
        setError(`No se encontraron horarios para la estación ${nearestStation.name}`);
        setLoading(false);
        return;
      }
      
      const daySchedule = stationSchedules[scheduleType];
      
      if (!daySchedule) {
        console.log('Debug - No se encontraron horarios para el tipo de día:', scheduleType);
        setError(`No hay horarios disponibles para ${scheduleType}`);
        setLoading(false);
        return;
      }
      
      // Obtener la hora actual en formato HH:MM
      const currentHour = today.getHours().toString().padStart(2, '0');
      const currentMinute = today.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;
      
      console.log('Debug - Hora actual:', currentTime);
      
      // Encontrar el próximo tren en cada dirección
      const nextTrainsInfo = {
        a_lemos: findNextTrain(daySchedule.a_lemos, currentTime),
        a_lacroze: findNextTrain(daySchedule.a_lacroze, currentTime)
      };
      
      console.log('Debug - Próximos trenes:', nextTrainsInfo);
      
      setNextTrains(nextTrainsInfo);
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener los horarios:', error);
      setError('Error al obtener los horarios de trenes');
      setLoading(false);
    }
  }, [nearestStation]);

  // Función para encontrar el próximo horario de tren
  const findNextTrain = (schedules, currentTime) => {
    if (!schedules || !Array.isArray(schedules)) {
      console.log('Debug - No hay horarios disponibles');
      return null;
    }
    
    // Filtrar horarios inválidos (con horas > 23 o minutos > 59)
    const validSchedules = schedules.filter(time => {
      const [hours, minutes] = time.split(':').map(Number);
      return !isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
    });
    
    // Ordenar los horarios cronológicamente
    validSchedules.sort((a, b) => {
      const [hoursA, minutesA] = a.split(':').map(Number);
      const [hoursB, minutesB] = b.split(':').map(Number);
      
      if (hoursA !== hoursB) {
        return hoursA - hoursB;
      }
      return minutesA - minutesB;
    });
    
    // Encontrar el próximo horario
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    
    // Convertir la hora actual a minutos desde medianoche para facilitar la comparación
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Buscar el próximo tren
    for (const schedule of validSchedules) {
      const [scheduleHour, scheduleMinute] = schedule.split(':').map(Number);
      const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;
      
      if (scheduleTimeInMinutes > currentTimeInMinutes) {
        // Calcular tiempo de espera en minutos
        const waitTime = scheduleTimeInMinutes - currentTimeInMinutes;
        return {
          time: schedule,
          waitTime: waitTime
        };
      }
    }
    
    // Si no hay más trenes hoy, mostrar el primer tren del día siguiente
    if (validSchedules.length > 0) {
      const firstTrainTomorrow = validSchedules[0];
      const [tomorrowHour, tomorrowMinute] = firstTrainTomorrow.split(':').map(Number);
      const tomorrowTimeInMinutes = tomorrowHour * 60 + tomorrowMinute;
      
      // Calcular tiempo de espera (24 horas - tiempo actual + tiempo del primer tren)
      const waitTime = (24 * 60 - currentTimeInMinutes) + tomorrowTimeInMinutes;
      
      return {
        time: firstTrainTomorrow,
        waitTime: waitTime,
        isTomorrow: true
      };
    }
    
    return null;
  };

  // Función para formatear el tiempo de espera
  const formatWaitTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} h`;
    }
    
    return `${hours} h ${remainingMinutes} min`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2" sx={{ my: 2 }}>
        {error}
      </Typography>
    );
  }

  if (!nearestStation) {
    return null;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mt: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Próximos Trenes
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ flex: 1 }}
        >
          <Paper elevation={2} sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h6" gutterBottom>
              A Lemos
            </Typography>
            {nextTrains.a_lemos ? (
              <>
                <Typography variant="h4">
                  {nextTrains.a_lemos.time}
                </Typography>
                <Typography variant="body2">
                  {nextTrains.a_lemos.isTomorrow ? 'Mañana - ' : ''}
                  Espera: {formatWaitTime(nextTrains.a_lemos.waitTime)}
                </Typography>
              </>
            ) : (
              <Typography variant="body1">
                No hay horarios disponibles
              </Typography>
            )}
          </Paper>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ flex: 1 }}
        >
          <Paper elevation={2} sx={{ p: 2, bgcolor: 'secondary.light', color: 'white' }}>
            <Typography variant="h6" gutterBottom>
              A Federico Lacroze
            </Typography>
            {nextTrains.a_lacroze ? (
              <>
                <Typography variant="h4">
                  {nextTrains.a_lacroze.time}
                </Typography>
                <Typography variant="body2">
                  {nextTrains.a_lacroze.isTomorrow ? 'Mañana - ' : ''}
                  Espera: {formatWaitTime(nextTrains.a_lacroze.waitTime)}
                </Typography>
              </>
            ) : (
              <Typography variant="body1">
                No hay horarios disponibles
              </Typography>
            )}
          </Paper>
        </motion.div>
      </Box>
    </Paper>
  );
};

export default NextTrainSchedule;