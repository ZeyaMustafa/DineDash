/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                borderRadius: {
                        lg: '0.75rem',
                        md: 'calc(0.75rem - 2px)',
                        sm: 'calc(0.75rem - 4px)'
                },
                colors: {
                        background: '#F4E1D2',
                        foreground: '#2B1C10',
                        card: {
                                DEFAULT: '#E1D4C1',
                                foreground: '#2B1C10'
                        },
                        popover: {
                                DEFAULT: '#E1D4C1',
                                foreground: '#2B1C10'
                        },
                        primary: {
                                DEFAULT: '#6E493A',
                                foreground: '#FFFFFF'
                        },
                        secondary: {
                                DEFAULT: '#987284',
                                foreground: '#FFFFFF'
                        },
                        muted: {
                                DEFAULT: '#E1D4C1',
                                foreground: '#2B1C10'
                        },
                        accent: {
                                DEFAULT: '#987284',
                                foreground: '#FFFFFF'
                        },
                        destructive: {
                                DEFAULT: '#DC2626',
                                foreground: '#FFFFFF'
                        },
                        border: '#D4C4B0',
                        input: '#E1D4C1',
                        ring: '#6E493A',
                        success: '#4D7C0F',
                        warning: '#F59E0B',
                        error: '#DC2626',
                        info: '#0284C7'
                },
                fontFamily: {
                        heading: ['Playfair Display', 'serif'],
                        body: ['Manrope', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace']
                },
                boxShadow: {
                        card: '0 4px 20px -2px rgba(110, 73, 58, 0.08)',
                        hover: '0 10px 40px -10px rgba(110, 73, 58, 0.15)',
                        dropdown: '0 10px 30px -5px rgba(110, 73, 58, 0.12)'
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};