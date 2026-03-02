
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ProfileCompletionForm from './ProfileCompletionForm';

interface ProfileCompletionPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const ProfileCompletionPopover = ({ isOpen, onClose, userEmail }: ProfileCompletionPopoverProps) => {
  useEffect(() => {
  }, [isOpen, userEmail]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Welcome to Spice & Slice! Please complete your profile to start ordering.
            {userEmail && (
              <span className="block mt-2 text-sm font-medium">
                Email confirmed: {userEmail}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <ProfileCompletionForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionPopover;
