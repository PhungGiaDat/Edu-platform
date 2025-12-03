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
                // Refined Kid-friendly palette (Balanced, not over-saturated)
                primary: {
                    DEFAULT: '#2ECC71', // Soft Green
                    dark: '#27AE60',
                    light: '#A9DFBF',
                },
                secondary: {
                    DEFAULT: '#3498DB', // Calm Blue
                    dark: '#2980B9',
                    light: '#AED6F1',
                },
                accent: {
                    DEFAULT: '#F1C40F', // Warm Yellow
                    dark: '#F39C12',
                },
                danger: {
                    DEFAULT: '#E74C3C', // Soft Red
                    dark: '#C0392B',
                },
                neutral: {
                    50: '#FDFEFE',
                    100: '#F4F6F7',
                    200: '#E5E8E8',
                    300: '#D7DBDD',
                    800: '#2C3E50', // Dark Blue-Grey for text (easier on eyes than black)
                    900: '#17202A',
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
