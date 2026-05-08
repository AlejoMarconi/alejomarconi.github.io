import React, { useState } from 'react';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  useMediaQuery,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import theme, { urquizaColors } from './theme';
import Header from './components/Header';
import Footer from './components/Footer';
import StationDetector from './components/StationDetector';
import NextTrainSchedule from './components/NextTrainSchedule';
import StationMap from './components/StationMap';
import AlarmsPanel from './components/AlarmsPanel';
import ScheduleSourceInfo from './components/ScheduleSourceInfo';
import useAlarms from './hooks/useAlarms';

const TABS = { HOME: 'home', MAP: 'map', ALARMS: 'alarms' };

function MobileLayout({
  detectorProps,
  nearestStation,
  currentLocation,
  alarmsApi,
  pendingDraft,
  onConsumeDraft,
  onAddAlarmShortcut,
}) {
  const [tab, setTab] = useState(TABS.HOME);

  return (
    <>
      <Box sx={{ pb: 9 }}>
        {tab === TABS.HOME && (
          <Stack spacing={2}>
            <StationDetector {...detectorProps} />
            {nearestStation && (
              <NextTrainSchedule
                nearestStation={nearestStation}
                onAddAlarm={(d) => {
                  onAddAlarmShortcut(d);
                  setTab(TABS.ALARMS);
                }}
              />
            )}
            <ScheduleSourceInfo />
          </Stack>
        )}
        {tab === TABS.MAP && (
          <StationMap
            currentLocation={currentLocation}
            nearestStation={nearestStation}
            height={'calc(100vh - 220px)'}
          />
        )}
        {tab === TABS.ALARMS && (
          <AlarmsPanel
            {...alarmsApi}
            nearestStation={nearestStation}
            pendingDraft={pendingDraft}
            onConsumeDraft={onConsumeDraft}
          />
        )}
      </Box>

      <BottomNavigation
        value={tab}
        onChange={(_, v) => setTab(v)}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: urquizaColors.surface,
          borderTop: `1px solid ${urquizaColors.border}`,
          zIndex: 1300,
          '& .Mui-selected': { color: urquizaColors.yellow },
        }}
      >
        <BottomNavigationAction value={TABS.HOME} label="Mi tren" icon={<HomeIcon />} />
        <BottomNavigationAction value={TABS.MAP} label="Mapa" icon={<MapIcon />} />
        <BottomNavigationAction
          value={TABS.ALARMS}
          label={`Alarmas${alarmsApi.alarms.filter((a) => !a.fired).length ? ` (${alarmsApi.alarms.filter((a) => !a.fired).length})` : ''}`}
          icon={<NotificationsActiveIcon />}
        />
      </BottomNavigation>
    </>
  );
}

function DesktopLayout({
  detectorProps,
  nearestStation,
  currentLocation,
  alarmsApi,
  pendingDraft,
  onConsumeDraft,
  onAddAlarmShortcut,
}) {
  return (
    <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
      <Stack spacing={2} sx={{ width: 360, flexShrink: 0 }}>
        <StationDetector {...detectorProps} />
        <AlarmsPanel
          {...alarmsApi}
          nearestStation={nearestStation}
          pendingDraft={pendingDraft}
          onConsumeDraft={onConsumeDraft}
        />
        <ScheduleSourceInfo />
      </Stack>

      <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
        {nearestStation && (
          <NextTrainSchedule nearestStation={nearestStation} onAddAlarm={onAddAlarmShortcut} />
        )}
        <StationMap currentLocation={currentLocation} nearestStation={nearestStation} height={520} />
      </Stack>
    </Stack>
  );
}

function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearestStation, setNearestStation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  const alarmsApi = useAlarms();

  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const detectorProps = {
    setCurrentLocation,
    setNearestStation,
    setError,
    setLoading,
    loading,
    error,
    nearestStation,
  };

  const handleAddAlarmShortcut = (draft) => setPendingDraft(draft);
  const consumeDraft = () => setPendingDraft(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header />
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        {isDesktop ? (
          <DesktopLayout
            detectorProps={detectorProps}
            nearestStation={nearestStation}
            currentLocation={currentLocation}
            alarmsApi={alarmsApi}
            pendingDraft={pendingDraft}
            onConsumeDraft={consumeDraft}
            onAddAlarmShortcut={handleAddAlarmShortcut}
          />
        ) : (
          <MobileLayout
            detectorProps={detectorProps}
            nearestStation={nearestStation}
            currentLocation={currentLocation}
            alarmsApi={alarmsApi}
            pendingDraft={pendingDraft}
            onConsumeDraft={consumeDraft}
            onAddAlarmShortcut={handleAddAlarmShortcut}
          />
        )}
        <Footer />
      </Container>
    </ThemeProvider>
  );
}

export default App;
