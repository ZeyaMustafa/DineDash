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
                        background: '#FDFBF7',
                        foreground: '#1A1A1A',
                        card: {
                                DEFAULT: '#FFFFFF',
                                foreground: '#1A1A1A'
                        },
                        popover: {
                                DEFAULT: '#FFFFFF',
                                foreground: '#1A1A1A'
                        },
                        primary: {
                                DEFAULT: '#E65100',
                                foreground: '#FFFFFF'
                        },
                        secondary: {
                                DEFAULT: '#F5F5F0',
                                foreground: '#1A1A1A'
                        },
                        muted: {
                                DEFAULT: '#F0EFEA',
                                foreground: '#666666'
                        },
                        accent: {
                                DEFAULT: '#4D7C0F',
                                foreground: '#FFFFFF'
                        },
                        destructive: {
                                DEFAULT: '#DC2626',
                                foreground: '#FFFFFF'
                        },
                        border: '#E5E5E5',
                        input: '#F0F0F0',
                        ring: '#E65100',
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
                        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                        hover: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
                        dropdown: '0 10px 30px -5px rgba(0, 0, 0, 0.1)'
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