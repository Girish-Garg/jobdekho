/** Editorial-minimal palette: warm ink on paper, one ember accent. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bricolage Grotesque', 'Georgia', 'serif'],
        sans: ['Public Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: '#f7f4ee',
        ink: '#1a1815',
        muted: '#6f6a60',
        line: '#e2ddd2',
        panel: '#fffdf8',
        ember: '#b8430f',
      },
    },
  },
  plugins: [],
};
