import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const toArray = (c) => (Array.isArray(c) ? c : [c]);

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/migrations/**",
      "next-env.d.ts",
      "*.config.*",
    ],
  },
  ...toArray(coreWebVitals),
  ...toArray(typescript),
  {
    rules: {
      // Stijlregel voor rechte apostrofs in tekst — te ruizig, geen echte bug.
      "react/no-unescaped-entities": "off",
      // Legitiem patroon (sessionStorage/localStorage client-side inladen) — waarschuwen i.p.v. blokkeren.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
