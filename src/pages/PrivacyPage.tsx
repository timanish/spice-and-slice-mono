import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PrivacyPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-1 bg-gradient-to-b from-gray-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-gray-600 text-lg">
              Last updated: November 22, 2025
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Welcome to Spice&Slice Bazaar. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy will inform you about how we handle your personal data when you visit our website and 
                tell you about your privacy rights.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>We may collect, use, store and transfer different kinds of personal data about you:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identity Data:</strong> Name, email address, phone number</li>
                <li><strong>Contact Data:</strong> Billing address, delivery address</li>
                <li><strong>Transaction Data:</strong> Details about payments and orders</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
                <li><strong>Usage Data:</strong> Information about how you use our website</li>
                <li><strong>Marketing Data:</strong> Your preferences in receiving marketing communications</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>We use your personal data for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To process and deliver your orders</li>
                <li>To manage your account and subscriptions</li>
                <li>To send you service-related communications</li>
                <li>To improve our website and services</li>
                <li>To send you marketing communications (with your consent)</li>
                <li>To comply with legal obligations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                We have implemented appropriate security measures to prevent your personal data from being accidentally lost, 
                used, accessed, altered, or disclosed in an unauthorized way. We use industry-standard encryption and secure 
                payment processing through trusted third-party providers.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Under data protection laws, you have rights including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The right to access your personal data</li>
                <li>The right to correct inaccurate personal data</li>
                <li>The right to request deletion of your personal data</li>
                <li>The right to object to processing of your personal data</li>
                <li>The right to data portability</li>
                <li>The right to withdraw consent</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Our website uses cookies to distinguish you from other users. This helps us provide you with a good 
                experience when you browse our website and allows us to improve our site. You can set your browser 
                to refuse all or some browser cookies.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                We use third-party services for authentication (Clerk), payment processing, and analytics. 
                These services may collect information as outlined in their respective privacy policies.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                If you have any questions about this privacy policy or our privacy practices, please contact us at:
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

export default PrivacyPage;
