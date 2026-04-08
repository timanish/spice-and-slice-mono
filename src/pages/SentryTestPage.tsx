import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';

const SentryTestPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-gray-600 text-sm">Sentry test page — safe to delete</p>
      <Button
        onClick={() => {
          throw new Error('This is your first error!');
        }}
        variant="destructive"
      >
        Break the world
      </Button>
      <Button
        onClick={() => {
          Sentry.captureException(new Error('Manual Sentry capture test'));
          alert('Event sent to Sentry!');
        }}
        variant="outline"
      >
        Capture silently
      </Button>
    </div>
  );
};

export default SentryTestPage;
