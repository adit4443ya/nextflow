import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "success-flash": "success-flash 1s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
