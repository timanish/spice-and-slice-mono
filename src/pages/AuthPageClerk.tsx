import { SignIn, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const AuthPage = () => {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to home
  useEffect(() => {
    if (isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Header */}
      <div className="text-center mb-8 space-y-3">
        <h1 className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-[#8B0000] via-[#A52A2A] to-[#FF8C00] bg-clip-text text-transparent">
          Spice & Slice Bazaar
        </h1>
        
        <div className="flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#8B0000]/30"></div>
          <Sparkles className="h-4 w-4 text-[#FF8C00]" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#8B0000]/30"></div>
        </div>
        
        <p className="text-gray-700 text-base font-medium">
          Welcome back! Sign in to your account or create a new one.
        </p>
      </div>

      {/* Auth Form */}
      <SignIn 
        routing="path"
        path="/auth"
        signUpUrl="/auth"
        afterSignInUrl="/"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "w-full shadow-xl",
            formButtonPrimary: "bg-gradient-to-r from-[#8B0000] to-[#A52A2A] hover:from-[#6B0000] hover:to-[#8B0000]",
            footerActionLink: "text-[#8B0000] hover:text-[#6B0000]",
          }
        }}
      />

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-[#8B0000] hover:text-[#6B0000] font-semibold hover:underline">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="/privacy" className="text-[#8B0000] hover:text-[#6B0000] font-semibold hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
