import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { AuthGuard } from "./components/AuthGuard";
import { AdminGuard } from "./components/AdminGuard";
import { AuthProvider } from "./contexts/ClerkAuthContext";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import CateringPage from "./pages/CateringPage";
import ContactPage from "./pages/ContactPage";
import AuthPageClerk from "./pages/AuthPageClerk";
import ProfilePage from "./pages/ProfilePage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminPromoCodesPage from "./pages/AdminPromoCodesPage";
import AdminMenuItemsPage from "./pages/AdminMenuItemsPage";
import AdminHeroSlidesPage from "./pages/AdminHeroSlidesPage";
import AdminCollectionsPage from "./pages/AdminCollectionsPage";
import AdminFestivalsPage from "./pages/AdminFestivalsPage";
import AdminFestivalProductsPage from "./pages/AdminFestivalProductsPage";
import AdminFeaturedProductsPage from "./pages/AdminFeaturedProductsPage";
import AdminTestimonialsPage from "./pages/AdminTestimonialsPage";
import AdminRecipesPage from "./pages/AdminRecipesPage";
import AdminFlashDealsPage from "./pages/AdminFlashDealsPage";
import AdminShopCombosPage from "./pages/AdminShopCombosPage";
import AdminLunchBoxSubscriptionsPage from "./pages/AdminLunchBoxSubscriptionsPage";
import AdminLunchBoxMenuPage from "./pages/AdminLunchBoxMenuPage";
import AdminDeliverySettingsPage from "./pages/AdminDeliverySettingsPage";
import AdminPickupSettingsPage from "./pages/AdminPickupSettingsPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AdminOrdersManagementPage from "./pages/AdminOrdersManagementPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminTikTokPage from "./pages/AdminTikTokPage";
import AdminTvMenuPage from "./pages/AdminTvMenuPage";
import AdminBulkOperationsPage from "./pages/AdminBulkOperationsPage";
import AdminCustomerMessagingPage from "./pages/AdminCustomerMessagingPage";
import TvMenuDisplayPage from "./pages/TvMenuDisplayPage";
import AdminStoreSettingsPage from "./pages/AdminStoreSettingsPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrderPendingPage from "./pages/OrderPendingPage";
import OrderConfirmPage from "./pages/OrderConfirmPage";
import OrderCanceledPage from "./pages/OrderCanceledPage";
import CheckoutPage from "./pages/CheckoutPage";
import GuestCheckoutPage from "./pages/GuestCheckoutPage";
import GuestOrderTrackingPage from "./pages/GuestOrderTrackingPage";
import GuestClaimPage from "./pages/GuestClaimPage";
import LunchBoxPage from "./pages/LunchBoxPage";
import LunchBoxSuccessPage from "./pages/LunchBoxSuccessPage";
import OnboardingPage from "./pages/OnboardingPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";
import { Root } from './Root';
import { CartInitializer } from "./components/CartInitializer";
import { ScrollToTop } from "./components/ScrollToTop";
import { PostHogUserTracker } from "./components/analytics/PostHogUserTracker";
import { SentryUserIdentifier } from "./components/analytics/SentryUserIdentifier";
import { AIChatBubble } from "./components/ai-chat/AIChatBubble";
import * as Sentry from '@sentry/react';

