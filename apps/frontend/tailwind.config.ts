import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}', './src/lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1C22',
        'ink-90': '#2A2D35',
        'ink-70': '#4A4D55',
        slate: '#4A5568',
        'slate-60': '#6B7380',
        'slate-30': '#A8AEB8',
        sand: '#F0EAD6',
        'sand-deep': '#E6DEC3',
        'sand-deeper': '#D9CFAE',
        cloud: '#F8F9FA',
        paper: '#FBFAF5',
        rust: '#B73A2B',
        'rust-bg': '#F4DAD4',
        orange: '#C4601F',
        'orange-bg': '#F4E1CF',
        amber: '#B58400',
        'amber-bg': '#F2E6BE',
        moss: '#2E7D32',
        'moss-bg': '#D6E7D3',
        hairline: '#D4CBA8',
        'hairline-strong': '#B8AE85',
      },
      fontFamily: {
        sans: ["'Instrument Sans'", 'sans-serif'],
        serif: ["'Instrument Serif'", 'serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
