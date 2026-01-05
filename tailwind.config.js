/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0f1117",
        panel: "#161a23",
        border: "#2a2f3a",
        accent: "#7aa2f7"
      }
    }
  },
  plugins: []
};

