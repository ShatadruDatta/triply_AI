import type { ImageSource } from "expo-image";

// Static UI-only data for the popular destinations carousel.
export type Destination = { id: string; city: string; country: string; image: ImageSource };
export const popularDestinations: Destination[] = [
  { id: "tokyo", city: "Tokyo", country: "Japan", image: require("@/assets/images/home/tokyo.png") },
  { id: "lisbon", city: "Lisbon", country: "Portugal", image: require("@/assets/images/home/lisbon.png") },
  { id: "bali", city: "Bali", country: "Indonesia", image: require("@/assets/images/home/bali.png") },
];
