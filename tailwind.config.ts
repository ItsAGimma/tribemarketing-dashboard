import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Accent huisstijlblauw
        brand: {
          50:  "#e6eefa",
          100: "#c2d4f2",
          200: "#8fb0e6",
          300: "#5c8cd9",
          400: "#2e6bc9",
          500: "#004BAD",
          600: "#00439c",
          700: "#003985",
          800: "#002e6b",
          900: "#002250",
        },
        // Sidebar donkerblauw
        sidebar: {
          DEFAULT: "#0A2342",
          active: "#004BAD",
          text: "#8FA0BC",
        },
        // Functionele KPI kleuren
        kpi: {
          inkomsten: "#2D6A4F",
          uitgaven: "#E05252",
          winst: "#004BAD",
        },
        canvas: "#F5F4F0",
        ink: "#1A1A1A",
        muted: "#6B7280",
        hairline: "#EBEBEA",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
