import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Briefcase, Heart, Users, PartyPopper, GraduationCap, Cake, ArrowLeft } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { cateringFormSchema } from './types';

interface DetailsStepProps {
  form: UseFormReturn<z.infer<typeof cateringFormSchema>>;
  onSubmit: (data: z.infer<typeof cateringFormSchema>) => void;
  loading: boolean;
  onBack?: () => void;
}

const eventTypes = [
  { id: 'corporate', label: 'Corporate', icon: Briefcase },
  { id: 'wedding', label: 'Wedding', icon: Heart },
  { id: 'birthday', label: 'Birthday', icon: Cake },
  { id: 'social', label: 'Social', icon: PartyPopper },
  { id: 'graduation', label: 'Graduation', icon: GraduationCap },
  { id: 'other', label: 'Other', icon: Users },
];

const dietaryOptions = [
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🌱' },
  { id: 'vegan', label: 'Vegan', emoji: '🥗' },
  { id: 'gluten-free', label: 'Gluten Free', emoji: '🌾' },
  { id: 'halal', label: 'Halal', emoji: '☪️' },
  { id: 'nut-free', label: 'Nut Free', emoji: '🥜' },
  { id: 'dairy-free', label: 'Dairy Free', emoji: '🥛' },
];

const DetailsStep: React.FC<DetailsStepProps> = ({ form, onSubmit, loading, onBack }) => {
  const [selectedEventType, setSelectedEventType] = React.useState<string>('');
  const [selectedDietary, setSelectedDietary] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (selectedEventType) {
      form.setValue('eventType', selectedEventType);
    }
  }, [selectedEventType, form]);

  React.useEffect(() => {
    form.setValue('dietaryRestrictions', selectedDietary.join(', '));
  }, [selectedDietary, form]);

  const toggleDietary = (id: string) => {
    setSelectedDietary(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        {onBack && (
          <div className="mb-6">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Menu
            </button>
          </div>
        )}

        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Event Details
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Just a few more details and we'll send you a customized quote
          </p>
        </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Information */}
        <Card className="p-8 border border-gray-200 shadow-lg rounded-2xl">
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <Users className="h-6 w-6 mr-3 text-[#8B0000]" />
            Contact Information
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name" className="text-sm font-semibold mb-2 block">
                Full Name *
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                {...form.register('name')}
                className="h-12"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-semibold mb-2 block">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...form.register('email')}
                className="h-12"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-semibold mb-2 block">
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                {...form.register('phone')}
                className="h-12"
              />
              {form.formState.errors.phone && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="eventDate" className="text-sm font-semibold mb-2 block">
                <Calendar className="h-4 w-4 inline mr-1" />
                Event Date *
              </Label>
              <Input
                id="eventDate"
                type="date"
                {...form.register('eventDate')}
                className="h-12"
              />
              {form.formState.errors.eventDate && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.eventDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="eventTime" className="text-sm font-semibold mb-2 block">
                <Clock className="h-4 w-4 inline mr-1" />
                Event Time *
              </Label>
              <Input
                id="eventTime"
                type="time"
                {...form.register('eventTime')}
                className="h-12"
              />
              {form.formState.errors.eventTime && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.eventTime.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="venue" className="text-sm font-semibold mb-2 block">
                <MapPin className="h-4 w-4 inline mr-1" />
                Event Location/Venue *
              </Label>
              <Input
                id="venue"
                placeholder="Address or venue name"
                {...form.register('venue')}
                className="h-12"
              />
              {form.formState.errors.venue && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.venue.message}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Event Type Selection */}
        <Card className="p-8 border border-gray-200 shadow-lg rounded-2xl">
          <h3 className="text-2xl font-bold mb-6">What type of event is this? *</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {eventTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedEventType(type.id)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                    selectedEventType === type.id
                      ? 'border-[#8B0000] bg-[#8B0000]/5 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`h-10 w-10 mx-auto mb-3 ${
                    selectedEventType === type.id ? 'text-[#8B0000]' : 'text-gray-400'
                  }`} />
                  <p className={`font-semibold ${
                    selectedEventType === type.id ? 'text-[#8B0000]' : 'text-gray-700'
                  }`}>
                    {type.label}
                  </p>
                </button>
              );
            })}
          </div>
          {form.formState.errors.eventType && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.eventType.message}</p>
          )}
        </Card>

        {/* Dietary Restrictions */}
        <Card className="p-8 border border-gray-200 shadow-lg rounded-2xl">
          <h3 className="text-2xl font-bold mb-3">Dietary Requirements</h3>
          <p className="text-gray-600 text-base mb-6 leading-relaxed">Select any dietary restrictions your guests may have</p>
          
          <div className="flex flex-wrap gap-3">
            {dietaryOptions.map((option) => (
              <Badge
                key={option.id}
                onClick={() => toggleDietary(option.id)}
                className={`text-base px-5 py-2.5 cursor-pointer transition-all duration-200 hover:scale-105 rounded-full font-semibold ${
                  selectedDietary.includes(option.id)
                    ? 'bg-[#8B0000] hover:bg-[#6B0000] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span className="mr-2">{option.emoji}</span>
                {option.label}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Additional Information */}
        <Card className="p-8 border border-gray-200 shadow-lg rounded-2xl">
          <h3 className="text-2xl font-bold mb-6">Additional Information</h3>
          
          <div>
            <Label htmlFor="additionalInfo" className="text-sm font-semibold mb-2 block">
              Any other details we should know?
            </Label>
            <Textarea
              id="additionalInfo"
              placeholder="Special requests, setup instructions, service preferences, etc."
              {...form.register('additionalInfo')}
              className="min-h-[120px]"
            />
          </div>
        </Card>

        {/* Submit Button */}
        <div className="text-center pt-4">
          <Button 
            type="submit"
            disabled={loading}
            onClick={() => console.log("Submit button clicked!")}
            className="bg-gradient-to-r from-[#8B0000] to-[#A52A2A] hover:from-[#6B0000] hover:to-[#8B0000] text-white h-16 px-16 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl"
          >
            {loading ? 'Submitting...' : 'Submit Enquiry'}
          </Button>
          <p className="text-sm text-gray-600 mt-5 leading-relaxed">
            ⚡ We'll respond within 24 hours with your customized quote
          </p>
        </div>

        {form.formState.errors.root && (
          <p className="text-red-500 text-center">{form.formState.errors.root.message}</p>
        )}
      </form>
      </div>
    </div>
  );
};

export default DetailsStep;
