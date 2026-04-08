import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import * as Sentry from '@sentry/react';

/**
 * Sets the current Clerk user as the Sentry user context so every
 * captured error is tied to a specific customer.
 */
export const SentryUserIdentifier = () => {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      Sentry.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.fullName ?? undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [isSignedIn, user]);

  return null;
};
