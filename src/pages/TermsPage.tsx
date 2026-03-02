import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TermsPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-1 bg-gradient-to-b from-gray-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-gray-600 text-lg">
              Last updated: November 22, 2025
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Agreement to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                By accessing and using the Spice&Slice Bazaar website, you accept and agree to be bound by the terms 
                and provisions of this agreement. If you do not agree to these terms, please do not use our website.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Use of Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Our services include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Online ordering and delivery of food products</li>
                <li>Lunch box subscription service</li>
                <li>Catering services for events</li>
                <li>Product browsing and information</li>
              </ul>
              <p className="mt-4">
                You agree to use our services only for lawful purposes and in accordance with these terms.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Account Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                To access certain features, you may be required to create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Updating your information as necessary</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Orders and Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                <strong>Order Acceptance:</strong> All orders are subject to acceptance and availability. 
                We reserve the right to refuse or cancel any order for any reason.
              </p>
              <p>
                <strong>Pricing:</strong> Prices are subject to change without notice. We strive to provide accurate 
                pricing information, but errors may occur.
              </p>
              <p>
                <strong>Payment:</strong> Payment is required at the time of order. We accept various payment methods 
                as indicated on our website. All payments are processed securely.
              </p>
              <p>
                <strong>Taxes:</strong> Applicable taxes will be added to your order total.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                We offer delivery services within our service area. Delivery times are estimates and may vary 
                based on location, traffic, and other factors. We are not liable for delays beyond our control.
              </p>
              <p>
                You must provide accurate delivery information. Additional charges may apply for failed deliveries 
                due to incorrect information.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Cancellations and Refunds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                <strong>Order Cancellation:</strong> Orders may be cancelled before preparation begins. 
                Please contact us immediately if you need to cancel.
              </p>
              <p>
                <strong>Refunds:</strong> Refunds are issued at our discretion for valid reasons such as 
                product quality issues or delivery problems. Please contact us within 24 hours of delivery 
                for any concerns.
              </p>
              <p>
                <strong>Subscription Cancellation:</strong> Lunch box subscriptions may be cancelled with 
                appropriate notice as outlined in the subscription terms.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Food Safety and Allergens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                We take food safety seriously and follow all applicable health regulations. However:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Our kitchen handles common allergens including nuts, dairy, gluten, and shellfish</li>
                <li>Cross-contamination may occur despite our best efforts</li>
                <li>You are responsible for informing us of any dietary restrictions or allergies</li>
                <li>We cannot guarantee 100% allergen-free products</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                All content on this website, including text, graphics, logos, images, and software, is the 
                property of Spice&Slice Bazaar and protected by copyright and other intellectual property laws. 
                You may not reproduce, distribute, or create derivative works without our written permission.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                To the fullest extent permitted by law, Spice&Slice Bazaar shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of our services.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                We reserve the right to modify these terms at any time. Changes will be effective immediately 
                upon posting to the website. Your continued use of the website after changes constitutes 
                acceptance of the modified terms.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                These terms are governed by the laws of the State of Texas, United States, without regard to 
                its conflict of law provisions.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                If you have any questions about these terms, please contact us at:
              </p>
              <div className="mt-4">
                <p><strong>Email:</strong> info@spiceandslice.com</p>
                <p><strong>Phone:</strong> (682) 255-5004</p>
                <p><strong>Address:</strong> 7451 N Beach St #172, Fort Worth, TX 76137</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
