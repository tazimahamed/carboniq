import type { Config } from "tailwindcss";
// রঙগুলো theme-এ রাখা, যাতে "bg-leaf/30"-এর মতো স্বচ্ছতা কাজ করে (CSS var দিয়ে Tailwind v3 স্বচ্ছতা বানাতে পারে না)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(11 31 23 / <alpha-value>)",
        forest: "rgb(15 61 46 / <alpha-value>)",
        leaf: "rgb(31 138 91 / <alpha-value>)",
        lime: "rgb(198 243 107 / <alpha-value>)",
        paper: "rgb(245 243 236 / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
export default config;
