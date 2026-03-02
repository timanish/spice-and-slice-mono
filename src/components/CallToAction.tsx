
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CallToAction = () => {
  return (
    <section className="py-16 bg-food-brown text-white">
      <div className="container text-center">
        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Ready to Plan Your Event?</h2>
        <p className="max-w-2xl mx-auto mb-8 text-lg opacity-90">
          Let us help you create a memorable experience with delicious food customized to your preferences and dietary needs.
        </p>
        <Button asChild className="bg-food-red hover:bg-food-red/90 px-8 py-6 text-lg">
          <Link to="/catering">Request a Quote</Link>
        </Button>
      </div>
    </section>
  );
};

export default CallToAction;
