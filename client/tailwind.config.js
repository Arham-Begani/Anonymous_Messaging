/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Background colors - softer dark tones
                background: '#0A0B0F',
                'background-elevated': '#12141A', 
                surface: '#161821',
                'surface-hover': '#1C1F2A',
                
                // Border colors - subtle with better opacity
                border: '#252837',
                'border-hover': '#2E3242',
                
                // Text colors - better contrast
                primary: '#E8EBF3',
                secondary: '#9CA3B4',
                muted: '#6B7280',
                'text-inverse': '#0A0B0F',
                
                // Accent colors - refined blue/purple tones
                accent: {
                    DEFAULT: '#6366F1',
                    hover: '#7C3AED',
                    light: '#818CF8',
                    dark: '#4F46E5',
                },
                
                // Message bubble colors
                bubble: {
                    received: '#1E2330',
                    sent: '#6366F1',
                    'sent-hover': '#7C3AED',
                },
                
                // Status colors
                success: '#10B981',
                warning: '#F59E0B', 
                error: '#EF4444',
                info: '#3B82F6',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'fade-in': 'fadeIn 0.2s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-sm': '0 0 10px rgba(99, 102, 241, 0.2)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
            },
        },
    },
    plugins: [],
}