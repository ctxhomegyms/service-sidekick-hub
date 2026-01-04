import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const FORCE_MOBILE_KEY = "force-mobile-layout";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Initial SSR-safe value - assume mobile for touch devices
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    // Check for forced mobile layout from localStorage
    const forceMobile = localStorage.getItem(FORCE_MOBILE_KEY) === "true";
    if (forceMobile) {
      setIsMobile(true);
      return;
    }

    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const hasTouchPoints = navigator.maxTouchPoints > 0;
      const isTouchDevice = isCoarsePointer || hasTouchPoints;
      
      // Consider it mobile if:
      // 1. Screen is small (< 768px), OR
      // 2. It's a touch device with screen < 1024px (tablets in portrait)
      const shouldUseMobile = isSmallScreen || (isTouchDevice && window.innerWidth < TABLET_BREAKPOINT);
      
      setIsMobile(shouldUseMobile);
    };

    // Check immediately
    checkMobile();

    // Listen for resize and orientation changes
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const tabletMql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      // Re-check if force mobile is set
      const forceMobile = localStorage.getItem(FORCE_MOBILE_KEY) === "true";
      if (forceMobile) {
        setIsMobile(true);
        return;
      }
      checkMobile();
    };

    mql.addEventListener("change", onChange);
    tabletMql.addEventListener("change", onChange);
    window.addEventListener("orientationchange", onChange);
    
    // Listen for storage changes (in case force mobile is toggled)
    const onStorage = (e: StorageEvent) => {
      if (e.key === FORCE_MOBILE_KEY) {
        if (e.newValue === "true") {
          setIsMobile(true);
        } else {
          checkMobile();
        }
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mql.removeEventListener("change", onChange);
      tabletMql.removeEventListener("change", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return isMobile;
}

export function useForceMobileLayout() {
  const [forceMobile, setForceMobileState] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(FORCE_MOBILE_KEY) === "true";
  });

  const setForceMobile = React.useCallback((value: boolean) => {
    localStorage.setItem(FORCE_MOBILE_KEY, value ? "true" : "false");
    setForceMobileState(value);
    // Trigger a re-render by dispatching a custom event
    window.dispatchEvent(new StorageEvent("storage", {
      key: FORCE_MOBILE_KEY,
      newValue: value ? "true" : "false",
    }));
  }, []);

  return [forceMobile, setForceMobile] as const;
}
