import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import HeroStep from '@/components/catering/HeroStep';
import MenuBrowseStep from '@/components/catering/MenuBrowseStep';
import DetailsStep from '@/components/catering/DetailsStep';
import { cateringFormSchema, SelectedMenuItem } from '@/components/catering/types';
import { useCateringService } from '@/components/catering/cateringService';
import { useToast } from '@/hooks/use-toast';
import { UtensilsCrossed, FileText, Check } from 'lucide-react';

type WizardStep = 'hero' | 'menu' | 'details';

const WIZARD_STEPS = [
  { id: 'hero' as const, label: 'Get Started', icon: UtensilsCrossed },
  { id: 'menu' as const, label: 'Build Menu', icon: UtensilsCrossed },
  { id: 'details' as const, label: 'Event Details', icon: FileText },
];

const CateringStepIndicator = ({
  currentStep,
  onStepClick,
  canNavigateTo,
}: {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  canNavigateTo: (step: WizardStep) => boolean;
}) => {
  const currentIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center max-w-lg mx-auto">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const canClick = canNavigateTo(step.id);

            return (
              <React.Fragment key={step.id}>
                {index > 0 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
                <button
                  onClick={() => canClick && onStepClick(step.id)}
                  disabled={!canClick}
                  className={`flex flex-col items-center gap-1.5 group ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-food-red text-white ring-2 ring-food-red/20'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent ? 'text-food-red' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CateringPage = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('hero');
  const [selectedItems, setSelectedItems] = useState<SelectedMenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  const { sendCateringEnquiry } = useCateringService();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof cateringFormSchema>>({
    resolver: zodResolver(cateringFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      eventType: "",
      venue: "",
      dietaryRestrictions: "",
      additionalInfo: "",
      eventDate: "",
      eventTime: ""
    }
  });

  const handleContinueFromHero = () => {
    setCurrentStep('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToDetails = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one menu item for your event.",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: z.infer<typeof cateringFormSchema>) => {
    if (selectedItems.length === 0) {
      form.setError("root", {
        type: "manual",
        message: "Please select at least one menu item."
      });
      return;
    }

    try {
      setLoading(true);

      await sendCateringEnquiry({
        ...data,
        selectedItems,
        spiceLevel: 'medium'
      });

      toast({
        title: "Enquiry Submitted!",
        description: "We'll get back to you within 24 hours with a customized quote."
      });

      form.reset();
      setSelectedItems([]);
      setCurrentStep('hero');

    } catch (error) {
      console.error('Error submitting catering enquiry:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your enquiry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (step: WizardStep) => {
    const currentIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    const targetIndex = WIZARD_STEPS.findIndex(s => s.id === step);
    if (targetIndex < currentIndex) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canNavigateTo = (step: WizardStep) => {
    const currentIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    const targetIndex = WIZARD_STEPS.findIndex(s => s.id === step);
    return targetIndex < currentIndex;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      {/* Step Indicator - show when past hero step */}
      {currentStep !== 'hero' && (
        <CateringStepIndicator
          currentStep={currentStep}
          onStepClick={handleStepClick}
          canNavigateTo={canNavigateTo}
        />
      )}

      <main className="flex-1">
        {currentStep === 'hero' && (
          <HeroStep onContinue={handleContinueFromHero} />
        )}

        {currentStep === 'menu' && (
          <MenuBrowseStep
            selectedItems={selectedItems}
            onUpdateItems={setSelectedItems}
            onProceedToDetails={handleProceedToDetails}
            onBack={() => {
              setCurrentStep('hero');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentStep === 'details' && (
          <DetailsStep
            form={form}
            onSubmit={onSubmit}
            loading={loading}
            onBack={() => {
              setCurrentStep('menu');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CateringPage;
