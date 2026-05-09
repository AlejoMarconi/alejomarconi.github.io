import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddAlarmIcon from '@mui/icons-material/AddAlarm';
import DeleteIcon from '@mui/icons-material/Delete';
import VibrationIcon from '@mui/icons-material/Vibration';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import IosShareIcon from '@mui/icons-material/IosShare';
import { motion } from 'framer-motion';

import useTrainSchedule, { formatWait } from '../hooks/useTrainSchedule';
import useNotificationPermission from '../hooks/useNotificationPermission';
import { computeFireEpoch } from '../hooks/useAlarms';
import { shareAlarmICS } from '../lib/calendar';
import { urquizaColors } from '../theme';

function AlarmEditorDialog({ open, onClose, onSave, defaults, stationName }) {
  const [direction, setDirection] = useState(defaults?.direction || 'a_lemos');
  const [trainTime, setTrainTime] = useState(defaults?.trainTime || '');
  const [minutesBefore, setMinutesBefore] = useState(defaults?.minutesBefore || 5);

  const { aLemos, aLacroze } = useTrainSchedule(stationName, { count: 8 });
  const list = direction === 'a_lemos' ? aLemos : aLacroze;

  // Reset when defaults change (open with a different prefill)
  React.useEffect(() => {
    if (!open) return;
    setDirection(defaults?.direction || 'a_lemos');
    setTrainTime(defaults?.trainTime || '');
    setMinutesBefore(defaults?.minutesBefore || 5);
  }, [open, defaults]);

  const buildAlarm = () => ({
    stationName,
    direction,
    trainTime,
    minutesBefore,
    fireEpoch: computeFireEpoch(trainTime, minutesBefore),
  });

  const submitInApp = () => {
    if (!trainTime) return;
    onSave(buildAlarm());
    onClose();
  };

  const submitToCalendar = async () => {
    if (!trainTime) return;
    const alarm = { id: `tmp-${Date.now()}`, ...buildAlarm() };
    onSave(alarm); // also save in-app for completeness
    await shareAlarmICS(alarm);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nueva alarma</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Estación: <strong>{stationName || '(detectá una primero)'}</strong>
          </Typography>

          <Select
            size="small"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <MenuItem value="a_lemos">A Gral. Lemos</MenuItem>
            <MenuItem value="a_lacroze">A F. Lacroze</MenuItem>
          </Select>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Próximos trenes en esta dirección
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {list.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Sin trenes próximos
                </Typography>
              )}
              {list.map((t) => (
                <Chip
                  key={t.time}
                  size="small"
                  label={`${t.time} · ${formatWait(t.minutesUntil)}`}
                  onClick={() => setTrainTime(t.time)}
                  variant={trainTime === t.time ? 'filled' : 'outlined'}
                  color={trainTime === t.time ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>

          <TextField
            size="small"
            label="Horario del tren (HH:MM)"
            value={trainTime}
            onChange={(e) => setTrainTime(e.target.value)}
            placeholder="06:14"
            inputProps={{ pattern: '[0-2][0-9]:[0-5][0-9]', maxLength: 5 }}
          />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Avisarme {minutesBefore} min antes
            </Typography>
            <Slider
              value={minutesBefore}
              onChange={(_, v) => setMinutesBefore(v)}
              min={1}
              max={20}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
              ]}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={submitInApp} disabled={!trainTime}>
          Solo en la app
        </Button>
        <Button
          onClick={submitToCalendar}
          variant="contained"
          startIcon={<EventAvailableIcon />}
          disabled={!trainTime}
        >
          Guardar + Calendario
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const AlarmsPanel = ({
  alarms,
  addAlarm,
  removeAlarm,
  testAlarm,
  clearFired,
  nearestStation,
  pendingDraft,
  onConsumeDraft,
}) => {
  const stationName = nearestStation?.name;
  const { state: permState, request, isIOS } = useNotificationPermission();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  // If a parent component pre-fills a draft (e.g. from the "+" button on
  // a train card), open the dialog with those defaults.
  React.useEffect(() => {
    if (pendingDraft) {
      setDraft(pendingDraft);
      setDialogOpen(true);
      onConsumeDraft?.();
    }
  }, [pendingDraft, onConsumeDraft]);

  const sortedAlarms = useMemo(
    () => [...alarms].sort((a, b) => a.fireEpoch - b.fireEpoch),
    [alarms],
  );

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
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsActiveIcon sx={{ color: urquizaColors.yellow }} />
          <Typography variant="h3" sx={{ fontSize: '1.05rem' }}>
            Alarmas
          </Typography>
        </Stack>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddAlarmIcon />}
          onClick={() => {
            setDraft(null);
            setDialogOpen(true);
          }}
          disabled={!stationName}
        >
          Nueva
        </Button>
      </Stack>

      {isIOS && (
        <Alert
          severity="info"
          icon={<IosShareIcon />}
          sx={{ mt: 2 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Para que iOS te avise aunque cierres la app: usá "Guardar + Calendario"
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            iOS no permite a las web apps disparar avisos en background después de unos minutos.
            La forma confiable es exportar la alarma al Calendario del iPhone:
            iOS la programa como recordatorio del sistema y suena en pantalla bloqueada
            con vibración aunque la PWA esté cerrada.
          </Typography>
        </Alert>
      )}
      {permState === 'default' && !isIOS && (
        <Alert
          severity="info"
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={request}>
              Permitir
            </Button>
          }
        >
          Activá las notificaciones para recibir el aviso aunque la pestaña esté en segundo plano.
        </Alert>
      )}
      {permState === 'denied' && !isIOS && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Bloqueaste las notificaciones. Habilitalas en la configuración del sitio,
          o usá el botón "Calendario" para que el sistema operativo dispare el aviso.
        </Alert>
      )}
      {permState === 'unsupported' && !isIOS && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Este navegador no soporta notificaciones del sistema. Usá "Guardar + Calendario"
          para agendar el aviso en el calendario del dispositivo.
        </Alert>
      )}

      <List dense sx={{ mt: 1 }}>
        {sortedAlarms.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Sin alarmas. Tocá "Nueva" o el ícono de campana de un tren para crear una.
          </Typography>
        )}
        {sortedAlarms.map((alarm) => {
          const dirLabel = alarm.direction === 'a_lemos' ? 'A Lemos' : 'A Lacroze';
          const fireDate = new Date(alarm.fireEpoch);
          const fireText = fireDate.toLocaleString('es-AR', {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <ListItem
              key={alarm.id}
              sx={{
                bgcolor: urquizaColors.surfaceElevated,
                borderRadius: 2,
                mb: 1,
                border: alarm.fired
                  ? `1px dashed ${urquizaColors.border}`
                  : `1px solid ${urquizaColors.border}`,
                opacity: alarm.fired ? 0.6 : 1,
              }}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    aria-label="Agregar al Calendario del sistema"
                    onClick={() => shareAlarmICS(alarm)}
                    sx={{ color: urquizaColors.yellow }}
                  >
                    <EventAvailableIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Probar alarma"
                    onClick={() => testAlarm(alarm)}
                  >
                    <PlayArrowIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Eliminar alarma"
                    onClick={() => removeAlarm(alarm.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {alarm.stationName}
                    </Typography>
                    <Chip
                      size="small"
                      label={dirLabel}
                      sx={{
                        bgcolor: urquizaColors.yellow,
                        color: '#000',
                        height: 20,
                        fontWeight: 700,
                      }}
                    />
                    {alarm.fired && (
                      <Chip
                        size="small"
                        label="disparada"
                        variant="outlined"
                        sx={{ height: 20 }}
                      />
                    )}
                  </Stack>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    Tren {alarm.trainTime} · avisa {alarm.minutesBefore} min antes ({fireText})
                  </Typography>
                }
              />
            </ListItem>
          );
        })}
      </List>

      {sortedAlarms.some((a) => a.fired) && (
        <Button size="small" onClick={clearFired}>
          Limpiar disparadas
        </Button>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<VibrationIcon />}
          onClick={() => testAlarm()}
        >
          Probar vibración + sonido
        </Button>
      </Stack>

      <AlarmEditorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={addAlarm}
        defaults={draft}
        stationName={stationName}
      />
    </Card>
  );
};

export default AlarmsPanel;
