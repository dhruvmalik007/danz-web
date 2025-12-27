import type { Config } from 'tailwindcss'

// Helper to create color with CSS variable that supports opacity
const withOpacity = (variable: string, fallback: string) => {
  return `rgb(var(--${variable}) / <alpha-value>)`
}

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables with RGB for opacity support
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          alt: 'rgb(var(--color-primary-alt-rgb) / <alpha-value>)',
          purple: '#926f8e',
          pink: '#d25ca7',
          darkPurple: '#4a3548',
          darkerPurple: '#2a1f29',
          lightPurple: '#b89ab5',
        },
        neon: {
          pink: 'rgb(var(--color-neon-pink-rgb) / <alpha-value>)',
          purple: 'rgb(var(--color-neon-purple-rgb) / <alpha-value>)',
          blue: 'rgb(var(--color-neon-blue-rgb) / <alpha-value>)',
        },
        bg: {
          primary: 'rgb(var(--color-bg-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-bg-secondary-rgb) / <alpha-value>)',
          card: 'rgb(var(--color-bg-card-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-bg-hover-rgb) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary':
          'linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-primary-alt-rgb)) 100%)',
        'gradient-neon':
          'linear-gradient(135deg, rgb(var(--color-neon-pink-rgb)) 0%, rgb(var(--color-neon-purple-rgb)) 100%)',
      },
      boxShadow: {
        'glow-pink': '0 0 30px rgb(var(--color-neon-pink-rgb) / 0.5)',
        'glow-purple': '0 0 30px rgb(var(--color-neon-purple-rgb) / 0.5)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.8s ease-out',
        typing: 'typing 3s steps(40) 1s forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}

export default config
