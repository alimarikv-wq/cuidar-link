import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#162033",
        mist: "#eef4ff",
        accent: "#0f8bff",
        gold: "#d8a548",
        sky: "#d9ecff"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(15, 48, 87, 0.10)"
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at top left, rgba(15,139,255,0.16), transparent 42%), radial-gradient(circle at top right, rgba(216,165,72,0.12), transparent 32%)"
      }
    }
  },
  plugins: []
};

export default config;
