import { colors } from "./src/theme/colors.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      keyframes: {
        bounceDot: { "0%,80%,100%": { transform: "translateY(0)", opacity: ".4" }, "40%": { transform: "translateY(-6px)", opacity: "1" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-6px)" }, "75%": { transform: "translateX(6px)" } },
      },
      animation: {
        "bounce-dot": "bounceDot 1.2s infinite ease-in-out",
        shake: "shake .3s ease-in-out",
      },
    },
  },
  plugins: [],
};
