import { useCallback, useState, useEffect, useRef } from 'react';
import { stations } from '../data/stations';

const useStationDetector = ({ setCurrentLocation, setNearestStation, setError, setLoading }) => {
  const [permissionState, setPermissionState] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [continuousTracking, setContinuousTracking] = useState(false);
  const watchIdRef = useRef(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Verificar el estado de los permisos al montar el componente
  useEffect(() => {
    checkPermissionState();
    
    // Cleanup function to clear any active watchers when component unmounts
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

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
    const distance = R * c;
    return distance;
  };

  // Función para encontrar la estación más cercana
  const findNearestStation = (latitude, longitude) => {
    let nearestStation = null;
    let minDistance = Infinity;
    let allDistances = {};

    // Calcular la distancia a cada estación
    for (const station of stations) {
      // Extract latitude and longitude from the station array
      const stationLat = station[0];
      const stationLon = station[1];
      const stationName = station[2];
      
      const distance = calculateDistance(
        latitude, 
        longitude, 
        stationLat, 
        stationLon
      );
      
      allDistances[stationName] = distance.toFixed(3);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = {
          name: stationName,
          coordinates: {
            latitude: stationLat,
            longitude: stationLon
          },
          // Add scheduleKey to match with trainSchedules.json
          // Normalize the station name to match the keys in trainSchedules.json
          scheduleKey: stationName
        };
      }
    }

    // Guardar información de depuración
    setDebugInfo({
      userCoordinates: { latitude, longitude },
      allDistances,
      nearestStationName: nearestStation?.name,
      nearestStationDistance: minDistance.toFixed(3)
    });

    console.log('Debug - Coordenadas del usuario:', { latitude, longitude });
    console.log('Debug - Distancias a todas las estaciones:', allDistances);
    console.log('Debug - Estación más cercana:', nearestStation?.name);
    console.log('Debug - Distancia a la estación más cercana:', minDistance.toFixed(3), 'km');

    return { station: nearestStation, distance: minDistance };
  };

  // Función para verificar el estado de los permisos
  const checkPermissionState = async () => {
    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      setError('La geolocalización no está disponible en este navegador.');
      return;
    }

    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionState(permissionStatus.state);
      
      // Log del estado de permisos
      console.log('Debug - Estado de permisos de geolocalización:', permissionStatus.state);
      
      permissionStatus.onchange = () => {
        setPermissionState(permissionStatus.state);
        console.log('Debug - Cambio en permisos de geolocalización:', permissionStatus.state);
      };
    } catch (error) {
      console.error('Error al verificar permisos:', error);
      // En algunos navegadores, especialmente móviles, la API de permisos puede no estar disponible
      // En ese caso, intentamos obtener la ubicación directamente
      detectStation();
    }
  };

  // Función principal para detectar la estación
  const detectStation = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttemptCount(prev => prev + 1);
    
    console.log('Debug - Intentando detectar estación...');

    if (!navigator.geolocation) {
      setLoading(false);
      setError('La geolocalización no está disponible en este navegador.');
      console.log('Debug - Geolocalización no disponible');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        
        console.log('Debug - Posición obtenida:', { latitude, longitude });
        
        const { station, distance } = findNearestStation(latitude, longitude);
        
        if (station) {
          console.log('Debug - Estación encontrada:', station.name, 'en trainSchedules.json como:', station.scheduleKey);
          setNearestStation({ ...station, distance });
        } else {
          console.log('Debug - No se encontró ninguna estación cercana');
          setError('No se pudo determinar la estación más cercana.');
        }
        
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        console.error('Error de geolocalización:', error);
        console.log('Debug - Error de geolocalización:', error.code, error.message);
        
        let errorMessage = 'Error al obtener la ubicación.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, habilita la ubicación en tu dispositivo y navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'La información de ubicación no está disponible. Verifica que el GPS esté activado.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Se agotó el tiempo para obtener la ubicación. Inténtalo de nuevo.';
            break;
          default:
            errorMessage = `Error al obtener la ubicación: ${error.message}`;
        }
        
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [setCurrentLocation, setNearestStation, setError, setLoading]);

  // Función para forzar la solicitud de permisos
  const forcePermissionRequest = useCallback(() => {
    console.log('Debug - Forzando solicitud de permisos');
    detectStation();
  }, [detectStation]);

  // Iniciar seguimiento continuo
  const startContinuousTracking = useCallback(() => {
    console.log('Debug - Iniciando seguimiento continuo');
    setContinuousTracking(true);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        
        console.log('Debug - Actualización de posición:', { latitude, longitude });
        
        const { station, distance } = findNearestStation(latitude, longitude);
        
        if (station) {
          console.log('Debug - Estación actualizada:', station.name);
          setNearestStation({ ...station, distance });
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error en seguimiento continuo:', error);
        console.log('Debug - Error en seguimiento continuo:', error.code, error.message);
        // No establecemos error para no interrumpir la experiencia
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [setCurrentLocation, setNearestStation, setLoading]);

  // Detener seguimiento continuo
  const stopContinuousTracking = useCallback(() => {
    console.log('Debug - Deteniendo seguimiento continuo');
    setContinuousTracking(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  return { 
    detectStation, 
    forcePermissionRequest, 
    permissionState, 
    attemptCount, 
    continuousTracking,
    startContinuousTracking,
    stopContinuousTracking,
    debugInfo
  };
};

export default useStationDetector;
