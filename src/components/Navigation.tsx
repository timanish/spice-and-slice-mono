import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Package, ListChecks, Settings, Image, Search, User, Layers, Calendar, Star, Quote, ChefHat, Zap, LayoutDashboard, Video } from 'lucide-react';
import { useAuth as useClerkAuth, useUser as useClerkUser, UserButton, SignInButton } from '@clerk/clerk-react';
import { useUser } from "@/hooks/use-user-clerk";
import { useCartStore } from "@/stores/cart";
import { usePostHogTracking } from '@/hooks/usePostHogTracking';
import NavItems from './navigation/NavItems';
import AdminItems from './navigation/AdminItems';
import UserMenu from './navigation/UserMenu';
import CartButton from './navigation/CartButton';
import MobileMenu from './navigation/MobileMenu';
import ShoppingCartComponent from "./shopping-cart/ShoppingCart";
import type { NavItem } from './navigation/NavItems';
import type { AdminNavItem } from './navigation/AdminItems';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isTogglingRef = useRef(false);
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useClerkUser();
  const { isAdmin, isCheckingRole } = useUser();
  const cartItems = useCartStore((state) => state.items);
  const { trackCartViewed } = usePostHogTracking();
  
  // Determine if we should show the search button based on the current route
  // Only show on lunch-box page (not on /products as it has its own filter button)
  const showSearchButton = location.pathname === '/lunch-box';
  
  const totalItems = cartItems.reduce((sum, item) => {
    if (item.product.is_weighted && item.weight) {
      return sum + 1;
    }
    return sum + item.quantity;
  }, 0);
  
  const navItems: NavItem[] = [
    { name: "Home", path: "/" },
    { name: "Lunch Box", path: "/lunch-box" },
    { name: "Catering", path: "/catering" }
  ];
  
  const adminItems: AdminNavItem[] = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Products", path: "/admin/products", icon: Package },
    { name: "Promo Codes", path: "/admin/promos", icon: ListChecks },
    { name: "Menu Items", path: "/admin/menu-items", icon: Settings },
    { name: "Hero Slides", path: "/admin/hero-slides", icon: Image },
    { name: "Collections", path: "/admin/collections", icon: Layers },
    { name: "Festivals", path: "/admin/festivals", icon: Calendar },
    { name: "Featured Products", path: "/admin/featured", icon: Star },
    { name: "Testimonials", path: "/admin/testimonials", icon: Quote },
    { name: "Recipes", path: "/admin/recipes", icon: ChefHat },
    { name: "Flash Deals", path: "/admin/flash-deals", icon: Zap },
    { name: "TikTok Videos", path: "/admin/tiktok", icon: Video }
  ];

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const openCart = useCallback(() => {
    setCartOpen(true);
    const totalValue = cartItems.reduce((sum, item) => {
      const price = item.product.is_weighted && item.weight
        ? item.weight * item.product.price_per_unit
        : item.quantity * item.product.price_per_unit;
      return sum + price;
    }, 0);
    trackCartViewed(cartItems.length, totalValue);
  }, [cartItems, trackCartViewed]);

  const closeCart = useCallback(() => {
    setCartOpen(false);
  }, []);

  const handleCartOpenFromMobile = useCallback(() => {
    setCartOpen(true);
    setMobileMenuOpen(false);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    const newState = !searchOpen;
    isTogglingRef.current = true;
    setSearchOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleProductFilters', { detail: { open: newState } }));
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 100);
  }, [searchOpen]);

  useEffect(() => {
    const handleUpdateState = (event: Event) => {
      if (isTogglingRef.current) {
        return;
      }
      
      const customEvent = event as CustomEvent<{ open: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.open === 'boolean') {
        setSearchOpen(customEvent.detail.open);
      }
    };
    
    window.addEventListener('updateSearchState', handleUpdateState);
    return () => window.removeEventListener('updateSearchState', handleUpdateState);
  }, []);

  const showAdminItems = isSignedIn && user && isAdmin;

  // console.log('🔴 [Navigation] Render - searchOpen:', searchOpen);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm relative">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center flex-shrink-0 group">
            <span className="font-serif font-bold text-2xl md:text-3xl transition-transform group-hover:scale-105">
              <span className="text-gray-900">Spice</span>
              <span className="text-food-red">&Slice</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex space-x-12 items-center absolute left-1/2 transform -translate-x-1/2">
            <NavItems items={navItems} />
            
            {/* {showAdminItems && (
              <>
                <div className="h-6 border-l border-gray-300"></div>
                <div className="text-food-red font-medium">Admin:</div>
                <AdminItems items={adminItems} />
              </>
            )} */}
          </nav>
          
          <div className="flex items-center gap-3">
            {/* Search button - only visible on mobile and on pages with product listings */}
            {showSearchButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSearch}
                className={`md:hidden text-gray-600 hover:text-food-red hover:bg-food-red/10 p-2 ml-auto ${searchOpen ? 'bg-food-red/10 text-food-red' : ''}`}
                aria-label="Toggle search filters"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            {/* Admin button - only visible on mobile for admin users */}
            {isAdmin && (
              <Link to="/admin" className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:text-food-red hover:bg-food-red/10 p-2"
                  aria-label="Admin Dashboard"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              </Link>
            )}
            {/* Cart button - only visible on mobile */}
            <div className="md:hidden">
              <CartButton totalItems={totalItems} onClick={openCart} />
            </div>
            {/* User button - only visible on mobile */}
            <div className="md:hidden">
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
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-food-red p-2">
                    <User className="h-5 w-5" />
                  </Button>
                </SignInButton>
              )}
            </div>
            {/* Hamburger menu - only visible on mobile */}
            <button
              onClick={toggleMobileMenu}
              type="button"
              className="md:hidden text-gray-600 hover:text-food-red z-50 relative p-2"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          
          <div className="hidden md:flex items-center space-x-3">
            {/* Admin button - only visible on desktop for admin users */}
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:text-food-red hover:bg-food-red/10"
                  aria-label="Admin Dashboard"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <CartButton totalItems={totalItems} onClick={openCart} />
            <UserMenu />
          </div>
        </div>
      </div>
      
      <MobileMenu 
        isOpen={mobileMenuOpen}
        navItems={navItems}
        adminItems={adminItems}
        isAdmin={!!showAdminItems}
        totalItems={totalItems}
        onCartOpen={handleCartOpenFromMobile}
        onMenuClose={handleMobileMenuClose}
      />
      
      <ShoppingCartComponent open={cartOpen} onOpenChange={setCartOpen} hideButton={true} />
    </header>
  );
};

export default Navigation;
