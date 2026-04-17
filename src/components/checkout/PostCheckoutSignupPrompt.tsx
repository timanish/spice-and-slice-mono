import { Link } from "react-router-dom";
import { Sparkles, Package, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  orderId: string;
  guestTrackingToken: string;
}

/**
 * Rendered on OrderSuccessPage after a guest completes card payment.
 * Pitches a quick account signup so the customer can track future orders.
 * On clicking the CTA, routes to /auth with redirect_url pointing at
 * /claim?orderId=...&token=... — the /claim route runs claim-guest-profile
 * once Clerk finishes the sign-up and returns.
 */
export const PostCheckoutSignupPrompt = ({
  orderId,
  guestTrackingToken,
}: Props) => {
  const claimPath = `/claim?orderId=${encodeURIComponent(
    orderId,
  )}&token=${encodeURIComponent(guestTrackingToken)}`;
  const authHref = `/auth?redirect_url=${encodeURIComponent(claimPath)}`;

  return (
    <Card className="border-food-orange/40 bg-gradient-to-br from-food-orange/5 to-food-red/5 text-left">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-food-red to-food-orange text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-food-brown">
              Save your order — create a free account
            </p>
            <p className="text-sm text-gray-600">
              We'll link this order to your account automatically.
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <Package className="h-4 w-4 text-food-red mt-0.5 shrink-0" />
            <span>Track all your orders in one place, no emails to dig up.</span>
          </li>
          <li className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-food-orange mt-0.5 shrink-0" />
            <span>
              Checkout faster next time with saved addresses and payment
              details.
            </span>
          </li>
        </ul>

        <Button
          asChild
          className="w-full bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90"
        >
          <Link to={authHref}>Create my account</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
