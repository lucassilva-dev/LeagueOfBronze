// ============================================================
// tailwind.config.ts — trechos para theme.extend
// ============================================================

// colors:
const colors = {
  bg:      "hsl(var(--bg) / <alpha-value>)",
  panel:   "hsl(var(--panel) / <alpha-value>)",
  panel2:  "hsl(var(--panel-2) / <alpha-value>)",
  text:    "hsl(var(--text) / <alpha-value>)",
  muted:   "hsl(var(--muted) / <alpha-value>)",
  border:  "hsl(var(--border) / <alpha-value>)",
  accent:  "hsl(var(--accent) / <alpha-value>)",   // ember
  accent2: "hsl(var(--accent-2) / <alpha-value>)", // bronze
  lime:    "hsl(var(--lime) / <alpha-value>)",
  success: "hsl(var(--success) / <alpha-value>)",
  danger:  "hsl(var(--danger) / <alpha-value>)",
};

// fontFamily:
const fontFamily = {
  display: ["var(--font-display)", "sans-serif"], // Anton — só nos números/heros gigantes
  heading: ["var(--font-heading)", "sans-serif"], // Space Grotesk — títulos, rótulos
  body:    ["var(--font-body)", "sans-serif"],     // Sora — corpo e UI
};

// boxShadow (glow ember/bronze):
const boxShadow = {
  ember:  "0 8px 24px rgba(255,106,43,.24)",
  bronze: "0 20px 70px rgba(40,20,6,.5), 0 0 0 1px rgba(200,138,69,.2)",
};

// borderRadius: 8 (sm) / 12 (md) / 16 (lg) / 20-22 (xl cards) / 9999 (pill)

export { colors, fontFamily, boxShadow };
