
import React, { useState } from 'react';
import { Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Menu from '@/components/Menu';

const CateringMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed left-4 top-24 z-50 md:left-6 shadow-md bg-white hover:bg-gray-100">
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Open Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl font-serif">Our Menu</SheetTitle>
          <SheetDescription>
            Explore our authentic Indo-Nepali dishes available for catering
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {/* Only render Menu component when sheet is open to prevent unnecessary API calls */}
          {open && <Menu />}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CateringMenu;
