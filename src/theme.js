import { createTheme } from '@mui/material/styles';

// Tren Urquiza dark theme. Yellow is the line's brand color in BA;
// dark surface keeps it readable in sunlight (typical use case: phone
// at the platform). Red is reserved for alerts only.
export const urquizaColors = {
  yellow: '#FFD500',
  yellowSoft: '#FFE54D',
  yellowDeep: '#E8C100',
  red: '#E63946',
  green: '#3FB950',
  background: '#0D1117',
  surface: '#161B22',
  surfaceElevated: '#1C2129',
  border: '#30363D',
  textPrimary: '#F0F6FC',
  textSecondary: '#8B949E',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: urquizaColors.yellow,
      light: urquizaColors.yellowSoft,
      dark: urquizaColors.yellowDeep,
      contrastText: '#000000',
    },
    secondary: {
      main: urquizaColors.red,
      contrastText: '#FFFFFF',
    },
    success: {
      main: urquizaColors.green,
    },
    background: {
      default: urquizaColors.background,
      paper: urquizaColors.surface,
    },
    text: {
      primary: urquizaColors.textPrimary,
      secondary: urquizaColors.textSecondary,
    },
    divider: urquizaColors.border,
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.25rem', fontWeight: 700 },
    h4: { fontSize: '1.1rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${urquizaColors.border}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
        containedPrimary: {
          color: '#000',
          fontWeight: 700,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: `0 0 0 4px ${urquizaColors.yellow}33`,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});

export default theme;
