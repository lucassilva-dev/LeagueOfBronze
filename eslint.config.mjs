import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // divulgacao/: material do trailer (o support.js é o runtime do Claude Design), fora do repositório.
    ignores: ["coverage/**", "design_handoff_rebrand/**", "divulgacao/**"],
  },
];

export default config;
