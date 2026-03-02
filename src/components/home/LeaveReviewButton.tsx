import { useState } from "react";
import { useUser } from "@/hooks/use-user-clerk";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import ReviewSubmissionDialog from "./ReviewSubmissionDialog";

const LeaveReviewButton = () => {
    const { user, isLoaded } = useUser();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    if (!isLoaded || !user) {
        return null;
    }

    return (
        <>
            <Button
                onClick={() => setIsDialogOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90 text-white font-bold shadow-lg hover:shadow-xl transition-all px-8 py-6 text-lg"
            >
                <MessageSquarePlus className="mr-3 h-6 w-6" />
                Leave a Review
            </Button>

            <ReviewSubmissionDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </>
    );
};

export default LeaveReviewButton;
