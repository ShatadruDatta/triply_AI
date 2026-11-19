import { createContext, use, useState, type ReactNode } from "react";

import { startOfDay } from "./date-utils";

export type Budget = "budget" | "moderate" | "luxury";
export type Pace = "relaxed" | "balanced" | "packed";
export type Interest = "food" | "culture" | "nature" | "nightlife" | "shopping" | "adventure";

export const MAX_TRAVELERS = 20;
export const MAX_TRIP_DAYS = 14;

export type PlanDraft = {
  destination: string;
  destinationPlaceId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  durationDays: number;
  adults: number;
  children: number;
  infants: number;
  budget: Budget;
  interests: Interest[];
  pace: Pace;
};

const initialDraft: PlanDraft = {
  destination: "",
  destinationPlaceId: null,
  startDate: null,
  endDate: null,
  durationDays: 7,
  adults: 2,
  children: 0,
  infants: 0,
  budget: "moderate",
  interests: ["food"],
  pace: "balanced",
};

type PlanDraftContextValue = {
  draft: PlanDraft;
  update: (patch: Partial<PlanDraft>) => void;
};

const PlanDraftContext = createContext<PlanDraftContextValue | null>(null);

export function PlanDraftProvider({ children }: { children: ReactNode }) {
  // Today is selected as the start date by default; the user picks the end date.
  const [draft, setDraft] = useState<PlanDraft>(() => ({
    ...initialDraft,
    startDate: startOfDay(new Date()),
  }));
  const update = (patch: Partial<PlanDraft>) => setDraft((current) => ({ ...current, ...patch }));

  return <PlanDraftContext value={{ draft, update }}>{children}</PlanDraftContext>;
}

export function usePlanDraft() {
  const value = use(PlanDraftContext);
  if (!value) throw new Error("usePlanDraft must be used inside PlanDraftProvider");
  return value;
}

export function totalTravelers(draft: PlanDraft) {
  return draft.adults + draft.children + draft.infants;
}
