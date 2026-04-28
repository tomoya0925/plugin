/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#00d1b6",
        "on-primary": "#ffffff",
        "background": "#f8fafc",
        "surface": "#ffffff",
        "surface-variant": "#f1f5f9",
        "on-surface": "#0f172a",
        "on-surface-variant": "#64748b",
        "outline": "#e2e8f0",
        "outline-variant": "#cbd5e1",
        "accent-lime": "#84cc16",
        "accent-purple": "#a855f7",
        "accent-orange": "#f97316",
        "accent-blue": "#3b82f6"
      },
      spacing: {
        "gutter": "16px",
        "stack-lg": "32px",
        "stack-md": "16px",
        "stack-sm": "8px",
        "unit": "8px",
        "container-padding": "24px"
      }
    },
  },
  plugins: [],
}