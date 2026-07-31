import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

const unionJackDarkTheme = {
  dark: true,
  colors: {
    background: '#0B132B',       // Deep Royal Navy Dark Background
    surface: '#1C2541',          // Slate Royal Navy Card Surface
    'surface-variant': '#2E3A59',
    primary: '#4A90E2',          // Regal British Royal Blue
    'primary-darken-1': '#2C5282',
    secondary: '#CF142B',        // Union Jack Crimson Red
    'secondary-darken-1': '#A61022',
    error: '#CF142B',            // Union Jack Red for Exceeded
    info: '#64B5F6',             // Soft Ice Blue accent
    success: '#10B981',          // Emerald Green for compliance
    warning: '#F59E0B',          // Amber Warning
    'on-background': '#F8FAFC',
    'on-surface': '#F8FAFC',
  },
}

const unionJackLightTheme = {
  dark: false,
  colors: {
    background: '#F4F6F9',       // Clean Off-White Background
    surface: '#FFFFFF',          // Pure White Surface
    'surface-variant': '#E2E8F0',
    primary: '#012169',          // Official Union Jack Pantone 280 C Royal Navy Blue
    'primary-darken-1': '#001440',
    secondary: '#C8102E',        // Official Union Jack Pantone 186 C Crimson Red
    'secondary-darken-1': '#9E0B22',
    error: '#C8102E',            // Official Union Jack Red for Exceeded
    info: '#0284C7',
    success: '#059669',
    warning: '#D97706',
    'on-background': '#0B132B',
    'on-surface': '#0B132B',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      dark: unionJackDarkTheme,
      light: unionJackLightTheme,
    },
  },
})
