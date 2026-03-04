/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg:       '#050a18',
          darker:   '#0a1628',
          dark:     '#0f1f3a',
          glass:    'rgba(10,22,40,0.65)',
          cyan:     '#00f0ff',
          magenta:  '#bf00ff',
          green:    '#00ff88',
          amber:    '#ffaa00',
          red:      '#ff003c',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        mono:     ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
