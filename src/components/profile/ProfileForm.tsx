
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { useUserData } from '@/hooks/useUserData';

interface ProfileFormProps {
  initialProfile: {
    full_name: string;
    phone_number: string;
  };
}

const ProfileForm = ({ initialProfile }: ProfileFormProps) => {
  const [profile, setProfile] = useState(initialProfile);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSignedIn } = useClerkUser();
  const { updateProfile } = useUserData();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      if (!isSignedIn) {
        throw new Error('No user found');
      }

      await updateProfile({
        full_name: profile.full_name,
        phone_number: profile.phone_number,
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <Input
            value={profile.full_name || ''}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <Input
            value={profile.phone_number || ''}
            onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
            placeholder="Enter your phone number"
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isUpdating}
      >
        {isUpdating ? "Updating..." : "Update Profile"}
      </Button>
    </form>
  );
};

export default ProfileForm;
