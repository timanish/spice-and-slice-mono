
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import NavItems from './NavItems';
import AdminItems from './AdminItems';
import CartButton from './CartButton';
import { UserButton, SignInButton, useUser } from '@clerk/clerk-react';

// Define a combined interface that works for both regular and admin items
interface BaseNavItem {
  name: string;
  path: string;
}

interface RegularNavItem extends BaseNavItem {
  icon?: React.ElementType;
}

interface AdminNavItem extends BaseNavItem {
  icon: React.ElementType;
}

interface MobileMenuProps {
  isOpen: boolean;
  navItems: RegularNavItem[];
  adminItems: AdminNavItem[];
  isAdmin: boolean;
  totalItems: number;
  onCartOpen: () => void;
  onMenuClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  navItems,
  adminItems,
  isAdmin,
  totalItems,
  onCartOpen,
  onMenuClose
}) => {
  const { user } = useUser();

  return (
    <div
      className={`${
        isOpen ? "block" : "hidden"
      } md:hidden absolute top-full left-0 right-0 z-40 bg-white shadow-lg border-t`}
      id="mobile-menu"
    >
      <div className="px-4 py-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <NavItems items={navItems} onClick={onMenuClose} />
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