// Route /checkout to the authenticated CheckoutPage for signed-in users and
// to GuestCheckoutPage for signed-out users. Waits for Clerk to load so we
// don't flash the wrong view while auth state resolves.
const CheckoutRouter = () => {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }
  return isSignedIn ? (
    <AuthGuard>
      <CheckoutPage />
    </AuthGuard>
  ) : (
    <Navigate to="/checkout/guest" replace />
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <Root>
      <React.StrictMode>
        <Sentry.ErrorBoundary fallback={
          <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
            <p className="text-xl font-semibold text-gray-800">Something went wrong</p>
            <p className="text-gray-500 text-sm">Our team has been notified. Please refresh to try again.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-food-red text-white rounded-lg text-sm">
              Refresh
            </button>
          </div>
        }>
        <BrowserRouter>
          <ScrollToTop />
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <AuthProvider>
                <PostHogUserTracker />
                <SentryUserIdentifier />
                <CartInitializer />
                <AIChatBubble />
                <Routes>
                  
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/catering" element={<CateringPage />} />
                  <Route path="/lunch-box" element={<LunchBoxPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/auth" element={<AuthPageClerk />} />
                  <Route path="/checkout" element={<CheckoutRouter />} />
                  <Route path="/checkout/guest" element={<GuestCheckoutPage />} />
                  <Route path="/guest-track/:orderId" element={<GuestOrderTrackingPage />} />
                  <Route path="/claim" element={<GuestClaimPage />} />
                  <Route path="/onboarding" element={
                    <AuthGuard>
                      <OnboardingPage />
                    </AuthGuard>
                  } />
                  <Route path="/profile" element={
                    <AuthGuard>
                      <ProfilePage />
                    </AuthGuard>
                  } />
                  <Route path="/order/:orderId" element={
                    <AuthGuard>
                      <OrderDetailsPage />
                    </AuthGuard>
                  } />
                  <Route path="/admin" element={
                    <AdminGuard>
                      <AdminDashboardPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/products" element={
                    <AdminGuard>
                      <AdminProductsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/promos" element={
                    <AdminGuard>
                      <AdminPromoCodesPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/menu-items" element={
                    <AdminGuard>
                      <AdminMenuItemsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/hero-slides" element={
                    <AdminGuard>
                      <AdminHeroSlidesPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/collections" element={
                    <AdminGuard>
                      <AdminCollectionsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/festivals" element={
                    <AdminGuard>
                      <AdminFestivalsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/festivals/:festivalId/products" element={
                    <AdminGuard>
                      <AdminFestivalProductsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/featured" element={
                    <AdminGuard>
                      <AdminFeaturedProductsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/testimonials" element={
                    <AdminGuard>
                      <AdminTestimonialsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/recipes" element={
                    <AdminGuard>
                      <AdminRecipesPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/flash-deals" element={
                    <AdminGuard>
                      <AdminFlashDealsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/shop-combos" element={
                    <AdminGuard>
                      <AdminShopCombosPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/subscriptions" element={
                    <AdminGuard>
                      <AdminLunchBoxSubscriptionsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/lunch-box-menu" element={
                    <AdminGuard>
                      <AdminLunchBoxMenuPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/delivery-settings" element={
                    <AdminGuard>
                      <AdminDeliverySettingsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/pickup-settings" element={
                    <AdminGuard>
                      <AdminPickupSettingsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/store-settings" element={
                    <AdminGuard>
                      <AdminStoreSettingsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/categories" element={
                    <AdminGuard>
                      <AdminCategoriesPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/orders" element={
                    <AdminGuard>
                      <AdminOrdersManagementPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/users" element={
                    <AdminGuard>
                      <AdminUsersPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/tiktok" element={
                    <AdminGuard>
                      <AdminTikTokPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/tv-menu" element={
                    <AdminGuard>
                      <AdminTvMenuPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/bulk-operations" element={
                    <AdminGuard>
                      <AdminBulkOperationsPage />
                    </AdminGuard>
                  } />
                  <Route path="/admin/customer-messages" element={
                    <AdminGuard>
                      <AdminCustomerMessagingPage />
                    </AdminGuard>
                  } />
                  <Route path="/tv-menu" element={<TvMenuDisplayPage />} />
                  <Route path="/tv-menu/:slug" element={<TvMenuDisplayPage />} />
                  <Route path="/order-pending/:orderId" element={<OrderPendingPage />} />
                  <Route path="/order-confirm/:orderId" element={<OrderConfirmPage />} />
                  <Route path="/order-success" element={<OrderSuccessPage />} />
                  <Route path="/lunch-box-success" element={<LunchBoxSuccessPage />} />
                  <Route path="/order-canceled" element={<OrderCanceledPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </BrowserRouter>
        </Sentry.ErrorBoundary>
      </React.StrictMode>
    </Root>
  );
}

export default App;
