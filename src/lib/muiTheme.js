import { createTheme } from '@mui/material/styles';

// Mirrors the exact values in src/styles/global.css — MUI has its own
// separate theming system that doesn't read CSS custom properties, so
// without this, MUI components (Button, TextField, Select, Switch, Tabs...)
// silently fall back to MUI's own default blue palette regardless of which
// theme is active. Keep these values in sync with global.css by hand;
// there's no automatic link between the two systems.
const PALETTES = {
  light: {
    primary: '#2563EB',
    primaryHover: '#1D4EDB',
    bg: '#F8FAFC',
    paper: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
  },
  dark: {
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    bg: '#0B0F1A',
    paper: '#111827',
    text: '#F8FAFC',
    textSecondary: '#94A3BB',
    border: '#334155',
  },
};

export function buildMuiTheme(dark) {
  const p = dark ? PALETTES.dark : PALETTES.light;
  return createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: p.primary, dark: p.primaryHover },
      background: { default: p.bg, paper: p.paper },
      text: { primary: p.text, secondary: p.textSecondary },
      divider: p.border,
    },
    typography: {
      fontFamily: "'Nunito', sans-serif",
    },
    shape: { borderRadius: 8 },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTableCell: { styleOverrides: { root: { borderColor: p.border } } },
    },
  });
}
