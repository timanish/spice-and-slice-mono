import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LayoutDashboard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { UserButton, SignInButton, useUser as useClerkUser } from '@clerk/clerk-react';
import { useUser } from "@/hooks/use-user-clerk";

const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useClerkUser();
  const { isAdmin, isCheckingRole } = useUser();
  
  const handleSignInClick = () => {
    navigate('/auth');
  };
  
  return (
    <>
      {user ? (
        <UserButton 
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-9 w-9"
            }
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="Profile"
              labelIcon={<User className="h-4 w-4" />}
              href="/profile"
            />
            <UserButton.Action label="manageAccount" />
          </UserButton.MenuItems>
        </UserButton>
      ) : (
        <SignInButton mode="modal">
          <Button 
            size="sm" 
            className="bg-food-red hover:bg-food-red/90"
          >
            Login
          </Button>
        </SignInButton>
      )}
    </>
  );
};

export default UserMenu;
