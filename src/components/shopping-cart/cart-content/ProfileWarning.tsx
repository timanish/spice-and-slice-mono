
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProfileWarningProps {
  showWarning: boolean;
}

const ProfileWarning: React.FC<ProfileWarningProps> = ({ showWarning }) => {
  const navigate = useNavigate();
  
  if (!showWarning) return null;
  
  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Please complete your profile with address and phone number before checkout.</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/profile')}
          className="ml-4 bg-white hover:bg-gray-100"
        >
          Complete Profile
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default ProfileWarning;
