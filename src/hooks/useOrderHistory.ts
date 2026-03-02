import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { useUserData } from "@/hooks/useUserData";

export type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status?: string;
  fulfillment_status?: string;
  fulfillment_type?: string;
  delivery_date?: string;
  delivery_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  order_items: Array<any>;
};

export const useOrderHistory = (activeTab: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(activeTab === "orders");
  const { toast } = useToast();
  const ordersFetchedRef = useRef(false);
  const { user, isSignedIn } = useClerkUser();
  const { listOrders } = useUserData();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (activeTab !== "orders" || ordersFetchedRef.current) return;

        setLoading(true);

        if (!isSignedIn || !user?.id) {
          throw new Error("No user found");
        }

        const result = await listOrders();
        if (result.data) setOrders(result.data);

        ordersFetchedRef.current = true;
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    if (activeTab === "orders" && !ordersFetchedRef.current) {
      fetchOrders();
    }
  }, [activeTab, toast, user?.id, isSignedIn, listOrders]);

  return { orders, loading };
};
