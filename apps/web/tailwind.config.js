/** Graphite and ink, one saffron accent, green and red for states, in two
 *  themes. The values live in src/index.css as channel triplets; this file
 *  only gives them names. */
const withAlpha = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bricolage Grotesque', 'Georgia', 'serif'],
        sans: ['Public Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: withAlpha('paper'),
        panel: withAlpha('panel'),
        overlay: withAlpha('overlay'),
        ink: withAlpha('ink'),
        muted: withAlpha('muted'),
        line: withAlpha('line'),
        edge: withAlpha('edge'),
        ember: withAlpha('ember'),
        select: withAlpha('select'),
        primary: withAlpha('primary'),
        'on-primary': withAlpha('on-primary'),
        applied: withAlpha('applied'),
        grade: {
          a: withAlpha('grade-a'),
          b: withAlpha('grade-b'),
          c: withAlpha('grade-c'),
          d: withAlpha('grade-d'),
        },
      },
      // A tool read for hours at a time, so the body step is 14 and the jumps
      // are real: nothing between 16 and 20, nothing between 20 and 28. Line
      // heights tighten as the size grows.
      fontSize: {
        xs: ['11px', { lineHeight: '1.45', letterSpacing: '0.01em' }],
        sm: ['12.5px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.55' }],
        md: ['16px', { lineHeight: '1.5' }],
        lg: ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        xl: ['28px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '2xl': ['40px', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      },
      boxShadow: {
        // Two, and no more: one for a surface lifted off the page, one for a
        // thing floating over it. Everything else is a surface step.
        raise: '0 1px 2px rgb(var(--ink) / 0.06)',
        pop: '0 16px 40px rgb(var(--ink) / 0.18)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        ease: 'var(--ease)',
        // The class ease-out: the theme's own arrival curve, in place of
        // Tailwind's stock one.
        out: 'var(--ease-out)',
      },
    },
  },
  plugins: [],
};
