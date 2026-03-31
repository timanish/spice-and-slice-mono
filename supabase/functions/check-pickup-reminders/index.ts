import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/**
 * Verify the request is from an authorized cron scheduler.
 * Accepts either:
 * - x-cron-secret header matching CRON_SECRET env var
 * - Bearer token matching SUPABASE_SERVICE_ROLE_KEY (for internal calls)
 */
function verifyCronAuth(req: Request): void {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");

  // Check cron secret header
  if (cronSecret && headerSecret === cronSecret) {
    return;
  }

  // Fallback: check service role key in Authorization header
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    if (token === SUPABASE_SERVICE_ROLE_KEY) {
      return;
    }
  }

  throw new Error("Unauthorized: invalid cron secret or service role key");
}

/**
 * Parse pickup time string (e.g., "2:00 PM - 4:00 PM") to get start time
 */
function parsePickupTimeStart(pickupTime: string): string | null {
  try {
    const match = pickupTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
  } catch (error) {
    console.error("Error parsing pickup time:", error);
    return null;
  }
}

/**
 * Calculate when reminder should be sent (1 hour before pickup window starts)
 */
function calculateReminderTime(
  pickupDate: string,
  pickupTime: string
): Date | null {
  try {
    const startTime = parsePickupTimeStart(pickupTime);
    if (!startTime) {
      console.error("Could not parse pickup time:", pickupTime);
      return null;
    }

    // Combine date and time in Central Time
    const pickupDateTime = new Date(`${pickupDate}T${startTime}-06:00`); // CST/CDT

    if (isNaN(pickupDateTime.getTime())) {
      console.error("Invalid pickup datetime:", pickupDate, startTime);
      return null;
    }

    // Subtract 1 hour for reminder
    const reminderTime = new Date(pickupDateTime.getTime() - 60 * 60 * 1000);

    return reminderTime;
  } catch (error) {
    console.error("Error calculating reminder time:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    verifyCronAuth(req);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Checking for orders needing pickup reminders...");

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Query orders that need reminders
    // - Pickup orders
    // - Status is confirmed or preparing
    // - Reminder not sent yet
    // - Scheduled reminder time is within next 2 hours (or already passed)
    const { data: orders, error: queryError } = await supabase
      .from("orders")
      .select(
        `
        id,
        pickup_date,
        pickup_time,
        fulfillment_status,
        pickup_reminder_sent_at,
        pickup_reminder_scheduled_for
      `
      )
      .eq("fulfillment_type", "pickup")
      .in("fulfillment_status", ["confirmed", "preparing"])
      .is("pickup_reminder_sent_at", null)
      .lte("pickup_reminder_scheduled_for", twoHoursFromNow.toISOString())
      .gte("pickup_date", now.toISOString().split("T")[0]); // Today or later

    if (queryError) {
      console.error("Error querying orders:", queryError);
      throw new Error(`Failed to query orders: ${queryError.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log("No orders found needing reminders");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No orders need reminders at this time",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Found ${orders.length} order(s) needing reminders`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each order
    for (const order of orders) {
      try {
        // Check if scheduled time has arrived (or if order was placed less than 1 hour before pickup)
        if (order.pickup_reminder_scheduled_for) {
          const scheduledTime = new Date(order.pickup_reminder_scheduled_for);
          if (scheduledTime > now) {
            console.log(`Order ${order.id} scheduled for later, skipping`);
            continue;
          }
        }

        console.log(`Sending reminder for order ${order.id}`);

        // Call send-pickup-reminder function
        const reminderResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/send-pickup-reminder`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ orderId: order.id }),
          }
        );

        if (!reminderResponse.ok) {
          const errorText = await reminderResponse.text();
          console.error(
            `Failed to send reminder for order ${order.id}:`,
            errorText
          );
          results.failed++;
          results.errors.push(`Order ${order.id}: ${errorText}`);
        } else {
          console.log(`Successfully sent reminder for order ${order.id}`);
          results.success++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        results.failed++;
        results.errors.push(
          `Order ${order.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    console.log("Pickup reminder check completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${orders.length} order(s)`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-pickup-reminders function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = message.includes("Unauthorized");
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isAuthError ? 401 : 500,
      }
    );
  }
});
