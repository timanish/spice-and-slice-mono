import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Package,
  Tag,
  Settings,
  Monitor,
  Image,
  Layers,
  Calendar,
  Star,
  Quote,
  ChefHat,
  Zap,
  UtensilsCrossed,
  Clock,
  Truck,
  ShoppingBag,
  ListChecks,
  Sparkles,
  Upload,
  Home,
  ArrowLeft,
  Mail,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import TikTokIcon from "../icons/TikTokIcon";

interface NavSection {
  title: string;
  icon: LucideIcon;
  items: {
    label: string;
    path: string;
    icon: LucideIcon;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: "Catalog",
    icon: Package,
    items: [
      { label: "Products", path: "/admin/products", icon: Package },
      { label: "Categories", path: "/admin/categories", icon: Tag },
      { label: "Menu Items", path: "/admin/menu-items", icon: Settings },
      { label: "Bulk Operations", path: "/admin/bulk-operations", icon: Upload },
    ],
  },
  {
    title: "Content",
    icon: Image,
    items: [
      { label: "Hero Slides", path: "/admin/hero-slides", icon: Image },
      { label: "Collections", path: "/admin/collections", icon: Layers },
      { label: "Testimonials", path: "/admin/testimonials", icon: Quote },
      { label: "Recipes", path: "/admin/recipes", icon: ChefHat },
      { label: "Festivals", path: "/admin/festivals", icon: Calendar },
      { label: "Festival Products", path: "/admin/festivals/products", icon: Sparkles },
      { label: "Tiktok", path: "/admin/tiktok", icon: Sparkles },
      { label: "TV Menu Board", path: "/admin/tv-menu", icon: Monitor },
    ],
  },
  {
    title: "Operations",
    icon: ShoppingBag,
    items: [
      { label: "Orders", path: "/admin/orders", icon: ShoppingBag, badge: "new" },
      { label: "User Management", path: "/admin/users", icon: Users },
      { label: "Delivery Settings", path: "/admin/delivery-settings", icon: Clock },
      { label: "Pickup Settings", path: "/admin/pickup-settings", icon: Truck },
      { label: "Store Settings", path: "/admin/store-settings", icon: Settings },
    ],
  },
  {
    title: "Marketing",
    icon: Zap,
    items: [
      { label: "Promo Codes", path: "/admin/promos", icon: ListChecks },
      { label: "Flash Deals", path: "/admin/flash-deals", icon: Zap },
      { label: "Featured Products", path: "/admin/featured", icon: Star },
      { label: "Shop Combos", path: "/admin/shop-combos", icon: ShoppingBag },
      { label: "Customer Messages", path: "/admin/customer-messages", icon: Mail },
    ],
  },
  {
    title: "Lunch Box",
    icon: UtensilsCrossed,
    items: [
      { label: "Lunch Box Menu", path: "/admin/lunch-box-menu", icon: ChefHat },
      { label: "Subscriptions", path: "/admin/subscriptions", icon: UtensilsCrossed },
    ],
  },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export const AdminSidebar = ({ onNavigate }: AdminSidebarProps) => {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Catalog",
    "Content",
    "Operations",
    "Marketing",
    "Lunch Box",
  ]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-food-red to-food-orange rounded-lg flex items-center justify-center">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500">Spice&Splice</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Dashboard */}
        <Link
          to="/admin"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            location.pathname === "/admin"
              ? "bg-food-red text-white"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="font-medium">Dashboard</span>
        </Link>

        {/* Sections */}
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSections.includes(section.title);

          return (
            <div key={section.title} className="space-y-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <SectionIcon className="h-5 w-5" />
                  <span className="font-semibold text-sm">{section.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="ml-4 space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                          active
                            ? "bg-food-red/10 text-food-red font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-food-red to-food-orange text-white rounded-lg hover:shadow-md transition-all duration-200 hover:scale-105"
        >
          <Home className="h-4 w-4" />
          <span className="font-medium">Go Back to Home</span>
        </Link>
        <div className="text-xs text-gray-500 text-center">
          Admin Panel v1.0
        </div>
      </div>
    </div>
  );
};
