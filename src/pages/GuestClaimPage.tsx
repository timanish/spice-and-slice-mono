import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ArrowRight, CheckCircle, Loader2, AlertTriangle } from "lucide-react";

import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchWithAuth } from "@/lib/auth-token";

type ClaimState = "waiting-auth" | "claiming" | "done" | "error";

const GuestClaimPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();

  const [state, setState] = useState<ClaimState>("waiting-auth");
  const [ordersClaimed, setOrdersClaimed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const claimAttempted = useRef(false);

  // Redirect unauthenticated visitors to /auth. Preserve the original
  // /claim URL as the post-signin destination so they end up right back here.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const current =
        window.location.pathname + window.location.search;
      navigate(`/auth?redirect_url=${encodeURIComponent(current)}`, {
        replace: true,
      });
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || claimAttempted.current) return;
    claimAttempted.current = true;

    (async () => {
      setState("claiming");
      try {
        const res = await fetchWithAuth("claim-guest-profile", {});
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to link your orders");
        }
        setOrdersClaimed(data.ordersClaimed || 0);
        setState("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to link orders");
        setState("error");
      }
    })();
  }, [isLoaded, isSignedIn]);

  const orderIdHint = searchParams.get("orderId");
  const tokenHint = searchParams.get("token");

  if (state === "waiting-auth" || state === "claiming") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container mx-auto max-w-xl px-4 py-16 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-food-red" />
          <p className="mt-4 text-gray-600">
            {state === "claiming"
              ? "Linking your orders to your new account..."
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container mx-auto max-w-xl px-4 py-16">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="items-center text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <CardTitle className="mt-2">We couldn't link your orders</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Your account was created successfully and any orders you place
                from now on will be tracked. If you expected an existing order
                to be linked, please contact support.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild className="flex-1">
                  <Link to="/profile?tab=orders">Go to my orders</Link>
                </Button>
                {orderIdHint && tokenHint && (
                  <Button asChild variant="outline" className="flex-1">
                    <Link
                      to={`/guest-track/${orderIdHint}?token=${encodeURIComponent(tokenHint)}`}
                    >
                      View order by link
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      <div className="container mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader className="items-center text-center">
            <CheckCircle className="h-12 w-12 text-food-green" />
            <CardTitle className="mt-3 text-2xl font-serif">
              You're all set
            </CardTitle>
            <CardDescription>
              {ordersClaimed > 0
                ? `We linked ${ordersClaimed} order${
                    ordersClaimed > 1 ? "s" : ""
                  } to your new account.`
                : "Your account is ready. Future orders will appear in your profile automatically."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-gradient-to-r from-food-red to-food-orange">
              <Link to="/profile?tab=orders">
                View my orders
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestClaimPage;
