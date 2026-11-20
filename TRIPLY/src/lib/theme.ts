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
  teal: "#24B2A2",
  track: "#E6E5E9",
  danger: "#D91F11",
  hint: "#6B7280",
  coralStrong: "#FD5E40",
  // Option icons in the Edit Profile preference sheets.
  iconGreen: "#5BAA55",
  iconGold: "#F2B63D",
  iconBlue: "#4C8DE6",
  iconPink: "#E0529C",
  iconOrange: "#F29A2E",
  iconTeal: "#1FA39A",
  selectBorder: "#F8A08C",
  sheet: "#FBFAFB",
  radioRing: "#C9C7CE",
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
  editBg: "linear-gradient(to bottom, #FCEFF3 0%, #FCF6F8 22%, #FBF4F7 100%)",
  helpHero: "linear-gradient(to bottom, #F5DDE6 0%, #F8D9E3 35%, #FCDDE0 70%, #FFE4E2 100%)",
  privacyHero: "linear-gradient(to bottom, #FEE2EF 0%, #F9DFEC 38%, #FDDFE6 72%, #FEE1D9 100%)",
  privacyHeroEdge: "linear-gradient(to right, rgba(253,223,230,1) 0%, rgba(253,223,230,0) 100%)",
  privacyHeroTop: "linear-gradient(to bottom, rgba(249,224,238,1) 0%, rgba(249,224,238,0) 100%)",
  helpHeroTop: "linear-gradient(to bottom, rgba(247,218,229,1) 0%, rgba(247,218,229,0) 100%)",
  helpHeroEdge: "linear-gradient(to right, rgba(251,220,224,1) 0%, rgba(251,220,224,0) 100%)",
  cta: "linear-gradient(90deg, #FF7C57 0%, #FF5A3A 100%)",
  ocean: "linear-gradient(160deg, #1CB0C8 0%, #0E9CC6 50%, #27BBD0 100%)",
  heroScrim: "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
} as const;
