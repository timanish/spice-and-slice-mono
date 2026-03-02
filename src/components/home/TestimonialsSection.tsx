import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

interface Testimonial {
  id: string;
  customer_name: string;
  customer_image: string | null;
  rating: number;
  review: string;
  source: string;
  user_id: string | null;
}

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("status", "approved")
        .eq("is_active", true)
        .order("display_order")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const mockTestimonials: Testimonial[] = [
    {
      id: "1",
      customer_name: "Prajwol P.",
      customer_image: "/assets/waiwai.png",
      rating: 5,
      review: "It was super good, thanks Spice&Splice team for this. Love it! Delivery was quick. I've been ordering from them for months now and never disappointed.",
      source: "admin",
      user_id: null,
    },
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : mockTestimonials;
  const currentTestimonial = displayTestimonials[currentIndex];

  // Auto-rotation - only depends on isPaused, not currentIndex
  useEffect(() => {
    if (isPaused || displayTestimonials.length <= 1) {
      return;
    }

    const rotateTestimonial = () => {
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev + 1) % displayTestimonials.length);
      setTimeout(() => setIsAnimating(false), 500);
    };

    timerRef.current = setInterval(rotateTestimonial, 5000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, displayTestimonials.length]);

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="container text-center">
          <p className="text-gray-600">Loading testimonials...</p>
        </div>
      </section>
    );
  }

  if (!currentTestimonial) {
    return null;
  }

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % displayTestimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handlePrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + displayTestimonials.length) % displayTestimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleThumbnailClick = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <section
      className="py-16 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-food-orange/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-food-red/5 rounded-full blur-3xl"></div>

      <div className="container relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Quote className="h-10 w-10 text-food-red fill-food-red/20" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-food-brown to-food-red bg-clip-text text-transparent">
              What Our Customers Say
            </h2>
          </div>
          <p className="text-muted-foreground text-lg">
            This is what customers feel about Spice&Splice.
          </p>
        </div>

        {/* Main Testimonial Display */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            {/* Left: Large Customer Image */}
            <div className="lg:col-span-2">
              <div className="relative">
                {/* Decorative quote background */}
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-food-red/10 rounded-full blur-2xl"></div>

                {/* Image with animation */}
                <div
                  key={currentTestimonial.id}
                  className={`relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white transition-all duration-500 ease-in-out ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                >
                  <img
                    src={currentTestimonial.customer_image || "/placeholder.svg"}
                    alt={currentTestimonial.customer_name}
                    className="w-full h-[500px] object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

                  {/* Star rating overlay */}
                  <div className="absolute bottom-6 left-6 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${i < currentTestimonial.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-white/50 fill-white/50"
                          } drop-shadow-lg`}
                      />
                    ))}
                  </div>
                </div>

                {/* Thumbnail indicators */}
                <div className="flex gap-3 justify-center mt-6">
                  {displayTestimonials.map((testimonial, index) => (
                    <button
                      key={testimonial.id}
                      onClick={() => handleThumbnailClick(index)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-3 transition-all duration-300 ${currentIndex === index
                        ? 'border-food-red shadow-lg scale-110'
                        : 'border-gray-200 hover:border-food-red/50 opacity-60 hover:opacity-100'
                        }`}
                    >
                      <img
                        src={testimonial.customer_image || "/placeholder.svg"}
                        alt={testimonial.customer_name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Testimonial Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Large Quote Icon */}
              <div className="relative">
                <Quote className="h-20 w-20 text-food-red/10 absolute -top-4 -left-4" />
              </div>

              {/* Review Text with animation */}
              <div
                key={`review-${currentTestimonial.id}`}
                className={`relative transition-all duration-500 ease-in-out ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                  }`}
              >
                <p className="text-2xl md:text-3xl text-gray-700 leading-relaxed font-light italic">
                  "{currentTestimonial.review}"
                </p>
              </div>

              {/* Customer Info */}
              <div
                key={`name-${currentTestimonial.id}`}
                className={`flex items-center justify-between transition-all duration-500 ease-in-out delay-75 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                  }`}
              >
                <div>
                  <p className="text-2xl font-bold text-food-brown mb-1">
                    {currentTestimonial.customer_name}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    {currentTestimonial.source === 'user' ? 'Verified Customer' : 'Featured Review'}
                  </p>
                </div>

                {/* Navigation Controls */}
                <div className="flex gap-2">
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    size="icon"
                    className="rounded-full border-2 hover:border-food-red hover:text-food-red transition-colors"
                    disabled={isAnimating}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={handleNext}
                    variant="outline"
                    size="icon"
                    className="rounded-full border-2 hover:border-food-red hover:text-food-red transition-colors"
                    disabled={isAnimating}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
