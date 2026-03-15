import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";

interface ProfileData {
  full_name?: string;
  phone_number?: string;
  profile_completed?: boolean;
}

interface LocationState {
  from?: {
    pathname: string;
  };
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoaded } = useClerkUser();
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const { trackEvent } = usePostHogTracking();

  // Get the redirect path from location state, or default to home
  const redirectPath = (location.state as LocationState)?.from?.pathname || "/";
  
  // Track onboarding started
  useEffect(() => {
    if (!isLoading && !profileData?.profile_completed) {
      trackEvent('onboarding_started' as any, {});
    }
  }, [isLoading, profileData, trackEvent]);

  console.log("🟣 OnboardingPage - user:", user?.id, "isLoaded:", isLoaded);

  useEffect(() => {
    const loadProfile = async () => {
      console.log("🔷 OnboardingPage - loadProfile called");
      
      if (!isLoaded) {
        console.log("⏳ OnboardingPage - Clerk not loaded yet");
        return;
      }
      
      if (!user?.id) {
        console.log("❌ OnboardingPage - No user ID");
        setIsLoading(false);
        return;
      }

      console.log("👤 OnboardingPage - Loading profile for:", user.id);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        // Type assertion until Supabase types are regenerated
        const profile = data as unknown as ProfileData;
        setProfileData(profile);
        
        console.log("📋 Onboarding: Loaded profile data:", profile);
        console.log("   - profile_completed:", profile?.profile_completed);
        console.log("   - redirectPath:", redirectPath);
        
        // If profile is already completed, redirect
        if (profile?.profile_completed) {
          console.log("✅ Profile already completed, redirecting to:", redirectPath);
          navigate(redirectPath, { replace: true });
        } else {
          console.log("❌ Profile not completed, staying on onboarding");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.id, isLoaded, navigate, redirectPath]);

  const handleComplete = () => {
    trackEvent('onboarding_completed' as any, {});
    navigate(redirectPath, { replace: true });
  };

  const handleSkip = () => {
    navigate(redirectPath, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            Welcome to Spice & Slice!
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Let's get your account set up for a seamless ordering experience
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                1
              </div>
              <span>Complete Profile</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                2
              </div>
              <span>Start Ordering</span>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-lg shadow-lg border p-8">
          <OnboardingForm
            onComplete={handleComplete}
            onSkip={handleSkip}
            initialData={{
              fullName: profileData?.full_name,
              phone: profileData?.phone_number,
            }}
          />
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:support@spicesplice.com" className="text-primary hover:underline">
            support@spicesplice.com
          </a>
        </p>
      </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
