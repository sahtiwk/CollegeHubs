/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        linkedinBg: '#f3f2ef',
        linkedinBlue: '#0a66c2',
      },
      boxShadow: {
        'aura-glow': '0 0 30px rgba(234,179,8,0.35)',
      },
      backgroundImage: {
        'aura-gradient': 'linear-gradient(135deg, #f59e0b, #e879f9, #4f46e5)',
      },
    },
  },
  plugins: [],
};

