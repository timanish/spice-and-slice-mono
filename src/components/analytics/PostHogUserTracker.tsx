import { useEffect } from 'react';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

/**
 * PostHog User Tracker
 * Automatically identifies users and tracks auth events
 */
export const PostHogUserTracker = () => {
  const { user, isSignedIn } = useClerkUser();
  const { identifyUser, resetUser, trackEvent } = usePostHogTracking();

  useEffect(() => {
    if (isSignedIn && user) {
      identifyUser(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        created_at: user.createdAt,
        has_image: !!user.imageUrl,
      });
    } else {
      resetUser();
    }
  }, [isSignedIn, user, identifyUser, resetUser]);

  return null;
};
