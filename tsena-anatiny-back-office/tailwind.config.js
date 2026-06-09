/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        panel: "hsl(var(--panel) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          soft: "hsl(var(--brand-soft) / <alpha-value>)"
        },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 12px 35px -12px hsl(var(--brand) / 0.55)"
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at 5% 0%, hsl(var(--brand-soft) / 0.4), transparent 35%), radial-gradient(circle at 95% 10%, hsl(var(--warning) / 0.25), transparent 35%), linear-gradient(120deg, hsl(var(--bg)), hsl(var(--panel)))"
      }
    }
  },
  plugins: []
};
