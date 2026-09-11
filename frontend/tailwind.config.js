/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ground: UCLA Darkest Blue (PANTONE 302C)
        ink: '#003B5C',        // page
        panel: '#004464',      // surfaces, lifted a hair off the ground
        raised: '#005679',     // hover
        sunken: '#002A42',     // inputs, media wells
        abyss: '#00121D',      // text on accent fills + modal scrims
        line: '#14688F',       // hairlines
        edge: '#2A86B0',       // stronger hairlines
        chalk: '#EAF4FB',      // primary text
        ash: '#B6D3E4',        // secondary text
        dim: '#92B8CE',        // tertiary text
        // Accent: yellow carries price, CTA and active state
        sun: {
          DEFAULT: '#FFD60A',
          deep: '#DDB800',
          soft: '#FFE97A',
        },
        // Royal blue reads by hue against the teal ground, so keep it
        // to fills and pair the lighter tint with abyss text.
        royal: {
          DEFAULT: '#2E50F5',
          light: '#6C86FF',
          deep: '#1A2FA8',
        },
        ember: '#FF5A45',
        mint: '#3BD9A4',
      },
      fontFamily: {
        sans: ['Archivo', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        meta: '0.18em',
        wide2: '0.28em',
      },
      keyframes: {
        marquee: { to: { transform: 'translateX(-50%)' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: { to: { transform: 'translateX(100%)' } },
        sweep: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        blip: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.15' },
        },
        scan: {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(400%)' },
        },
      },
      animation: {
        rise: 'rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        blip: 'blip 1.6s ease-in-out infinite',
        scan: 'scan 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
