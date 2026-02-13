/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "var(--ds-color-primary)",
                "primary-foreground": "#ffffff",
                surface: "var(--ds-color-surface)",
                accent: "var(--ds-color-accent)",
                danger: "var(--ds-color-danger)",
            }
        },
    },
    plugins: [],
}
