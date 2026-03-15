import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 py-16">
        <div className="text-center max-w-md">
          <div className="text-8xl font-serif font-bold text-food-red/20 mb-2">404</div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-3">
            Page not found
          </h1>
          <p className="text-gray-600 mb-8">
            Sorry, we couldn't find the page you're looking for. 
            It may have been moved or no longer exists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button asChild className="bg-food-red hover:bg-food-red/90">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/products">
                <Search className="mr-2 h-4 w-4" />
                Browse Products
              </Link>
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            <p className="mb-2">Looking for something specific?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/lunch-box" className="text-food-red hover:underline">Lunch Box</Link>
              <span>·</span>
              <Link to="/catering" className="text-food-red hover:underline">Catering</Link>
              <span>·</span>
              <Link to="/contact" className="text-food-red hover:underline">Contact Us</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
