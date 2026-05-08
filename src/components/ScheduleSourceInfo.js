import React from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';

import metadata from '../data/scheduleMetadata.json';
import { urquizaColors } from '../theme';

function formatVigencia(meta) {
  if (meta.vigencia_text) return meta.vigencia_text;
  if (meta.vigencia_date) return `Vigente desde ${meta.vigencia_date}`;
  return null;
}

function formatFetched(meta) {
  if (!meta.fetched_at) return null;
  const d = new Date(meta.fetched_at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const ScheduleSourceInfo = () => {
  const vigencia = formatVigencia(metadata);
  const fetched = formatFetched(metadata);
  const url = metadata.source_url;
  const file = metadata.source_filename;

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        border: `1px solid ${urquizaColors.border}`,
        bgcolor: urquizaColors.surface,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <VerifiedIcon sx={{ color: urquizaColors.yellow, fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Horarios oficiales de Metrovias
        </Typography>
      </Stack>
      {vigencia && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {vigencia}
        </Typography>
      )}
      {(url || file) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Archivo:{' '}
          {url ? (
            <Link href={url} target="_blank" rel="noopener noreferrer" color="primary">
              {file || url}
            </Link>
          ) : (
            file
          )}
        </Typography>
      )}
      {fetched && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Última verificación automática: {fetched}
        </Typography>
      )}
    </Box>
  );
};

export default ScheduleSourceInfo;
