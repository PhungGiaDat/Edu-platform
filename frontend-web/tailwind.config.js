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
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false, // Disable Tailwind's base reset to avoid conflicts with existing CSS
    },
}
