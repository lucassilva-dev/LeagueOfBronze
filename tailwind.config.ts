import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        panel: "hsl(var(--panel) / <alpha-value>)",
        panel2: "hsl(var(--panel-2) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)", // ember
        accent2: "hsl(var(--accent-2) / <alpha-value>)", // bronze
        lime: "hsl(var(--lime) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"], // Anton — números/heros gigantes
        heading: ["var(--font-heading)", "sans-serif"], // Space Grotesk — títulos, rótulos
        body: ["var(--font-body)", "sans-serif"], // Sora — corpo e UI
      },
      boxShadow: {
        ember: "0 8px 24px rgba(255, 106, 43, 0.24)",
        bronze: "0 20px 70px rgba(40, 20, 6, 0.5), 0 0 0 1px rgba(200, 138, 69, 0.2)",
        // nomes mantidos p/ compat — agora com tom ember
        glow: "0 0 0 1px rgba(255, 106, 43, 0.16), 0 8px 30px rgba(120, 50, 12, 0.22)",
        "glow-strong":
          "0 0 0 1px rgba(255, 106, 43, 0.32), 0 12px 40px rgba(150, 60, 16, 0.3)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(120% 70% at 50% -8%, rgba(255,106,43,0.14), transparent 46%), radial-gradient(80% 50% at 90% 6%, rgba(203,255,62,0.05), transparent 50%), radial-gradient(70% 60% at 8% 100%, rgba(200,138,69,0.08), transparent 46%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
