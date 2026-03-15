import { SignIn, useUser as useClerkUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AuthPage = () => {
  const { isSignedIn, isLoaded } = useClerkUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, isLoaded, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B0000]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Back to home link */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-food-red transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
      
      <SignIn 
        routing="path" 
        path="/auth"
        signUpUrl="/auth"
        afterSignInUrl="/"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "w-full",
          }
        }}
      />
    </div>
  );
};

export default AuthPage;
