
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, Check, ArrowRight, ArrowLeft, CheckCircle2, Clock, Minus, Plus, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@clerk/clerk-react';
import { fetchWithAuth } from '@/lib/auth-token';
import { format, addDays, isWeekend, startOfDay, differenceInHours, isBefore, isSameDay } from 'date-fns';
import DeliveryCalendar from './DeliveryCalendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const subscriptionSchema = z.object({
  subscriptionType: z.enum(['weekly', 'monthly', 'custom']),
  totalDeliveryDays: z.number().min(5).max(29).optional(),
  deliverySchedule: z.array(z.date()).optional(),
  deliveryAddress: z.object({
    company: z.string().min(1, 'Company name is required'),
    addressLine1: z.string().min(1, 'Address is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    deliveryInstructions: z.string().optional(),
  }),
  startDate: z.string().min(1, 'Start date is required'),
}).refine(
  (data) => {
    if (data.subscriptionType === 'custom') {
      return (
        data.totalDeliveryDays !== undefined &&
        data.totalDeliveryDays >= 5 &&
        data.totalDeliveryDays <= 29
      );
    }
    return true;
  },
  {
    message: 'Please select between 5 and 29 days for custom plan',
    path: ['totalDeliveryDays'],
  }
).refine(
  (data) => {
    if (data.subscriptionType === 'custom' && data.deliverySchedule) {
      return data.deliverySchedule.length === data.totalDeliveryDays;
    }
    return true;
  },
  {
    message: 'Please select the exact number of delivery days',
    path: ['deliverySchedule'],
  }
);

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface LunchBoxSubscriptionFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const LunchBoxSubscriptionForm = ({ isOpen, onClose }: LunchBoxSubscriptionFormProps) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMonthlyDialog, setShowMonthlyDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      subscriptionType: 'weekly',
      totalDeliveryDays: undefined,
      deliverySchedule: [],
      deliveryAddress: {
        company: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        deliveryInstructions: '',
      },
      startDate: '',
    },
  });

  const onSubmit = async (data: SubscriptionFormData) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to subscribe.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const isCustomPlan = data.subscriptionType === 'custom';
      const deliverySchedule = isCustomPlan && data.deliverySchedule
        ? data.deliverySchedule.map(date => format(date, 'yyyy-MM-dd'))
        : [];

      const origin = window.location.origin;

      const res = await fetchWithAuth('create-lunchbox-checkout', {
        subscriptionType: data.subscriptionType,
        startDate: data.startDate,
        deliverySchedule,
        totalDeliveryDays: data.totalDeliveryDays || 0,
        deliveryAddress: {
          company: data.deliveryAddress.company,
          addressLine1: data.deliveryAddress.addressLine1,
          addressLine2: data.deliveryAddress.addressLine2 || '',
          city: data.deliveryAddress.city,
          state: data.deliveryAddress.state,
          postalCode: data.deliveryAddress.postalCode,
          deliveryInstructions: data.deliveryAddress.deliveryInstructions || '',
        },
        successUrl: `${origin}/lunch-box-success`,
        cancelUrl: `${origin}/lunch-box`,
      });

      const checkoutData = await res.json();

      if (!res.ok) {
        throw new Error(checkoutData.error || 'Failed to create checkout session');
      }

      if (!checkoutData.url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to Stripe Checkout
      window.location.href = checkoutData.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start payment. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    let isValid = false;
    const subscriptionType = form.getValues('subscriptionType');
    
    if (step === 1) {
      isValid = await form.trigger(['subscriptionType', 'startDate']);
    } else if (step === 2 && subscriptionType === 'custom') {
      isValid = await form.trigger('totalDeliveryDays');
      
      const days = form.getValues('totalDeliveryDays');
      if (days && days >= 30) {
        setShowMonthlyDialog(true);
        return;
      }
    } else if (step === 3 && subscriptionType === 'custom') {
      isValid = await form.trigger('deliverySchedule');
      const schedule = form.getValues('deliverySchedule');
      const totalDays = form.getValues('totalDeliveryDays');
      
      if (schedule?.length !== totalDays) {
        toast({
          variant: "destructive",
          title: "Invalid Selection",
          description: `Please select exactly ${totalDays} delivery days.`,
        });
        return;
      }
    } else if ((step === 2 && subscriptionType !== 'custom') || (step === 4 && subscriptionType === 'custom')) {
      isValid = await form.trigger('deliveryAddress');
    }
    
    if (isValid) {
      setStep(step + 1);
    }
  };
  
  const prevStep = () => setStep(step - 1);

  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  };

  const getFirstWeekdays = (count: number, startFrom: Date): Date[] => {
    const dates: Date[] = [];
    let currentDate = new Date(startFrom);
    const startFromDay = startOfDay(startFrom);
    const now = new Date();
    const today = startOfDay(now);
    
    while (dates.length < count) {
      const currentDateStart = startOfDay(currentDate);
      if (isBefore(currentDateStart, startFromDay)) {
        currentDate = addDays(currentDate, 1);
        continue;
      }
      
      // Skip weekends
      if (isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 1);
        continue;
      }
      
      if (isSameDay(currentDateStart, today) || isSameDay(currentDateStart, addDays(today, 1))) {
        const hoursDifference = differenceInHours(currentDateStart, now);
        if (hoursDifference < 24) {
          currentDate = addDays(currentDate, 1);
          continue;
        }
      }
      
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  };

  const handleDayCountChange = (days: number) => {
    form.setValue('totalDeliveryDays', days);
    
    const startDate = form.watch('startDate');
    const actualStartDate = startDate ? new Date(startDate) : addDays(new Date(), 1);
    
    const autoSelectedDates = getFirstWeekdays(days, actualStartDate);
    form.setValue('deliverySchedule', autoSelectedDates);
  };

  const subscriptionType = form.watch('subscriptionType');
  const totalDeliveryDays = form.watch('totalDeliveryDays');
  const deliverySchedule = form.watch('deliverySchedule');
  
  const subscriptionPrice = subscriptionType === 'weekly' 
    ? '$59.99' 
    : subscriptionType === 'monthly'
    ? '$199.99'
    : totalDeliveryDays
    ? `$${(totalDeliveryDays * 12.99).toFixed(2)}`
    : '$0.00';
  
  const getTotalSteps = () => subscriptionType === 'custom' ? 5 : 3;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#8B1A1A]" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#3E1F1F]">
              Subscribe to Lunch Box Delivery
            </h2>
          </div>
          <p className="text-sm text-gray-600 ml-13">
            Set up your weekly lunch delivery subscription
          </p>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto">
            {(subscriptionType === 'custom' ? [
              { num: 1, label: 'Plan' },
              { num: 2, label: 'Days' },
              { num: 3, label: 'Calendar' },
              { num: 4, label: 'Address' },
              { num: 5, label: 'Review' }
            ] : [
              { num: 1, label: 'Plan' },
              { num: 2, label: 'Address' },
              { num: 3, label: 'Review' }
            ]).map((item, index, array) => (
              <div key={item.num} className="flex items-center flex-1 min-w-fit">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step > item.num 
                      ? 'bg-green-500 text-white' 
                      : step === item.num 
                      ? 'bg-[#8B1A1A] text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > item.num ? <Check className="h-4 w-4" /> : item.num}
                  </div>
                  <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${step >= item.num ? 'text-gray-900' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
                {index < array.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-colors ${
                    step > item.num ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-6">
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-serif font-semibold text-[#3E1F1F] mb-2">
                    Choose Your Plan
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Select the subscription plan that works best for you
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="subscriptionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-4"
                          >
                            {/* Weekly Plan */}
                            <label 
                              htmlFor="weekly"
                              className={`relative flex items-start gap-4 border-2 rounded-2xl p-6 cursor-pointer transition-all hover:border-gray-300 ${
                                field.value === 'weekly' ? 'border-[#8B1A1A] bg-[#8B1A1A]/5' : 'border-gray-200'
                              }`}
                            >
                              <RadioGroupItem value="weekly" id="weekly" className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-lg font-semibold text-gray-900">
                                      Weekly Plan - $59.99/week
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      5 lunches delivered Monday through Friday
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {field.value === 'weekly' && (
                                <div className="absolute top-4 right-4">
                                  <div className="w-6 h-6 rounded-full bg-[#8B1A1A] flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              )}
                            </label>

                            {/* Monthly Plan */}
                            <label 
                              htmlFor="monthly"
                              className={`relative flex items-start gap-4 border-2 rounded-2xl p-6 cursor-pointer transition-all hover:border-gray-300 ${
                                field.value === 'monthly' ? 'border-[#8B1A1A] bg-[#8B1A1A]/5' : 'border-gray-200'
                              }`}
                            >
                              <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-lg font-semibold text-gray-900">
                                        Monthly Plan - $199.99/month
                                      </p>
                                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                                        Save 15%
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      20+ lunches per month with 15% savings
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {field.value === 'monthly' && (
                                <div className="absolute top-4 right-4">
                                  <div className="w-6 h-6 rounded-full bg-[#8B1A1A] flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              )}
                            </label>

                            {/* Custom Plan */}
                            <label 
                              htmlFor="custom"
                              className={`relative flex items-start gap-4 border-2 rounded-2xl p-6 cursor-pointer transition-all hover:border-gray-300 ${
                                field.value === 'custom' ? 'border-[#8B1A1A] bg-[#8B1A1A]/5' : 'border-gray-200'
                              }`}
                            >
                              <RadioGroupItem value="custom" id="custom" className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="w-full">
                                    <p className="text-lg font-semibold text-gray-900">
                                      Custom Plan - $12.99/meal
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Choose your days (5-29 days) and schedule
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {field.value === 'custom' && (
                                <div className="absolute top-4 right-4">
                                  <div className="w-6 h-6 rounded-full bg-[#8B1A1A] flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              )}
                            </label>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#8B1A1A]" />
                          When should we start delivering?
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="date"
                              min={getNextMonday()}
                              className="h-12 rounded-xl border-2 border-gray-300 focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 text-base px-4 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0"
                              {...field}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </FormControl>
                        <p className="text-sm text-gray-500 mt-2">
                          Deliveries start on the selected Monday and continue weekly
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    className="h-12 px-8 rounded-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white font-semibold"
                  >
                    {subscriptionType === 'custom' ? 'Continue to Day Selection' : 'Continue to Delivery Address'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Day Selection (Custom Plans Only) */}
            {step === 2 && subscriptionType === 'custom' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-serif font-semibold text-[#3E1F1F] mb-2">
                    How Many Days?
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Choose between 5 and 29 days for your custom lunch box plan
                  </p>
                </div>

                <div className="bg-gradient-to-br from-[#FFF0E8] to-[#FFFAF5] rounded-2xl p-8 border border-gray-100">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-lg font-semibold text-gray-900 mb-1 block">
                          Number of Days
                        </Label>
                        <p className="text-sm text-gray-600">
                          Select between 5 and 29 delivery days
                        </p>
                      </div>
                      <Badge className="bg-[#8B1A1A] text-white text-lg px-4 py-2">
                        {totalDeliveryDays || 0} days
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-2"
                        onClick={() => {
                          const current = totalDeliveryDays || 5;
                          if (current > 5) handleDayCountChange(current - 1);
                        }}
                        disabled={!totalDeliveryDays || totalDeliveryDays <= 5}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      
                      <Input
                        type="number"
                        min={5}
                        max={29}
                        value={totalDeliveryDays || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 5 && value <= 29) {
                            handleDayCountChange(value);
                          }
                        }}
                        className="h-14 text-center text-2xl font-bold border-2 rounded-xl"
                        placeholder="0"
                      />
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-2"
                        onClick={() => {
                          const current = totalDeliveryDays || 5;
                          if (current < 29) handleDayCountChange(current + 1);
                        }}
                        disabled={!totalDeliveryDays || totalDeliveryDays >= 29}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>

                    {totalDeliveryDays && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Price Per Day:</span>
                          <span className="text-lg font-bold text-[#8B1A1A]">$12.99</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold text-gray-900">Estimated Total:</span>
                          <span className="text-2xl font-bold text-[#8B1A1A]">
                            ${(totalDeliveryDays * 12.99).toFixed(2)}
                          </span>
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                {totalDeliveryDays && totalDeliveryDays >= 30 && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm text-amber-800">
                      For 30+ days, our Monthly Plan ($199.99) offers better value!
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    className="h-12 px-6 rounded-full border-2 border-gray-300 hover:border-gray-400"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={!totalDeliveryDays || totalDeliveryDays < 5}
                    className="flex-1 h-12 px-8 rounded-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white font-semibold disabled:opacity-50"
                  >
                    Continue to Calendar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Calendar Selection (Custom Plans Only) */}
            {step === 3 && subscriptionType === 'custom' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-serif font-semibold text-[#3E1F1F] mb-2">
                    Choose Your Delivery Days
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Select {totalDeliveryDays} days for your lunch box deliveries
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      {deliverySchedule?.length || 0} / {totalDeliveryDays} days selected
                    </Badge>
                    <span className="text-gray-500">
                      • Click to select/deselect days
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                  <DeliveryCalendar
                    selectedDates={deliverySchedule || []}
                    onDatesChange={(dates) => form.setValue('deliverySchedule', dates)}
                    totalDaysAllowed={totalDeliveryDays || 0}
                    isReadOnly={false}
                    minDate={form.watch('startDate') ? new Date(form.watch('startDate')) : addDays(new Date(), 1)}
                  />
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm text-blue-800">
                    <strong>Note:</strong> The first {totalDeliveryDays} weekdays from tomorrow are auto-selected. 
                    You can click on any date to deselect it and choose a different one. Weekends are not available.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    className="h-12 px-6 rounded-full border-2 border-gray-300 hover:border-gray-400"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={deliverySchedule?.length !== totalDeliveryDays}
                    className="flex-1 h-12 px-8 rounded-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white font-semibold disabled:opacity-50"
                  >
                    Continue to Delivery Address
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2/4: Delivery Address */}
            {((step === 2 && subscriptionType !== 'custom') || (step === 4 && subscriptionType === 'custom')) && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-[#8B1A1A]" />
                    <h3 className="text-xl font-serif font-semibold text-[#3E1F1F]">
                      Delivery Address
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Where should we deliver your lunch boxes?
                  </p>
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="deliveryAddress.company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-900">Company/Building Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABC Company" 
                            className="h-12 rounded-xl border-gray-300 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryAddress.addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-900">Address Line 1</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123 Main Street" 
                            className="h-12 rounded-xl border-gray-300 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryAddress.addressLine2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-900">Address Line 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Suite 456, Floor 12" 
                            className="h-12 rounded-xl border-gray-300 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryAddress.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-900">City</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="New York" 
                              className="h-12 rounded-xl border-gray-300 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryAddress.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-900">State</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="NY" 
                                className="h-12 rounded-xl border-gray-300 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="deliveryAddress.postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-900">Postal Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10001" 
                              className="h-12 rounded-xl border-gray-300 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryAddress.deliveryInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-900">Delivery Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Reception desk, ask for [Name]" 
                              className="h-12 rounded-xl border-gray-300 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevStep}
                      className="h-12 px-6 rounded-full border-2 border-gray-300 hover:border-gray-400"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      onClick={nextStep}
                      className="flex-1 h-12 px-8 rounded-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white font-semibold"
                    >
                      Continue to Review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

            {/* Step 3/5: Review */}
            {((step === 3 && subscriptionType !== 'custom') || (step === 5 && subscriptionType === 'custom')) && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-[#8B1A1A]" />
                    <h3 className="text-xl font-serif font-semibold text-[#3E1F1F]">
                      Review Your Subscription
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Please review your subscription details before confirming
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Plan Details */}
                  <div className="bg-gradient-to-br from-[#FFF0E8] to-[#FFFAF5] rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-1">Selected Plan</p>
                        <p className="text-2xl font-serif font-bold text-[#3E1F1F]">
                          {subscriptionType === 'weekly' 
                            ? 'Weekly Plan' 
                            : subscriptionType === 'monthly' 
                            ? 'Monthly Plan'
                            : 'Custom Plan'}
                        </p>
                        <p className="text-lg font-semibold text-[#8B1A1A] mt-1">
                          {subscriptionPrice}
                          {subscriptionType !== 'custom' && (
                            <span className="text-sm text-gray-600 font-normal">
                              /{subscriptionType === 'weekly' ? 'week' : 'month'}
                            </span>
                          )}
                        </p>
                        {subscriptionType === 'custom' && totalDeliveryDays && (
                          <p className="text-sm text-gray-600 mt-1">
                            {totalDeliveryDays} delivery days • $12.99 per meal
                          </p>
                        )}
                      </div>
                      <Badge className="bg-[#8B1A1A] text-white border-0">
                        {subscriptionType === 'weekly' 
                          ? '5 lunches/week' 
                          : subscriptionType === 'monthly'
                          ? '20+ lunches/month'
                          : `${totalDeliveryDays} days`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Starting {new Date(form.watch('startDate')).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                    {subscriptionType === 'custom' && deliverySchedule && deliverySchedule.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Delivery Schedule:</p>
                        <div className="flex flex-wrap gap-2">
                          {deliverySchedule.slice(0, 5).map((date, idx) => (
                            <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              {format(date, 'MMM d')}
                            </Badge>
                          ))}
                          {deliverySchedule.length > 5 && (
                            <Badge variant="outline" className="bg-gray-50">
                              +{deliverySchedule.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Address */}
                  <div className="border-2 border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-[#8B1A1A]" />
                      <p className="font-semibold text-gray-900">Delivery Address</p>
                    </div>
                    <div className="space-y-2 text-gray-700">
                      <p className="font-medium">{form.watch('deliveryAddress.company')}</p>
                      <p>{form.watch('deliveryAddress.addressLine1')}</p>
                      {form.watch('deliveryAddress.addressLine2') && (
                        <p>{form.watch('deliveryAddress.addressLine2')}</p>
                      )}
                      <p>
                        {form.watch('deliveryAddress.city')}, {form.watch('deliveryAddress.state')} {form.watch('deliveryAddress.postalCode')}
                      </p>
                      {form.watch('deliveryAddress.deliveryInstructions') && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-600 mb-1">Delivery Instructions</p>
                          <p className="text-sm">{form.watch('deliveryAddress.deliveryInstructions')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    className="h-12 px-6 rounded-full border-2 border-gray-300 hover:border-gray-400"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 px-8 rounded-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white font-semibold disabled:opacity-50"
                  >
                    {isSubmitting ? 'Redirecting to Payment...' : 'Proceed to Payment'}
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>

        {/* Monthly Plan Suggestion Dialog */}
        <AlertDialog open={showMonthlyDialog} onOpenChange={setShowMonthlyDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch to Monthly Plan?</AlertDialogTitle>
              <AlertDialogDescription>
                For 30+ days, our Monthly Plan ($199.99) offers better value than a custom plan! 
                You'll get 20+ lunches with 15% savings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                form.setValue('totalDeliveryDays', 29);
                handleDayCountChange(29);
              }}>
                Continue with Custom (Max 29 days)
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                form.setValue('subscriptionType', 'monthly');
                form.setValue('totalDeliveryDays', undefined);
                form.setValue('deliverySchedule', []);
                setStep(1);
                setShowMonthlyDialog(false);
              }}>
                Switch to Monthly Plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default LunchBoxSubscriptionForm;
