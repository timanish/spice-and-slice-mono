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
    let acquiring = false;
    const noSleep = new NoSleep();
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;

    const acquire = async () => {
      if (cancelled || acquiring || sentinel) return;
      if (document.visibilityState !== "visible") return;
      acquiring = true;
      try {
        if (wakeLock) {
          try {
            const result = await wakeLock.request("screen");
            if (cancelled) {
              result.release().catch(() => {});
              return;
            }
            sentinel = result;
            sentinel.addEventListener("release", () => {
              sentinel = null;
              // OS may release the lock on its own (dimming/battery policy).
              // Re-acquire if the document is still visible.
              if (!cancelled && document.visibilityState === "visible") {
                acquire();
              }
            });
            return;
          } catch {
            // Fall through to NoSleep fallback
          }
        }
        if (cancelled) return;
        try {
          await noSleep.enable();
          if (cancelled) noSleep.disable();
        } catch {
          // First call may need a user gesture; gestureRetry handles it
        }
      } finally {
        acquiring = false;
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
      sentinel = null;
      noSleep.disable();
    };
  }, [enabled]);
}
