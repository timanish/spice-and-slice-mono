import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PendingReview {
    id: string;
    user_id: string | null;
    user_email: string | null;
    customer_name: string;
    customer_image: string | null;
    rating: number;
    review: string;
    source: string;
    status: string;
    created_at: string;
}

export const usePendingReviews = () => {
    return useQuery({
        queryKey: ["pending-reviews"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("testimonials")
                .select("*")
                .eq("status", "pending")
                .eq("source", "user")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as PendingReview[];
        },
    });
};
