import { UtensilsCrossed } from "lucide-react";

export function MenuComingSoon() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <UtensilsCrossed className="h-20 w-20 text-amber-400 mb-6" />
      <h1 className="text-5xl font-serif font-bold text-amber-400 mb-4">
        Menu Coming Soon
      </h1>
      <p className="text-xl text-gray-400">
        Our menu display is being prepared. Please check back shortly.
      </p>
    </div>
  );
}
