
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

export interface NavItem {
  name: string;
  path: string;
  icon?: React.ElementType;
}

interface NavItemsProps {
  items: NavItem[];
  onClick?: () => void;
}

const NavItems: React.FC<NavItemsProps> = ({ items, onClick }) => {
  const location = useLocation();
  const { trackEvent } = usePostHogTracking();
  
  const handleClick = (item: NavItem) => {
    trackEvent('navigation_clicked', {
      link_text: item.name,
      destination: item.path,
      location: 'header',
    });
    if (onClick) onClick();
  };
  
  return (
    <div className="flex md:flex-row flex-col w-full md:space-x-12 space-y-4 md:space-y-0">
      {items.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className={cn(
            "text-gray-600 hover:text-food-red transition-colors whitespace-nowrap py-2 md:py-0",
            location.pathname === item.path && "text-food-red font-medium"
          )}
          onClick={() => handleClick(item)}
        >
          {item.icon && <item.icon className="h-4 w-4 mr-2 inline" />}
          {item.name}
        </Link>
      ))}
    </div>
  );
};

export default NavItems;
