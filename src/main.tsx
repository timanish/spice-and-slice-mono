import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';
import { PostHogProvider } from 'posthog-js/react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

const options = {
  api_host: import.meta.env.DEV ? '/ingest' : (POSTHOG_HOST || 'https://us.i.posthog.com'),
  ui_host: 'https://us.i.posthog.com',
  defaults: '2025-11-30' as const,
  disable_session_recording: true,
  advanced_disable_decide: false,
  persistence: 'localStorage+cookie' as const,
  loaded: (posthog) => {
    // console.log('[PostHog] Initialized successfully');
    // console.log('[PostHog] Token:', posthog.config.token);
    // console.log('[PostHog] Host:', posthog.config.api_host);
    // console.log('[PostHog] Using proxy:', import.meta.env.DEV);
    // console.log('[PostHog] Autocapture:', posthog.config.autocapture);
    // console.log('[PostHog] Capture Pageview:', posthog.config.capture_pageview);
  },
}

if (!POSTHOG_KEY) {
  console.warn('[PostHog] API key not found - analytics will be disabled');
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    {POSTHOG_KEY ? (
      <PostHogProvider
        apiKey={POSTHOG_KEY}
        options={options}
      >
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      </PostHogProvider>
    ) : (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    )}
  </StrictMode>
);
