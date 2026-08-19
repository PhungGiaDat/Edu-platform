/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            zIndex: {
                '9999': '9999',
            },
            colors: {
                // ── Claymorphic EduAR palette ─────────────────────────────────
                // Primary: Sky Blue
                primary: {
                    DEFAULT: '#6EB9FF',
                    dark: '#3A8FD1',
                    light: '#C5E4FF',
                },
                // Secondary: Mint Green
                secondary: {
                    DEFAULT: '#B4E197',
                    dark: '#7DC760',
                    light: '#DFFFD0',
                },
                // Accent: Sunshine Yellow
                accent: {
                    DEFAULT: '#FFD93D',
                    dark: '#E5B800',
                    light: '#FFF3A3',
                },
                // Coral Pink
                coral: {
                    DEFAULT: '#FF9F9F',
                    dark: '#D97070',
                    light: '#FFD5D5',
                },
                // Danger
                danger: {
                    DEFAULT: '#E74C3C',
                    dark: '#C0392B',
                },
                // Neutrals — warm-white base
                neutral: {
                    50: '#FFFBF0',   // warm white base
                    100: '#F4F6F7',
                    200: '#E2E8F0',
                    300: '#D7DBDD',
                    600: '#4A5568',
                    800: '#1A2744',  // deep slate (main text)
                    900: '#111827',
                }
            },
            fontFamily: {
                sans: ['"Nunito"', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'xl':  '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
                '4xl': '2rem',   // claymorphic extreme rounding
            },
            boxShadow: {
                // Claymorphic shadows — solid bottom shadow = 3D depth
                'clay':    '0 8px 0 rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
                'clay-lg': '0 14px 0 rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.7)',
                'clay-sm': '0 4px 0 rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                // Yellow button pressed state
                'clay-yellow': '0 6px 0 #E5B800, inset 0 1px 0 rgba(255,255,255,0.4)',
                'clay-blue':   '0 6px 0 #3A8FD1, inset 0 1px 0 rgba(255,255,255,0.4)',
                'clay-green':  '0 6px 0 #7DC760, inset 0 1px 0 rgba(255,255,255,0.4)',
            },
            animation: {
                'float':        'float 4s ease-in-out infinite',
                'float-delay':  'floatDelay 3.5s ease-in-out infinite 0.8s',
                'xp-pulse':     'xpPulse 2s ease-in-out infinite',
                'shimmer':      'shimmer 2s infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
                    '50%':      { transform: 'translateY(-14px) rotate(2deg)' },
                },
                floatDelay: {
                    '0%, 100%': { transform: 'translateY(0) rotate(3deg)' },
                    '50%':      { transform: 'translateY(-10px) rotate(-1deg)' },
                },
                xpPulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%':      { opacity: '0.75' },
                },
                shimmer: {
                    '0%':   { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(200%)' },
                },
            },
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
}
