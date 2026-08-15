import type { Config } from 'tailwindcss';

/**
 * Ledger & Co. design tokens.
 *
 * Loaded by Tailwind v4 through the `@config` directive in src/styles/global.css.
 * `colors`, `fontFamily` and `fontSize` are *replaced* rather than extended, so the
 * stock Tailwind palette and type ramp are unavailable by design — every utility in
 * the markup has to resolve to a token that lives in this file.
 */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#FFFFFF',
      black: '#000000',

      // Primary brand navy. `soft`/`muted` are for secondary text and rules,
      // tuned to stay legible on `paper` rather than being a generated ramp.
      ink: {
        DEFAULT: '#12203A',
        soft: '#2A3A57',
        muted: '#5A6780',
      },

      // Warm off-white ground. `warm` is for banded sections, `bright` for cards
      // that need to lift off the page without going pure white.
      paper: {
        DEFAULT: '#F6F3EC',
        warm: '#EDE8DD',
        bright: '#FDFCF9',
      },

      // Accent. `deep` is the only variant that clears 4.5:1 on paper for body-size
      // text — DEFAULT is reserved for large type, rules and fills.
      amber: {
        DEFAULT: '#C4682B',
        deep: '#9E5220',
        soft: '#E4A579',
      },
    },

    // Fluid ramp: each step interpolates between its min and max across a
    // 320px–1280px viewport, so no type-specific breakpoints are needed.
    fontSize: {
      xs: ['clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)', { lineHeight: '1.5' }],
      sm: ['clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem)', { lineHeight: '1.55' }],
      base: ['clamp(1rem, 0.95rem + 0.25vw, 1.125rem)', { lineHeight: '1.65' }],
      lg: ['clamp(1.125rem, 1.05rem + 0.38vw, 1.375rem)', { lineHeight: '1.55' }],
      xl: ['clamp(1.375rem, 1.25rem + 0.6vw, 1.75rem)', { lineHeight: '1.4' }],
      '2xl': ['clamp(1.625rem, 1.4rem + 1.1vw, 2.25rem)', { lineHeight: '1.3' }],
      '3xl': ['clamp(2rem, 1.6rem + 1.9vw, 3rem)', { lineHeight: '1.2' }],
      '4xl': ['clamp(2.5rem, 1.9rem + 2.9vw, 4rem)', { lineHeight: '1.1' }],
      '5xl': ['clamp(3rem, 2.1rem + 4.4vw, 5.25rem)', { lineHeight: '1.05' }],
      '6xl': ['clamp(3.5rem, 2.2rem + 6.4vw, 7rem)', { lineHeight: '1' }],
    },

    fontFamily: {
      display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'Times New Roman', 'serif'],
      sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
    },

    extend: {
      letterSpacing: {
        // Fraunces at display sizes needs negative tracking to hold together.
        display: '-0.02em',
        eyebrow: '0.12em',
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
} satisfies Config;
