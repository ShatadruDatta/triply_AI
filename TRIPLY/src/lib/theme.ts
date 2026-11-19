// Native-only color values (tab bar tint etc.) that can't use NativeWind classes.
// Keep in sync with `theme.extend.colors.brand` in tailwind.config.js.
export const colors = {
  coral: "#FF6B4A",
  navy: "#0F172A",
  slate: "#475569",
  gray: "#94A3B8",
  violet: "#8B6CF0",
  white: "#FFFFFF",
  error: "#EF4444",
  link: "#1D5FD1",
  oceanLand: "#4C8A5B",
  oceanLandLight: "#7DB27A",
} as const;

// CSS gradient strings for `experimental_backgroundImage` (no gradient library needed).
export const gradients = {
  heroFade:
    "linear-gradient(to bottom, rgba(252,248,248,0) 55%, rgba(252,248,248,0.55) 80%, rgba(252,248,248,1) 100%)",
  heroSky:
    "linear-gradient(to bottom, rgba(112,132,232,0.7) 0%, rgba(160,140,226,0.4) 22%, rgba(220,150,190,0.12) 40%, rgba(255,255,255,0) 55%)",
  planHero:
    "linear-gradient(to bottom, rgba(140,150,240,0.8) 0%, rgba(190,150,225,0.55) 30%, rgba(245,170,200,0.35) 55%, rgba(252,248,248,0.1) 70%, rgba(252,248,248,0.92) 96%, rgba(252,248,248,1) 100%)",
  cardScrim: "linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)",
  banner: "linear-gradient(120deg, #FBEBE7 0%, #F2E6F0 50%, #DCE6F8 100%)",
  cta: "linear-gradient(90deg, #FF7C57 0%, #FF5A3A 100%)",
  ocean: "linear-gradient(160deg, #1CB0C8 0%, #0E9CC6 50%, #27BBD0 100%)",
  heroScrim: "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
} as const;
