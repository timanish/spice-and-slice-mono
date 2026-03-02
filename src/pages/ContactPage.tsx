
import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock, MessageCircle, Send } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';

const ContactPage = () => {
  const { user } = useClerkUser();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone_number')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
        
        setFormData(prev => ({
          ...prev,
          name: data?.full_name || '',
          email: user.primaryEmailAddress?.emailAddress || '',
          phone: data?.phone_number || ''
        }));
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!formData.name || !formData.email || !formData.message) {
        throw new Error('Please fill in all required fields');
      }
      
      const response = await fetch('https://vpaklzfcgzznutyqdtxe.supabase.co/functions/v1/send-contact-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject || 'Contact Form Submission',
          message: formData.message
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      toast({
        title: "Message Sent",
        description: "Thank you for contacting us. We'll get back to you soon!",
      });
      
      setFormData(prev => ({
        ...prev,
        subject: '',
        message: ''
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message. Please try again later.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      console.error('Contact form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#8B0000] to-[#6B0000] text-white py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Get In Touch
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed">
              Have questions about our products, catering services, or lunch program? 
              We're here to help and would love to hear from you.
            </p>
          </div>
        </div>
      </div>
      
      <main className="flex-1">
        {/* Contact Cards Section */}
        <div className="container mx-auto px-4 -mt-12 relative z-20 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Location Card */}
            <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="bg-gradient-to-br from-[#8B0000] to-[#6B0000] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg mb-2">Visit Us</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  7451 N Beach St #172<br />
                  Fort Worth, TX 76137
                </p>
                <a 
                  href="https://maps.google.com/?q=7451+N+Beach+St+172+Fort+Worth+TX+76137" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#8B0000] text-sm font-semibold hover:underline mt-3 inline-block"
                >
                  Get Directions →
                </a>
              </CardContent>
            </Card>

            {/* Phone Card */}
            <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="bg-gradient-to-br from-[#8B0000] to-[#6B0000] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg mb-2">Call Us</h3>
                <p className="text-gray-600 text-sm mb-1">Customer Service</p>
                <a 
                  href="tel:6822555004" 
                  className="text-[#8B0000] font-semibold text-lg hover:underline"
                >
                  (682) 255-5004
                </a>
                <p className="text-gray-500 text-xs mt-2">Mon-Sun: 11AM-9PM</p>
              </CardContent>
            </Card>

            {/* Email Card */}
            <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="bg-gradient-to-br from-[#8B0000] to-[#6B0000] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg mb-2">Email Us</h3>
                <p className="text-gray-600 text-sm mb-1">Send us a message</p>
                <a 
                  href="mailto:spiceandslicedfw@gmail.com" 
                  className="text-[#8B0000] font-semibold text-sm hover:underline break-all"
                >
                  spiceandslicedfw@gmail.com
                </a>
                <p className="text-gray-500 text-xs mt-2">We reply within 24hrs</p>
              </CardContent>
            </Card>

            {/* Hours Card */}
            <Card className="bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="bg-gradient-to-br from-[#8B0000] to-[#6B0000] text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg mb-2">Business Hours</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">Mon - Fri</p>
                  <p>11:00 AM - 9:00 PM</p>
                  <p className="font-medium text-gray-900 mt-2">Sat - Sun</p>
                  <p>11:00 AM - 10:00 PM</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form and Map Section */}
        <div className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="shadow-xl border-2 border-gray-100">
              <CardContent className="p-8">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2 tracking-tight">Send Us a Message</h2>
                  <p className="text-gray-600">Fill out the form below and we'll get back to you as soon as possible.</p>
                </div>
                
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="John Doe" 
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                          <Input 
                        id="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        placeholder="john@example.com" 
                        required
                        className="h-12"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                      Phone Number
                    </label>
                    <Input 
                      id="phone" 
                      type="tel"
                      value={formData.phone} 
                      onChange={handleChange} 
                      placeholder="(123) 456-7890" 
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700">
                      Subject
                    </label>
                    <Input 
                      id="subject" 
                      value={formData.subject} 
                      onChange={handleChange} 
                      placeholder="How can we help you?" 
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <Textarea 
                      id="message" 
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more about your inquiry..." 
                      rows={6}
                      required
                      className="resize-none"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#8B0000] to-[#6B0000] hover:from-[#6B0000] hover:to-[#8B0000] shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    We'll respond to your message within 24 hours
                  </p>
                </form>
              </CardContent>
            </Card>

            {/* Map Section */}
            <div className="space-y-6">
              <Card className="shadow-xl border-2 border-gray-100 overflow-hidden h-full">
                <div className="h-full min-h-[500px]">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3352.326893721746!2d-97.29484292427485!3d32.85124477412714!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864dd44eec3ede29%3A0x1fa3412353f0cb67!2s7451%20N%20Beach%20St%20%23172%2C%20Fort%20Worth%2C%20TX%2076137!5e0!3m2!1sen!2sus!4v1712533739651!5m2!1sen!2sus" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen={false} 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Google Map - Spice & Slice Bazaar Location"
                  ></iframe>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* FAQ or Additional Info Section */}
        <div className="container mx-auto px-4 mt-16">
          <Card className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 shadow-xl">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Need Immediate Assistance?</h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                For urgent matters or immediate support, give us a call during business hours. 
                Our friendly team is always ready to help with your orders, catering inquiries, 
                or any questions about our services.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href="tel:6822555004">
                  <Button className="bg-[#8B0000] hover:bg-[#6B0000] h-12 px-8 text-base font-semibold shadow-lg">
                    <Phone className="mr-2 h-5 w-5" />
                    Call Now
                  </Button>
                </a>
                <a href="mailto:spiceandslicedfw@gmail.com">
                  <Button variant="outline" className="h-12 px-8 text-base font-semibold border-2">
                    <Mail className="mr-2 h-5 w-5" />
                    Email Us
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ContactPage;
