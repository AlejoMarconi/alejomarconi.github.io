import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box } from '@mui/material';
import Header from './components/Header';
import StationDetector from './components/StationDetector';
import StationMap from './components/StationMap';
import InfoSection from './components/InfoSection';
import Footer from './components/Footer';
import NextTrainSchedule from './components/NextTrainSchedule';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3498db',
    },
    secondary: {
      main: '#2c3e50',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#2c3e50',
    },
    h2: {
      fontSize: '1.8rem',
      fontWeight: 600,
      color: '#3498db',
    },
  },
});

function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearestStation, setNearestStation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Header />
          <StationDetector 
            setCurrentLocation={setCurrentLocation}
            setNearestStation={setNearestStation}
            setError={setError}
            setLoading={setLoading}
            loading={loading}
            error={error}
            nearestStation={nearestStation}
          />
          
          {nearestStation && (
            <>
              <NextTrainSchedule nearestStation={nearestStation} />
              <StationMap 
                currentLocation={currentLocation} 
                nearestStation={nearestStation} 
              />
            </>
          )}
          
          <Footer />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;