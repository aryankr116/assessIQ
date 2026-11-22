/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F8EAE4",
          100: "#F1D5C9",
          200: "#E4B7A8",
          300: "#D98F76",
          400: "#CF7255",
          500: "#C45B3D",
          600: "#A84431",
          700: "#893A2A",
          800: "#6E3025",
          900: "#54261E",
          950: "#331914",
        },
        sand: {
          50: "#FBF8F1",
          100: "#F0E7D7",
          200: "#E2D6C4",
          300: "#CBBBA5",
          400: "#6E6256",
          500: "#62574B",
          600: "#4D443B",
          700: "#3A332D",
          800: "#2B251F",
          900: "#211B17",
          950: "#171411",
        },
        knowledge: "#893A2A",
        skill: "#62574B",
        slate: {
          50: "#FBF8F1",
          100: "#F0E7D7",
          200: "#E2D6C4",
          300: "#CBBBA5",
          400: "#6E6256",
          500: "#62574B",
          600: "#4D443B",
          700: "#3A332D",
          800: "#2B251F",
          900: "#211B17",
          950: "#171411",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Newsreader", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(37,32,27,0.04), 0 7px 20px rgba(37,32,27,0.06)",
        "card-hover": "0 10px 24px rgba(37,32,27,0.10), 0 2px 5px rgba(37,32,27,0.05)",
        elevated: "0 18px 42px rgba(37,32,27,0.16), 0 4px 10px rgba(37,32,27,0.07)",
        glow: "0 0 24px rgba(196,91,61,0.16)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.5)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      animation: {
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
};
