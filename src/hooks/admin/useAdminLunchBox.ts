import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import type {
  LunchBoxDelivery,
  LunchBoxSubscription,
} from "@/integrations/supabase/types/lunchbox";

export interface DeliveryWithSubscription extends LunchBoxDelivery {
  subscription: {
    id: string;
    company: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    delivery_instructions: string | null;
    user_id: string;
    subscription_type: string;
  };
}

export const useAllDeliveries = (filters?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  city?: string;
  hasMenu?: boolean;
}) => {
  const { isAdmin } = useAdminRole();
  const { select } = useAdminCrud();

  return useQuery({
    queryKey: ["adminAllDeliveries", filters],
    queryFn: async () => {
      if (!isAdmin) {
        throw new Error("Unauthorized - admin access required");
      }

      const queryFilters: Array<{ column: string; operator: string; value: unknown }> = [];

      if (filters?.dateFrom) {
        queryFilters.push({ column: "delivery_date", operator: "gte", value: filters.dateFrom });
      }
      if (filters?.dateTo) {
        queryFilters.push({ column: "delivery_date", operator: "lte", value: filters.dateTo });
      }
      if (filters?.status) {
        queryFilters.push({ column: "status", operator: "eq", value: filters.status });
      }
      if (filters?.hasMenu === false) {
        queryFilters.push({ column: "menu_item_id", operator: "is", value: null });
      }

      const { data } = await select("lunch_box_deliveries", {
        columns: `
          *,
          menu_item:menu_items(id, name, description, image_url),
          subscription:lunch_box_subscriptions(
            id, company, address_line1, address_line2, city, state,
            postal_code, delivery_instructions, user_id, subscription_type
          )
        `,
        filters: queryFilters,
        order: { column: "delivery_date", ascending: true },
      });

      let filteredData = (data || []) as unknown as DeliveryWithSubscription[];

      // Client-side filter for hasMenu=true (IS NOT NULL not supported via admin-crud filters)
      if (filters?.hasMenu === true) {
        filteredData = filteredData.filter((d) => d.menu_item_id != null);
      }

      if (filters?.city) {
        filteredData = filteredData.filter((d) =>
          d.subscription.city
            .toLowerCase()
            .includes(filters.city!.toLowerCase()),
        );
      }

      return filteredData;
    },
    enabled: isAdmin,
  });
};

export const useDeliveriesByDate = (date: string) => {
  const { isAdmin } = useAdminRole();
  const { select } = useAdminCrud();

  return useQuery({
    queryKey: ["adminDeliveriesByDate", date],
    queryFn: async () => {
      if (!isAdmin) {
        throw new Error("Unauthorized - admin access required");
      }

      const { data } = await select("lunch_box_deliveries", {
        columns: `
          *,
          menu_item:menu_items(id, name, description, image_url),
          subscription:lunch_box_subscriptions(
            id, company, address_line1, address_line2, city, state,
            postal_code, delivery_instructions, user_id, subscription_type
          )
        `,
        filters: [
          { column: "delivery_date", operator: "eq", value: date },
        ],
        order: { column: "created_at", ascending: true },
      });

      return (data || []) as unknown as DeliveryWithSubscription[];
    },
    enabled: !!date && isAdmin,
  });
};

export const useLunchBoxMenuItems = () => {
  return useQuery({
    queryKey: ["lunchBoxMenuItems"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("lunch_box_eligible", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

// Bulk assign menu to deliveries
export const useAssignMenuBulk = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { update } = useAdminCrud();

  return useMutation({
    mutationFn: async ({
      deliveryIds,
      menuItemId,
    }: {
      deliveryIds: string[];
      menuItemId: string;
    }) => {
      await update("lunch_box_deliveries", { menu_item_id: menuItemId }, [
        { column: "id", operator: "in", value: deliveryIds },
      ]);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminAllDeliveries"] });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveriesByDate"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingDeliveries"] });
      toast({
        title: "Menu Assigned",
        description: `Successfully assigned menu to ${
          variables.deliveryIds.length
        } ${variables.deliveryIds.length === 1 ? "delivery" : "deliveries"}`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign menu to deliveries",
      });
      console.error("Error assigning menu:", error);
    },
  });
};

// Assign menu to single delivery
export const useAssignMenuToDelivery = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { update } = useAdminCrud();

  return useMutation({
    mutationFn: async ({
      deliveryId,
      menuItemId,
    }: {
      deliveryId: string;
      menuItemId: string | null;
    }) => {
      await update("lunch_box_deliveries", { menu_item_id: menuItemId }, [
        { column: "id", operator: "eq", value: deliveryId },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAllDeliveries"] });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveriesByDate"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingDeliveries"] });
      toast({
        title: "Menu Updated",
        description: "Successfully updated menu assignment",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update menu assignment",
      });
      console.error("Error updating menu:", error);
    },
  });
};

// Update delivery status
export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { update } = useAdminCrud();

  return useMutation({
    mutationFn: async ({
      deliveryId,
      status,
      driverNotes,
    }: {
      deliveryId: string;
      status: string;
      driverNotes?: string;
    }) => {
      const updateData: Record<string, string> = { status };

      if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      if (driverNotes !== undefined) {
        updateData.driver_notes = driverNotes;
      }

      await update("lunch_box_deliveries", updateData, [
        { column: "id", operator: "eq", value: deliveryId },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAllDeliveries"] });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveriesByDate"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingDeliveries"] });
      toast({
        title: "Status Updated",
        description: "Delivery status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update delivery status",
      });
      console.error("Error updating status:", error);
    },
  });
};

// Generate missing deliveries for a subscription
export const useGenerateMissingDeliveries = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.rpc(
        "auto_generate_subscription_deliveries",
        { p_subscription_id: subscriptionId },
      );

      if (error) throw error;
      return data as number;
    },
    onSuccess: (generatedCount, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: ["adminAllDeliveries"] });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveriesByDate"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingDeliveries"] });
      queryClient.invalidateQueries({
        queryKey: ["lunchBoxSubscription"],
      });
      toast({
        title: "Deliveries Generated",
        description: `Generated ${generatedCount} delivery ${
          generatedCount === 1 ? "record" : "records"
        }`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate delivery records",
      });
      console.error("Error generating deliveries:", error);
    },
  });
};

// Bulk generate deliveries for all active subscriptions
export const useBulkGenerateMissingDeliveries = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        "bulk_generate_missing_deliveries",
      );

      if (error) throw error;
      return data as Array<{
        subscription_id: string;
        generated_count: number;
      }>;
    },
    onSuccess: (results) => {
      const totalGenerated = results.reduce(
        (sum, r) => sum + r.generated_count,
        0,
      );
      queryClient.invalidateQueries({ queryKey: ["adminAllDeliveries"] });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveriesByDate"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingDeliveries"] });
      queryClient.invalidateQueries({
        queryKey: ["adminLunchBoxSubscriptions"],
      });
      toast({
        title: "Bulk Generation Complete",
        description: `Generated ${totalGenerated} delivery records across ${results.length} subscriptions`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to bulk generate deliveries",
      });
      console.error("Error bulk generating:", error);
    },
  });
};
