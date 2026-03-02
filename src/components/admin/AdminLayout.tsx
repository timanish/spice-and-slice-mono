import { useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileHeader } from "./AdminMobileHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Desktop Sidebar - Always visible on lg+ */}
        <aside className="hidden lg:block w-80 fixed left-0 top-0 bottom-0 z-30">
          <AdminSidebar />
        </aside>

        {/* Mobile Header */}
        <AdminMobileHeader
          onMenuClick={() => setIsMobileMenuOpen(true)}
          title={title}
        />

        {/* Mobile Drawer */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <AdminSidebar onNavigate={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 lg:ml-80 w-full overflow-x-hidden">
          <div className="pt-16 lg:pt-0">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
};
