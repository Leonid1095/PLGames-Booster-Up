import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6C63FF',
          light: '#8B83FF',
          dark: '#5A52E0',
        },
        accent: {
          cyan: '#00D4FF',
          green: '#00FF94',
          orange: '#FF6B35',
        },
        surface: {
          bg: '#0A0A14',
          card: '#12121F',
          'card-hover': '#1A1A2E',
          border: '#1E1E32',
          hover: '#252538',
        },
        text: {
          primary: '#E8E8F0',
          secondary: '#9999AA',
          muted: '#666680',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(108,99,255,0.15), transparent)',
      },
    },
  },
  plugins: [],
};

export default config;
