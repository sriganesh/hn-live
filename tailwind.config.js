/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.1s ease-in-out',
      },
      fontFamily: {
        'jetbrains': ['JetBrains Mono', 'monospace'],
        'fira': ['Fira Code', 'monospace'],
        'source': ['Source Code Pro', 'monospace'],
        'system': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      }
    },
  },
  plugins: [],
} 