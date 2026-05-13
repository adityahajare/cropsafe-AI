import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}", // ✅ FIXED
  ],

  theme: {
    extend: {
      colors: {
        cropsafe: {
          primary: "#2E7D32",
          "primary-dark": "#1B5E20",
          "primary-light": "#4CAF50",
          secondary: "#66BB6A",
          accent: "#FDD835",
          danger: "#E53935",
          background: "#F9FBF7",
          card: "#FFFFFF",
          "text-dark": "#1a2e1a",
          "text-light": "#6B8C6B",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      spacing: {
        "bottom-nav": "70px",
        "card-padding": "20px",
      },

      borderRadius: {
        card: "16px",
      },

      keyframes: {
        "slide-from-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },

        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },

        "scanning-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },

      animation: {
        "slide-from-right": "slide-from-right 300ms ease-out",
        ripple: "ripple 0.6s ease-out",
        "scanning-line": "scanning-line 2s linear infinite",
      },
    },
  },

  plugins: [
    tailwindcssAnimate,

    // ✅ SAFE utilities for @apply
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".bg-primary": { backgroundColor: "#2E7D32" },
        ".bg-primary-dark": { backgroundColor: "#1B5E20" },
      });
    }),
  ],
} satisfies Config;