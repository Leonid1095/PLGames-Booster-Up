/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6C63FF",
          light: "#8B83FF",
          dark: "#5A52E0",
        },
        accent: {
          cyan: "#00D4FF",
          green: "#00FF94",
          orange: "#FF6B35",
        },
        surface: {
          bg: "#0A0A14",
          card: "#12121F",
          "card-hover": "#1A1A2E",
          border: "#1E1E32",
          hover: "#252538",
        },
        text: {
          primary: "#E8E8F0",
          secondary: "#9999AA",
          muted: "#666680",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        slideDown: {
          "0%": { opacity: "0", transform: "translateX(-50%) translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateX(-50%) translateY(0)" },
        },
      },
      animation: {
        slideDown: "slideDown 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
