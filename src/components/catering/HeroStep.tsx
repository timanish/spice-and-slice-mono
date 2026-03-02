import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';

interface HeroStepProps {
  guestCount: string;
  onGuestCountChange: (value: string) => void;
  onContinue: () => void;
}

const HeroStep: React.FC<HeroStepProps> = ({ guestCount, onGuestCountChange, onContinue }) => {
  return (
    <section className="relative bg-gradient-to-br from-[#FFF0E8] to-[#FFFAF5] overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 min-h-[700px] lg:min-h-[85vh] items-center py-20 lg:py-0">
          {/* Left Column - Content */}
          <div className="flex flex-col justify-center space-y-8 lg:space-y-10 z-10">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-[#3E1F1F] leading-tight">
                Catering Services
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-lg leading-relaxed">
                Let us make your next event special with our customized catering services. From small gatherings to large events, we create memorable food experiences.
              </p>
            </div>

            {/* Guest Count Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#8B1A1A] p-3 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3E1F1F]">Let's Get Started</h2>
                  <p className="text-sm text-gray-500">Tell us about your event</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    How many guests are you expecting?
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    value={guestCount}
                    onChange={(e) => onGuestCountChange(e.target.value)}
                    className="text-lg h-14 border-2 border-gray-200 focus:border-[#8B1A1A] rounded-xl"
                    min="1"
                  />
                </div>

                <Button 
                  onClick={onContinue}
                  disabled={!guestCount || parseInt(guestCount) < 1}
                  className="w-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white rounded-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Build My Menu
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <p className="text-sm text-gray-500 text-center">
                  We'll help you calculate portions based on your guest count
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Column - Hero Image */}
          <div className="relative lg:absolute lg:right-0 lg:top-0 lg:h-full lg:w-1/2 flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-none lg:w-[110%] lg:-mr-[10%]">
              <img 
                src="https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&h=1200&fit=crop"
                alt="Catering buffet spread"
                className="rounded-3xl lg:rounded-none object-cover w-full h-[500px] lg:h-[85vh] shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroStep;
