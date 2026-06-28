/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#0a0e17", 800: "#0f1626", 700: "#16203a", 600: "#1e2c4d" },
        pdist: "#5b9dff", // P → blue
        qdist: "#ff6b6b", // Q → red
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
