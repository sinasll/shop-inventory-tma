/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Telegram theme variables wired to Tailwind for native feel.
        tg: {
          bg: 'var(--tg-bg, #ffffff)',
          'bg-secondary': 'var(--tg-secondary-bg, #f1f1f4)',
          text: 'var(--tg-text, #0f1115)',
          hint: 'var(--tg-hint, #707991)',
          link: 'var(--tg-link, #2f7fd6)',
          button: 'var(--tg-button, #2f7fd6)',
          'button-text': 'var(--tg-button-text, #ffffff)',
        },
        brand: {
          50: '#eef6ff', 100: '#d9ebff', 200: '#bcdcff', 300: '#8ec6ff',
          400: '#59a6ff', 500: '#2f7fd6', 600: '#1f63b8', 700: '#1b4f95',
          800: '#1c447a', 900: '#1c3b66',
        },
        danger: { soft: '#fee2e2', DEFAULT: '#dc2626', dark: '#991b1b' },
        warn: { soft: '#fef3c7', DEFAULT: '#d97706', dark: '#92400e' },
        ok: { soft: '#dcfce7', DEFAULT: '#16a34a', dark: '#166534' },
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)',
        pop: '0 10px 30px rgba(16,24,40,.18)',
      },
      keyframes: {
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.5' } },
      },
      animation: {
        'slide-up': 'slide-up .22s ease-out',
        'fade-in': 'fade-in .18s ease-out',
        pulse2: 'pulse2 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
