import { CateringFormValues, SelectedMenuItem } from "./types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@clerk/clerk-react";

interface CateringEnquiryData extends CateringFormValues {
  selectedItems: SelectedMenuItem[];
  spiceLevel: string;
}

export const useCateringService = () => {
  const { toast } = useToast();
  const { user } = useUser();

  const sendCateringEnquiry = async (data: CateringEnquiryData) => {
    try {
      const totalPeople = data.selectedItems.reduce((sum, item) => sum + item.servingCount, 0);

      if (user?.id) {
        const { error: dbError } = await supabase
          .from("catering_requests")
          .insert({
            user_id: user.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            guest_count: totalPeople,
            event_type: data.eventType,
            event_date: data.eventDate,
            event_time: data.eventTime,
            venue: data.venue,
            dietary_restrictions: data.dietaryRestrictions || null,
            additional_info: data.additionalInfo || null,
            selected_items: data.selectedItems as any,
            status: "pending",
          } as any)
          .select();

        if (dbError) {
          console.error("Error saving to database:", dbError);
        }
      } else {
        console.warn("No user ID found, skipping database save");
      }

      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          subject: `Catering Enquiry for ${data.eventType}`,
          message: `
Event Details:
- Event Type: ${data.eventType}
- Event Date: ${data.eventDate}
- Event Time: ${data.eventTime}
- Venue: ${data.venue}
- Spice Level: ${data.spiceLevel}
- Selected Items:
${data.selectedItems
  .map((item) => `  • ${item.menuItem.name} — ${item.servingCount} people`)
  .join("\n")}
- Total People: ${totalPeople}
- Dietary Restrictions: ${data.dietaryRestrictions || "None"}
- Additional Information: ${data.additionalInfo || "None"}
          `,
        },
      });

      if (error) throw error;

      toast({
        title: "Enquiry Submitted",
        description:
          "Thank you for your catering enquiry. Our team will contact you shortly to discuss details and pricing.",
      });

      return true;
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Failed to submit your enquiry. Please try again or contact us directly.",
      });
      return false;
    }
  };

  return { sendCateringEnquiry };
};
