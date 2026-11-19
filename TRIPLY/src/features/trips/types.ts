// Response shapes of the trips API (see src/app/api/trips).
export type TripStatus = 'pending' | 'generating' | 'ready' | 'failed';

export type ImageCredit = { name: string; profileUrl: string; photoUrl: string };

export type TripSummary = {
  id: string;
  status: TripStatus;
  destinationName: string;
  startDate: string;
  endDate: string;
  travelers: number;
  heroImageUrl: string | null;
  heroImageCredit: ImageCredit | null;
  createdAt: string;
};

export type Activity = {
  id: string;
  position: number;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  name: string;
  description: string;
  category: string;
  estCost: number | null;
  address: string | null;
  imageUrl: string | null;
  imageCredit: ImageCredit | null;
};

export type TripDay = {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  summary: string;
  status: 'ready' | 'regenerating' | 'failed';
  activities: Activity[];
};

export type Hotel = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  rating: number | null;
  priceRange: string | null;
  imageUrl: string | null;
  imageCredit: ImageCredit | null;
};

export type TripDetail = Omit<TripSummary, never> & {
  budgetTier: string;
  currency: string;
  interests: string[];
  pace: string;
  summary: string | null;
  errorCode: string | null;
  budgetBreakdown: {
    total: number;
    perDay: number | null;
    currency: string;
    items: { category: 'stay' | 'food' | 'activities' | 'transport' | 'other'; amount: number }[];
  } | null;
  days: TripDay[];
  hotels: Hotel[];
};
