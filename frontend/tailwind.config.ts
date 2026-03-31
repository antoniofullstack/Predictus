import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0faf5',
          100: '#dcf5e7',
          200: '#bbead1',
          300: '#8dd9b2',
          400: '#5ac48e',
          500: '#45A874',
          600: '#37865D',
          700: '#2b6f4c',
          800: '#25593f',
          900: '#0E1612',
        },
      },
    },
  },
  plugins: [],
};
export default config;
