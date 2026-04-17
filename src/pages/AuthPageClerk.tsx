import { SignIn, useAuth } from '@clerk/clerk-react';
import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Sparkles } from 'lucide-react';

import { useCartStore } from '@/stores/cart';

const AuthPage = () => {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { items, comboItems } = useCartStore();

  // Clerk treats redirect_url as the post-signin destination. Honor the query
  // param if present, otherwise fall back to home.
  const redirectUrl = searchParams.get('redirect_url') || '/';

  // Redirect authenticated users to wherever they were headed.
  useEffect(() => {
    if (isSignedIn) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isSignedIn, navigate, redirectUrl]);

  // Show the guest-checkout banner when it would actually help: the cart has
  // items and the user was bounced here while heading to checkout.
  const showGuestBanner = useMemo(() => {
    const hasCart = items.length > 0 || comboItems.length > 0;
    const cameFromCheckout =
      redirectUrl.startsWith('/checkout') ||
      location.state?.from === '/checkout';
    return hasCart && cameFromCheckout;
  }, [items.length, comboItems.length, redirectUrl, location.state]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Header */}
      <div className="text-center mb-8 space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-[#8B0000] via-[#A52A2A] to-[#FF8C00] bg-clip-text text-transparent">
          Spice & Slice Bazaar
        </h1>

        <div className="flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#8B0000]/30"></div>
          <Sparkles className="h-4 w-4 text-[#FF8C00]" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#8B0000]/30"></div>
        </div>

        <p className="text-gray-700 text-base font-medium">
          Welcome back! Sign in to your account or create a new one.
        </p>
      </div>

      {showGuestBanner && (
        <div className="w-full max-w-sm mb-6">
          <Link
            to="/checkout/guest"
            className="group flex items-center justify-between gap-3 rounded-lg border border-[#FF8C00]/40 bg-gradient-to-r from-[#FF8C00]/10 to-[#8B0000]/10 px-4 py-3 hover:from-[#FF8C00]/15 hover:to-[#8B0000]/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-[#8B0000] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#8B0000]">
                  Just shopping?
                </p>
                <p className="text-xs text-gray-600">
                  Continue to checkout as a guest — no account needed.
                </p>
              </div>
            </div>
            <span className="text-[#8B0000] text-lg group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>
        </div>
      )}

      {/* Auth Form */}
      <SignIn
        routing="path"
        path="/auth"
        signUpUrl="/auth"
        afterSignInUrl={redirectUrl}
        afterSignUpUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "w-full shadow-xl",
            formButtonPrimary: "bg-gradient-to-r from-[#8B0000] to-[#A52A2A] hover:from-[#6B0000] hover:to-[#8B0000]",
            footerActionLink: "text-[#8B0000] hover:text-[#6B0000]",
          }
        }}
      />

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-[#8B0000] hover:text-[#6B0000] font-semibold hover:underline">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="/privacy" className="text-[#8B0000] hover:text-[#6B0000] font-semibold hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
