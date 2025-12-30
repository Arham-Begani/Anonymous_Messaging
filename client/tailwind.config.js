/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#000000', // Pitch black
                surface: '#0a0a0a',
                border: '#1a1a1a', // Grey accent
                primary: '#ffffff', // White for high contrast
                secondary: '#737373', // Muted grey
                bubble: '#111111',
                'bubble-self': '#222222',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
