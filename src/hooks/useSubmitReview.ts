import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user-clerk";
import { useToast } from "@/hooks/use-toast";
import { useUserData } from "@/hooks/useUserData";

interface SubmitReviewData {
  rating: number;
  review: string;
  customer_image?: string;
}

export const useSubmitReview = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { submitReview } = useUserData();

  return useMutation({
    mutationFn: async (data: SubmitReviewData) => {
      if (!user) {
        throw new Error("You must be logged in to submit a review");
      }

      await submitReview({
        customer_name: user.fullName || user.firstName || "Anonymous",
        rating: data.rating,
        review_text: data.review,
        image_url: data.customer_image || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["pending-reviews"] });
      toast({
        title: "Review submitted!",
        description: "Your review has been submitted and is pending approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting review",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
