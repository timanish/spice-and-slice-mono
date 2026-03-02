import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminMobileHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export const AdminMobileHeader = ({ onMenuClick, title }: AdminMobileHeaderProps) => {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="mr-3"
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-food-red to-food-orange rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">A</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {title || "Admin Panel"}
          </h1>
        </div>
      </div>
    </header>
  );
};
