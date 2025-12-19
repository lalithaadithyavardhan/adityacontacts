import { DefaultTheme } from 'react-native-paper';

// Eye-droppered colors from the brand image
const BRAND_ORANGE = '#F05819'; // The primary vibrant orange
const BRAND_BLUE = '#0D47A1';   // The secondary deep blue

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    
    // --- Primary Brand Colors ---
    primary: BRAND_ORANGE,   // Main color for headers, buttons, active tints
    accent: BRAND_BLUE,        // Accent color for highlights or secondary actions

    // --- Light Theme Backgrounds ---
    background: '#FFFFFF',     // App background is now pure white
    surface: '#F8F9FA',       // A very light grey for cards/surfaces to stand out
    card: '#FFFFFF',           // Cards can be white, we'll use shadows for separation

    // --- Light Theme Text ---
    text: '#333333',           // Main text is now a dark grey for readability
    textSecondary: '#666666', // Lighter grey for subtitles and less important text
    
    // --- Other UI Elements ---
    divider: '#E0E0E0',        // Light grey for dividers
    placeholder: '#B0B0B0',
    
    // --- Standard Colors ---
    error: '#B00020',
    success: '#4CAF50',
    warning: '#FF9800',
    info: BRAND_BLUE,
  },
  roundness: 12, // Slightly more rounded corners for a modern feel
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
  },
};
