import React, { useState, useEffect } from 'react';
import { addDays, setHours, setMinutes, isAfter, isBefore, startOfDay } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { CalendarIcon, Clock, AlertCircle, Package } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { usePickupSlots, usePickupCapacity } from '@/hooks/usePickupSlots';
import { usePickupSettings } from '@/hooks/usePickupSettings';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

interface TimeSlot {
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  maxOrders: number;
}

interface PickupTimeSelectorProps {
  required?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

const PickupTimeSelector: React.FC<PickupTimeSelectorProps> = ({ 
  required = false,
  onValidationChange 
}) => {
  const { settings: pickupSettings } = usePickupSettings();
  const { data: dbSlots, isLoading: slotsLoading, error: slotsError } = usePickupSlots();
  const { trackEvent } = usePostHogTracking();

  // Use settings with fallback defaults
  const TIMEZONE = pickupSettings?.timezone || 'America/Chicago';
  const MIN_ADVANCE_HOURS = pickupSettings?.min_advance_hours || 2;
  const MAX_DAYS_ADVANCE = pickupSettings?.max_days_advance || 7;

  // Convert database slots to TimeSlot format
  const TIME_SLOTS: TimeSlot[] = dbSlots?.map(slot => ({
    label: slot.label,
    startHour: slot.start_hour,
    startMinute: slot.start_minute,
    endHour: slot.end_hour,
    endMinute: slot.end_minute,
    maxOrders: slot.max_orders_per_slot,
  })) || [];

  // Get current time in store timezone
  const nowUTC = new Date();
  const now = toZonedTime(nowUTC, TIMEZONE);

  // State for date and time selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const savedDate = localStorage.getItem('selectedPickupDate');
    if (savedDate) {
      try {
        const date = new Date(savedDate);
        const savedDateFormatted = format(date, 'yyyy-MM-dd', { timeZone: TIMEZONE });
        const todayFormatted = format(now, 'yyyy-MM-dd', { timeZone: TIMEZONE });
        
        if (savedDateFormatted >= todayFormatted) {
          return date;
        } else {
          localStorage.removeItem('selectedPickupDate');
          localStorage.removeItem('selectedPickupTime');
        }
      } catch {
        return undefined;
      }
    }
    return undefined;
  });

  const [selectedTime, setSelectedTime] = useState<string | undefined>(() => {
    const savedTime = localStorage.getItem('selectedPickupTime');
    if (savedTime && selectedDate) {
      return savedTime;
    }
    return undefined;
  });

  // Get capacity for selected slot
  const pickupDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd', { timeZone: TIMEZONE }) : undefined;
  const { data: capacityData } = usePickupCapacity(pickupDateStr, selectedTime);

  // Calculate minimum pickup date based on advance hours
  const minPickupDate = addDays(startOfDay(now), Math.ceil(MIN_ADVANCE_HOURS / 24));
  const maxPickupDate = addDays(startOfDay(now), MAX_DAYS_ADVANCE);

  // Filter available time slots based on selected date and current time
  const getAvailableSlots = (): TimeSlot[] => {
    if (!selectedDate || !pickupSettings) return [];

    const selectedDateFormatted = format(selectedDate, 'yyyy-MM-dd', { timeZone: TIMEZONE });
    const todayFormatted = format(now, 'yyyy-MM-dd', { timeZone: TIMEZONE });
    
    // Check if selected date is today
    const isToday = selectedDateFormatted === todayFormatted;

    // Check if within store hours
    const openingHour = parseInt(pickupSettings.opening_time.split(':')[0]);
    const closingHour = parseInt(pickupSettings.closing_time.split(':')[0]);

    return TIME_SLOTS.filter(slot => {
      // Check if slot is within store hours
      if (slot.startHour < openingHour || slot.endHour > closingHour) {
        return false;
      }

      // If today, check if slot is far enough in future
      if (isToday) {
        const slotStart = setMinutes(setHours(now, slot.startHour), slot.startMinute);
        const minTime = addDays(now, MIN_ADVANCE_HOURS / 24);
        
        if (isBefore(slotStart, minTime)) {
          return false;
        }
      }

      return true;
    });
  };

  const availableSlots = getAvailableSlots();

  // Persist selection to localStorage
  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem('selectedPickupDate', selectedDate.toISOString());
    } else {
      localStorage.removeItem('selectedPickupDate');
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime) {
      localStorage.setItem('selectedPickupTime', selectedTime);
    } else {
      localStorage.removeItem('selectedPickupTime');
    }
  }, [selectedTime]);

  // Validation effect
  useEffect(() => {
    const isValid = !!selectedDate && !!selectedTime && (capacityData?.isAvailable ?? true);
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [selectedDate, selectedTime, capacityData, onValidationChange]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(undefined); // Reset time when date changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    trackEvent('pickup_time_selected', {
      date: format(selectedDate || new Date(), 'yyyy-MM-dd', { timeZone: TIMEZONE }),
      time_slot: time,
    });
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return 'Select pickup date';
    return format(toZonedTime(selectedDate, TIMEZONE), 'EEEE, MMMM d, yyyy');
  };

  if (slotsLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Clock className="h-5 w-5 animate-spin" />
        <span>Loading pickup slots...</span>
      </div>
    );
  }

  if (slotsError) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <span>Error loading pickup slots</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Package className="h-5 w-5 text-food-orange" />
        <h3 className="text-lg font-semibold">Schedule Your Pickup</h3>
        {required && <span className="text-red-500">*</span>}
      </div>

      {/* Date Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Pickup Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatSelectedDate()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const dateFormatted = startOfDay(date);
                return (
                  isBefore(dateFormatted, minPickupDate) ||
                  isAfter(dateFormatted, maxPickupDate)
                );
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {selectedDate && (
          <p className="text-xs text-gray-500">
            Timezone: Central Time (CT)
          </p>
        )}
      </div>

      {/* Time Slot Selector */}
      {selectedDate && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Pickup Time</label>
          <Select value={selectedTime} onValueChange={handleTimeSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a time slot" />
            </SelectTrigger>
            <SelectContent>
              {availableSlots.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  No available time slots for this date
                </div>
              ) : (
                availableSlots.map((slot) => {
                  const isCurrentSlot = slot.label === selectedTime;
                  const slotCapacity = isCurrentSlot && capacityData 
                    ? capacityData 
                    : { current: 0, max: slot.maxOrders, isAvailable: true };
                  
                  return (
                    <SelectItem 
                      key={slot.label} 
                      value={slot.label}
                      disabled={!slotCapacity.isAvailable}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{slot.label}</span>
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Capacity Warning */}
      {selectedTime && capacityData && !capacityData.isAvailable && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">This time slot is fully booked</p>
            <p>Please select a different time slot.</p>
          </div>
        </div>
      )}

      {/* Confirmation Message */}
      {selectedDate && selectedTime && capacityData?.isAvailable && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Clock className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold">Pickup scheduled for:</p>
            <p>{formatSelectedDate()} at {selectedTime}</p>
            <p className="text-xs mt-1">Please arrive within the selected time window</p>
          </div>
        </div>
      )}

      {/* Store Info Reminder */}
      {pickupSettings && (
        <div className="text-xs text-gray-600 mt-2">
          <p>Store hours: {format(toZonedTime(new Date(`2000-01-01T${pickupSettings.opening_time}`), TIMEZONE), 'h:mm a')} - {format(toZonedTime(new Date(`2000-01-01T${pickupSettings.closing_time}`), TIMEZONE), 'h:mm a')}</p>
          <p>Minimum advance notice: {MIN_ADVANCE_HOURS} hours</p>
        </div>
      )}
    </div>
  );
};

export default PickupTimeSelector;
