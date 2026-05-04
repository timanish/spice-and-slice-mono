import { useEffect } from "react";
import NoSleep from "nosleep.js";

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

export function useScreenWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const noSleep = new NoSleep();
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (wakeLock) {
        try {
          sentinel = await wakeLock.request("screen");
          sentinel.addEventListener("release", () => {
            sentinel = null;
          });
          return;
        } catch {
          // Fall through to NoSleep fallback
        }
      }
      try {
        await noSleep.enable();
      } catch {
        // First call may need a user gesture; gestureRetry handles it
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };

    const gestureRetry = () => {
      acquire();
      window.removeEventListener("click", gestureRetry);
      window.removeEventListener("keydown", gestureRetry);
      window.removeEventListener("touchstart", gestureRetry);
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("click", gestureRetry);
    window.addEventListener("keydown", gestureRetry);
    window.addEventListener("touchstart", gestureRetry);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("click", gestureRetry);
      window.removeEventListener("keydown", gestureRetry);
      window.removeEventListener("touchstart", gestureRetry);
      sentinel?.release().catch(() => {});
      noSleep.disable();
    };
  }, [enabled]);
}
