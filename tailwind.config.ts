import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        status: {
          present: '#dcfce7',
          absent: '#fecaca',
          late: '#fef08a',
          leave: '#bfdbfe',
          empty: '#e5e7eb',
        },
      },
      boxShadow: {
        card: '0 18px 40px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
