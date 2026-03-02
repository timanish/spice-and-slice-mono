
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface AdminItemsProps {
  items: AdminNavItem[];
  onClick?: () => void;
}

const AdminItems: React.FC<AdminItemsProps> = ({ items, onClick }) => {
  const location = useLocation();
  
  return (
    <div className="flex md:flex-row flex-col w-full md:space-x-6 space-y-4 md:space-y-0">
      {items.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className={cn(
            "text-gray-600 hover:text-food-red transition-colors whitespace-nowrap py-2 md:py-0 flex items-center",
            location.pathname === item.path && "text-food-red font-medium"
          )}
          onClick={onClick}
        >
          <item.icon className="h-4 w-4 mr-2" />
          {item.name}
        </Link>
      ))}
    </div>
  );
};

export default AdminItems;
