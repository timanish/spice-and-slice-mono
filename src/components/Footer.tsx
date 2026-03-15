
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MapPin, Phone, Mail, Clock, ChevronRight } from 'lucide-react';
import TikTokIcon from './icons/TikTokIcon';
import { Button } from './ui/button';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-food-red/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-food-orange/5 rounded-full blur-3xl"></div>
      
      <div className="container relative z-10">
        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-6 group">
              <span className="font-serif font-bold text-3xl transition-transform group-hover:scale-105">
                <span className="text-white">Spice</span>
                <span className="text-food-red">&Slice</span>
                <span className="text-yellow-500">Bazaar</span>
              </span>
            </Link>
            <p className="text-gray-400 leading-relaxed mb-6">
              Authentic Indo-Nepali cuisine with bold flavors and traditional preparation methods. Experience the taste of home.
            </p>
            
            {/* Social Links */}
            <div>
              <p className="text-white font-semibold mb-3">Follow Us</p>
              <div className="flex space-x-3">
                <a 
                  href="https://www.facebook.com/profile.php?id=61571574123654" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on Facebook"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-food-red flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a 
                  href="https://www.instagram.com/spiceandslicedfw/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on Instagram"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a 
                  href="https://www.tiktok.com/@spiceandslicedfw" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on TikTok"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-black flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg"
                >
                  <TikTokIcon className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-food-red rounded-full"></div>
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all group">
                  <ChevronRight className="h-4 w-4 text-food-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all group">
                  <ChevronRight className="h-4 w-4 text-food-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  Products
                </Link>
              </li>
              <li>
                <Link to="/lunch-box" className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all group">
                  <ChevronRight className="h-4 w-4 text-food-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  Lunch Program
                </Link>
              </li>
              <li>
                <Link to="/catering" className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all group">
                  <ChevronRight className="h-4 w-4 text-food-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  Catering
                </Link>
              </li>
              <li>
                <Link to="/contact" className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all group">
                  <ChevronRight className="h-4 w-4 text-food-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all group">
                  <ChevronRight className="h-4 w-4 text-food-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all group">
                  <ChevronRight className="h-4 w-4 text-food-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Business Hours */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-food-orange rounded-full"></div>
              Business Hours
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-food-orange flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Monday - Friday</p>
                  <p className="text-gray-400">11:00 AM - 9:00 PM</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-food-orange flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Saturday - Sunday</p>
                  <p className="text-gray-400">11:00 AM - 10:00 PM</p>
                </div>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
              Contact Us
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-food-red flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Visit Us</p>
                  <p className="text-gray-400 text-sm">7451 N Beach St #172<br />Fort Worth, TX 76137</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-food-orange flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Call Us</p>
                  <a href="tel:6822555004" className="text-gray-400 hover:text-food-orange transition-colors">
                    (682) 255-5004
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Email Us</p>
                  <a href="mailto:spiceandslicedfw@gmail.com" className="text-gray-400 hover:text-yellow-500 transition-colors text-sm break-all">
                    spiceandslicedfw@gmail.com
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Newsletter Section */}
        {/* <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">Stay Updated!</h3>
              <p className="text-gray-400 text-sm">Subscribe to get special offers and updates</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-food-red transition-colors flex-1 md:w-80"
              />
              <Button className="bg-food-red hover:bg-food-red/90 text-white px-6">
                Subscribe
              </Button>
            </div>
          </div>
        </div> */}
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-gray-400">
              &copy; {new Date().getFullYear()} Spice & Slice Bazaar. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
