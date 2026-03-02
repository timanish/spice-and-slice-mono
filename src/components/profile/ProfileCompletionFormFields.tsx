
import { Input } from '@/components/ui/input';

interface ProfileData {
  full_name: string;
  phone_number: string;
}

interface ProfileCompletionFormFieldsProps {
  profile: ProfileData;
  onProfileChange: (profile: ProfileData) => void;
}

const ProfileCompletionFormFields = ({ profile, onProfileChange }: ProfileCompletionFormFieldsProps) => {
  const updateProfile = (field: keyof ProfileData, value: string) => {
    onProfileChange({ ...profile, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Full Name *</label>
        <Input
          value={profile.full_name}
          onChange={(e) => updateProfile('full_name', e.target.value)}
          placeholder="Enter your full name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone Number *</label>
        <Input
          value={profile.phone_number}
          onChange={(e) => updateProfile('phone_number', e.target.value)}
          placeholder="Enter your phone number"
          required
        />
      </div>
      <p className="text-sm text-gray-600">
        You can add your delivery addresses later from your profile page.
      </p>
    </div>
  );
};

export default ProfileCompletionFormFields;
