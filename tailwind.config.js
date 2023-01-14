/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/renderer/index.ts.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                background: '#F5F5F5',
                primary: '#182B50',
                secondary: '#3A4A69',
                inactive: '#ACACAC', // dark dark blue,\
                contrast: '#005780'
            }
        }
    },
    plugins: []
}
