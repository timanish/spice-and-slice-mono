
import React from 'react';

const DeliveryPlatforms = () => {
  const platforms = [
    {
      name: "UberEats",
      logo: "https://d1a3f4spazzrp4.cloudfront.net/arch-frontend/1.1.1/d1a3f4spazzrp4.cloudfront.net/eats/eats-logo-1a01872c77.svg",
      url: "#",
      description: "Fast delivery from our restaurant to your door"
    },
    {
      name: "DoorDash",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/DoorDash_Logo.svg/1200px-DoorDash_Logo.svg.png",
      url: "#",
      description: "Your favorite dishes delivered"
    },
    {
      name: "GrubHub",
      logo: "https://assets.grubhub.com/assets/img/grubhub-logo-color@2x.png",
      url: "#",
      description: "Order online for delivery or pickup"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {platforms.map(platform => (
        <div key={platform.name} className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
          <img src={platform.logo} alt={platform.name} className="h-12 mb-4 object-contain" />
          <h3 className="font-semibold mb-2">{platform.name}</h3>
          <p className="text-gray-600 text-sm">{platform.description}</p>
          <a href={platform.url} className="mt-4 text-food-red hover:underline">Order Now</a>
        </div>
      ))}
    </div>
  );
};

export default DeliveryPlatforms;
