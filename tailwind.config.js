/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  /**
   * Класовете на бутоните и клетките в модул „Дневник" се сглобяват динамично
   * (`db-${tone}`, `dn-${tone}`), затова Tailwind не ги вижда в кода и ги
   * изчиства. Тук са изброени изрично, за да оцелеят след билда.
   */
  safelist: [
    'db-teal', 'db-green', 'db-blue', 'db-purple', 'db-red', 'db-gold',
    'dn-olive', 'dn-salmon', 'dn-green', 'dn-zero',
    'dt', 'dt-on', 'dt-c', 'dt-c0',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec5ff',
          400: '#59a4ff',
          500: '#3282fb',
          600: '#1c62f0',
          700: '#154cdc',
          800: '#183fb2',
          900: '#19398c',
          950: '#142455',
        },
        ink: {
          900: '#0f1c33',
          800: '#16233d',
          700: '#22314f',
          600: '#3a4a68',
          500: '#5b6b88',
          400: '#8593ab',
          300: '#aab5c8',
          200: '#d3dae5',
          100: '#e9eef5',
          50: '#f5f8fc',
        },
        ok: '#1f9d55',
        warn: '#d9822b',
        danger: '#d64545',
        accent: '#7b3ff2',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,28,51,.06), 0 4px 14px rgba(15,28,51,.06)',
        pop: '0 10px 40px rgba(15,28,51,.18)',
      },
    },
  },
  plugins: [],
}
