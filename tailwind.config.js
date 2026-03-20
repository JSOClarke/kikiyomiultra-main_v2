/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        'surface-active': 'var(--surface-active)',
        primary: 'var(--primary)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-active': 'var(--text-active)',
        sec: 'var(--sec)',
        warn: 'var(--warn)',
        border: 'var(--border)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      fontFamily: {
        ui: 'var(--font-ui)',
        reader: 'var(--font-reader)',
      }
    },
  },
  plugins: [],
}
