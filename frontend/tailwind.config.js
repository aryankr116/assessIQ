/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecf6f3",
          100: "#d2ebe4",
          200: "#a8d9cc",
          300: "#76c2b0",
          400: "#47a692",
          500: "#2c8a77",
          600: "#1f6f60",
          700: "#1b594f",
          800: "#194940",
          900: "#163d36",
          950: "#0b2420",
        },
        // "sand" kept as an alias to clean neutral so bg-sand-*/text-sand-*
        // classes render as crisp grays instead of tan/beige.
        sand: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        knowledge: "#1f6f60",
        skill: "#5b21b6",
        // Map cool slate -> clean neutral so the whole app reads crisp/cool.
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["DM Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card": "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "card-hover": "0 6px 20px rgba(15,23,42,0.10), 0 2px 4px rgba(15,23,42,0.05)",
        "elevated": "0 12px 32px rgba(15,23,42,0.14), 0 4px 8px rgba(15,23,42,0.06)",
        "glow": "0 0 24px rgba(44,138,119,0.22)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.12)",
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
