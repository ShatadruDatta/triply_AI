import { useNavigation } from "expo-router";
import { useEffect } from "react";

// Trips is a stack inside a tab. Without this, leaving the tab while on "Plan a Trip" or a trip
// would bring you back to that screen; the Trips tab should always open on My Trips.
export function useResetOnTabBlur() {
  const navigation = useNavigation();

  useEffect(() => {
    const tab = navigation.getParent();
    if (!tab) return;
    return tab.addListener("blur", () => {
      if (navigation.canGoBack()) navigation.dispatch({ type: "POP_TO_TOP" });
    });
  }, [navigation]);
}
