import { useState } from "react";
import { useUser } from "@/hooks/use-user-clerk";
import { useSubmitReview } from "@/hooks/useSubmitReview";
import { uploadImage } from "@/lib/upload-image";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Upload, X } from "lucide-react";

interface ReviewSubmissionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ReviewSubmissionDialog = ({ open, onOpenChange }: ReviewSubmissionDialogProps) => {
    const { user } = useUser();
    const { toast } = useToast();
    const submitReview = useSubmitReview();
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Invalid file type",
                    description: "Please select an image file",
                    variant: "destructive",
                });
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: "Please select an image under 5MB",
                    variant: "destructive",
                });
                return;
            }

            setSelectedFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedFile(null);
        setImagePreview("");
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!selectedFile || !user) return null;

        setIsUploading(true);
        try {
            const fileExt = selectedFile.name.split(".").pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `testimonials/${fileName}`;

            return await uploadImage(selectedFile, filePath);
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({
                title: "Upload failed",
                description: "Failed to upload image. Please try again.",
                variant: "destructive",
            });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            return;
        }

        let uploadedImageUrl = "";

        if (selectedFile) {
            const url = await uploadImage();
            if (!url) {
                return;
            }
            uploadedImageUrl = url;
        }

        submitReview.mutate(
            {
                rating,
                review: reviewText,
                customer_image: uploadedImageUrl || undefined,
            },
            {
                onSuccess: () => {
                    // Reset form
                    setRating(5);
                    setReviewText("");
                    setSelectedFile(null);
                    setImagePreview("");
                    onOpenChange(false);
                },
            }
        );
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-food-brown">
                        Leave a Review
                    </DialogTitle>
                    <DialogDescription>
                        Share your experience with Spice&Splice! Your review will be submitted for approval.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Rating */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Rating *</Label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredStar(star)}
                                    onMouseLeave={() => setHoveredStar(null)}
                                    className="transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`h-10 w-10 ${star <= (hoveredStar || rating)
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-gray-300"
                                            }`}
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-lg font-medium text-gray-700">
                                {rating} {rating === 1 ? "star" : "stars"}
                            </span>
                        </div>
                    </div>

                    {/* Review Text */}
                    <div className="space-y-2">
                        <Label htmlFor="review" className="text-base font-semibold">
                            Your Review *
                        </Label>
                        <Textarea
                            id="review"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Tell us about your experience with our products and service..."
                            required
                            rows={6}
                            maxLength={500}
                            className="resize-none"
                        />
                        <p className="text-sm text-gray-500 text-right">
                            {reviewText.length}/500 characters
                        </p>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="imageUpload" className="text-base font-semibold">
                            Upload Image (Optional)
                        </Label>

                        {!imagePreview ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    id="imageUpload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById("imageUpload")?.click()}
                                    className="w-full"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Choose Image
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-48 object-cover rounded-lg border"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={handleRemoveImage}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <p className="text-sm text-gray-500">
                            Add a photo to showcase your favorite products (Max 5MB)
                        </p>
                    </div>
                    {/* Customer Name Preview */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                            Review will be submitted as:{" "}
                            <span className="font-semibold text-gray-900">
                                {user?.fullName || user?.firstName || "Anonymous"}
                            </span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitReview.isPending || isUploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!reviewText || submitReview.isPending || isUploading}
                            className="bg-food-red hover:bg-food-red/90"
                        >
                            {isUploading ? "Uploading..." : submitReview.isPending ? "Submitting..." : "Submit Review"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ReviewSubmissionDialog;
