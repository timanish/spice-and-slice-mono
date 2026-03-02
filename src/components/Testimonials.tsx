
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Event Planner",
    content: "The catering service was exceptional! The food was delicious, and the presentation was beautiful. I received so many compliments from our guests.",
    image: "https://randomuser.me/api/portraits/women/32.jpg"
  },
  {
    name: "Michael Rodriguez",
    role: "Corporate Manager",
    content: "Our company has used FeastHub for multiple events. The food is consistently outstanding, and their staff is professional and accommodating.",
    image: "https://randomuser.me/api/portraits/men/47.jpg"
  },
  {
    name: "Emily Chen",
    role: "Wedding Client",
    content: "They made our wedding day perfect! The custom menu they created was exactly what we wanted, and our guests are still raving about the food.",
    image: "https://randomuser.me/api/portraits/women/44.jpg"
  }
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-2">What Our Clients Say</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">We pride ourselves on customer satisfaction and delivering memorable food experiences.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-4">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="mb-4 text-gray-700">"{testimonial.content}"</p>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
