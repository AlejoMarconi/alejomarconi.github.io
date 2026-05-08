import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import NotificationAddIcon from '@mui/icons-material/NotificationAdd';
import TrainIcon from '@mui/icons-material/Train';
import { motion } from 'framer-motion';

import useTrainSchedule, { formatWait } from '../hooks/useTrainSchedule';
import { urquizaColors } from '../theme';

const DIRECTION_LABEL = {
  a_lemos: 'A Gral. Lemos',
  a_lacroze: 'A F. Lacroze',
};

function CountdownChip({ minutes }) {
  let color = 'default';
  if (minutes != null) {
    if (minutes <= 1) color = 'error';
    else if (minutes <= 5) color = 'warning';
    else color = 'success';
  }
  return (
    <Chip
      size="small"
      color={color === 'default' ? undefined : color}
      label={minutes == null ? '--' : `en ${formatWait(minutes)}`}
      sx={{ fontWeight: 700 }}
    />
  );
}

function DirectionCard({ direction, trains, onAddAlarm, stationName }) {
  const next = trains[0];
  const upcoming = trains.slice(1);

  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        flex: 1,
        bgcolor: urquizaColors.surface,
        borderRadius: 3,
        border: `1px solid ${urquizaColors.border}`,
        overflow: 'visible',
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 8,
                height: 24,
                borderRadius: 1,
                bgcolor: urquizaColors.yellow,
              }}
            />
            <Typography variant="overline" color="text.secondary">
              {DIRECTION_LABEL[direction]}
            </Typography>
          </Stack>
          {next && (
            <IconButton
              size="small"
              aria-label="Crear alarma para este tren"
              onClick={() =>
                onAddAlarm({
                  stationName,
                  direction,
                  trainTime: next.time,
                })
              }
              sx={{ color: urquizaColors.yellow }}
            >
              <NotificationAddIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {next ? (
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="baseline" spacing={1.5}>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Roboto Mono", "SF Mono", monospace',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: urquizaColors.yellow,
                  fontSize: { xs: '2.5rem', sm: '3rem' },
                  lineHeight: 1,
                }}
              >
                {next.time}
              </Typography>
              <CountdownChip minutes={next.minutesUntil} />
            </Stack>
            {next.isTomorrow && (
              <Typography variant="caption" color="text.secondary">
                Mañana
              </Typography>
            )}
            {upcoming.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Después
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                  {upcoming.map((t) => (
                    <Chip
                      key={t.time}
                      size="small"
                      variant="outlined"
                      icon={<TrainIcon sx={{ fontSize: 14 }} />}
                      label={`${t.time} · ${formatWait(t.minutesUntil)}`}
                      sx={{
                        borderColor: urquizaColors.border,
                        color: urquizaColors.textSecondary,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Sin trenes próximos
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const NextTrainSchedule = ({ nearestStation, onAddAlarm }) => {
  // 1-second tick lets the countdown stay live without recomputing the
  // time list (the hook itself rebuilds every 30s).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const stationName = nearestStation?.name;
  const { available, aLemos, aLacroze } = useTrainSchedule(stationName, { count: 4 });

  if (!stationName) return null;

  if (!available) {
    return (
      <Card sx={{ p: 3, bgcolor: urquizaColors.surface }}>
        <Typography color="error">
          No se encontraron horarios para {stationName}.
        </Typography>
      </Card>
    );
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DirectionCard
          direction="a_lemos"
          trains={aLemos}
          onAddAlarm={onAddAlarm}
          stationName={stationName}
        />
        <DirectionCard
          direction="a_lacroze"
          trains={aLacroze}
          onAddAlarm={onAddAlarm}
          stationName={stationName}
        />
      </Stack>
    </Box>
  );
};

export default NextTrainSchedule;
