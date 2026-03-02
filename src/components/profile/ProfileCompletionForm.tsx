
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProfileCompletionFormFields from './ProfileCompletionFormFields';
import { useUser as useClerkUser } from '@clerk/clerk-react';

interface ProfileData {
  full_name: string;
  phone_number: string;
}

interface ProfileCompletionFormProps {
  onClose: () => void;
}

const ProfileCompletionForm = ({ onClose }: ProfileCompletionFormProps) => {
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    phone_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isSignedIn } = useClerkUser();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (!isSignedIn || !user?.id) {
        console.error('ProfileCompletionForm: No Clerk user found');
        throw new Error('No user session found. Please try logging in again.');
      }
      const { data: updateResult, error: updateError } = await supabase
        .from('profiles')
        .update({
          email: user.primaryEmailAddress?.emailAddress,
          ...profile
        })
        .eq('id', user.id)
        .select();


      if (updateError) {
        console.error('ProfileCompletionForm: Profile update error:', updateError);
        throw updateError;
      }


      toast({
        title: "Profile completed!",
        description: "Welcome to Spice & Slice! You can now start ordering.",
      });
      
      onClose();
      navigate('/');
    } catch (error: any) {
      console.error('ProfileCompletionForm: Profile completion error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: "Profile skipped",
      description: "You can complete your profile later from the Profile page.",
    });
    onClose();
    navigate('/');
  };

  return (
    <form onSubmit={handleUpdate} className="space-y-4">
      <ProfileCompletionFormFields 
        profile={profile} 
        onProfileChange={setProfile} 
      />
      
      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Saving...' : 'Complete Profile'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip for now
        </Button>
      </div>
    </form>
  );
};

export default ProfileCompletionForm;
