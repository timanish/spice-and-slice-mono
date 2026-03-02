
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthSuccessMessageProps {
  type: 'signup' | 'reset';
  onBackToLogin: () => void;
}

export const AuthSuccessMessage = ({ type, onBackToLogin }: AuthSuccessMessageProps) => {
  const message = type === 'signup'
    ? 'Please check your email for a confirmation link to complete your signup.'
    : 'We\'ve sent you an email with instructions to reset your password.';

  return (
    <Alert>
      <AlertDescription>
        {message}
        {type === 'signup' && ' The email might take a few minutes to arrive. Be sure to check your spam folder as well.'}
        <div className="mt-4">
          <Button 
            variant="outline" 
            onClick={onBackToLogin}
            className="mr-2"
          >
            Back to Login
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
