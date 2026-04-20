import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}', './src/lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1720',
        slate: '#f4efe7',
        sand: '#d7c7af',
        rust: '#8b3a26',
        moss: '#34533d',
        cloud: '#fffaf2',
      },
      boxShadow: {
        panel: '0 18px 60px rgba(15, 23, 32, 0.12)',
      },
      borderRadius: {
        xl: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
