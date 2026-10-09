/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidade VR Software (vrsoft.com.br): laranja #FF7200 + cinzas neutros (#4D4D4D, #F3F3F3).
        // 500 é o laranja da marca; 600 é o laranja do logo, usado em botões (melhor contraste com branco).
        vr: {
          50:  '#fff6ed',
          100: '#ffead4',
          200: '#ffd0a8',
          300: '#ffad70',
          400: '#ff8d38',
          500: '#ff7200',
          600: '#ea5b0c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['"Montserrat Variable"', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 16px rgb(0 0 0 / 0.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        'slide-in-right': { from: { transform: 'translateX(32px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
      },
    },
  },
  plugins: [],
}
