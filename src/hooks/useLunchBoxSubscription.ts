import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  LunchBoxSubscription,
  CreateLunchBoxSubscriptionData,
  UpdateLunchBoxSubscriptionData,
  LunchBoxDelivery,
  CreateDeliveryData,
  UpdateDeliveryData,
} from "@/integrations/supabase/types/lunchbox";

export const useLunchBoxSubscription = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["lunchBoxSubscription", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("lunch_box_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LunchBoxSubscription | null;
    },
    enabled: !!userId,
  });
};

export const useAllUserSubscriptions = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["allLunchBoxSubscriptions", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("lunch_box_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LunchBoxSubscription[];
    },
    enabled: !!userId,
  });
};

export const useCreateLunchBoxSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLunchBoxSubscriptionData) => {
      const { data: subscription, error } = await supabase
        .from("lunch_box_subscriptions")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Auto-generate deliveries for weekly and monthly subscriptions
      if (
        subscription.subscription_type === "weekly" ||
        subscription.subscription_type === "monthly"
      ) {
        const { error: rpcError } = await supabase.rpc(
          "auto_generate_subscription_deliveries",
          { p_subscription_id: subscription.id },
        );

        if (rpcError) {
          console.error("Failed to auto-generate deliveries:", rpcError);
          // Don't throw error - subscription was created successfully
        }
      }

      return subscription as LunchBoxSubscription;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxSubscription", variables.user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["allLunchBoxSubscriptions", variables.user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["upcomingDeliveries"],
      });
    },
  });
};

export const useUpdateLunchBoxSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      userId,
    }: {
      id: string;
      data: UpdateLunchBoxSubscriptionData;
      userId: string;
    }) => {
      // SECURITY: Verify ownership before updating
      const { data: subscription, error } = await supabase
        .from("lunch_box_subscriptions")
        .update(data)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return subscription as LunchBoxSubscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxSubscription", data.user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["allLunchBoxSubscriptions", data.user_id],
      });
    },
  });
};

export const useCancelLunchBoxSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      // SECURITY: Verify ownership before cancelling
      const { data: subscription, error } = await supabase
        .from("lunch_box_subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return subscription as LunchBoxSubscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxSubscription", data.user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["allLunchBoxSubscriptions", data.user_id],
      });
    },
  });
};

export const usePauseLunchBoxSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data: subscription, error } = await supabase
        .from("lunch_box_subscriptions")
        .update({
          status: "paused",
          paused_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return subscription as LunchBoxSubscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxSubscription", data.user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["allLunchBoxSubscriptions", data.user_id],
      });
    },
  });
};

export const useResumeLunchBoxSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data: subscription, error } = await supabase
        .from("lunch_box_subscriptions")
        .update({
          status: "active",
          paused_at: null,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return subscription as LunchBoxSubscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxSubscription", data.user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["allLunchBoxSubscriptions", data.user_id],
      });
    },
  });
};

// Deliveries hooks
export const useSubscriptionDeliveries = (
  subscriptionId: string | undefined,
) => {
  return useQuery({
    queryKey: ["lunchBoxDeliveries", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return [];

      const { data, error } = await supabase
        .from("lunch_box_deliveries")
        .select(
          `
          *,
          menu_item:menu_items(id, name, description, image_url)
        `,
        )
        .eq("subscription_id", subscriptionId)
        .order("delivery_date", { ascending: true });

      if (error) throw error;
      return data as unknown as LunchBoxDelivery[];
    },
    enabled: !!subscriptionId,
  });
};

export const useUpcomingDeliveries = (subscriptionId: string | undefined) => {
  return useQuery({
    queryKey: ["upcomingDeliveries", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return [];

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("lunch_box_deliveries")
        .select(
          `
          *,
          menu_item:menu_items(id, name, description, image_url)
        `,
        )
        .eq("subscription_id", subscriptionId)
        .gte("delivery_date", today)
        .in("status", ["scheduled", "out_for_delivery"])
        .order("delivery_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as unknown as LunchBoxDelivery[];
    },
    enabled: !!subscriptionId,
  });
};

export const useUpdateDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDeliveryData;
    }) => {
      const { data: delivery, error } = await supabase
        .from("lunch_box_deliveries")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return delivery as LunchBoxDelivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxDeliveries", data.subscription_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["upcomingDeliveries", data.subscription_id],
      });
    },
  });
};

export const useUpdateDeliverySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      newSchedule,
    }: {
      subscriptionId: string;
      newSchedule: string[];
    }) => {
      const { data: subscription, error: subError } = await supabase
        .from("lunch_box_subscriptions")
        .update({
          delivery_schedule: newSchedule,
        })
        .eq("id", subscriptionId)
        .select()
        .single();

      if (subError) throw subError;

      // Generate/update deliveries based on new schedule
      const { error: funcError } = await supabase.rpc(
        "generate_deliveries_for_subscription",
        {
          p_subscription_id: subscriptionId,
          p_delivery_dates: newSchedule,
        },
      );

      if (funcError) throw funcError;

      const { data: nextDate, error: nextDateError } = await supabase.rpc(
        "calculate_next_delivery_date",
        { p_subscription_id: subscriptionId },
      );

      if (nextDateError) {
        console.error("Error calculating next delivery date:", nextDateError);
      }

      if (nextDate) {
        const { error: updateError } = await supabase
          .from("lunch_box_subscriptions")
          .update({ next_delivery_date: nextDate })
          .eq("id", subscriptionId);

        if (updateError) {
          console.error("Error updating next delivery date:", updateError);
          // Don't throw - this is non-critical
        }
      }

      return subscription as LunchBoxSubscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxSubscription", data.user_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxDeliveries", data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["upcomingDeliveries", data.id],
      });
    },
  });
};
