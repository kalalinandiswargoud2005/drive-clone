/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#3b82f6', // A nice blue for light mode
          dark: '#60a5fa',  // A slightly lighter blue for dark mode text/icons
        },
        // You can add more custom colors here
      },
    },
  },
  plugins: [],
};