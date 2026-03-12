import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bb: {
          "powder-blue": "#86B3D5",
          "powder-blue-light": "#b8d4e8",
          coral: "#FD747B",
          "coral-light": "#fecaca",
          mustard: "#FDAE4F",
          "mustard-light": "#fde4c4",
          black: "#1a1a1a",
          white: "#ffffff",
          grey: "#f5f5f5",
          "grey-sidebar": "#f0f0f0",
          dark: "#0f1419",
          "dark-elevated": "#1a2229",
          "dark-sidebar": "#141b22",
          orange: "#f97316",
          "orange-light": "#fed7aa",
          red: "#dc2626",
          "red-light": "#fecaca",
          green: "#16a34a",
          "green-light": "#bbf7d0",
          blue: "#2563eb",
          "blue-light": "#bfdbfe",
        },
      },
      fontFamily: {
        sans: ["var(--font-merriweather-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
