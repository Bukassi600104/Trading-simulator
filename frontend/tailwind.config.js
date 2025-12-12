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
                // Midnight Trader Design System
                'midnight': {
                    'primary': '#0F172A',    // Deep Navy - Slate 900 (Primary Background)
                    'secondary': '#1E293B',  // Slate 800 (Cards/Panels)
                    'tertiary': '#334155',   // Slate 700 (Borders)
                },
                // Accent Colors
                'accent': {
                    'blue': '#3B82F6',       // Electric Blue (CTA Primary)
                    'green': '#10B981',      // Mint Green (Profit/Long)
                    'red': '#EF4444',        // Crimson Red (Loss/Short)
                    'amber': '#F59E0B',      // Amber Gold (Warning/Risk)
                },
                // Semantic Colors
                'profit': '#10B981',
                'loss': '#EF4444',
                'warning': '#F59E0B',
                'neutral': '#6b7280',
                // Primary Blue Scale
                'primary': {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
                // Dark/Slate Scale
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
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'confetti': 'confetti 1s ease-out forwards',
                'pulse-profit': 'pulseProfit 0.5s ease-in-out',
                'pulse-loss': 'pulseLoss 0.5s ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
                    '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
                },
                pulseProfit: {
                    '0%, 100%': { color: '#10B981' },
                    '50%': { color: '#34D399', textShadow: '0 0 10px rgba(16, 185, 129, 0.5)' },
                },
                pulseLoss: {
                    '0%, 100%': { color: '#EF4444' },
                    '50%': { color: '#F87171', textShadow: '0 0 10px rgba(239, 68, 68, 0.5)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'midnight-gradient': 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
