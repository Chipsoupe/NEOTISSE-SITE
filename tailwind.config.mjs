/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brown: '#2a211b',
        panel: '#362b22',
        gold: '#d9aa3d',
        cream: '#f5efe3',
        paper: '#e9e3d7',
      },
      fontFamily: {
        serif: ['Gloock', 'Georgia', 'serif'],
        sans: ['Inter', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
