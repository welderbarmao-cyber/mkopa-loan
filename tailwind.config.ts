import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        mkopa: { green: '#009739', orange: '#E87722', dark: '#005A2B', light: '#E8F5E9' },
      },
    },
  },
  plugins: [],
};
export default config;
