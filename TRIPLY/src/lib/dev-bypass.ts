import { useSyncExternalStore } from "react";

// DEV ONLY: when true, the sign-in buttons skip Clerk and open the signed-in tabs.
// Always false in release builds. Set to false to use real Apple/Google sign-in again.
export const DEV_LOGIN_SHORTCUT = __DEV__ && true;

let enabled = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setEnabled(value: boolean) {
  enabled = value;
  listeners.forEach((listener) => listener());
}

export function useDevBypass() {
  return useSyncExternalStore(subscribe, () => enabled);
}

export const enableDevBypass = () => setEnabled(true);
export const disableDevBypass = () => setEnabled(false);
