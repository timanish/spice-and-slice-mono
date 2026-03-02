import { SignIn, useUser as useClerkUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen flex items-center justify-center p-4">
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
