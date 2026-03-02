
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ResetPasswordErrorProps {
  message: string;
}

export const ResetPasswordError = ({ message }: ResetPasswordErrorProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Password Reset Error
          </h2>
        </div>
        
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
};
