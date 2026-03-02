import { format, add, isBefore, isAfter, parse, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const STORE_TIMEZONE = "America/Chicago";

export interface PickupSettings {
  preparation_time_minutes: number;
  opening_time: string;
  closing_time: string;
  last_order_cutoff_minutes: number;
  is_pickup_enabled: boolean;
  timezone: string;
}

/**
 * Calculate when a pickup order will be ready
 * @param preparationMinutes - Minutes needed to prepare the order
 * @returns Date object in UTC representing when order will be ready
 */
export function calculatePickupReadyTime(
  preparationMinutes: number = 60
): Date {
  const now = new Date();
  const readyTime = add(now, { minutes: preparationMinutes });
  return readyTime;
}

/**
 * Convert a time string (HH:mm:ss) to a Date object for today in store timezone
 * @param timeString - Time in format "HH:mm:ss" (e.g., "05:00:00")
 * @returns Date object in UTC
 */
function timeStringToDate(timeString: string): Date {
  const now = new Date();
  const storeNow = toZonedTime(now, STORE_TIMEZONE);
  const today = startOfDay(storeNow);
  const time = parse(timeString, "HH:mm:ss", today);
  return fromZonedTime(time, STORE_TIMEZONE);
}

/**
 * Check if current time is within store hours
 * @param settings - Pickup settings from database
 * @returns true if store is currently open
 */
export function isStoreOpen(settings: PickupSettings): boolean {
  if (!settings.is_pickup_enabled) return false;

  const now = new Date();
  const storeNow = toZonedTime(now, STORE_TIMEZONE);

  const openingTime = timeStringToDate(settings.opening_time);
  const closingTime = timeStringToDate(settings.closing_time);

  const storeOpeningTime = toZonedTime(openingTime, STORE_TIMEZONE);
  const storeClosingTime = toZonedTime(closingTime, STORE_TIMEZONE);

  return (
    isAfter(storeNow, storeOpeningTime) && isBefore(storeNow, storeClosingTime)
  );
}

/**
 * Check if a pickup order can be placed now
 * @param settings - Pickup settings from database
 * @returns Object with validation result and message
 */
export function validatePickupAvailability(settings: PickupSettings): {
  isAvailable: boolean;
  message: string;
  readyAt?: Date;
} {
  if (!settings.is_pickup_enabled) {
    return {
      isAvailable: false,
      message: "Pickup is currently unavailable.",
    };
  }

  // Pickup is available whenever enabled — users select a future date/time
  // slot, so current store hours should not block ordering.
  return {
    isAvailable: true,
    message: "Select a pickup date and time slot.",
  };
}

/**
 * Format pickup ready time for display
 * @param readyAt - Date when order will be ready
 * @param includeDate - Whether to include the date in the format
 * @returns Formatted string
 */
export function formatPickupTime(
  readyAt: Date,
  includeDate: boolean = false
): string {
  const storeTime = toZonedTime(readyAt, STORE_TIMEZONE);

  if (includeDate) {
    return format(storeTime, "EEEE, MMMM d 'at' h:mm a");
  }

  return format(storeTime, "h:mm a");
}

/**
 * Get store hours formatted for display
 * @param settings - Pickup settings from database
 * @returns Formatted string like "5:00 AM - 10:00 PM"
 */
export function formatStoreHours(settings: PickupSettings): string {
  const openingTime = timeStringToDate(settings.opening_time);
  const closingTime = timeStringToDate(settings.closing_time);

  const storeOpeningTime = toZonedTime(openingTime, STORE_TIMEZONE);
  const storeClosingTime = toZonedTime(closingTime, STORE_TIMEZONE);

  return `${format(storeOpeningTime, "h:mm a")} - ${format(
    storeClosingTime,
    "h:mm a"
  )}`;
}
