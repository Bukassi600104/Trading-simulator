/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Terminal Zero — Stitch Redesign Palette
                't0': {
                    'void': '#020617',
                    'abyss': '#0a0a12',
                    'depth': '#0f172a',
                    'surface': '#1e293b',
                    'elevated': '#334155',
                    'border': '#475569',
                },
                // Primary: Neon Emerald
                'primary': {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#11d473',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                    950: '#022c22',
                },
                // Coral: Warmth, CTA, Loss
                'coral': {
                    400: '#ff8a8a',
                    500: '#ff6b6b',
                    600: '#f43f5e',
                },
                // Amber: Highlights, Warnings
                'amber': {
                    400: '#fbbf24',
                    500: '#FFD93D',
                    600: '#f59e0b',
                },
                // Lavender: Info, Community
                'lavender': {
                    400: '#c4b5fd',
                    500: '#B8B8FF',
                    600: '#8b5cf6',
                },
                // Semantic
                'profit': {
                    DEFAULT: '#11d473',
                    400: '#34d399',
                    500: '#11d473',
                    600: '#059669',
                },
                'loss': {
                    DEFAULT: '#f43f5e',
                    400: '#fb7185',
                    500: '#f43f5e',
                    600: '#e11d48',
                },
                'warning': {
                    DEFAULT: '#f59e0b',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                },
                // Slate scale
                'dark': {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
            },
            fontFamily: {
                sans: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
                display: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                '2xs': ['10px', { lineHeight: '14px' }],
            },
            borderRadius: {
                'sm': '6px',
                'md': '10px',
                'lg': '16px',
                'xl': '24px',
            },
            boxShadow: {
                'glow-primary': '0 0 20px rgba(17, 212, 115, 0.3)',
                'glow-primary-lg': '0 0 40px rgba(17, 212, 115, 0.4)',
                'glow-coral': '0 0 20px rgba(255, 107, 107, 0.3)',
                'glow-amber': '0 0 20px rgba(255, 217, 61, 0.3)',
                'glow-lavender': '0 0 20px rgba(184, 184, 255, 0.3)',
                'glow-emerald': '0 0 20px rgba(17, 212, 115, 0.3)',
                'glow-rose': '0 0 20px rgba(244, 63, 94, 0.3)',
                'card': '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)',
                'card-hover': '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
                'modal': '0 25px 60px rgba(0, 0, 0, 0.5)',
                'terminal': '0 0 50px -12px rgba(17, 212, 115, 0.3)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
                'fade-out': 'fadeOut 0.3s ease-in forwards',
                'slide-up': 'slideUp 0.4s ease-out forwards',
                'slide-down': 'slideDown 0.3s ease-out forwards',
                'slide-in-right': 'slideInRight 0.3s ease-out forwards',
                'slide-out-right': 'slideOutRight 0.3s ease-in forwards',
                'scale-in': 'scaleIn 0.2s ease-out forwards',
                'scale-out': 'scaleOut 0.15s ease-in forwards',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'shimmer': 'shimmer 1.5s infinite',
                'spin-slow': 'spin 2s linear infinite',
                'pulse-profit': 'pulseProfit 0.5s ease-in-out',
                'pulse-loss': 'pulseLoss 0.5s ease-in-out',
                'tab-indicator': 'tabIndicator 0.3s ease-out forwards',
                'progress-fill': 'progressFill 1s ease-out forwards',
                'count-up': 'countUp 0.6s ease-out',
                'backdrop-in': 'backdropIn 0.2s ease-out forwards',
                'backdrop-out': 'backdropOut 0.15s ease-in forwards',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeOut: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(16px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideOutRight: {
                    '0%': { transform: 'translateX(0)', opacity: '1' },
                    '100%': { transform: 'translateX(100%)', opacity: '0' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                scaleOut: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '100%': { transform: 'scale(0.95)', opacity: '0' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(17, 212, 115, 0.3)' },
                    '100%': { boxShadow: '0 0 25px rgba(17, 212, 115, 0.6)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                pulseProfit: {
                    '0%, 100%': { color: '#11d473' },
                    '50%': { color: '#34D399', textShadow: '0 0 10px rgba(17, 212, 115, 0.5)' },
                },
                pulseLoss: {
                    '0%, 100%': { color: '#f43f5e' },
                    '50%': { color: '#FB7185', textShadow: '0 0 10px rgba(244, 63, 94, 0.5)' },
                },
                tabIndicator: {
                    '0%': { transform: 'scaleX(0)' },
                    '100%': { transform: 'scaleX(1)' },
                },
                progressFill: {
                    '0%': { width: '0%' },
                    '100%': { width: 'var(--progress-width)' },
                },
                countUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                backdropIn: {
                    '0%': { backdropFilter: 'blur(0px)', background: 'rgba(0,0,0,0)' },
                    '100%': { backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' },
                },
                backdropOut: {
                    '0%': { backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' },
                    '100%': { backdropFilter: 'blur(0px)', background: 'rgba(0,0,0,0)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'grid-dots': 'radial-gradient(circle, rgba(17, 212, 115, 0.08) 1px, transparent 1px)',
            },
            backgroundSize: {
                'grid': '40px 40px',
            },
            transitionTimingFunction: {
                'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
