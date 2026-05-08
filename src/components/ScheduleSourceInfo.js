import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import metadata from '../data/scheduleMetadata.json';

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
        mt: 4,
        mb: 2,
        p: 1.5,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
      }}
    >
      <Typography variant="caption" color="text.secondary" component="div">
        Horarios oficiales de Metrovias
        {vigencia ? ` - ${vigencia}` : ''}
      </Typography>
      {(url || file) && (
        <Typography variant="caption" color="text.secondary" component="div">
          Fuente:{' '}
          {url ? (
            <Link href={url} target="_blank" rel="noopener noreferrer">
              {file || url}
            </Link>
          ) : (
            file
          )}
        </Typography>
      )}
      {fetched && (
        <Typography variant="caption" color="text.secondary" component="div">
          Última actualización del archivo: {fetched}
        </Typography>
      )}
    </Box>
  );
};

export default ScheduleSourceInfo;
