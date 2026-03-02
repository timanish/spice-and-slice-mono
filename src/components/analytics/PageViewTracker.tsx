import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

/**
 * Page View Tracker
 * Automatically tracks page views when route changes
 */
export const PageViewTracker = () => {
  const location = useLocation();
  const { trackEvent } = usePostHogTracking();

  useEffect(() => {
    trackEvent('page_viewed', {
      page_path: location.pathname + location.search,
      page_title: document.title,
      referrer: document.referrer,
    });
  }, [location.pathname, location.search, trackEvent]);

  return null;
};
