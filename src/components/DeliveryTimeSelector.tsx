
import React, { useState, useEffect } from 'react';
import { addDays, setHours, setMinutes, isAfter, isBefore } from 'date-fns';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useDeliverySlots } from '@/hooks/useDeliverySlots';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

interface TimeSlot {
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface DeliveryTimeSelectorProps {
  required?: boolean;
  onValidationChange?: (isValid: boolean) => void;
  minDaysAdvance?: number;
}

const DeliveryTimeSelector: React.FC<DeliveryTimeSelectorProps> = ({
  required = false,
  onValidationChange,
  minDaysAdvance = 0,
}) => {
  const { data: deliverySettings } = useDeliverySettings();
  const { data: dbSlots, isLoading: slotsLoading, error: slotsError } = useDeliverySlots();
  const { trackEvent } = usePostHogTracking();
  const TIMEZONE = deliverySettings?.timezone || 'America/Chicago';
  const MIN_DELIVERY_HOURS = deliverySettings?.minDeliveryHours || 2;
  const DELIVERY_CUTOFF_HOUR = deliverySettings?.deliveryCutoffHour || 18;
  const MAX_DAYS_ADVANCE = deliverySettings?.maxDaysAdvance || 7;

  const TIME_SLOTS: TimeSlot[] = dbSlots?.map(slot => ({
    label: slot.label,
    startHour: slot.start_hour,
    startMinute: slot.start_minute,
    endHour: slot.end_hour,
    endMinute: slot.end_minute,
  })) || [];

  const nowUTC = new Date();
  const now = toZonedTime(nowUTC, TIMEZONE);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const savedDate = localStorage.getItem('selectedDeliveryDate');
    if (savedDate) {
      try {
        const date = new Date(savedDate);
        const nowCentral = toZonedTime(new Date(), deliverySettings?.timezone || 'America/Chicago');

        const savedDateFormatted = format(date, 'yyyy-MM-dd', { timeZone: deliverySettings?.timezone || 'America/Chicago' });
        const minAllowedDate = addDays(nowCentral, minDaysAdvance);
        const minDateFormatted = format(minAllowedDate, 'yyyy-MM-dd', { timeZone: deliverySettings?.timezone || 'America/Chicago' });

        if (savedDateFormatted >= minDateFormatted) {
          return date;
        } else {
          localStorage.removeItem('selectedDeliveryDate');
          localStorage.removeItem('selectedDeliveryTime');
        }
      } catch {
        return undefined;
      }
    }
    return undefined;
  });
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    return localStorage.getItem('selectedDeliveryTime') || "";
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const findNextAvailableDate = (): Date => {
    const nowCentral = toZonedTime(new Date(), TIMEZONE);

    const startDay = minDaysAdvance > 0 ? minDaysAdvance : 0;

    for (let daysAhead = startDay; daysAhead <= MAX_DAYS_ADVANCE; daysAhead++) {
      const checkDate = new Date(nowCentral);
      checkDate.setDate(nowCentral.getDate() + daysAhead);
      
      const isToday = daysAhead === 0;
      const earliestDeliveryTime = new Date(nowCentral);
      earliestDeliveryTime.setHours(nowCentral.getHours() + MIN_DELIVERY_HOURS);
      earliestDeliveryTime.setMinutes(nowCentral.getMinutes());
      
      // console.log(`\n📅 Checking ${isToday ? 'TODAY' : 'day +' + daysAhead}:`, format(checkDate, 'yyyy-MM-dd', { timeZone: TIMEZONE }));
      // console.log('Earliest delivery time:', format(earliestDeliveryTime, 'HH:mm', { timeZone: TIMEZONE }));
      
      const hasAvailableSlots = TIME_SLOTS.some(slot => {
        const slotStartTime = setMinutes(setHours(new Date(checkDate), slot.startHour), slot.startMinute);
        const slotEndTime = setMinutes(setHours(new Date(checkDate), slot.endHour), slot.endMinute);
        
        if (isToday) {
          // Slot start time must be at or after earliest delivery time
          const canDeliverInSlot = !isAfter(earliestDeliveryTime, slotStartTime);
          const endsBeforeCutoff = isBefore(slotEndTime, setMinutes(setHours(new Date(checkDate), DELIVERY_CUTOFF_HOUR), 1)) ||
                                  slotEndTime.getHours() === DELIVERY_CUTOFF_HOUR;
          
          // console.log(`  Slot ${slot.label}: canDeliver=${canDeliverInSlot}, beforeCutoff=${endsBeforeCutoff}`);
          
          return canDeliverInSlot && endsBeforeCutoff;
        } else {
          return true;
        }
      });
      
      // console.log(`  ✅ Has available slots: ${hasAvailableSlots}`);
      
      if (hasAvailableSlots) {
        return checkDate;
      }
    }
    
    const tomorrow = new Date(nowCentral);
    tomorrow.setDate(nowCentral.getDate() + 1);
    return tomorrow;
  };

  useEffect(() => {
    if (selectedDate && TIME_SLOTS.length > 0 && !slotsLoading && !hasInitialized) {
      const nowCentral = toZonedTime(new Date(), TIMEZONE);
      const selectedDateFormatted = format(selectedDate, 'yyyy-MM-dd', { timeZone: TIMEZONE });
      const todayFormatted = format(nowCentral, 'yyyy-MM-dd', { timeZone: TIMEZONE });
      const isToday = selectedDateFormatted === todayFormatted;
      
      if (isToday) {
        const earliestDeliveryTime = new Date(nowCentral);
        earliestDeliveryTime.setHours(nowCentral.getHours() + MIN_DELIVERY_HOURS);
        earliestDeliveryTime.setMinutes(nowCentral.getMinutes());
        
        const hasAvailableSlots = TIME_SLOTS.some(slot => {
          const slotStartTime = setMinutes(setHours(new Date(selectedDate), slot.startHour), slot.startMinute);
          const slotEndTime = setMinutes(setHours(new Date(selectedDate), slot.endHour), slot.endMinute);
          // Slot start time must be at or after earliest delivery time
          const canDeliverInSlot = !isAfter(earliestDeliveryTime, slotStartTime);
          const endsBeforeCutoff = slotEndTime.getHours() <= DELIVERY_CUTOFF_HOUR;
          return canDeliverInSlot && endsBeforeCutoff;
        });
        
        if (!hasAvailableSlots) {
          // console.log('⚠️ Selected date (today) has no available slots, clearing and finding next available...');
          localStorage.removeItem('selectedDeliveryDate');
          localStorage.removeItem('selectedDeliveryTime');
          setSelectedDate(undefined);
          setSelectedTime("");
        }
      }
    }
  }, [selectedDate, TIME_SLOTS.length, slotsLoading, hasInitialized, MIN_DELIVERY_HOURS, DELIVERY_CUTOFF_HOUR, TIMEZONE]);

  useEffect(() => {
    if (!hasInitialized && TIME_SLOTS.length > 0 && !slotsLoading) {
      if (!selectedDate) {
        // console.log('🚀 Initializing with next available date...');
        const nextAvailableDate = findNextAvailableDate();
        setSelectedDate(nextAvailableDate);
      }
      setHasInitialized(true);
    }
  }, [hasInitialized, TIME_SLOTS.length, slotsLoading, selectedDate]);
  
  useEffect(() => {
    if (!selectedDate || TIME_SLOTS.length === 0) {
      setAvailableTimeSlots([]);
      return;
    }

    const slots: string[] = [];
    const nowCentral = toZonedTime(new Date(), TIMEZONE);
    const isToday = format(selectedDate, 'yyyy-MM-dd', { timeZone: TIMEZONE }) === format(nowCentral, 'yyyy-MM-dd', { timeZone: TIMEZONE });
    const earliestDeliveryTime = new Date(nowCentral);
    earliestDeliveryTime.setHours(nowCentral.getHours() + MIN_DELIVERY_HOURS);
    earliestDeliveryTime.setMinutes(nowCentral.getMinutes());
    
    // console.log('\n🔍 Calculating slots for selected date:', format(selectedDate, 'yyyy-MM-dd', { timeZone: TIMEZONE }));
    // console.log('Is today?', isToday);
    // console.log('Current CT time:', format(nowCentral, 'HH:mm', { timeZone: TIMEZONE }));
    // console.log('Earliest delivery:', format(earliestDeliveryTime, 'HH:mm', { timeZone: TIMEZONE }));
    
    TIME_SLOTS.forEach(slot => {
      const slotStartTime = setMinutes(setHours(new Date(selectedDate), slot.startHour), slot.startMinute);
      const slotEndTime = setMinutes(setHours(new Date(selectedDate), slot.endHour), slot.endMinute);
      
      if (isToday) {
        // Slot start time must be at or after earliest delivery time
        const canDeliverInSlot = !isAfter(earliestDeliveryTime, slotStartTime);
        
        const endsBeforeCutoff = isBefore(slotEndTime, setMinutes(setHours(new Date(selectedDate), DELIVERY_CUTOFF_HOUR), 1)) ||
                                slotEndTime.getHours() === DELIVERY_CUTOFF_HOUR;
        
        // console.log(`  ${slot.label}: canDeliver=${canDeliverInSlot}, beforeCutoff=${endsBeforeCutoff}`);
        
        if (canDeliverInSlot && endsBeforeCutoff) {
          slots.push(slot.label);
        }
      } else {
        slots.push(slot.label);
      }
    });
    
    setAvailableTimeSlots(slots);
    
    if (slots.length > 0 && !slots.includes(selectedTime)) {
      setSelectedTime(slots[0]);
    } else if (slots.length === 0) {
      setSelectedTime("");
    }
  }, [selectedDate, TIME_SLOTS.length, MIN_DELIVERY_HOURS, DELIVERY_CUTOFF_HOUR]);

  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem('selectedDeliveryDate', format(selectedDate, 'yyyy-MM-dd'));
    }
    
    if (selectedTime) {
      localStorage.setItem('selectedDeliveryTime', selectedTime);
      trackEvent('delivery_time_selected', {
        date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
        time_slot: selectedTime,
      });
    }

    if (onValidationChange) {
      const isValid = !!(selectedDate && selectedTime);
      onValidationChange(isValid);
    }
  }, [selectedDate, selectedTime, onValidationChange, trackEvent]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const isValid = selectedDate && selectedTime;
  const showError = required && !isValid;

  if (slotsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-food-red" />
          <h3 className="text-lg font-semibold">Delivery Schedule</h3>
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-3">
          Loading delivery time slots...
        </div>
      </div>
    );
  }

  if (slotsError || TIME_SLOTS.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-food-red" />
          <h3 className="text-lg font-semibold">Delivery Schedule</h3>
        </div>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Unable to load delivery time slots</p>
            <p className="text-xs mt-1">Please contact support or try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-5 w-5 text-food-red" />
        <h3 className="text-lg font-semibold">Delivery Schedule</h3>
        {required && <span className="text-red-500 text-sm">*</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Delivery Date {required && <span className="text-red-500">*</span>}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal h-11",
                  !selectedDate && "text-muted-foreground",
                  showError && "border-red-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : <span>Select date</span>}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const minDate = minDaysAdvance > 0 ? addDays(today, minDaysAdvance) : today;
                  const maxDate = addDays(today, MAX_DAYS_ADVANCE);
                  return date < minDate || date > maxDate;
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Delivery Time {required && <span className="text-red-500">*</span>}
          </label>
          <Select 
            value={selectedTime} 
            onValueChange={setSelectedTime}
            disabled={!selectedDate}
          >
            <SelectTrigger 
              className={cn(
                "w-full h-11",
                showError && "border-red-500"
              )}
            >
              <SelectValue placeholder="Select delivery time" />
            </SelectTrigger>
            <SelectContent>
              {availableTimeSlots.length === 0 ? (
                <SelectItem value="none" disabled>
                  No available slots for this date
                </SelectItem>
              ) : (
                availableTimeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info message about available slots */}
      {selectedDate && availableTimeSlots.length === 0 && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
          <p className="font-medium">No delivery slots available for this date</p>
          <p className="text-xs mt-1">
            {format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
              ? `All slots require ${MIN_DELIVERY_HOURS} hours advance notice and must complete by ${DELIVERY_CUTOFF_HOUR > 12 ? DELIVERY_CUTOFF_HOUR - 12 : DELIVERY_CUTOFF_HOUR} ${DELIVERY_CUTOFF_HOUR >= 12 ? 'PM' : 'AM'}. Please select a future date.`
              : 'Please select another date.'}
          </p>
        </div>
      )}

      {/* Delivery info */}
      <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="font-medium mb-1">Delivery Information:</p>
        <ul className="text-xs space-y-1">
          <li>• Orders require {MIN_DELIVERY_HOURS} hours advance notice</li>
          <li>• Delivery times: {TIME_SLOTS.length > 0 ? `${TIME_SLOTS[0].label.split(' - ')[0]} - ${TIME_SLOTS[TIME_SLOTS.length - 1].label.split(' - ')[1]}` : 'Loading...'}</li>
          <li>• Timezone: {TIMEZONE.replace('America/', '').replace('_', ' ')}</li>
        </ul>
      </div>

      {/* Validation error */}
      {showError && (
        <p className="text-sm text-red-500 font-medium">
          Please select a delivery date and time to continue
        </p>
      )}
    </div>
  );
};

export default DeliveryTimeSelector;
