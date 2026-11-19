/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Palette from design/design-system.png
        brand: {
          coral: "#FF6B4A",
          teal: "#1FA39A",
          navy: "#0F172A",
          sand: "#F8F6F3",
          gray: "#94A3B8",
          slate: "#475569",
          night: "#021422",
          violet: "#8B6CF0",
          canvas: "#FCF8F8",
          mint: "#D5F2EC",
          mist: "#F2F1F7",
          error: "#EF4444",
          errorSoft: "#FDE8E8",
          warnSoft: "#FFEFD6",
          line: "#E8E6EF",
          link: "#1D5FD1",
        },
      },
    },
  },
  plugins: [],
};
