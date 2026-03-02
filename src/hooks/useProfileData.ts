import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { useUserData } from "@/hooks/useUserData";

export type ProfileData = {
  full_name: string;
  phone_number: string;
};

export const useProfileData = () => {
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    phone_number: "",
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, isLoaded } = useClerkUser();
  const profileFetchedRef = useRef(false);
  const { getProfile } = useUserData();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!isLoaded) return;
        if (profileFetchedRef.current) return;
        if (!user?.id) throw new Error("No user found");

        const result = await getProfile();
        if (result.data) setProfile(result.data);

        profileFetchedRef.current = true;
        setLoading(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load profile";
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, isLoaded, toast, getProfile]);

  return { profile, loading };
};
