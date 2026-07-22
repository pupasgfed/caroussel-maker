/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charte Carrousel Maker
        app: {
          base: '#323347',
          panel: '#4a4b65',
          accent: '#aaa8f8',
          ink: '#ffffff',
        },
      },
      fontFamily: {
        spartan: ['"League Spartan"', 'system-ui', 'sans-serif'],
        nunito: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        madimi: ['"Madimi One"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '12': '12px',
      },
    },
  },
  plugins: [],
};
