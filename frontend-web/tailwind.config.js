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
                // Kid-friendly palette (Duolingo-inspired but distinct)
                primary: {
                    DEFAULT: '#58CC02', // Bright Green
                    dark: '#46A302',
                    light: '#89E219',
                },
                secondary: {
                    DEFAULT: '#1CB0F6', // Bright Blue
                    dark: '#1899D6',
                    light: '#58CC02',
                },
                accent: {
                    DEFAULT: '#FFC800', // Yellow/Gold
                    dark: '#E5B400',
                },
                danger: {
                    DEFAULT: '#FF4B4B', // Red
                    dark: '#D33131',
                },
                neutral: {
                    100: '#F7F7F7',
                    200: '#E5E5E5',
                    300: '#D4D4D4',
                    800: '#4B4B4B',
                    900: '#3C3C3C',
                }
            },
            fontFamily: {
                sans: ['"Nunito"', 'system-ui', 'sans-serif'], // Rounded friendly font
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false, // Disable Tailwind's base reset to avoid conflicts with existing CSS
    },
}
