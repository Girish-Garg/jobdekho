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
        // Seniority is an ordered ladder, so its colours are one ramp rather
        // than six categorical hues: lightness falls by a fixed step at every
        // rung, which keeps the order readable in greyscale and to a dichromat
        // even when the hues collapse. Every rung clears 4.5:1 on paper, and
        // the arc stops short of ember's orange so "new today" stays its own.
        level: {
          internship: '#4b7756',
          entry: '#0b6d6c',
          mid: '#185a85',
          senior: '#603e66',
          staff: '#613040',
          executive: '#492f1b',
        },
      },
    },
  },
  plugins: [],
};
